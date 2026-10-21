# Customer Thermometer MCP Server

MCP server for [Customer Thermometer](https://www.customerthermometer.com/)'s customer feedback / NPS survey API - thermometers, recipient lists, sending, and reporting, for AI assistants and the WYRE Conduit gateway.

## Authentication

Customer Thermometer authenticates with a single static API key, generated from your account's Integration settings. Either a "Super API key" (full account access) or a narrower "sub-API key" works with this connector.

## Configuration

Copy [`.env.example`](.env.example) and set the variables below.

| Env var | Description |
|---|---|
| `CUSTOMERTHERMOMETER_API_KEY` | API key issued by Customer Thermometer. Used by stdio and by HTTP when `AUTH_MODE=env`. |
| `MCP_TRANSPORT` | `stdio` (default) or `http`. |
| `AUTH_MODE` | `env` (default, reads the var above) or `gateway` (the API key arrives per request on `X-CustomerThermometer-Api-Key` and never falls back to the environment). The Docker image and Compose file default to `gateway`. |
| `CONDUIT_S2S_SECRET` | Required for HTTP. HMAC key checked against `X-Gateway-S2S` on `/mcp`. Generate with `openssl rand -hex 32`. If this is empty or a known placeholder (`changeme`, `your-s2s-secret`, `replace-with-a-real-secret`, and the other public examples), the HTTP server logs an error and exits non-zero. Compose will not start when it is unset. Never commit a real value. The value is never logged. |
| `MCP_ALLOW_INSECURE_DEV` | Set to exactly `1` only for local development to start HTTP without `CONDUIT_S2S_SECRET`. Logs a warning, does not enforce `X-Gateway-S2S`, and binds `127.0.0.1` only. A non-loopback `MCP_HTTP_HOST` is ignored in that mode. A known placeholder secret still refuses to start. |
| `MCP_HTTP_HOST` | Bind address when `MCP_TRANSPORT=http`. Defaults to `127.0.0.1`. Honored when `CONDUIT_S2S_SECRET` is set. The container image sets `0.0.0.0`. Without a secret, the listener is `127.0.0.1` only. |
| `MCP_HTTP_PORT` | HTTP port. Defaults to `8080`. |
| `LOG_LEVEL` | `debug` \| `info` (default) \| `warn` \| `error`. |

`/health` stays unauthenticated and does not read credentials. The stdio transport does not use `CONDUIT_S2S_SECRET`.

### HTTP authentication

With `MCP_TRANSPORT=http` and `CONDUIT_S2S_SECRET` set, every `/mcp` request must include `X-Gateway-S2S`. The header value is `t=<unix seconds>,v1=<hex>`. `<hex>` is HMAC-SHA256 of the literal string `t=<unix seconds>` (the same `t=` prefix and timestamp), keyed with `CONDUIT_S2S_SECRET`, encoded as 64 lowercase hex characters. The timestamp must be within 300 seconds of the server clock. A missing or invalid header is HTTP 401, before vendor credentials are read.

In `AUTH_MODE=gateway`, `/mcp` also requires `X-CustomerThermometer-Api-Key`. That header is the only credential source for the request. A request missing it returns 401 and does not fall back to `CUSTOMERTHERMOMETER_API_KEY`.

### Request limits

- HTTP request bodies are capped at 256 KiB (262144 bytes). After the `X-Gateway-S2S` check passes, a `Content-Length` above the cap returns 413 with a JSON-RPC error; bodies without `Content-Length` are capped by the MCP SDK transport. Unauthenticated requests still get 401 first.
- `tools/call` arguments are capped at 10,000 elements (every array item and object key at any depth). Larger inputs return an `isError` tool result and are never dispatched.

These limits address CVE-2026-111768 / GHSA-46jr-4wx8-v453 (memory exhaustion during validation) and GHSA-f897-62hf-6gxq (no request body / batch cap).

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

The image listens on `0.0.0.0` inside the container (`MCP_HTTP_HOST`) and defaults to `AUTH_MODE=gateway`. Publish the port on loopback and pass the S2S secret. In gateway mode the API key arrives on each request as `X-CustomerThermometer-Api-Key`; it is not read from the environment. Every `/mcp` request must also include a valid `X-Gateway-S2S` signature (see [HTTP authentication](#http-authentication)).

```bash
docker build -t customer-thermometer-mcp .
docker run \
  -e CONDUIT_S2S_SECRET="$CONDUIT_S2S_SECRET" \
  -p 127.0.0.1:8080:8080 \
  customer-thermometer-mcp
```

Compose refuses to start when `CONDUIT_S2S_SECRET` is unset, defaults `AUTH_MODE` to `gateway`, publishes `127.0.0.1:8080:8080`, and does not set `CUSTOMERTHERMOMETER_API_KEY`:

```bash
CONDUIT_S2S_SECRET="$CONDUIT_S2S_SECRET" docker compose up
```

Single-tenant HTTP (`AUTH_MODE=env`) still requires the S2S secret, then uses `CUSTOMERTHERMOMETER_API_KEY`:

```bash
docker run \
  -e CONDUIT_S2S_SECRET="$CONDUIT_S2S_SECRET" \
  -e AUTH_MODE=env \
  -e CUSTOMERTHERMOMETER_API_KEY="$CUSTOMERTHERMOMETER_API_KEY" \
  -p 127.0.0.1:8080:8080 \
  customer-thermometer-mcp
```

HTTP refuses to start until `CONDUIT_S2S_SECRET` is a real secret. Local HTTP without a secret is development-only: it binds `127.0.0.1` only and logs a warning.

```bash
CONDUIT_S2S_SECRET="$CONDUIT_S2S_SECRET" npm run start:http

MCP_ALLOW_INSECURE_DEV=1 npm run start:http
```
