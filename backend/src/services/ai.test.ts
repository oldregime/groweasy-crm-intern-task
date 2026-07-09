import { describe, it, expect } from 'vitest';
import { mapRecordHeuristically } from './ai';

describe('Heuristic Mapping Engine Tests', () => {
  it('should map standard columns correctly', () => {
    const rawRow = {
      'Lead Name': 'Alice Smith',
      'Primary Email': 'alice@example.com',
      'Mobile Number': '9876543210',
      'Company Name': 'Acme Corp',
      'City': 'New York',
      'Lead Status': 'Interested',
      'Source': 'Eden Park',
    };

    const result = mapRecordHeuristically(rawRow);

    expect(result.name).toBe('Alice Smith');
    expect(result.email).toBe('alice@example.com');
    expect(result.mobile_without_country_code).toBe('9876543210');
    expect(result.company).toBe('Acme Corp');
    expect(result.city).toBe('New York');
    expect(result.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
    expect(result.data_source).toBe('eden_park');
    expect(result.is_skipped).toBe(false);
  });

  it('should restrict and map crm_status and data_source values correctly', () => {
    const rawRow = {
      'Email': 'bob@example.com',
      'Phone': '9876543211',
      'status': 'Deal Closed', // should map to SALE_DONE
      'source': 'meridian tower', // should map to meridian_tower
    };

    const result = mapRecordHeuristically(rawRow);

    expect(result.crm_status).toBe('SALE_DONE');
    expect(result.data_source).toBe('meridian_tower');
    expect(result.is_skipped).toBe(false);
  });

  it('should handle multiple emails and phone numbers correctly', () => {
    const rawRow = {
      'Name': 'Charlie Brown',
      'Email': 'charlie@example.com, charlie2@example.com',
      'Phone': '+91-9876543212; +91-9876543213',
    };

    const result = mapRecordHeuristically(rawRow);

    expect(result.email).toBe('charlie@example.com');
    expect(result.country_code).toBe('+91');
    expect(result.mobile_without_country_code).toBe('9876543212');
    expect(result.crm_note).toContain('Extra emails: charlie2@example.com');
    expect(result.crm_note).toContain('Extra phones: +91-9876543213');
  });

  it('should skip record if both email and mobile are missing', () => {
    const rawRow = {
      'Name': 'No Contact Info',
      'City': 'Mumbai',
    };

    const result = mapRecordHeuristically(rawRow);

    expect(result.is_skipped).toBe(true);
    expect(result.skip_reason).toContain('neither email nor mobile');
  });
});
