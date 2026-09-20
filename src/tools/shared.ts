import type { CustomerThermometerCredentials } from '../types.js';
import type { CallToolResult } from './types.js';

export function textResult(value: unknown): CallToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/** Returns an error CallToolResult if credentials are missing, else null. */
export function requireCredentials(creds: CustomerThermometerCredentials | null): CallToolResult | null {
  if (!creds) {
    return errorResult('No Customer Thermometer credentials configured. Set CUSTOMERTHERMOMETER_API_KEY.');
  }
  return null;
}
