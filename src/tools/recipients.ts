import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { addRecipientToList, getCredentials, unsubscribeRecipient } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

export const RECIPIENT_TOOLS: Tool[] = [
  {
    name: 'customerthermometer_add_recipient_to_list',
    description: 'Add a recipient to a Customer Thermometer recipient list.',
    inputSchema: {
      type: 'object',
      properties: {
        emailAddress: { type: 'string', description: 'Recipient email address.' },
        listId: { type: 'string', description: 'ID of the recipient list to add to.' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        companyName: { type: 'string' },
      },
      required: ['emailAddress', 'listId'],
    },
  },
  {
    name: 'customerthermometer_unsubscribe_recipient',
    description: "Add an email address to the account's Customer Thermometer unsubscribe list.",
    inputSchema: {
      type: 'object',
      properties: {
        emailAddress: { type: 'string', description: 'Email address to unsubscribe.' },
        notify: { type: 'boolean', description: 'Whether to notify the account of the unsubscribe.' },
      },
      required: ['emailAddress'],
    },
  },
];

export async function handleRecipientTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'customerthermometer_add_recipient_to_list') {
      const emailAddress = args.emailAddress as string;
      const listId = args.listId as string | number;
      if (!emailAddress || !listId) return errorResult('emailAddress and listId are required.');
      const result = await addRecipientToList(creds!, {
        emailAddress,
        listId,
        firstName: args.firstName as string | undefined,
        lastName: args.lastName as string | undefined,
        companyName: args.companyName as string | undefined,
      });
      return textResult(result);
    }

    if (name === 'customerthermometer_unsubscribe_recipient') {
      const emailAddress = args.emailAddress as string;
      if (!emailAddress) return errorResult('emailAddress is required.');
      const result = await unsubscribeRecipient(creds!, {
        emailAddress,
        notify: args.notify as boolean | undefined,
      });
      return textResult(result);
    }

    return errorResult(`Unknown recipient tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
