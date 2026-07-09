import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';
import prisma from '../db';
import { mapBatch } from '../services/ai';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/', upload.single('file'), async (req: express.Request, res: express.Response): Promise<void> => {
  // Check if file is provided
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please upload a valid CSV file.' });
    return;
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Turn off buffering for Nginx/Vercel

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const fileContent = req.file.buffer.toString('utf-8');
    
    // Parse CSV
    sendEvent('status', { message: 'Parsing CSV file...' });
    let rawRecords: any[] = [];
    try {
      rawRecords = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      sendEvent('error', { message: `Failed to parse CSV: ${parseError.message}` });
      res.end();
      return;
    }

    if (rawRecords.length === 0) {
      sendEvent('error', { message: 'The uploaded CSV file is empty.' });
      res.end();
      return;
    }

    const totalRecords = rawRecords.length;
    const importSessionId = crypto.randomUUID();
    sendEvent('status', { 
      message: `Found ${totalRecords} records. Starting AI processing...`,
      importSessionId,
      totalRecords 
    });

    const batchSize = 50;
    let processedCount = 0;
    let importedCount = 0;
    let skippedCount = 0;
    const processedLeads: any[] = [];

    // Retrieve provider and apiKey from headers or query if provided
    const apiKey = (req.headers['x-api-key'] as string) || undefined;
    const provider = (req.headers['x-provider'] as 'gemini' | 'openai' | 'heuristic') || undefined;

    for (let i = 0; i < rawRecords.length; i += batchSize) {
      const batch = rawRecords.slice(i, i + batchSize);
      sendEvent('status', { 
        message: `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(totalRecords / batchSize)}...` 
      });

      // Map batch using AI or Heuristics
      const mappedBatch = await mapBatch(batch, { apiKey, provider });

      // Save mapped records to SQLite database
      const dbLeads = await Promise.all(
        mappedBatch.map(async (lead) => {
          try {
            const savedLead = await prisma.lead.create({
              data: {
                import_session_id: importSessionId,
                created_at: lead.created_at || new Date().toISOString(),
                name: lead.name || (lead.is_skipped ? '' : 'Unknown Lead'),
                email: lead.email || null,
                country_code: lead.country_code || null,
                mobile_without_country_code: lead.mobile_without_country_code || null,
                company: lead.company || null,
                city: lead.city || null,
                state: lead.state || null,
                country: lead.country || null,
                lead_owner: lead.lead_owner || null,
                crm_status: lead.crm_status || 'GOOD_LEAD_FOLLOW_UP',
                crm_note: lead.crm_note || null,
                data_source: lead.data_source || '',
                possession_time: lead.possession_time || null,
                description: lead.description || null,
                is_skipped: lead.is_skipped,
                skip_reason: lead.skip_reason || null,
              },
            });
            
            if (lead.is_skipped) {
              skippedCount++;
            } else {
              importedCount++;
            }
            return savedLead;
          } catch (dbError) {
            console.error('Failed to save lead to database:', dbError);
            // Even if DB fails, count it as skipped or error
            skippedCount++;
            return { ...lead, id: crypto.randomUUID(), is_skipped: true, skip_reason: 'Database error' };
          }
        })
      );

      processedCount += batch.length;
      processedLeads.push(...dbLeads);

      // Stream progress back
      sendEvent('progress', {
        processed: processedCount,
        total: totalRecords,
        percent: Math.min(Math.round((processedCount / totalRecords) * 100), 100),
        imported: importedCount,
        skipped: skippedCount,
        recentBatch: dbLeads,
      });
    }

    // Processing finished
    sendEvent('complete', {
      importSessionId,
      total: totalRecords,
      imported: importedCount,
      skipped: skippedCount,
      leads: processedLeads,
    });
    res.end();

  } catch (error: any) {
    console.error('Error during import processing:', error);
    sendEvent('error', { message: `An unexpected server error occurred: ${error.message}` });
    res.end();
  }
});

export default router;
