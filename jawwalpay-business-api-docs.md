# Jawwal Pay Business Portal – API Documentation

**Base URL:** `https://business.jawwalpay.ps`  
**Authentication:** Session-based (cookies: `portalcookie`, `TS*` cookies)  
**Date captured:** 2026-08-01

---

## Overview

This document maps the API endpoints observed on the Jawwal Pay Business Portal (`business.jawwalpay.ps`).  
All endpoints return JSON unless otherwise noted. Most list endpoints follow a **DataTables-compatible** response structure.

---

## 1. Get Active News / Announcements

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | *(exact path not captured)*                |
| **Method**         | `GET` or `POST`                            |
| **Parameters**     | `isActive=true&max=1000`                   |
| **Response Type**  | DataTables-style JSON                      |

### Response Structure

```json
{
  "draw": null,
  "recordsTotal": 3,
  "recordsFiltered": 3,
  "data2": [
    ["<a href='javascript:void(0);' onclick='getNewsForm(17)'>Title text</a>"]
  ],
  "data": [
    {
      "id": "17",
      "title": "Full title text",
      "title1": "<a href='javascript:void(0);' onclick='getNewsForm(17)'>Title text</a>",
      "description": "HTML-encoded description content"
    }
  ]
}
```

### Purpose
Returns the list of active news and announcements shown to points of sale (نقاط البيع).  
Client-side uses `getNewsForm(id)` to open individual news items.

---

## 2. Get Merchant Info (Dashboard Summary)

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | `/merchant/getMerchantInfo`                |
| **Full URL**       | `https://business.jawwalpay.ps/merchant/getMerchantInfo` |
| **Method**         | `POST`                                     |
| **Request Body**   | Empty                                      |
| **Response Type**  | JSON                                       |

### Response Example

```json
{
  "merchantBalance": 0.0,
  "commissionBalance": 0.0,
  "agentBalance": 0.0,
  "notifications": 0,
  "amountOfTransactionToday": 0.0,
  "numberOfTransactionToday": 0,
  "errorCode": null,
  "showAgent": true,
  "showMerchant": false
}
```

### Fields Description

| Field                        | Type    | Description                              |
|-----------------------------|---------|------------------------------------------|
| `merchantBalance`           | number  | Merchant account balance                 |
| `commissionBalance`         | number  | Commission balance                       |
| `agentBalance`              | number  | Agent balance                            |
| `notifications`             | number  | Number of unread notifications           |
| `amountOfTransactionToday`  | number  | Total amount of transactions today       |
| `numberOfTransactionToday`  | number  | Number of transactions today             |
| `errorCode`                 | string/null | Error code if any                     |
| `showAgent`                 | boolean | Whether to show agent UI                 |
| `showMerchant`              | boolean | Whether to show merchant UI              |

### Purpose
Called on dashboard load/refresh to populate balance cards, today’s statistics, and visibility flags.

---

## 3. Get Last Transactions

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | `/cumulativeReportTbl/getLastTransaction`  |
| **Full URL**       | `https://business.jawwalpay.ps/cumulativeReportTbl/getLastTransaction` |
| **Method**         | `POST`                                     |
| **Content-Type**   | `application/x-www-form-urlencoded`        |
| **Response Type**  | DataTables-style JSON                      |

### Request Parameters

| Parameter         | Example   | Description                     |
|-------------------|-----------|---------------------------------|
| `sSearch`         | ``        | Free-text search filter         |
| `offset`          | `0`       | Pagination offset               |
| `max`             | `-1`      | Max records (`-1` = unlimited)  |
| `draw`            | `1`       | DataTables draw counter         |
| `orderColumn`     | `0`       | Column index to sort by         |
| `orderDirection`  | `desc`    | Sort direction (`asc`/`desc`)   |

### Response Structure

```json
{
  "draw": "1",
  "recordsTotal": 0,
  "recordsFiltered": 0,
  "data2": [],
  "data": []
}
```

### Purpose
Retrieves the list of recent / last transactions for the current merchant or agent.  
Returns empty arrays when no transactions exist.

---

## 4. Check Workflow Notifications

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | `/workflowOrder/hasNotifications`          |
| **Full URL**       | `https://business.jawwalpay.ps/workflowOrder/hasNotifications` |
| **Method**         | `POST`                                     |
| **Request Body**   | Empty                                      |
| **Response Type**  | JSON containing pre-rendered HTML          |

### Response Example

```json
{
  "htmlContent": "<ul class=\"nav\"> ... full notification dropdown HTML ... </ul>"
}
```

The HTML contains:
- Notification bell icon
- Badge with count (e.g. `0`)
- Dropdown menu titled **اشعارات** (Notifications)
- Empty list when there are no notifications

### Purpose
Returns ready-to-inject HTML for the top navigation notification component.  
Typically called on page load or polled periodically.

---

## 5. Send OTP Code (Agent)

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | `/agent/sendOTPCode`                       |
| **Full URL**       | `https://business.jawwalpay.ps/agent/sendOTPCode` |
| **Method**         | `POST`                                     |
| **Content-Type**   | `application/x-www-form-urlencoded`        |
| **Response Type**  | JSON                                       |

### Request Parameters

| Parameter            | Example         | Description                     |
|----------------------|-----------------|---------------------------------|
| `agentMobileNumber`  | `0599977568`    | Agent mobile number (Palestinian format) |

### Response Layout

```json
{
  "success": true,
  "reference": 2922461129726,
  "message": "<div class=\"alert-list\">\n <div class='alert alert-block alert-success ' >\n <button data-dismiss=\"alert\" class=\"close\" type=\"button\" >\n x\n </button>\n تم ارسال رمز التاكيد للمستخدم بنجاح <br></div> </div>"
}
```

### Fields Description

| Field       | Type          | Description                                      |
|-------------|---------------|--------------------------------------------------|
| `success`   | boolean       | Whether the OTP was sent successfully            |
| `reference` | number/long   | Unique reference ID for the OTP request          |
| `message`   | string (HTML) | Pre-rendered Bootstrap alert HTML to display     |

### Message Content (decoded)
Success message (Arabic):  
**تم ارسال رمز التاكيد للمستخدم بنجاح**  
*(Translation: "The confirmation code has been successfully sent to the user")*

### Purpose
Sends a one-time password (OTP) / confirmation code to the specified agent mobile number.  
Used during agent-related flows that require mobile verification. Returns a success flag, a reference number, and ready-to-display HTML feedback.

---

## 6. Filter Previous Registrations (Agent)

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| **Endpoint**       | `/agent/filterPreviousRegistration`        |
| **Full URL**       | `https://business.jawwalpay.ps/agent/filterPreviousRegistration` |
| **Method**         | `POST`                                     |
| **Content-Type**   | `application/x-www-form-urlencoded`        |
| **Response Type**  | DataTables-style JSON                      |

### Request Parameters

| Parameter             | Example     | Description                              |
|-----------------------|-------------|------------------------------------------|
| `customerStatus`      | `Created`   | Filter by status (e.g. `Created`)        |
| `mobileNumber`        | ``          | Filter by mobile number                  |
| `fromSubmissionDate`  | ``          | Filter from submission date              |
| `toSubmissionDate`    | ``          | Filter to submission date                |
| `sSearch`             | ``          | Free-text search                         |
| `offset`              | `0`         | Pagination offset                        |
| `max`                 | `10`        | Max records per page                     |
| `draw`                | `1` / `2`   | DataTables draw counter                  |
| `orderColumn`         | `0`         | Column index to sort by                  |
| `orderDirection`      | `desc`      | Sort direction (`asc` / `desc`)          |

### Response Layout

```json
{
  "draw": "1",
  "recordsTotal": 9549,
  "recordsFiltered": 9549,
  "data2": [
    [
      "Abdullah rizq alatar",
      "804690295",
      "00970595258024",
      "01/03/2025 14:51:42",
      null,
      "02/03/2025 13:57:13",
      "SOUTH",
      "تمت الموافقة",
      "jalal.azab@SOUTH-FIELD-USER1@Portal"
    ]
  ],
  "data": [
    {
      "id": "00970595258024",
      "fullName": "Abdullah rizq alatar",
      "customerIdNumber": "804690295",
      "mobileNumber": "00970595258024",
      "creationDate": "01/03/2025 14:51:42",
      "submissionDate": null,
      "approvalDate": "02/03/2025 13:57:13",
      "regAgentName": "SOUTH",
      "allowEdit": "false",
      "customerStatus": "تمت الموافقة",
      "regAgentDeviceName": "jalal.azab@SOUTH-FIELD-USER1@Portal"
    }
  ]
}
```

### Fields Description (`data` array objects)

| Field                 | Type          | Description                                      |
|-----------------------|---------------|--------------------------------------------------|
| `id`                  | string        | Unique ID (usually the mobile number)            |
| `fullName`            | string        | Customer full name                               |
| `customerIdNumber`    | string        | National ID / identity number                    |
| `mobileNumber`        | string        | Mobile number (format: `00970xxxxxxxxx`)         |
| `creationDate`        | string        | Registration creation date (`dd/MM/yyyy HH:mm:ss`) |
| `submissionDate`      | string/null   | Submission date (null if not submitted)          |
| `approvalDate`        | string/null   | Approval date (null if still pending)            |
| `regAgentName`        | string        | Region / agent group (e.g. `SOUTH`)              |
| `allowEdit`           | string        | Whether editing is allowed (`"true"` / `"false"`) |
| `customerStatus`      | string        | Status in Arabic (see below)                     |
| `regAgentDeviceName`  | string        | Agent username + device info                     |

### Customer Status Values

| Arabic            | Filter Value (approx.) | Meaning        | `allowEdit` |
|-------------------|------------------------|----------------|-------------|
| `تمت الموافقة`    | *(Approved)*           | Approved       | `false`     |
| `قيد المراجعة`    | *(UnderReview)*        | Under review   | `false`     |
| `قيد الانتظار`    | `Created`              | Pending / Waiting | `true`   |

### Purpose
Retrieves a paginated, filterable list of previous customer registrations submitted by agents.  
Supports filtering by **status**, mobile number, and date range. Used in the agent registration history / management screen.

**Observed totals:**
- All statuses: **9549** records
- `customerStatus=Created` (قيد الانتظار): **8** records

---

## Summary Table

| # | Endpoint                                      | Method | Purpose                              |
|---|-----------------------------------------------|--------|--------------------------------------|
| 1 | *(news endpoint)*                             | GET/POST | Active news & announcements         |
| 2 | `/merchant/getMerchantInfo`                   | POST   | Dashboard balances & daily stats     |
| 3 | `/cumulativeReportTbl/getLastTransaction`     | POST   | Recent transactions list             |
| 4 | `/workflowOrder/hasNotifications`             | POST   | Notification badge + dropdown HTML   |
| 5 | `/agent/sendOTPCode`                          | POST   | Send OTP to agent mobile number      |
| 6 | `/agent/filterPreviousRegistration`           | POST   | Filter & list previous registrations |

---

## Notes

- All endpoints require a valid authenticated session.
- DataTables endpoints (`draw`, `recordsTotal`, `recordsFiltered`, `data`, `data2`) are consistent across list APIs.
- The portal uses F5/TS cookies and a custom `portalcookie`.
- Server header observed: `x-application-context: application:production:8080`
- Remote IP observed: `213.6.245.13`

---

*Documentation generated from network captures – 2026-08-01*
