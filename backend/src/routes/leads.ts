import express from 'express';
import prisma from '../db';

const router = express.Router();

// GET /api/leads - Query leads with search, filters, pagination
router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const source = (req.query.source as string) || '';
    const sessionId = (req.query.sessionId as string) || '';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Build filters
    const where: any = {};

    // Filter out skipped records by default, unless requested
    const showSkipped = req.query.showSkipped === 'true';
    if (!showSkipped) {
      where.is_skipped = false;
    }

    if (sessionId) {
      where.import_session_id = sessionId;
    }

    if (status) {
      where.crm_status = status;
    }

    if (source) {
      where.data_source = source;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { mobile_without_country_code: { contains: search } },
        { crm_note: { contains: search } },
        { company: { contains: search } },
      ];
    }

    // Query database
    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { db_created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: `Failed to fetch leads: ${error.message}` });
  }
});

// GET /api/sessions - Get history of import sessions and statistics
router.get('/sessions', async (req, res) => {
  try {
    // Get unique sessions
    const sessions = await prisma.lead.groupBy({
      by: ['import_session_id'],
      _count: {
        id: true,
      },
      _min: {
        db_created_at: true,
      },
    });

    // For each session, compute statistics (imported vs skipped)
    const sessionDetails = await Promise.all(
      sessions.map(async (sess) => {
        const sessionId = sess.import_session_id;
        
        const [imported, skipped] = await Promise.all([
          prisma.lead.count({
            where: { import_session_id: sessionId, is_skipped: false },
          }),
          prisma.lead.count({
            where: { import_session_id: sessionId, is_skipped: true },
          }),
        ]);

        return {
          id: sessionId,
          timestamp: sess._min.db_created_at,
          total: sess._count.id,
          imported,
          skipped,
        };
      })
    );

    // Sort by timestamp desc
    sessionDetails.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    res.json(sessionDetails);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: `Failed to fetch sessions: ${error.message}` });
  }
});

// DELETE /api/leads/:id - Delete a specific lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({
      where: { id },
    });
    res.json({ message: 'Lead deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: `Failed to delete lead: ${error.message}` });
  }
});

// DELETE /api/leads/reset - Reset the database (Delete all records)
router.delete('/reset', async (req, res) => {
  try {
    const deleted = await prisma.lead.deleteMany();
    res.json({ message: 'Database reset successful.', count: deleted.count });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: `Failed to reset database: ${error.message}` });
  }
});

export default router;
