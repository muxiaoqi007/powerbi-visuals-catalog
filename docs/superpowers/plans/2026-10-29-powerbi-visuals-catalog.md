# Power BI Visuals Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chinese-first responsive Power BI visuals catalog that can be deployed to Qoder Sites, with a database-backed catalog and an online manual DataChant sync action.

**Architecture:** Build a static SPA and a Qoder Sites server Function. The Function fetches only the configured public DataChant GitHub CSV source, validates and normalizes records, then updates managed database tables through the Sites function backend; the SPA reads public catalog/sync status and lets only authorized site owners invoke sync. Marketplace and OKVIZ are linked sources, not scraping dependencies.

**Tech Stack:** Confirmed by repository after bootstrap; target Qoder Sites static web artifact, TypeScript server Function, Sites database and Secrets. Use the minimal framework supported by the workspace and Sites runtime; do not add a translation service or download/mirror third-party packages.

**Spec:** `docs/superpowers/specs/2026-10-29-powerbi-visuals-catalog-design.md`

## Global Constraints

- Use Chinese for navigation, categories, filters, and operational messages; retain source-language product names/descriptions and do not translate in phase one.
- DataChant is the bulk catalog source; Microsoft Marketplace and OKVIZ are external detail/editorial links, not automated scraping dependencies.
- Do not mirror or redistribute third-party PBIVIZ, PBIX, or vendor images; link to the original source.
- Sync must not accept arbitrary URLs; validate all external URLs to HTTP(S) and render external descriptions as plain text.
- On upstream or parsing failure, preserve the last successful catalog; do not show invented or unknown values as facts.
- Qoder Sites resource allocation and schema changes are cloud mutations; obtain explicit user authorization before `ensure_backend` and before applying a reviewed migration. Publishing requires explicit user authorization and final status verification.

---

## File Structure

The workspace is currently empty except for brainstorming artifacts and this plan/spec; there is no existing app or package manifest. After Sites target confirmation and bootstrap, use these focused files (adjust only when actual Sites starter/runtime dictates):

- `package.json` — app scripts and minimal runtime/build dependencies.
- `index.html` — SPA document metadata and mount point.
- `src/main.tsx` — UI bootstrap.
- `src/App.tsx` — directory page composition, routing-free MVP.
- `src/components/VisualCard.tsx` — one catalog card and safe external links.
- `src/components/VisualFilters.tsx` — query and filter controls.
- `src/components/VisualDetails.tsx` — selected record details and source/legal links.
- `src/components/SyncStatus.tsx` — last-run state and owner-only sync action.
- `src/lib/types.ts` — normalized visual and sync-run types.
- `src/lib/catalog.ts` — client-side query/filter functions and URL validation helpers.
- `src/lib/sites-client.ts` — narrow client interface for list reads and sync invocation, based on verified Sites function APIs.
- `src/styles.css` — responsive tokens, layout and component styles.
- `functions/sync-catalog/index.ts` — server-side DataChant fetch, parse, normalize, sync orchestration.
- `functions/sync-catalog/csv.ts` — CSV parser/column mapping if runtime has no appropriate built-in parser.
- `functions/sync-catalog/normalize.ts` — source record validation, identity selection and stable normalized mapping.
- `tests/catalog.test.ts` — filtering, search and display rules.
- `tests/sync-normalize.test.ts` — CSV mapping, URL validation, identity and malformed-row behavior.
- `tests/sync-catalog.test.ts` — duplicate/retry/failure preservation behavior using an injected repository/fetch boundary.
- Qoder Sites generated `.qoder.site` descriptor — created only by `prepare_site`; never hand-write or edit it.

## Task 1: Confirm Site Target and Supported Runtime

**Files:**
- Read: current workspace and any generated Qoder Sites descriptor (if present).

**Interfaces:**
- Consumes: user-confirmed goal to deploy to Qoder Sites.
- Produces: verified site/project target, supported front-end build contract, function runtime contract, access model, and publish path.

- [ ] Read `mcp__plugin_sites_qoder_sites__get_context`; inspect `sites` and `unavailableSites` without inferring a target from empty results.
- [ ] If no intended site is bound, ask whether to create a new site for the current account; do not set `createNewSite=true` until the user explicitly requests creation.
- [ ] Once target is authorized, read site details and current database/function capability summaries.
- [ ] Confirm supported build output, SPA behavior, function invocation/auth identity, database operations/transaction options, and environment limits from the live Sites context and skill references.
- [ ] Select the smallest compatible frontend toolchain and document actual commands in `package.json` only after confirmation.
- [ ] If source-fetch networking or owner authorization cannot be guaranteed by Sites Functions, stop and return to design for an allowed sync approach rather than quietly replacing the source or security model.

## Task 2: Scaffold Responsive Catalog Shell

**Files:**
- Create: `package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Test: `tests/catalog.test.ts`

**Interfaces:**
- Consumes: verified build/runtime contract from Task 1.
- Produces: runnable responsive SPA shell with sample fixture data and semantic UI states.

- [ ] Create the smallest runnable app supported by the verified Sites build contract, with `dev`, `build`, and `test` scripts.
- [ ] Add a failing test asserting search/filter combination behavior through pure catalog utilities before rendering.
- [ ] Run the targeted test and confirm it fails for the missing catalog utility.
- [ ] Implement the shell with desktop sidebar/main layout, fluid width, tablet card grid, mobile collapsed navigation, and cards that reflow without horizontal overflow.
- [ ] Keep fixture data visibly labeled as preview/sample; never represent it as synced live data.
- [ ] Run unit tests and production build; fix any failures.

## Task 3: Define Catalog Domain and Read Interface

**Files:**
- Create: `src/lib/types.ts`, `src/lib/catalog.ts`, `src/lib/sites-client.ts`, `src/components/VisualCard.tsx`, `src/components/VisualFilters.tsx`, `src/components/VisualDetails.tsx`
- Modify: `src/App.tsx`, `src/styles.css`
- Test: `tests/catalog.test.ts`

**Interfaces:**
- Produces `VisualRecord`: `{ id: string; sourceId: string | null; visualGuid: string | null; name: string; publisher: string | null; description: string | null; categories: string[]; keywords: string[]; version: string | null; pricing: string | null; certified: boolean | null; rating: number | null; ratingCount: number | null; iconUrl: string | null; marketplaceUrl: string | null; publisherUrl: string | null; pbivizUrl: string | null; pbixUrl: string | null; legalTermsUrl: string | null; privacyUrl: string | null; supportUrl: string | null; status: 'active' | 'unlisted'; updatedAt: string | null }`.
- Produces `SyncRun`: `{ id: string; status: 'running' | 'succeeded' | 'failed'; startedAt: string; finishedAt: string | null; sourceRevision: string | null; readCount: number; insertedCount: number; updatedCount: number; unlistedCount: number; skippedCount: number; failedCount: number; message: string | null }`.
- Produces `CatalogClient`: `listVisuals(): Promise<VisualRecord[]>`, `listSyncRuns(): Promise<SyncRun[]>`, `syncCatalog(): Promise<SyncRun>`; concrete signatures may be narrowed only if verified Sites SDK requires it.

- [ ] Write failing tests for case-insensitive name/publisher/description/keyword search, selected category/price/certification/example filters, and empty results.
- [ ] Run the tests to verify failures.
- [ ] Define nullable fields accurately so unavailable source facts remain unknown.
- [ ] Implement pure search/filter/sort functions; validate outbound link protocols before rendering anchors.
- [ ] Wire card, filter, and details UI to typed records; use `rel="noopener noreferrer"` for external links and plain-text descriptions.
- [ ] Implement list methods in the client adapter against the verified Sites Function/database read contract; do not use owner-only MCP admin tools as application runtime APIs.
- [ ] Run targeted tests and production build.

## Task 4: Provision and Review Database Schema

**Files:**
- Create through Sites migration workflow: `visuals` and `sync_runs` tables plus required indexes and access policies.

**Interfaces:**
- Consumes: verified target and schemaRef from Tasks 1 and 3.
- Produces: `visuals` public read-only, `sync_runs` read access according to desired status visibility; writes restricted to the server Function backend.

- [ ] Confirm the user explicitly authorizes allocating the required Sites database/function capabilities before calling `ensure_backend`.
- [ ] Allocate only `database` and `functions` with `databaseAccessModel: "function_backend"`; poll the operation and verify each capability independently.
- [ ] Read database schema and migration guidance for the exact site; preserve the returned `schemaRef`.
- [ ] Create an immutable migration plan using supported DDL only; set complete table policies to deny anonymous/authenticated writes and allow server function writes. Public visual reads may be granted if the directory is public; do not expose sync implementation secrets.
- [ ] Review generated plan SQL and policies with the user before applying; apply only after explicit approval.
- [ ] Poll migration operation and reread schema to verify tables, keys, indexes and policies.

## Task 5: Implement DataChant Fetch and Normalization

**Files:**
- Create: `functions/sync-catalog/csv.ts`, `functions/sync-catalog/normalize.ts`
- Test: `tests/sync-normalize.test.ts`

**Interfaces:**
- `parseCsv(text: string): Record<string, string>[]` — handles quoted commas, escaped quotes, and CRLF.
- `normalizeRecord(row: Record<string,string>): VisualRecord | null` — maps known DataChant columns, derives stable identity from source ID then Visual GUID, validates HTTP(S) URLs, returns null for records without a usable identity/name.

- [ ] Add tests for quoted descriptions, embedded commas/newlines, source header mapping, empty optional values, invalid schemes, missing identity/name, and nullable certification/pricing.
- [ ] Run tests to verify failures.
- [ ] Implement parser/mapping with a maintained CSV library only if verified runtime supports it; otherwise keep a small tested CSV parser in `csv.ts`.
- [ ] Add row-level result accounting so malformed rows are skipped/reported, not fatal to all valid records.
- [ ] Run targeted tests and static checks.

## Task 6: Implement Safe, Idempotent Sync Function

**Files:**
- Create: `functions/sync-catalog/index.ts`
- Modify: `functions/sync-catalog/normalize.ts`
- Test: `tests/sync-catalog.test.ts`

**Interfaces:**
- Function input: no source URL; optional empty JSON body only.
- Function output: `{ run: SyncRun }`.
- Internal `CatalogRepository`: bounded methods to insert/update records, mark stale records unlisted, create/update sync run, and read current active identifiers; database calls use verified Sites function backend.

- [ ] Add injected fetch/repository tests for one successful sync, second identical sync with no duplicates, updated record, unlisted transition, upstream timeout, HTTP error, malformed file, and partial invalid rows.
- [ ] Run tests to verify failures.
- [ ] Implement fixed-source fetch to the verified public DataChant CSV endpoint with timeout, content-type/size/row-count limits and no user-controlled URL.
- [ ] Normalize all valid rows before mutating live records; stage or batch changes using supported database transactions/atomic strategy where available.
- [ ] Preserve current catalog on fetch/parse/system failure; do not mark records unlisted after an incomplete read. Keep row-level skips separate from source-wide failure threshold.
- [ ] Add idempotency/concurrency guard for overlapping manual requests; ensure only authorized site owner can trigger writes using verified invocation identity.
- [ ] Record sync run counts, upstream revision if available, and sanitized operator-facing error summaries; never log secrets or raw untrusted payloads.
- [ ] Run targeted tests and function typecheck/build.

## Task 7: Connect Sync Status and Owner-Only Action

**Files:**
- Create: `src/components/SyncStatus.tsx`
- Modify: `src/lib/sites-client.ts`, `src/App.tsx`, `src/styles.css`
- Test: `tests/catalog.test.ts` or focused component test if supported.

**Interfaces:**
- Consumes `CatalogClient.listSyncRuns()` and `CatalogClient.syncCatalog()`.
- Produces visible last-success time, latest run result/counts, loading state, failure state, and owner-only action.

- [ ] Add tests for loading, success, failure, and duplicate-click-disabled states where the selected UI framework's test tools are available.
- [ ] Implement status display and manual sync action; prevent overlapping clicks while a run is active.
- [ ] Hide/disable action for non-owner identities; enforce authorization again in the server Function.
- [ ] Refresh catalog and sync history after successful sync; preserve existing results after failure.
- [ ] Run full unit suite and production build.

## Task 8: Populate and Verify a Real Draft

**Files:**
- Modify app and function files only for defects found in live integration.
- Create via Sites: generated `.qoder.site` descriptor and backend resources.

**Interfaces:**
- Consumes: verified implementation, approved database schema and deployment permission.
- Produces: ready Qoder Sites draft and a successful real DataChant sync visible in UI.

- [ ] Run a local development server and test the actual UI in browser at desktop, tablet and narrow mobile dimensions; cover search, combined filters, details, no-results and external links.
- [ ] Obtain explicit instruction to create a new Qoder Site for the current account if no verified existing target is bound; the earlier goal “final can be deployed” alone does not authorize new cloud resource creation.
- [ ] Build the configured output directory and prepare a Sites draft with exact output/function directory, SPA flag, database access mode and schemaRef; let Sites generate descriptor, never hand-write it.
- [ ] Verify artifact/dependency readiness and inspect site/backend/function/schema context.
- [ ] Run one authorized real manual sync against DataChant, verify counts and sample rows, then repeat to confirm idempotency and correct UI refresh.
- [ ] Check function logs for sanitized success/failure details and ensure no credentials or untrusted HTML leak.
- [ ] If asked to publish, use the Sites publish workflow and verify final publication state/site URL; otherwise leave as a draft and do not publish.

## Task 9: Final Verification

**Files:**
- Modify relevant source/tests only if verification finds defects.

**Interfaces:**
- Produces evidence against every acceptance criterion in the spec.

- [ ] Run all unit tests, typecheck and production build.
- [ ] In a browser, verify golden path: search a known record, filter by category/price/certification, open details and follow source link.
- [ ] Verify responsive layout at desktop/tablet/mobile widths with no horizontal overflow.
- [ ] Verify first and repeated sync, failure preservation, run summary, access control and no duplicate records against real Sites backend.
- [ ] Confirm no visual binaries were copied into project/site storage and no secrets are present in client build.
- [ ] Report any unverified deployment or publish step explicitly; never claim cloud deployment without a completed status read.
