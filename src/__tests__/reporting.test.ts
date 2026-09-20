import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleReportingTool } from '../tools/reporting.js';
import { runWithCredentials } from '../client.js';
import { textOf, textResponse } from './test-helpers.js';

describe('handleReportingTool', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('customerthermometer_get_nps_value parses a negative integer and forwards date-range filters', async () => {
    const creds = { apiKey: 'key-nps-1' };
    fetchMock.mockResolvedValueOnce(textResponse('-12'));

    const result = await runWithCredentials(creds, () =>
      handleReportingTool('customerthermometer_get_nps_value', { fromDate: '2026-01-01', toDate: '2026-01-31' })
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('-12');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getNPSValue');
    expect(url.searchParams.get('fromDate')).toBe('2026-01-01');
    expect(url.searchParams.get('toDate')).toBe('2026-01-31');
  });

  it('customerthermometer_get_happiness_value parses the integer percentage response', async () => {
    const creds = { apiKey: 'key-happy-1' };
    fetchMock.mockResolvedValueOnce(textResponse('87'));

    const result = await runWithCredentials(creds, () =>
      handleReportingTool('customerthermometer_get_happiness_value', { limit: 50 })
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('87');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getHappinessValue');
    expect(url.searchParams.get('limit')).toBe('50');
  });

  it('customerthermometer_get_blast_results parses the XML response and forwards temperatureID', async () => {
    const creds = { apiKey: 'key-blast-1' };
    fetchMock.mockResolvedValueOnce(
      textResponse('<Responses><Response><TemperatureID>1</TemperatureID></Response></Responses>')
    );

    const result = await runWithCredentials(creds, () =>
      handleReportingTool('customerthermometer_get_blast_results', { temperatureID: 1, blastID: '99' })
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain('TemperatureID');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getBlastResults');
    expect(url.searchParams.get('temperatureID')).toBe('1');
    expect(url.searchParams.get('blastID')).toBe('99');
  });

  it('customerthermometer_get_comments parses the XML response', async () => {
    const creds = { apiKey: 'key-comments-1' };
    fetchMock.mockResolvedValueOnce(
      textResponse('<Comments><Comment><Text>Great support!</Text></Comment></Comments>')
    );

    const result = await runWithCredentials(creds, () => handleReportingTool('customerthermometer_get_comments', {}));

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain('Great support!');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getComments');
  });
});
