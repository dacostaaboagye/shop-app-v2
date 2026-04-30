# Internal API Docs

## Purpose

This repository exposes a protected internal backend API reference for developers at:

- API spec: `/api/internal/docs/openapi.json`
- Web viewer: `/admin/access/api-docs`

The initial implementation is intentionally security-first:

- the API spec route requires the `api.docs.view` permission
- the viewer consumes the protected API route through the existing web auth flow
- the exported document is internal-only and should not be published publicly

## Current scope

The current implementation documents:

- public route paths
- HTTP methods
- route intent and summaries
- access requirements and permission metadata
- contract-backed query parameters where shared Zod query schemas exist
- contract-backed JSON request bodies where shared request schemas exist
- contract-backed JSON success responses where shared response schemas exist

This is now more than a route list, but it is still not a contract-perfect Swagger replacement. Coverage currently depends on whether a route already has a shared public contract in `@shop/contracts`.

## Access model

`api.docs.view` is seeded into the admin role. Additional access should be granted through the existing access-control workflow using:

- role assignment, or
- user permission override

Do not expose this route publicly. If production access is enabled, place it behind the same organization controls used for other internal tools.

## Next expansions

Recommended next steps if deeper API documentation is needed:

1. Attach structured OpenAPI schema metadata per route.
2. Expand request query/body/response coverage to the remaining routes.
3. Export the generated spec into a private Postman workspace.
4. Add environment-specific examples that use only sanitized sample values.
