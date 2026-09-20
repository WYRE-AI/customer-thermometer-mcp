import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleListTool } from '../tools/lists.js';
import { runWithCredentials } from '../client.js';
import { textOf, textResponse } from './test-helpers.js';

describe('handleListTool', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('customerthermometer_get_thermometers dispatches getMethod=getThermometers and parses the XML response', async () => {
    const creds = { apiKey: 'key-thermo-1' };
    fetchMock.mockResolvedValueOnce(
      textResponse(
        '<Thermometers><Thermometer><ID>1</ID><Name>Support Survey</Name></Thermometer></Thermometers>'
      )
    );

    const result = await runWithCredentials(creds, () => handleListTool('customerthermometer_get_thermometers', {}));

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain('Support Survey');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api.php');
    expect(url.searchParams.get('getMethod')).toBe('getThermometers');
    expect(url.searchParams.get('apiKey')).toBe('key-thermo-1');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('customerthermometer_get_recipient_lists dispatches getMethod=getRecipientLists and parses the XML response', async () => {
    const creds = { apiKey: 'key-lists-1' };
    fetchMock.mockResolvedValueOnce(
      textResponse('<Lists><List><ID>10</ID><Name>Newsletter</Name></List></Lists>')
    );

    const result = await runWithCredentials(creds, () =>
      handleListTool('customerthermometer_get_recipient_lists', {})
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain('Newsletter');

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('getMethod')).toBe('getRecipientLists');
    expect(url.searchParams.get('apiKey')).toBe('key-lists-1');
  });

  it('returns an error when no credentials are configured', async () => {
    const result = await handleListTool('customerthermometer_get_thermometers', {});
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
