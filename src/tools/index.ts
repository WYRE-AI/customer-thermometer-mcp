import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LIST_TOOLS, handleListTool } from './lists.js';
import { RECIPIENT_TOOLS, handleRecipientTool } from './recipients.js';
import { SENDING_TOOLS, handleSendingTool } from './sending.js';
import { REPORTING_TOOLS, handleReportingTool } from './reporting.js';
import type { CallToolResult } from './types.js';

export const ALL_TOOLS: Tool[] = [...LIST_TOOLS, ...RECIPIENT_TOOLS, ...SENDING_TOOLS, ...REPORTING_TOOLS];

const LIST_NAMES = new Set(LIST_TOOLS.map((t) => t.name));
const RECIPIENT_NAMES = new Set(RECIPIENT_TOOLS.map((t) => t.name));
const SENDING_NAMES = new Set(SENDING_TOOLS.map((t) => t.name));
const REPORTING_NAMES = new Set(REPORTING_TOOLS.map((t) => t.name));

export async function dispatchToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  if (LIST_NAMES.has(name)) return handleListTool(name, args);
  if (RECIPIENT_NAMES.has(name)) return handleRecipientTool(name, args);
  if (SENDING_NAMES.has(name)) return handleSendingTool(name, args);
  if (REPORTING_NAMES.has(name)) return handleReportingTool(name, args);
  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
}
