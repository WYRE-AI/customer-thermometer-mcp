# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **The HTTP transport no longer exits on a malformed request (WYREAI-741).** The request
  target was parsed against the client-supplied `Host` header, and a value that does not parse
  (or a target such as `//`) threw inside the request listener before authentication. The
  target is now parsed against a fixed base, so `Host` is no longer consulted, and a target
  that still cannot be parsed gets a `400` JSON response while the server keeps running.

### Added
- Initial release: MCP server for Customer Thermometer's customer feedback / NPS survey API.
- List tools: `customerthermometer_get_thermometers`, `customerthermometer_get_recipient_lists`.
- Recipient tools: `customerthermometer_add_recipient_to_list`, `customerthermometer_unsubscribe_recipient`.
- Sending tools: `customerthermometer_send_email`, `customerthermometer_get_credits`.
- Reporting tools: `customerthermometer_get_nps_value`, `customerthermometer_get_happiness_value`, `customerthermometer_get_blast_results`, `customerthermometer_get_comments`.
