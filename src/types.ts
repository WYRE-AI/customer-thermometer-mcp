/**
 * Customer Thermometer authenticates every request with a single static API
 * key issued from the account's Integration settings — either a "Super API
 * key" (full account access) or a narrower "sub-API key" scoped to specific
 * thermometers/lists. This connector uses the query-string `apiKey` form
 * (the documented default for both key types), not the alternate
 * `Authorization: Bearer` header some sub-API keys also accept.
 */
export interface CustomerThermometerCredentials {
  apiKey: string;
}

/**
 * Customer Thermometer's single flat endpoint (`api.php`) dispatches on a
 * `getMethod` query parameter rather than a REST resource tree. Every method
 * below is documented at
 * https://www.customerthermometer.com/integration/api-documentation/.
 */
export type GetMethod =
  | 'getThermometers'
  | 'getRecipientLists'
  | 'addRecipientToList'
  | 'sendEmail'
  | 'getSendQuota'
  | 'getNPSValue'
  | 'getHappinessValue'
  | 'getBlastResults'
  | 'getComments'
  | 'unsubscribeRecipient';

/**
 * The vendor's own API documentation does not publish an XML schema (element
 * names, nesting) for `getThermometers` / `getRecipientLists` /
 * `getBlastResults` / `getComments` — it only says each "returns an XML
 * document containing/showing ...". Rather than fabricate tag names that
 * might not match the live response, these tools parse the XML generically
 * (fast-xml-parser) and pass the resulting object straight through, the same
 * "don't invent an undocumented shape" convention dicker-data-mcp uses for
 * its own untyped vendor responses.
 */
export type UntypedXmlResponse = Record<string, unknown>;
