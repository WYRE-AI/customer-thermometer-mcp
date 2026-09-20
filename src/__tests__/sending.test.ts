import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSendingTool } from '../tools/sending.js';
import { runWithCredentials } from '../client.js';
import { textOf, textResponse } from './test-helpers.js';

describe('handleSendingTool', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('customerthermometer_send_email GETs with thermometerID/listID/emailAddress and parses the integer response', async () => {
    const creds = { apiKey: 'key-send-1' };
    fetchMock.mockResolvedValueOnce(textResponse('1'));

    const result = await runWithCredentials(creds, () =>
      handleSendingTool('customerthermometer_send_email', {
        thermometerID: '5',
        listID: '10',
        emailAddress: 'a@example.com',
      })
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('1');

    const [urlArg, init] = fetchMock.mock.calls[0];
    const url = new URL(urlArg as string);
    expect(url.searchParams.get('getMethod')).toBe('sendEmail');
    expect(url.searchParams.get('thermometerID')).toBe('5');
    expect(url.searchParams.get('listID')).toBe('10');
    expect(url.searchParams.get('emailAddress')).toBe('a@example.com');
    expect(init.method).toBe('GET');
  });

  it('customerthermometer_send_email requires thermometerID, listID, and emailAddress', async () => {
    const creds = { apiKey: 'key-send-2' };
    const result = await runWithCredentials(creds, () =>
      handleSendingTool('customerthermometer_send_email', { emailAddress: 'a@example.com' })
    );
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('customerthermometer_get_credits parses the integer response', async () => {
    const creds = { apiKey: 'key-quota-1' };
    fetchMock.mockResolvedValueOnce(textResponse('357'));

    const result = await runWithCredentials(creds, () => handleSendingTool('customerthermometer_get_credits', {}));

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('357');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getSendQuota');
  });

  it('surfaces a non-numeric response body (e.g. an error message) as a tool error instead of silently coercing it', async () => {
    const creds = { apiKey: 'key-quota-2' };
    fetchMock.mockResolvedValueOnce(textResponse('Invalid API Key'));

    const result = await runWithCredentials(creds, () => handleSendingTool('customerthermometer_get_credits', {}));

    expect(result.isError).toBe(true);
  });
});
