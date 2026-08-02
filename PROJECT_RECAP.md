# Jawwal Pay UX+ Project Recap

## Repository Layout

- `jawwalpay-business-api-docs.md`
  - Primary API documentation file for the Jawwal Pay Business Portal.
  - Documents endpoints, request/response shapes, and DataTables-style payloads.

- `jawwal-pay-uxplus/`
  - Chrome extension workspace for `Jawwal Pay UX+`.
  - Contains manifest, content scripts, popup UI, design assets, and page-specific enhancers.

- `enhanced-reference/`
  - Static HTML reference pages / redesign examples.

- `.mhtml` files and visual docs
  - Existing portal screenshots, page flows, and UX references.

## Extension Architecture

### `manifest.json`
- `manifest_version: 3`
- `content_scripts` run on `https://business.jawwalpay.ps/*`
- Permissions: `storage`
- Host permissions: `https://business.jawwalpay.ps/*`
- `background.service_worker`: `background.js`
- Popup UI under `popup/`

### Loading flow

- `jawwal-pay-uxplus/content/loader.js`
  - Entry script injected into portal pages.
  - Reads stored `enabled` state.
  - Loads shared UI components and `api-hub.js` first.
  - Detects current portal page using `page-detector.js`.
  - Injects the page-specific enhancer from `content/enhancers/`.

- `jawwal-pay-uxplus/content/page-detector.js`
  - Uses DOM checks and URL patterns to classify portal pages.
  - Known pages: `login`, `dashboard`, `main`, `services`, `editCustomer`, `registration`, `validateOTPCode`, `previousRegistration`.

### API Layer

- `jawwal-pay-uxplus/content/api-hub.js`
  - Centralized request helper: `apiRequest(endpoint, options)`.
  - Handles cookie auth via `credentials: 'include'`.
  - Parses JSON or HTML responses.
  - Exposes helper methods:
    - `fetchMerchantInfo()`
    - `fetchLastTransactions(params)`
    - `fetchNews()`
    - `fetchNotifications()`
    - `sendOtpCode(params)`
    - `filterPreviousRegistrations(params)`
  - Provides a reusable gateway for enhancers to call portal APIs.

### Page Enhancers

- `jawwal-pay-uxplus/content/enhancers/dashboard.js`
  - Rebuilds the dashboard UI and injects a new overlay.
  - Uses `window.JawwalPayAPI` to fetch portal data.
  - Includes DOM fallback extraction when API hub isn't loaded.

- `jawwal-pay-uxplus/content/enhancers/previousRegistration.js`
  - Enhances agent registration history search.
  - Builds a custom search/pagination layer.
  - Uses `filterPreviousRegistrations` as primary server-side query.
  - Supports translation of original portal table responses into enhanced UX.

- `jawwal-pay-uxplus/content/enhancers/registration.js`
  - Enhances OTP and registration flows.
  - Uses `sendOtpCode` helper.

- Additional enhancers exist for login, main, services, editCustomer, validateOTPCode.

### Shared UI and helpers

- `jawwal-pay-uxplus/content/shared-components.js`
  - Provides shared HTML fragments, layout helpers, normalization, and notification rendering.
  - Used by multiple enhancers to keep consistent UI structure.

### Popup UI

- `jawwal-pay-uxplus/popup/popup.html`
- `jawwal-pay-uxplus/popup/popup.js`
  - Small extension popup to toggle enhancement state.
  - Queries the active tab for current detected page.

## Current Behavior and Key Constraints

- This project is a browser extension overlay, not a backend server.
- The extension reuses the existing Jawwal Pay portal session and cookies.
- It does not currently implement a separate caching API or team-based record stats service.
- Most portal endpoints return DataTables-style JSON responses with `draw`, `recordsTotal`, `recordsFiltered`, `data`, and `data2`.
- The `previousRegistration` enhancer already handles paged portal list requests and could be a good integration point for caching logic.

## Important Points for a New Agent

1. Start with `jawwal-pay-uxplus/content/api-hub.js`.
   - This is the central place to add new API routing or cache lookup logic.
   - A new local/team cache API can be integrated here before falling back to the original portal endpoints.

2. The user wants a team-based cache flow.
   - Check if the current user exists in the new cache API.
   - If not, fetch the user’s team data from the original portal API.
   - Store team stats in the cache for later requests.
   - Use this cache to avoid bulk requests to the original Jawwal Pay API.

3. The relevant enhancement path is likely the `dashboard` or `previousRegistration` flow.
   - `dashboard.js` fetches summary/stats data for the logged-in user.
   - `previousRegistration.js` fetches paged records and can be extended to use cached stats for team records.

4. Keep the existing portal session model.
   - Any new API should coexist with `credentials: 'include'` for portal calls.
   - The cache API may be a separate backend or local storage proxy.

5. The documentation file `jawwalpay-business-api-docs.md` is the best source for endpoint behavior.
   - It contains details on portal endpoint structure and example responses.

## Recommended Next Steps

- Add a new caching service module, e.g. `content/team-cache.js` or extend `api-hub.js`.
- Define a small internal API interface: `getUserTeamStats(userId)`, `cacheTeamStats(teamId, stats)`, `getCachedTeamStats(userId)`.
- Wire the new cache logic into page enhancers that request user/team records.
- Maintain a fallback to original portal API when cache misses occur.

---

This file is intended as a fast onboarding summary for another agent to understand the project layout, extension flow, and where to implement the team caching API.