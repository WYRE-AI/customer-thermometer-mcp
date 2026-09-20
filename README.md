# Customer Thermometer MCP Server

MCP server for [Customer Thermometer](https://www.customerthermometer.com/)'s customer feedback / NPS survey API - thermometers, recipient lists, sending, and reporting, for AI assistants and the WYRE Conduit gateway.

## Authentication

Customer Thermometer authenticates with a single static API key, generated from your account's Integration settings. Either a "Super API key" (full account access) or a narrower "sub-API key" works with this connector.

## Configuration

| Env var | Description |
|---|---|
| `CUSTOMERTHERMOMETER_API_KEY` | API key issued by Customer Thermometer. |
| `MCP_TRANSPORT` | `stdio` (default) or `http`. |
| `AUTH_MODE` | `env` (default, reads the var above) or `gateway` (credential arrives per-request via the `X-CustomerThermometer-Api-Key` header, injected by the Conduit gateway). |
| `CONDUIT_S2S_SECRET` | When set, the HTTP transport requires a valid `X-Gateway-S2S` header (Conduit sidecar auth) on every `/mcp` request. |
| `LOG_LEVEL` | `debug` \| `info` (default) \| `warn` \| `error`. |

## Tools

### Lists
- `customerthermometer_get_thermometers` - list all survey templates (Thermometers) on the account.
- `customerthermometer_get_recipient_lists` - list all recipient lists on the account.

### Recipients
- `customerthermometer_add_recipient_to_list` - add a recipient to a list.
- `customerthermometer_unsubscribe_recipient` - add an email address to the account's unsubscribe list.

### Sending
- `customerthermometer_send_email` - send a single Email Thermometer survey to one recipient.
- `customerthermometer_get_credits` - remaining Thermometer send credits on the account.

### Reporting
- `customerthermometer_get_nps_value` - Net Promoter Score, optionally filtered by blast/date range.
- `customerthermometer_get_happiness_value` - Happiness Factor percentage, optionally filtered by blast/date range.
- `customerthermometer_get_blast_results` - raw survey responses, optionally filtered by temperature/blast/date range.
- `customerthermometer_get_comments` - free-text comments left with responses, optionally filtered by temperature/blast/date range.

The read endpoints that return XML (`getThermometers`, `getRecipientLists`, `getBlastResults`, `getComments`) are parsed generically rather than mapped to a hand-written schema - the vendor's API documentation does not publish the element names for these responses, so the parsed structure is passed straight through instead of risking a schema that doesn't match the live response.

## Scope

This is a v1 surface covering the core survey workflow: listing thermometers/lists, adding and unsubscribing recipients, sending surveys, and reading NPS/happiness/response/comment reports. Explicitly out of scope for now: `logResponse` and `deleteResponse` - destructive, lower-value endpoints that mutate or discard existing response data. They can be added as a follow-up if there's demand.

## Development

```bash
npm install
npm run build
npm test
npm run lint   # tsc --noEmit
```

## Docker

```bash
docker build -t customer-thermometer-mcp .
docker run -p 8080:8080 -e CUSTOMERTHERMOMETER_API_KEY=... customer-thermometer-mcp
```
