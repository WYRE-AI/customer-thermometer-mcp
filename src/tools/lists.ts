import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getRecipientLists, getThermometers } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

export const LIST_TOOLS: Tool[] = [
  {
    name: 'customerthermometer_get_thermometers',
    description: 'List all Customer Thermometer survey templates (Thermometer names and IDs) on the account.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'customerthermometer_get_recipient_lists',
    description: 'List all recipient lists (names and IDs) on the Customer Thermometer account.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export async function handleListTool(name: string, _args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'customerthermometer_get_thermometers') {
      return textResult(await getThermometers(creds!));
    }

    if (name === 'customerthermometer_get_recipient_lists') {
      return textResult(await getRecipientLists(creds!));
    }

    return errorResult(`Unknown list tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
