import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getSendQuota, sendEmail } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

export const SENDING_TOOLS: Tool[] = [
  {
    name: 'customerthermometer_send_email',
    description: 'Send a single Email Thermometer survey to one recipient.',
    inputSchema: {
      type: 'object',
      properties: {
        thermometerID: { type: 'string', description: 'ID of the Thermometer (survey template) to send.' },
        listID: { type: 'string', description: 'ID of the recipient list the recipient belongs to.' },
        emailAddress: { type: 'string', description: 'Recipient email address.' },
        blastID: { type: 'string', description: 'Optional blast ID to group this send under.' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        companyName: { type: 'string' },
      },
      required: ['thermometerID', 'listID', 'emailAddress'],
    },
  },
  {
    name: 'customerthermometer_get_credits',
    description: 'Get the number of remaining Thermometer send credits on the account.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export async function handleSendingTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'customerthermometer_send_email') {
      const thermometerID = args.thermometerID as string | number;
      const listID = args.listID as string | number;
      const emailAddress = args.emailAddress as string;
      if (!thermometerID || !listID || !emailAddress) {
        return errorResult('thermometerID, listID, and emailAddress are required.');
      }
      const result = await sendEmail(creds!, {
        thermometerID,
        listID,
        emailAddress,
        blastID: args.blastID as string | number | undefined,
        firstName: args.firstName as string | undefined,
        lastName: args.lastName as string | undefined,
        companyName: args.companyName as string | undefined,
      });
      return textResult(result);
    }

    if (name === 'customerthermometer_get_credits') {
      return textResult(await getSendQuota(creds!));
    }

    return errorResult(`Unknown sending tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
