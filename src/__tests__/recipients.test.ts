import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleRecipientTool } from '../tools/recipients.js';
import { runWithCredentials } from '../client.js';
import { textOf, textResponse } from './test-helpers.js';

describe('handleRecipientTool', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('customerthermometer_add_recipient_to_list POSTs getMethod/apiKey in the query string and the recipient fields in the form body', async () => {
    const creds = { apiKey: 'key-add-1' };
    fetchMock.mockResolvedValueOnce(textResponse('recipient@example.com'));

    const result = await runWithCredentials(creds, () =>
      handleRecipientTool('customerthermometer_add_recipient_to_list', {
        emailAddress: 'recipient@example.com',
        listId: '42',
        firstName: 'Ada',
      })
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('recipient@example.com');

    const [urlArg, init] = fetchMock.mock.calls[0];
    const url = new URL(urlArg as string);
    expect(url.searchParams.get('getMethod')).toBe('addRecipientToList');
    expect(url.searchParams.get('apiKey')).toBe('key-add-1');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const body = new URLSearchParams(init.body as string);
    expect(body.get('emailAddress')).toBe('recipient@example.com');
    expect(body.get('listId')).toBe('42');
    expect(body.get('firstName')).toBe('Ada');
  });

  it('customerthermometer_add_recipient_to_list requires emailAddress and listId', async () => {
    const creds = { apiKey: 'key-add-2' };
    const result = await runWithCredentials(creds, () =>
      handleRecipientTool('customerthermometer_add_recipient_to_list', { emailAddress: 'x@example.com' })
    );
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('customerthermometer_unsubscribe_recipient POSTs emailAddress and optional notify in the form body', async () => {
    const creds = { apiKey: 'key-unsub-1' };
    fetchMock.mockResolvedValueOnce(textResponse('OK'));

    const result = await runWithCredentials(creds, () =>
      handleRecipientTool('customerthermometer_unsubscribe_recipient', {
        emailAddress: 'gone@example.com',
        notify: true,
      })
    );

    expect(result.isError).toBeUndefined();

    const [urlArg, init] = fetchMock.mock.calls[0];
    const url = new URL(urlArg as string);
    expect(url.searchParams.get('getMethod')).toBe('unsubscribeRecipient');

    const body = new URLSearchParams(init.body as string);
    expect(body.get('emailAddress')).toBe('gone@example.com');
    expect(body.get('notify')).toBe('true');
  });
});
