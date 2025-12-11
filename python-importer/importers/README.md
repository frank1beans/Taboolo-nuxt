# Importers (stateless)

Stateless parsers for SIX, LX, and MX formats with **no DB or external service dependencies**. Each module returns JSON-friendly objects ready to be persisted via Nitro/Mongo.

- `services/six_import_service.py` remains the full SIX/XML parser.
- `importers/lx/parser.py` and `importers/mx/parser.py` handle LX/MX Excel returns.
- `importers/excel`, `importers/parser_utils.py`, and `importers/common.py` provide shared helpers (column cleanup, amount calculation, WBS normalization).
- `importers/six/parser.py` hosts the stateless SIX/XML parser classes (consumed by the service wrapper).
- `importers/registry.py` exposes `parse_estimate_from_bytes(format_hint, ...)` to dispatch to the right parser (six, lx, mx, excel) and normalize the result.
- `importers/normalize.py` converts parser-specific types into `NormalizedEstimate`/`NormalizedItem` defined in `importers/types.py`.

Use these parsers as a library: read the file, call the appropriate parser, then store the result in your datastore (Mongo via Nitro). SQL logic and side effects have been removed from this layer.
