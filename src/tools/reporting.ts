import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getBlastResults, getComments, getCredentials, getHappinessValue, getNPSValue } from '../client.js';
import type { ResultsFilter } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

const DATE_RANGE_PROPERTIES = {
  limit: { type: 'number', description: 'Maximum number of results to return.' },
  blastID: { type: 'string', description: 'Restrict to a single blast/send.' },
  fromDate: { type: 'string', description: 'Start date, e.g. 2026-01-01.' },
  toDate: { type: 'string', description: 'End date, e.g. 2026-01-31.' },
} as const;

export const REPORTING_TOOLS: Tool[] = [
  {
    name: 'customerthermometer_get_nps_value',
    description: 'Get the Net Promoter Score (positive or negative integer) for the account or a filtered set of responses.',
    inputSchema: { type: 'object', properties: { ...DATE_RANGE_PROPERTIES } },
  },
  {
    name: 'customerthermometer_get_happiness_value',
    description: 'Get the Happiness Factor (as a percentage) for the account or a filtered set of responses.',
    inputSchema: { type: 'object', properties: { ...DATE_RANGE_PROPERTIES } },
  },
  {
    name: 'customerthermometer_get_blast_results',
    description: 'Get raw survey responses received, optionally filtered by temperature (1=gold,2=green,3=yellow,4=red), blast, or date range.',
    inputSchema: {
      type: 'object',
      properties: {
        temperatureID: { type: 'number', description: '1=gold, 2=green, 3=yellow, 4=red.' },
        ...DATE_RANGE_PROPERTIES,
      },
    },
  },
  {
    name: 'customerthermometer_get_comments',
    description: 'Get free-text comments left with survey responses, optionally filtered by temperature, blast, or date range.',
    inputSchema: {
      type: 'object',
      properties: {
        temperatureID: { type: 'number', description: '1=gold, 2=green, 3=yellow, 4=red.' },
        ...DATE_RANGE_PROPERTIES,
      },
    },
  },
];

function filterFromArgs(args: Record<string, unknown>): ResultsFilter {
  return {
    limit: args.limit as number | undefined,
    blastID: args.blastID as string | number | undefined,
    fromDate: args.fromDate as string | undefined,
    toDate: args.toDate as string | undefined,
    temperatureID: args.temperatureID as 1 | 2 | 3 | 4 | undefined,
  };
}

export async function handleReportingTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'customerthermometer_get_nps_value') {
      return textResult(await getNPSValue(creds!, filterFromArgs(args)));
    }

    if (name === 'customerthermometer_get_happiness_value') {
      return textResult(await getHappinessValue(creds!, filterFromArgs(args)));
    }

    if (name === 'customerthermometer_get_blast_results') {
      return textResult(await getBlastResults(creds!, filterFromArgs(args)));
    }

    if (name === 'customerthermometer_get_comments') {
      return textResult(await getComments(creds!, filterFromArgs(args)));
    }

    return errorResult(`Unknown reporting tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
