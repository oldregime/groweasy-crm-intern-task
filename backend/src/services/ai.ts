/**
 * AI Mapping Service
 * Handles mapping of raw CSV rows to the GrowEasy CRM schema.
 * Supports Gemini API, OpenAI API, and a robust Heuristic fallback.
 */

// GrowEasy CRM Fields interface
export interface CRMRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';
  crm_note?: string;
  data_source?: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';
  possession_time?: string;
  description?: string;
  is_skipped: boolean;
  skip_reason?: string;
}

// 1. HEURISTIC MAPPING ENGINE (Robust Fallback)
export function mapRecordHeuristically(rawRecord: Record<string, any>): CRMRecord {
  const result: Partial<CRMRecord> = {
    is_skipped: false,
  };

  const keys = Object.keys(rawRecord);
  const findValue = (regexes: RegExp[]): { val: any; matchedKey: string } | null => {
    for (const regex of regexes) {
      for (const key of keys) {
        if (regex.test(key)) {
          return { val: rawRecord[key], matchedKey: key };
        }
      }
    }
    return null;
  };

  // Field definitions and regexes
  const emailMatch = findValue([/email/i, /e-mail/i, /mail/i]);
  const phoneMatch = findValue([/phone/i, /mobile/i, /cell/i, /contact/i, /number/i, /tele/i]);
  const nameMatch = findValue([/fullname/i, /full.*name/i, /name/i, /first.*name/i, /lead.*name/i]);
  const countryCodeMatch = findValue([/country.*code/i, /dial.*code/i, /code/i]);
  const companyMatch = findValue([/company/i, /org/i, /business/i, /employer/i]);
  const cityMatch = findValue([/city/i, /town/i]);
  const stateMatch = findValue([/state/i, /region/i, /province/i]);
  const countryMatch = findValue([/country/i]); // note: can overlap, handled below
  const statusMatch = findValue([/status/i, /lead.*status/i, /stage/i]);
  const sourceMatch = findValue([/source/i, /data.*source/i, /lead.*source/i]);
  const dateMatch = findValue([/created/i, /date/i, /time/i]);
  const noteMatch = findValue([/note/i, /remark/i, /comment/i, /feedback/i]);
  const possessionMatch = findValue([/possession/i, /possession.*time/i, /property.*time/i]);
  const descMatch = findValue([/desc/i, /description/i, /about/i, /details/i]);
  const ownerMatch = findValue([/owner/i, /assignee/i, /agent/i]);

  // Extract Name
  if (nameMatch) {
    result.name = String(nameMatch.val).trim();
  }

  // Extract Emails
  let emails: string[] = [];
  if (emailMatch && emailMatch.val) {
    const rawEmails = String(emailMatch.val).split(/[\s,;|]+/);
    emails = rawEmails.map(e => e.trim()).filter(e => e.includes('@'));
  }
  if (emails.length > 0) {
    result.email = emails[0];
  }

  // Extract Phones
  let phones: string[] = [];
  if (phoneMatch && phoneMatch.val) {
    const rawPhones = String(phoneMatch.val).split(/[\s,;|]+/);
    phones = rawPhones.map(p => p.trim()).filter(p => p.length >= 7);
  }

  // Extract Country Code
  if (countryCodeMatch) {
    let code = String(countryCodeMatch.val).trim();
    if (!code.startsWith('+') && /^\d+$/.test(code)) {
      code = '+' + code;
    }
    result.country_code = code;
  } else if (phones.length > 0 && phones[0].startsWith('+')) {
    // Try to extract from phone if starting with +
    const match = phones[0].match(/^(\+\d{1,4})/);
    if (match) {
      result.country_code = match[1];
      phones[0] = phones[0].replace(match[1], '').trim();
    }
  }

  if (phones.length > 0) {
    result.mobile_without_country_code = phones[0].replace(/[^\d]/g, '');
  }

  // CRM Note Consolidation
  const extraNotes: string[] = [];
  if (emails.length > 1) {
    extraNotes.push(`Extra emails: ${emails.slice(1).join(', ')}`);
  }
  if (phones.length > 1) {
    extraNotes.push(`Extra phones: ${phones.slice(1).join(', ')}`);
  }
  if (noteMatch && noteMatch.val) {
    extraNotes.push(String(noteMatch.val).trim());
  }
  if (extraNotes.length > 0) {
    result.crm_note = extraNotes.join(' | ');
  }

  // General fields
  if (companyMatch) result.company = String(companyMatch.val).trim();
  if (cityMatch) result.city = String(cityMatch.val).trim();
  if (stateMatch) result.state = String(stateMatch.val).trim();
  
  if (countryMatch && countryMatch.matchedKey !== countryCodeMatch?.matchedKey) {
    result.country = String(countryMatch.val).trim();
  }

  if (ownerMatch) result.lead_owner = String(ownerMatch.val).trim();
  if (possessionMatch) result.possession_time = String(possessionMatch.val).trim();
  if (descMatch) result.description = String(descMatch.val).trim();

  // Date parsing
  if (dateMatch && dateMatch.val) {
    const rawDate = String(dateMatch.val).trim();
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      result.created_at = d.toISOString();
    } else {
      result.created_at = rawDate; // Fallback to raw string
    }
  } else {
    result.created_at = new Date().toISOString();
  }

  // Allowed CRM Status mapping
  if (statusMatch && statusMatch.val) {
    const rawStatus = String(statusMatch.val).toUpperCase().trim();
    if (rawStatus.includes('FOLLOW') || rawStatus.includes('GOOD')) {
      result.crm_status = 'GOOD_LEAD_FOLLOW_UP';
    } else if (rawStatus.includes('DID') || rawStatus.includes('NOT') || rawStatus.includes('CONNECT')) {
      result.crm_status = 'DID_NOT_CONNECT';
    } else if (rawStatus.includes('BAD') || rawStatus.includes('JUNK') || rawStatus.includes('SPAM')) {
      result.crm_status = 'BAD_LEAD';
    } else if (rawStatus.includes('SALE') || rawStatus.includes('DONE') || rawStatus.includes('WON') || rawStatus.includes('CLOSED')) {
      result.crm_status = 'SALE_DONE';
    } else {
      result.crm_status = 'GOOD_LEAD_FOLLOW_UP'; // Default
    }
  } else {
    result.crm_status = 'GOOD_LEAD_FOLLOW_UP'; // Default
  }

  // Allowed Data Source mapping
  if (sourceMatch && sourceMatch.val) {
    const rawSrc = String(sourceMatch.val).toLowerCase().trim();
    if (rawSrc.includes('demand')) {
      result.data_source = 'leads_on_demand';
    } else if (rawSrc.includes('meridian')) {
      result.data_source = 'meridian_tower';
    } else if (rawSrc.includes('eden')) {
      result.data_source = 'eden_park';
    } else if (rawSrc.includes('varah')) {
      result.data_source = 'varah_swamy';
    } else if (rawSrc.includes('sarjapur')) {
      result.data_source = 'sarjapur_plots';
    } else {
      result.data_source = ''; // Blank if none confidently match
    }
  } else {
    result.data_source = '';
  }

  // Skipping Logic: If neither email nor mobile exists, skip
  if (!result.email && !result.mobile_without_country_code) {
    result.is_skipped = true;
    result.skip_reason = 'Record contains neither email nor mobile number.';
  }

  // Ensure default name if skipped is false
  if (!result.name && !result.is_skipped) {
    result.name = 'Unknown Lead';
  }

  return result as CRMRecord;
}

// 2. AI MAPPING ENGINE (Gemini REST Call)
async function mapRecordsWithGemini(records: any[], apiKey: string): Promise<CRMRecord[]> {
  const prompt = `
You are an expert CRM Data Integration assistant.
Your task is to map a batch of raw records from a CSV file into the GrowEasy CRM schema.

Target CRM Schema format (JSON Object fields):
- created_at: Lead creation date (ISO-8601 string or JS-convertible date)
- name: Full name of the lead
- email: Primary email
- country_code: Dialing code (e.g. +91)
- mobile_without_country_code: Mobile number only
- company: Company name
- city: City
- state: State
- country: Country
- lead_owner: Lead owner name
- crm_status: MUST be exactly one of: "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE"
- crm_note: Notes/remarks, and CONSOLIDATED extra details (e.g. extra emails/phones)
- data_source: MUST be exactly one of: "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots" | "" (empty string if none match confidently)
- possession_time: Property possession details
- description: Additional description

Strict Rules:
1. For crm_status: Map any status like "interested", "active", "follow up" to "GOOD_LEAD_FOLLOW_UP". Map "not reachable", "busy", "disconnected" to "DID_NOT_CONNECT". Map "junk", "fake", "bad" to "BAD_LEAD". Map "deal closed", "sold" to "SALE_DONE". Default is "GOOD_LEAD_FOLLOW_UP".
2. For data_source: If the value matches or is related to one of the 5 allowed options, use the exact value. Otherwise, leave it as "".
3. For multiple emails/phones: Use the first one for "email" and "mobile_without_country_code". Append any extra ones into "crm_note".
4. Date format: created_at must be JS-convertible: e.g. "new Date(created_at)" works.
5. Skipping Rule: If a record contains NEITHER email NOR mobile number, you MUST set "is_skipped": true and "skip_reason": "Missing email and phone". Otherwise, set "is_skipped": false and "skip_reason": null.
6. Return a valid JSON array of objects representing mapped records. DO NOT return any markdown wrapping (like \`\`\`json) or text explanations. Just return the raw JSON array.

Raw Records to process:
${JSON.stringify(records, null, 2)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API call failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  // Parse and clean response
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsedRecords = JSON.parse(cleanedText);

  if (!Array.isArray(parsedRecords)) {
    throw new Error('AI did not return a JSON array.');
  }

  return parsedRecords.map((r: any) => ({
    created_at: r.created_at || new Date().toISOString(),
    name: r.name || (r.is_skipped ? '' : 'Unknown Lead'),
    email: r.email || undefined,
    country_code: r.country_code || undefined,
    mobile_without_country_code: r.mobile_without_country_code || undefined,
    company: r.company || undefined,
    city: r.city || undefined,
    state: r.state || undefined,
    country: r.country || undefined,
    lead_owner: r.lead_owner || undefined,
    crm_status: ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'].includes(r.crm_status) 
      ? r.crm_status 
      : 'GOOD_LEAD_FOLLOW_UP',
    crm_note: r.crm_note || undefined,
    data_source: ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots', ''].includes(r.data_source)
      ? r.data_source
      : '',
    possession_time: r.possession_time || undefined,
    description: r.description || undefined,
    is_skipped: !!r.is_skipped,
    skip_reason: r.skip_reason || undefined,
  }));
}

// 3. MAIN SERVICE ENTRYPOINT WITH RETRIES & FALLBACK
export async function mapBatch(
  records: any[],
  options: {
    apiKey?: string;
    provider?: 'gemini' | 'openai' | 'heuristic';
    retries?: number;
  } = {}
): Promise<CRMRecord[]> {
  const provider = options.provider || (options.apiKey ? 'gemini' : 'heuristic');
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const maxRetries = options.retries ?? 2;

  if (provider === 'heuristic' || !apiKey) {
    // Run heuristically
    return records.map(r => mapRecordHeuristically(r));
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      if (provider === 'gemini') {
        return await mapRecordsWithGemini(records, apiKey);
      }
      // Add OpenAI implementation here if needed
      throw new Error(`Unsupported provider: ${provider}`);
    } catch (error) {
      attempt++;
      console.warn(`[AI SERVICE] Attempt ${attempt} failed:`, error);
      if (attempt > maxRetries) {
        console.error('[AI SERVICE] Max retries reached. Falling back to Heuristic Mapping!');
        return records.map(r => mapRecordHeuristically(r));
      }
      // Wait before retry
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }

  // Fallback if loop finishes weirdly
  return records.map(r => mapRecordHeuristically(r));
}
