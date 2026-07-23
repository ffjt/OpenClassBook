# OpenClassBook API Security Audit / API 安全审计

Date: 2026-07-23
Scope: FastAPI backend API, SQLite persistence, upload storage, export pipeline, and
the frontend API clients that carry credentials.

## Executive summary / 执行摘要

The initial API trusted numeric resource IDs. An unauthenticated caller could list
books and then read, modify, delete, upload to, or export another book by changing
an ID in the URL. Author IDs were also sufficient to take over another author's
submissions. These are production-blocking flaws. They have been corrected in this
change set and are covered by regression tests.

No plaintext password storage, SQL string interpolation of request data, or shell
command execution from API input was found. Passwords use pwdlib's recommended
Argon2 configuration, ORM queries are parameterized, and uploaded files are stored
outside application code directories.

## Findings / 漏洞清单

| Severity / 严重性 | Finding / 问题 | Affected files / 受影响文件 | Status / 状态 |
| --- | --- | --- | --- |
| Critical | API-wide missing authentication and book-owner authorization allowed IDOR across books, authors, articles, uploads, templates, and exports. | `app/api/v1/*.py`, `app/repositories/book.py`, `app/models/book.py` | Fixed |
| Critical | Author identity was recoverable by name and numeric author ID; an attacker with an invitation could read or edit another author's work. | `app/api/v1/authors.py`, `articles.py`, `join.py`, `app/services/auth.py` | Fixed |
| High | Logout revoked only the refresh token; a stolen access token remained usable until expiry. Refresh rotation also had a replay race. | `app/services/auth.py`, `app/repositories/auth.py`, `app/models/user.py` | Fixed |
| High | Six-digit email codes had unlimited verification attempts. | `app/services/verification.py`, `app/repositories/auth.py`, `app/models/user.py` | Fixed |
| High | Sensitive endpoints lacked login, registration, invitation, and upload throttling. | `app/api/v1/auth.py`, `join.py`, `books.py`, `app/core/rate_limit.py` | Mitigated in-process; production edge limit still required |
| High | Crafted DOCX archives and oversized decompressed images could exhaust CPU, memory, or disk during validation/rendering. | `app/storage/local.py` | Fixed |
| High | Production could start with a rotating implicit JWT secret, debug enabled, or development LAN CORS pattern. | `app/core/config.py`, `app/main.py`, `.env.example` | Fixed |
| Medium | Invitation codes have no persisted expiry, maximum-use counter, or per-code revocation history beyond regeneration. | `app/models/book.py`, `app/services/book.py`, `app/services/join.py` | Open |
| Medium | Owner refresh/access tokens are held in `localStorage`; any future stored XSS could exfiltrate them. | `frontend/src/repositories/authRepository.ts` | Open |
| Medium | There is no role model for admin/editor delegation. The implemented model is owner-only plus self-scoped authors. | `app/models/user.py`, `app/models/book.py` | Open / product decision |
| Medium | Security events are application logs only; no durable audit trail, alerting, or shared rate-limit store exists. | `app/core/rate_limit.py`, `app/api/v1/auth.py`, `app/api/dependencies.py` | Partially mitigated |
| Low | Article text is safely escaped in the React/PDF paths reviewed, but the raw API value is intentionally retained; a future HTML renderer must sanitize with an allowlist. | `app/schemas/article.py`, `app/services/pdf_renderer.py` | Documented guardrail |
| Low | API security headers (HSTS, CSP, `X-Content-Type-Options`, frame policy) are not set by this application. | Deployment/reverse proxy | Open |

## Implemented remediations / 已实施修复

### Ownership and authorization / 所有权与授权

- Books now have an `owner_id` foreign key. New books are bound to the authenticated
  account; lists are filtered by owner; cross-owner resources return `404` to avoid
  existence disclosure.
- Existing SQLite books are migrated only when ownership can be established without
  guessing: a unique username match, or the only account. Ambiguous legacy books
  remain unassigned and inaccessible until an explicit data migration assigns them.
- Every management, upload, file, template, export, review, layout, and deletion
  endpoint requires the correct book owner.
- Invitation-created authors receive an expiring signed author token. It carries a
  random author UUID binding and can access only that author and that author's
  articles/template. Name-based author selection no longer grants access.

### Sessions and authentication / 会话与认证

- Password hashing remains Argon2 through `PasswordHash.recommended()`; plaintext
  passwords are neither persisted nor logged.
- Access and refresh tokens share a server-side session ID. The access-token check
  requires an active refresh-session record, so logout invalidates both immediately.
- Refresh-token use performs a conditional revoke, preventing a concurrent replay
  from receiving a second session.
- Verification codes lock after five bad attempts and continue to use HMAC hashes
  and constant-time comparison.

### Input, uploads, and deployment / 输入、上传与部署

- Article bodies now have a 100,000-character ceiling and embedded article images
  are restricted to PNG/JPEG/WebP base64 data URLs.
- Upload validation rejects image pixel bombs and DOCX archives with excessive entry
  counts, decompressed size, or compression ratio. File paths remain generated below
  the storage root and are resolved with traversal checks.
- Development CORS remains convenient locally, but production startup now requires
  an explicit strong JWT secret, non-local allowlisted origins, `DEBUG=false`, and
  disables interactive API documentation.
- Login failures, denied access tokens, denied book access, and rate-limit events
  emit security event logs without passwords, tokens, or request bodies.

## Required production deployment controls / 上线前必须配置

1. Set `APP_ENVIRONMENT=production`, a unique `AUTH_JWT_SECRET` of at least 32
   random characters, `DEBUG=false`, and exact HTTPS `CORS_ORIGINS` in the deployed
   secret store. Do not put the secret in source control.
2. Apply shared gateway/WAF limits at minimum: login 10 per IP/15 min, verification
   5 per IP/15 min, registration 20 per IP/15 min, invitation join 10 per IP/15 min,
   upload 20 per authenticated principal/15 min. The in-process limiter is an
   additional single-worker safeguard, not a multi-worker replacement.
3. Put the service behind TLS and set HSTS, CSP, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy`, and an appropriate frame-ancestors policy at the proxy.
4. Before multi-user public launch, add invitation expiry and use limits, a durable
   security audit log, and a product-approved editor/admin role model.
5. Plan a migration from `localStorage` owner tokens to Secure, HttpOnly, SameSite
   cookies plus CSRF protection. Keep the current React escaping and use an HTML
   allowlist if rich article HTML is ever rendered.

## Verification / 验证

- `backend/.venv/Scripts/python.exe -m pytest -q --basetemp=tmp/security-audit-pytest-20260723` — 74 passed. A workspace-local base temp avoids an unrelated denied Windows user-temp directory.
- `backend/.venv/Scripts/python.exe -m ruff check app tests` — passed.
- `frontend/node_modules/.bin/tsc.cmd -b` — passed.
- Backend restarted on port 8000. Live checks: `/health` and `/openapi.json` returned
  200; unauthenticated `/api/v1/books`, `/api/v1/files/1/cover`, and
  `/api/v1/books/1/export` returned 401.
- Full Vite build was attempted but the local Windows sandbox denied esbuild process
  creation with `spawn EPERM`; this is an environment restriction, not a reported
  application test pass.
