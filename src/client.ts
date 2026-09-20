import { AsyncLocalStorage } from 'node:async_hooks';
import { XMLParser } from 'fast-xml-parser';
import { logger } from './utils/logger.js';
import type { CustomerThermometerCredentials, GetMethod, UntypedXmlResponse } from './types.js';

export const BASE_URL = 'https://app.customerthermometer.com/api.php';

// Request-scoped credential store. In gateway mode the HTTP layer runs each
// request inside runWithCredentials({apiKey}); getCredentials() reads from
// it. Falls back to process.env for stdio/single-tenant mode.
const credStore = new AsyncLocalStorage<CustomerThermometerCredentials>();

export function runWithCredentials<T>(creds: CustomerThermometerCredentials, fn: () => T): T {
  return credStore.run(creds, fn);
}

export function getCredentials(): CustomerThermometerCredentials | null {
  const scoped = credStore.getStore();
  if (scoped?.apiKey) return scoped;
  const apiKey = process.env.CUSTOMERTHERMOMETER_API_KEY;
  if (!apiKey) {
    logger.warn('Missing credentials', { hasApiKey: !!apiKey });
    return null;
  }
  return { apiKey };
}

/** Thrown for any non-2xx / unexpected vendor response. */
export class CustomerThermometerApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

/**
 * Parses an XML response body into a plain object. Customer Thermometer's
 * API docs don't publish the element schema for the XML-returning methods
 * (getThermometers / getRecipientLists / getBlastResults / getComments), so
 * this deliberately parses generically rather than asserting a shape the
 * live API might not match, and passes the result straight through to the
 * caller.
 *
 * The vendor returns plain-text error messages (e.g. an invalid API key) in
 * the same body slot as success data, same as the Integer endpoints below —
 * but fast-xml-parser does NOT throw on non-XML plain text, it silently
 * returns `{}` (verified: "Invalid API key" -> {}, "" -> {}, whitespace ->
 * {}). Any genuinely valid XML response, including an empty result set,
 * always yields at least one top-level key (verified: even a bare empty
 * root element like `<thermometers/>` parses to {thermometers: ""}). So a
 * zero-key parse result on non-empty input is a reliable signal that the
 * body was a plain-text error, not real (possibly empty) XML data — without
 * needing to know the vendor's exact error-message wording.
 */
function parseXml(text: string): UntypedXmlResponse {
  let parsed: UntypedXmlResponse;
  try {
    parsed = xmlParser.parse(text) as UntypedXmlResponse;
  } catch (err) {
    throw new CustomerThermometerApiError(`Failed to parse XML response: ${(err as Error).message}`);
  }
  if (Object.keys(parsed as Record<string, unknown>).length === 0 && text.trim().length > 0) {
    throw new CustomerThermometerApiError(`Expected an XML response, got: ${text.trim()}`);
  }
  return parsed;
}

/**
 * Customer Thermometer's "Integer" endpoints (getSendQuota, sendEmail,
 * getNPSValue, getHappinessValue) return a bare number as the plain-text
 * body on success. On failure the vendor returns a plain-text error message
 * in the same slot (e.g. an invalid API key), which is why this fails loudly
 * on a non-numeric body rather than silently coercing it to NaN.
 */
function parseInteger(text: string): number {
  const trimmed = text.trim();
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new CustomerThermometerApiError(`Expected a numeric response, got: ${trimmed}`);
  }
  return value;
}

function buildQuery(params: Record<string, unknown>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    qs.append(key, String(value));
  }
  return qs;
}

async function doGet(
  creds: CustomerThermometerCredentials,
  method: GetMethod,
  params: Record<string, unknown> = {}
): Promise<string> {
  const query = buildQuery({ getMethod: method, apiKey: creds.apiKey, ...params });
  const res = await fetch(`${BASE_URL}?${query.toString()}`, {
    method: 'GET',
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new CustomerThermometerApiError(`Customer Thermometer rejected the API key (HTTP ${res.status})`, res.status);
  }
  if (!res.ok) {
    throw new CustomerThermometerApiError(`Customer Thermometer ${method} failed: HTTP ${res.status}`, res.status);
  }
  return text;
}

/**
 * `getMethod`/`apiKey` are always sent as URL query parameters (per the
 * vendor's docs, even on POST requests); the method-specific fields go in a
 * form-encoded POST body.
 */
async function doPost(
  creds: CustomerThermometerCredentials,
  method: GetMethod,
  body: Record<string, unknown>
): Promise<string> {
  const query = buildQuery({ getMethod: method, apiKey: creds.apiKey });
  const form = buildQuery(body);
  const res = await fetch(`${BASE_URL}?${query.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new CustomerThermometerApiError(`Customer Thermometer rejected the API key (HTTP ${res.status})`, res.status);
  }
  if (!res.ok) {
    throw new CustomerThermometerApiError(`Customer Thermometer ${method} failed: HTTP ${res.status}`, res.status);
  }
  return text;
}

// ---------------------------------------------------------------------
// Thermometers & lists
// ---------------------------------------------------------------------

/** GET getMethod=getThermometers - list of survey template names/IDs (XML). */
export async function getThermometers(creds: CustomerThermometerCredentials): Promise<UntypedXmlResponse> {
  return parseXml(await doGet(creds, 'getThermometers'));
}

/** GET getMethod=getRecipientLists - list of recipient list names/IDs (XML). */
export async function getRecipientLists(creds: CustomerThermometerCredentials): Promise<UntypedXmlResponse> {
  return parseXml(await doGet(creds, 'getRecipientLists'));
}

// ---------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------

export interface AddRecipientToListInput {
  emailAddress: string;
  listId: string | number;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

/** POST getMethod=addRecipientToList - adds a recipient to a list. */
export async function addRecipientToList(
  creds: CustomerThermometerCredentials,
  input: AddRecipientToListInput
): Promise<string> {
  return doPost(creds, 'addRecipientToList', { ...input });
}

export interface UnsubscribeRecipientInput {
  emailAddress: string;
  notify?: boolean;
}

/** POST getMethod=unsubscribeRecipient - adds an email address to the account's unsubscribe list. */
export async function unsubscribeRecipient(
  creds: CustomerThermometerCredentials,
  input: UnsubscribeRecipientInput
): Promise<string> {
  return doPost(creds, 'unsubscribeRecipient', { ...input });
}

// ---------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------

export interface SendEmailInput {
  thermometerID: string | number;
  listID: string | number;
  emailAddress: string;
  blastID?: string | number;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

/** GET getMethod=sendEmail - sends a single Email Thermometer to a single recipient. */
export async function sendEmail(creds: CustomerThermometerCredentials, input: SendEmailInput): Promise<number> {
  return parseInteger(await doGet(creds, 'sendEmail', { ...input }));
}

/** GET getMethod=getSendQuota - remaining Thermometer send credits on the account. */
export async function getSendQuota(creds: CustomerThermometerCredentials): Promise<number> {
  return parseInteger(await doGet(creds, 'getSendQuota'));
}

// ---------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------

export interface DateRangeFilter {
  limit?: number;
  blastID?: string | number;
  fromDate?: string;
  toDate?: string;
}

/** GET getMethod=getNPSValue - Net Promoter Score over the given filter (can be negative). */
export async function getNPSValue(creds: CustomerThermometerCredentials, filter: DateRangeFilter = {}): Promise<number> {
  return parseInteger(await doGet(creds, 'getNPSValue', { ...filter }));
}

/** GET getMethod=getHappinessValue - Happiness Factor (%) over the given filter. */
export async function getHappinessValue(
  creds: CustomerThermometerCredentials,
  filter: DateRangeFilter = {}
): Promise<number> {
  return parseInteger(await doGet(creds, 'getHappinessValue', { ...filter }));
}

export interface ResultsFilter extends DateRangeFilter {
  /** 1=gold, 2=green, 3=yellow, 4=red. */
  temperatureID?: 1 | 2 | 3 | 4;
}

/** GET getMethod=getBlastResults - raw survey responses for the account/blast (XML). */
export async function getBlastResults(
  creds: CustomerThermometerCredentials,
  filter: ResultsFilter = {}
): Promise<UntypedXmlResponse> {
  return parseXml(await doGet(creds, 'getBlastResults', { ...filter }));
}

/** GET getMethod=getComments - free-text comments left with responses (XML). */
export async function getComments(
  creds: CustomerThermometerCredentials,
  filter: ResultsFilter = {}
): Promise<UntypedXmlResponse> {
  return parseXml(await doGet(creds, 'getComments', { ...filter }));
}
