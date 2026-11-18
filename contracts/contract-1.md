# Modules 1 to 5: Identity, Organisation, Property, Inventory, Marketplace

Conventions from Part 1 apply everywhere: base path `/api/v1`, UUID v7 IDs, money as integer paise `{ "amount": 850000, "currency": "INR" }` (INR 8,500.00), dates `YYYY-MM-DD` in Asia/Kolkata, timestamps ISO 8601 UTC, `camelCase` JSON, cursor pagination, `Idempotency-Key` header where stated, `If-Match`/`version` for optimistic concurrency. **Response examples show only the `data` value.** Every real response is wrapped in `{ "success": true, "data": ..., "meta": { "requestId", "timestamp" } }`; errors use the Part 1 error envelope. Common errors (401 `AUTH_TOKEN_INVALID`, 403 `PERMISSION_DENIED`, 404 `RESOURCE_NOT_FOUND`, 429 `RATE_LIMIT_EXCEEDED`, 500 `INTERNAL_ERROR`) apply to every endpoint and are listed below only when something specific is added.

Audience legend: PUBLIC = no auth; USER = any authenticated user (tenant context); OWNER = organisation member (checked by `OrganisationAccessGuard`); ADMIN = SUPER_ADMIN.

---

# MODULE 1: Authentication and user profile

### 1. Purpose
Establish identity (delegated to Better Auth or Clerk), expose the application-level identity and capabilities of the caller, manage the profile, sessions, deactivation, deletion requests and notification preferences.

### 2. Endpoints overview

| Method | Endpoint | Description | Access | Owned by |
|---|---|---|---|---|
| POST | /auth/otp/send | Send mobile OTP (optional facade) | PUBLIC | Provider, NestJS facade |
| POST | /auth/otp/verify | Verify OTP, return session (optional facade) | PUBLIC | Provider, NestJS facade |
| GET | /me | Current user, capabilities, organisation memberships | USER | NestJS |
| GET | /me/profile | Full profile | USER | NestJS |
| PATCH | /me/profile | Update profile | USER | NestJS |
| GET | /me/sessions | List active sessions | USER | NestJS |
| DELETE | /me/sessions/{sessionId} | Revoke one session | USER | NestJS + provider revoke |
| POST | /me/logout | End current session | USER | Provider + NestJS mirror |
| POST | /me/deactivate | Deactivate own account | USER | NestJS + provider revoke |
| POST | /me/deletion-requests | Request account deletion | USER | NestJS |
| GET | /me/deletion-requests/current | View pending request | USER | NestJS |
| DELETE | /me/deletion-requests/current | Cancel pending request | USER | NestJS |
| GET | /me/notification-preferences | Read preferences | USER | NestJS |
| PUT | /me/notification-preferences | Replace preferences | USER | NestJS |

Token refresh, cookie handling, social login and password flows are SDK-only and have no NestJS route.

### 3. Detailed endpoint contracts

**Endpoint:** POST /api/v1/auth/otp/send
**Access:** PUBLIC. **Authentication:** none. **Purpose:** Start phone sign-in. Always responds identically for known and unknown numbers.

Request:
```json
{ "phone": "+919826012345", "purpose": "SIGN_IN", "captchaToken": "03AFcWeA5..." }
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| phone | string | yes | E.164, `+91` followed by 10 digits starting 6 to 9 | Target number |
| purpose | enum | yes | `SIGN_IN`, `PHONE_CHANGE` | Why OTP is sent |
| captchaToken | string | conditional | Required after 2 failures from the IP | Bot protection |

Success 202:
```json
{ "challengeId": "otpc_01JC9A7", "resendAfterSeconds": 30, "expiresInSeconds": 300 }
```
Errors: 400 `VALIDATION_ERROR`; 429 `RATE_LIMIT_EXCEEDED` (3 per phone per 10 min, 10 per day, 20 per IP per hour; `Retry-After` header); 422 `CAPTCHA_REQUIRED`.
Business rules: no user enumeration; 30 s cooldown; premium-rate prefixes blocked.
Database: `audit_logs` (hashed phone), rate counters in Redis.
Security: never log OTP; phone stored hashed in logs.

**Endpoint:** POST /api/v1/auth/otp/verify
**Access:** PUBLIC. 
Request: `{ "challengeId": "otpc_01JC9A7", "code": "482913" }`
Fields: `challengeId` string required; `code` string required, 6 digits.
Success 200:
```json
{ "accessToken": "<provider-issued>", "expiresIn": 900, "isNewUser": true }
```
Errors: 400 `OTP_INVALID` (attempts left in `details`), 410 `OTP_EXPIRED`, 429 `OTP_ATTEMPTS_EXCEEDED` (5 attempts, then challenge locked).
Rules: on success the provider creates the session; the first authenticated call to `/me` provisions `users` and `user_auth_identities`. Database: `users`, `user_auth_identities`, `user_sessions`.

**Endpoint:** GET /api/v1/me
**Access:** USER. **Purpose:** The single source of truth for who the caller is. Frontends must use this, never token claims.

Success:
```json
{
  "id": "0192f1c4-7a3e-7b10-9c55-2d1f0a6b8e11",
  "status": "ACTIVE",
  "phone": "+919826012345",
  "phoneVerified": true,
  "email": "rishabh@example.com",
  "platformRole": "NONE",
  "profile": { "fullName": "Aarav Sharma", "avatarUrl": null },
  "organisations": [
    { "organisationId": "0192f1c5-0001-7000-8a00-000000000001", "name": "Sharma Student Living", "memberRole": "OWNER", "organisationStatus": "ACTIVE" }
  ],
  "capabilities": { "isOwner": true, "isAdmin": false, "hasActiveTenancy": false },
  "pendingDeletionRequest": false
}
```
`platformRole` is `NONE` or `SUPER_ADMIN`. Rules: server derived only. Database: reads `users`, `organisation_members`, `tenants`, `tenancies`. Edge: deactivated or suspended users get 403 `USER_DEACTIVATED` / `USER_SUSPENDED` (this endpoint included, with a body telling the client what to show).

**Endpoint:** GET /api/v1/me/profile and PATCH /api/v1/me/profile
**Access:** USER.

PATCH request:
```json
{
  "fullName": "Aarav Sharma",
  "gender": "MALE",
  "dateOfBirth": "2001-08-14",
  "occupation": "STUDENT",
  "institutionOrEmployer": "IPS Academy, Indore",
  "currentCity": "Indore",
  "preferredLanguage": "hi",
  "avatarUploadId": "upl_01JC9B2"
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| fullName | string | no | 2 to 100 chars, letters, spaces, `.` `'` `-` | Legal display name |
| gender | enum | no | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` | Used for gender-restricted listings |
| dateOfBirth | date | no | Age 16 to 100; under 18 flags account as `isMinor` and blocks owner role | Age checks |
| occupation | enum | no | `STUDENT`, `WORKING_PROFESSIONAL`, `OTHER` | Matching |
| institutionOrEmployer | string | no | max 150 | Optional |
| currentCity | string | no | max 80 | Optional |
| preferredLanguage | enum | no | `en`, `hi` | Notification language |
| avatarUploadId | string | no | Completed upload by this user | Avatar |

Not patchable here: phone, email (provider-verified changes only), status, platformRole. Sending them returns 400 `FIELD_NOT_ALLOWED`.
Success: full profile with `version` incremented. Errors: 409 `VERSION_MISMATCH`, 422 `PROFILE_UNDERAGE`.
Database: `user_profiles`. Security: users only read and write their own row; fields cannot be set for another user.

**Endpoint:** GET /api/v1/me/sessions
Success:
```json
[ { "sessionId": "0192f1c8-2b3e-7a00-8c00-111111111111", "device": "Chrome on Windows", "ipCity": "Indore", "createdAt": "2026-11-10T09:12:00Z", "lastSeenAt": "2026-11-10T17:40:00Z", "isCurrent": true } ]
```
**DELETE /api/v1/me/sessions/{sessionId}:** 204. Path: `sessionId` UUID, must belong to caller else 404. Revoking the current session behaves as logout. Calls `AuthProvider.revokeSessions` for that session and marks `user_sessions.revoked_at`.

**POST /api/v1/me/logout:** 204. Ends current session. Idempotent.

**POST /api/v1/me/deactivate**
Request: `{ "reason": "NOT_USING", "confirm": true }`. `reason` enum `NOT_USING`, `PRIVACY`, `FOUND_ACCOMMODATION`, `OTHER`; `confirm` must be `true`.
Success: `{ "status": "DEACTIVATED", "reactivatableUntil": "2027-02-08T00:00:00Z" }`.
Rules: reversible by signing in within 90 days (assumption); all sessions revoked; tenants with an active tenancy get 422 `ACTIVE_TENANCY_EXISTS`; owners with published listings must first unpublish or have none (422 `ACTIVE_LISTINGS_EXIST`). Database: `users.status`, `user_sessions`, `audit_logs`.

**POST /api/v1/me/deletion-requests**
Request: `{ "reason": "PRIVACY", "confirm": true }`
Success 202: `{ "id": "0192...", "status": "PENDING", "scheduledFor": "2026-12-10T00:00:00Z", "blockers": [] }`.
Rules (edge case 23): blocked with 422 `DELETION_BLOCKED` and `details` listing blockers while any of these exist: active tenancy, unpaid invoices, open deposit settlement, open dispute, owner with active organisation. A 30-day cooling period follows; the user can cancel. After it, a background job anonymises PII (name, phone, email, documents deleted) but retains financial records and audit logs with an anonymised user reference, as required for accounting and legal retention. Database: `account_deletion_requests` (new table), later `users`, `user_profiles`, `tenant_documents`, provider `deleteIdentity`.

**GET/PUT /api/v1/me/notification-preferences**
```json
{
  "channels": { "EMAIL": true, "SMS": true, "WHATSAPP": false, "PUSH": true },
  "categories": {
    "BOOKING": ["EMAIL", "SMS", "PUSH"],
    "PAYMENT": ["EMAIL", "SMS", "PUSH"],
    "RENT_REMINDER": ["SMS", "PUSH"],
    "MAINTENANCE": ["PUSH"],
    "ANNOUNCEMENT": ["EMAIL"],
    "MARKETING": []
  },
  "quietHours": { "enabled": true, "from": "22:00", "to": "07:00" }
}
```
Validation: categories must be known enum values; channels listed must be enabled in `channels`; `quietHours` times `HH:mm` Asia/Kolkata. Rule: transactional categories (`PAYMENT`, `BOOKING`, security alerts) cannot be fully disabled; PUT returns 422 `CATEGORY_REQUIRED` if the array is empty for them. Database: `notification_preferences` (new, one row per user).

### 4. Workflow
Sign-in through provider, first `/me` call provisions the user, client reads capabilities and routes to tenant app, owner dashboard (if memberships exist) or admin console.

### 5. Edge cases
Phone number recycled to a new person (phone change requires OTP on both numbers and invalidates sessions); user signs in with a different provider after a migration (matched by verified phone); OTP SMS delayed (resend honours cooldown, older challenge stays valid until expiry); deactivated owner attempts login (403 with reactivation hint).

---

# MODULE 2: Organisation management

### 1. Purpose
Let an owner create and manage a business entity that owns properties, and define membership so more roles can be added later.

### 2. Endpoints overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /owner/organisations | Create organisation (caller becomes OWNER member) | USER |
| GET | /owner/organisations | Organisations the caller belongs to | USER |
| GET | /owner/organisations/{organisationId} | Organisation details | OWNER |
| PATCH | /owner/organisations/{organisationId} | Update details | OWNER |
| GET | /owner/organisations/{organisationId}/settings | Read settings | OWNER |
| PATCH | /owner/organisations/{organisationId}/settings | Update settings | OWNER |
| GET | /owner/organisations/{organisationId}/members | List members | OWNER |
| GET | /owner/organisations/{organisationId}/access | Validate access, return permissions | OWNER |

Inviting or removing members is not in the MVP (single OWNER). The `organisation_members` schema carries `role_id`, `status`, `invited_by`, so adding MANAGER later needs only new endpoints and seed data.

### 3. Detailed endpoint contracts

**Endpoint:** POST /api/v1/owner/organisations
**Access:** USER (this is how a user becomes an owner). **Idempotency-Key** required.

Request:
```json
{
  "legalName": "Sharma Student Living Pvt Ltd",
  "displayName": "Sharma Student Living",
  "businessType": "COMPANY",
  "contactEmail": "hello@sharmaliving.in",
  "contactPhone": "+919826012345",
  "gstin": "23ABCDE1234F1Z5",
  "pan": "ABCDE1234F",
  "registeredAddress": { "line1": "12, Vijay Nagar", "city": "Indore", "state": "Madhya Pradesh", "pincode": "452010" }
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| legalName | string | yes | 2 to 150 | Registered name |
| displayName | string | yes | 2 to 80, unique per creator | Shown to tenants |
| businessType | enum | yes | `INDIVIDUAL`, `PROPRIETORSHIP`, `PARTNERSHIP`, `COMPANY` | Business form |
| contactEmail | string | yes | RFC email | Business contact |
| contactPhone | string | yes | E.164 Indian mobile | Business contact |
| gstin | string | no | 15 chars, GSTIN regex, state code matches `registeredAddress.state` | Tax |
| pan | string | conditional | 10 chars `AAAAA9999A`; required for payouts | Tax |
| registeredAddress | object | yes | `line1` required, `pincode` 6 digits | Address |

Success 201:
```json
{
  "id": "0192f1c5-0001-7000-8a00-000000000001",
  "displayName": "Sharma Student Living",
  "legalName": "Sharma Student Living Pvt Ltd",
  "status": "ACTIVE",
  "verificationStatus": "UNVERIFIED",
  "currentPlan": { "type": "FREE", "propertyLimit": 1 },
  "createdAt": "2026-11-10T18:10:00Z",
  "version": 1
}
```
Errors: 409 `ORGANISATION_ALREADY_EXISTS` (same displayName and creator or same PAN), 422 `INVALID_GSTIN`, 422 `USER_NOT_ELIGIBLE` (minor, deactivated), 422 `ORGANISATION_LIMIT_EXCEEDED` (assumption: max 3 per user).
Rules: in one transaction create `organisations`, an `organisation_members` row with the OWNER role, a FREE `subscriptions` row. PAN and GSTIN are stored encrypted at column level; responses return masked values (`ABCDE****F`).
Security: caller identity comes from the token; no `ownerId` in the body.

**GET /api/v1/owner/organisations** Access: USER. Query: `limit`, `cursor`, `status`. Returns only organisations where the caller has an ACTIVE membership; each item has `id`, `displayName`, `status`, `memberRole`, `propertyCount`, `plan`. A user with no memberships gets an empty list (not an error).

**GET /api/v1/owner/organisations/{organisationId}** Path: `organisationId` UUID. Returns full organisation with masked tax IDs, counts, subscription summary, verification status.

**PATCH /api/v1/owner/organisations/{organisationId}**
Body: any of `displayName`, `contactEmail`, `contactPhone`, `registeredAddress`, `logoUploadId`, `version` (required). `legalName`, `pan`, `gstin`, `businessType` changes return 422 `REQUIRES_REVERIFICATION` and create a `verification_records` entry for admin review rather than applying immediately. Errors: 409 `VERSION_MISMATCH`, 403 `ORGANISATION_SUSPENDED`. Database: `organisations`, `audit_logs`.

**GET/PATCH .../settings**
```json
{
  "billing": { "rentDueDay": 5, "gracePeriodDays": 3, "lateFee": { "type": "FLAT", "amount": 50000, "currency": "INR", "perDay": false }, "prorationMethod": "DAILY" },
  "booking": { "approvalMode": "OWNER_APPROVAL", "holdMinutes": 30, "ownerResponseHours": 24, "cancellationPolicy": "FLEXIBLE" },
  "notifications": { "ownerDigest": "DAILY", "reminderDaysBeforeDue": [3, 1] },
  "payouts": { "bankAccountRef": "ba_01JC9...", "payoutSchedule": "WEEKLY" }
}
```
Validation: `rentDueDay` 1 to 28; `gracePeriodDays` 0 to 15; `approvalMode` `INSTANT`, `OWNER_APPROVAL`; `holdMinutes` 10 to 120; `lateFee.amount` max 100000 paise per day or flat; reminders 0 to 15 days. Settings are defaults; properties can override. Settings changes never rewrite issued invoices or existing bookings. Bank details are references to a vault or gateway contact, not raw account numbers.

**GET .../members** Returns `userId`, `fullName` (name only), `role`, `status`, `joinedAt`. No contact details beyond what the user shared for the org. MVP always returns exactly one OWNER.

**GET .../access** Returns `{ "organisationId", "memberRole": "OWNER", "permissions": ["property:write","booking:manage","invoice:issue", "..."], "organisationStatus": "ACTIVE", "restrictions": [] }`. `restrictions` can include `CANNOT_PUBLISH` (suspended) or `PLAN_PROPERTY_LIMIT_REACHED`. Lets the frontend check access once per organisation switch.

### 4. Workflow
Create organisation, then create property (Module 3), choose plan (Module 18). Organisation switching on the frontend is a client concern; every call carries the organisation in the path and the server re-checks membership.

### 5. Edge cases
User tries `/owner/organisations/{someoneElsesId}` returns 404; suspended organisation can read but not publish, accept bookings or invoice; two tabs editing settings trigger `VERSION_MISMATCH`; owner changes GSTIN mid-year (admin re-verification, old value kept on issued invoices).

---

# MODULE 3: Property management

### 1. Purpose
Create and maintain properties, their media, documents, rules, amenities and address, and drive them through the verification process that gates publication.

### 2. Endpoints overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /owner/organisations/{orgId}/properties | Create property (DRAFT) | OWNER |
| GET | /owner/organisations/{orgId}/properties | List properties | OWNER |
| GET | /owner/organisations/{orgId}/properties/{propertyId} | Property details | OWNER |
| PATCH | .../properties/{propertyId} | Update | OWNER |
| POST | .../properties/{propertyId}/archive | Archive | OWNER |
| POST | .../properties/{propertyId}/restore | Restore archived | OWNER |
| DELETE | .../properties/{propertyId} | Hard delete (only if never used) | OWNER |
| PUT | .../properties/{propertyId}/address | Address and geolocation | OWNER |
| PUT | .../properties/{propertyId}/amenities | Set amenities | OWNER |
| PUT | .../properties/{propertyId}/rules | Set rules | OWNER |
| POST | .../properties/{propertyId}/verification-submissions | Submit for verification | OWNER |
| GET | .../properties/{propertyId}/verification | Verification status | OWNER |
| POST | .../properties/{propertyId}/images/uploads | Get image upload URL | OWNER |
| POST | .../properties/{propertyId}/images | Attach uploaded image | OWNER |
| PATCH | .../properties/{propertyId}/images/order | Reorder, set cover | OWNER |
| DELETE | .../properties/{propertyId}/images/{imageId} | Delete image | OWNER |
| POST | .../properties/{propertyId}/documents/uploads | Get document upload URL | OWNER |
| POST | .../properties/{propertyId}/documents | Attach document | OWNER |
| GET | .../properties/{propertyId}/documents | List documents and status | OWNER |
| GET | .../properties/{propertyId}/documents/{documentId}/download-url | Signed URL | OWNER, ADMIN |
| DELETE | .../properties/{propertyId}/documents/{documentId} | Remove (not if approved and in use) | OWNER |
| GET | /public/amenities | Amenity catalogue | PUBLIC |

(`orgId` = `/api/v1/owner/organisations/{organisationId}` prefix, shortened for the table.)

### 3. Detailed endpoint contracts

**Endpoint:** POST /api/v1/owner/organisations/{organisationId}/properties
**Access:** OWNER. **Idempotency-Key** required. 

Request:
```json
{
  "name": "Sharma Boys PG, Vijay Nagar",
  "propertyType": "PG",
  "description": "Fully furnished PG with AC rooms, 3 meals, 400 m from Treasure Island Mall.",
  "genderPreference": "MALE_ONLY",
  "foodAvailability": "VEG_ONLY",
  "foodIncluded": true,
  "totalFloors": 3,
  "yearBuilt": 2018,
  "address": {
    "line1": "45, Scheme 54",
    "line2": "Near Vijay Nagar Square",
    "city": "Indore",
    "state": "Madhya Pradesh",
    "localityId": "0192a000-0000-7000-8000-0000000000a1",
    "pincode": "452010",
    "latitude": 22.7533,
    "longitude": 75.8937
  },
  "contact": { "displayName": "Mr. Sharma", "phone": "+919826012345", "whatsapp": "+919826012345", "showPhonePublicly": false },
  "amenityCodes": ["WIFI", "AC", "POWER_BACKUP", "LAUNDRY", "CCTV"]
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| name | string | yes | 3 to 100, no phone numbers or URLs | Listing name |
| propertyType | enum | yes | `PG`, `HOSTEL`, `DORMITORY`, `SHARED_APARTMENT`, `INDEPENDENT_ROOM`, `FLAT`, `RENTAL_HOUSE`, `COLIVING` | Drives default inventory mode |
| description | string | no | max 3000; contact details stripped | Public text |
| genderPreference | enum | yes | `MALE_ONLY`, `FEMALE_ONLY`, `UNISEX` | Who can book |
| foodAvailability | enum | no | `NONE`, `VEG_ONLY`, `NON_VEG_ONLY`, `BOTH`, `OPTIONAL_PAID` | Food |
| foodIncluded | boolean | no | Only if availability is not `NONE` | In rent or not |
| totalFloors | integer | no | 1 to 60 | Informational |
| address.line1 | string | yes | 5 to 150 | Private; public shows locality only |
| address.localityId | uuid | yes | Must exist under `city`; locality's city must equal `city` | Normalised locality |
| address.pincode | string | yes | 6 digits, matches `^[1-8][0-9]{5}$` | |
| address.latitude, longitude | number | yes | Within India bounds (lat 6 to 37, lng 68 to 98); must fall within 25 km of locality centroid (assumption) | Geo point |
| contact.phone | string | yes | E.164 | Private by default |
| contact.showPhonePublicly | boolean | no | Default false | Public exposure is opt-in and is never shown before enquiry unless true |
| amenityCodes | string[] | no | Each exists in catalogue, max 60 | Amenities |

Success 201:
```json
{
  "id": "0192f1d0-4a00-7000-9000-0000000000b1",
  "organisationId": "0192f1c5-0001-7000-8a00-000000000001",
  "name": "Sharma Boys PG, Vijay Nagar",
  "slug": "sharma-boys-pg-vijay-nagar",
  "propertyType": "PG",
  "status": "DRAFT",
  "verificationStatus": "NOT_SUBMITTED",
  "listingStatus": "NOT_LISTED",
  "completeness": { "percent": 45, "missing": ["IMAGES_MIN_3", "DOCUMENT_OWNERSHIP", "ROOMS_MIN_1"] },
  "version": 1,
  "createdAt": "2026-11-10T18:25:00Z"
}
```
Errors: 422 `PLAN_LIMIT_EXCEEDED` (FREE plan allows 1 property), 422 `LOCALITY_CITY_MISMATCH`, 422 `COORDINATES_OUT_OF_RANGE`, 409 `DUPLICATE_PROPERTY` (same organisation, same name and pincode), 403 `ORGANISATION_SUSPENDED`.
Rules: property limit enforced inside the creation transaction by counting non-archived properties against the plan entitlement (see Module 18). `propertyType` is immutable after any room exists. Slug generated and uniquified. Database: `properties`, `property_amenities`, `audit_logs`; outbox event `PropertyCreated`.
Security: `organisationId` taken from the validated path context, not the body; body containing `organisationId` is rejected.

**GET .../properties**
Query:

| Param | Type | Description |
|---|---|---|
| limit | int 1 to 100 | default 20 |
| cursor | string | opaque |
| status | enum list | `DRAFT`, `PENDING_VERIFICATION`, `APPROVED`, `REJECTED`, `SUSPENDED`, `ARCHIVED` |
| propertyType | enum list | |
| city, localityId | string, uuid | |
| q | string | name search, min 2 chars |
| sortBy | enum | `createdAt` (default), `name`, `updatedAt` |
| sortOrder | enum | `desc` default |

Item: `id, name, propertyType, status, verificationStatus, listingStatus, city, locality, coverImageUrl, totalBeds, occupiedBeds, createdAt`. Counts come from a cached inventory summary.

**GET .../properties/{propertyId}** Full owner view: everything above plus `address` (exact), `contact`, `rules`, `amenities`, `images[]`, `documents[]` (metadata), `verification` summary, `inventorySummary`, `version`. Path validation: both IDs UUID; property must belong to organisation else 404.

**PATCH .../properties/{propertyId}**
Body: any of `name`, `description`, `genderPreference`, `foodAvailability`, `foodIncluded`, `totalFloors`, `contact`, plus required `version`. Rules: changes to `name`, `genderPreference`, `propertyType` or address on an APPROVED property move `verificationStatus` to `CHANGES_PENDING_REVIEW` but keep the listing live (assumption A11), except `genderPreference` change while tenancies are active (422 `ACTIVE_OCCUPANCY_CONFLICT`). Errors: 409 `VERSION_MISMATCH`, 422 `PROPERTY_ARCHIVED`.

**PUT .../properties/{propertyId}/address** Same address object as create. Moving coordinates more than 500 m on an approved property triggers re-verification. Response returns the normalised address.

**PUT .../properties/{propertyId}/amenities** Body `{ "amenityCodes": ["WIFI","AC"], "version": 3 }`. Full replacement; unknown code returns 400 listing the invalid codes. Amenity catalogue entries have `code`, `label`, `category` (`ROOM`, `BUILDING`, `FOOD`, `SAFETY`, `SERVICES`).

**PUT .../properties/{propertyId}/rules**
```json
{
  "rules": {
    "gateClosingTime": "23:00",
    "visitorsAllowed": true,
    "visitorsTiming": "09:00-20:00",
    "smokingAllowed": false,
    "alcoholAllowed": false,
    "petsAllowed": false,
    "noticePeriodDays": 30,
    "minStayMonths": 3,
    "lockInMonths": 0,
    "securityDepositMonths": 1,
    "cancellationPolicy": "FLEXIBLE",
    "customRules": ["No loud music after 10 PM"]
  }
}
```
Validation: times `HH:mm`; `noticePeriodDays` 0 to 90; `securityDepositMonths` 0 to 6 (multiples of 0.5); `customRules` max 15 items of 200 chars. These are snapshotted into every booking and agreement at the time it is created.

**POST .../properties/{propertyId}/archive**
Request: `{ "reason": "CLOSING_BUSINESS", "version": 7 }`. Rules (edge cases 20 and 22): 422 `PROPERTY_HAS_ACTIVE_OCCUPANCY` if any tenancy is ACTIVE or any booking is CONFIRMED with a future start date, or if unsettled deposits and open invoices exist (`details` lists counts). If allowed: listing unpublished, open holds released, pending bookings cancelled with notifications, status `ARCHIVED`. Historical data preserved. **DELETE** is allowed only for a DRAFT property that never had a booking, invoice or payment; otherwise 422 `PROPERTY_HAS_HISTORY` and the client must archive. Database: `properties`, `listings`, `booking_holds`, `inventory_occupancy`, `audit_logs`.

**POST .../properties/{propertyId}/verification-submissions**
Request: `{ "declaration": true, "notesForReviewer": "Rent agreement attached." }`
Success 202: `{ "verificationId": "0192...", "status": "SUBMITTED", "submittedAt": "2026-11-10T18:50:00Z", "estimatedReviewHours": 48 }`
Rules: preconditions checked, all failures returned together as 422 `VERIFICATION_PREREQUISITES_MISSING` with `details[]`: at least 3 images, cover image set, at least 1 room with pricing, ownership or authority document (sale deed, property tax receipt, electricity bill or rent agreement with owner NOC), owner ID proof, valid address and coordinates, organisation active. Duplicate submissions while one is open return 409 `VERIFICATION_IN_PROGRESS`. Event `PropertySubmittedForVerification`. Database: `verification_records`, `properties.verification_status`.

**GET .../properties/{propertyId}/verification**
```json
{
  "status": "REJECTED",
  "submittedAt": "2026-11-10T18:50:00Z",
  "reviewedAt": "2026-11-11T10:20:00Z",
  "rejection": { "reasonCode": "DOCUMENT_UNREADABLE", "message": "Electricity bill image is blurry.", "fields": ["documents.0b1f..."] },
  "canResubmit": true,
  "history": [ { "status": "SUBMITTED", "at": "..." } ]
}
```
Reviewer's internal notes are never exposed to the owner (edge case 18). After rejection the property returns to editable DRAFT state and listing stays unpublished.

**Images.** `POST .../images/uploads` body `{ "fileName": "room1.jpg", "contentType": "image/jpeg", "sizeBytes": 2400000 }`, validated: JPEG, PNG or WebP, max 10 MB, max 30 images per property; returns `{ "uploadId", "uploadUrl", "expiresInSeconds": 600 }`. `POST .../images` body `{ "uploadId": "...", "caption": "Double sharing room", "roomId": null, "isCover": false }` validates the object exists, passes malware and type sniffing, strips EXIF GPS, generates thumbnails. Errors 422 `UPLOAD_NOT_COMPLETED`, 422 `IMAGE_LIMIT_EXCEEDED`, 422 `IMAGE_REJECTED_CONTENT` (explicit content moderation). `PATCH .../images/order` body `{ "orderedImageIds": ["...","..."], "coverImageId": "..." }` must contain exactly the current set (else 422 `IMAGE_SET_MISMATCH`). `DELETE .../images/{imageId}` returns 204; cannot delete the last image of a PUBLISHED listing (422 `LISTING_REQUIRES_IMAGES`).

**Documents.** `documentType` enum: `OWNERSHIP_PROOF`, `PROPERTY_TAX_RECEIPT`, `ELECTRICITY_BILL`, `RENT_AGREEMENT_WITH_NOC`, `FIRE_NOC`, `POLICE_VERIFICATION`, `TRADE_LICENSE`, `OWNER_ID_PROOF`, `OTHER`. Upload flow as images (PDF, JPEG, PNG; 15 MB). `GET .../documents` returns metadata and `verificationStatus` per document (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`) with `rejectionReason`. `download-url` returns a 5 minute signed URL and writes an audit log; ADMIN access only while a verification record is open. Approved documents cannot be deleted while the property is APPROVED; they can be superseded by a new upload.

### 4. Workflow
Create property, set address, amenities, rules, add images, create inventory (Module 4), upload documents, submit; admin reviews (Module 19); on APPROVED the owner may publish a listing. A suspended owner calling publish gets 403 `ORGANISATION_SUSPENDED`; an admin-suspended property stays hidden publicly while owner can read it (edge case 17).

### 5. Edge cases
Owner submits with a missing document, submission rejected with every failed prerequisite listed; address typo corrected after approval triggers lightweight re-review without delisting; two staff-less devices edit simultaneously, `VERSION_MISMATCH`; image upload finishes after the client times out (complete call is idempotent and safe to retry); archive requested with active tenants is refused with counts.

---

# MODULE 4: Floor, room and bed inventory

### 1. Purpose
Model physical inventory and pricing and expose availability. Implements the `rentalMode` design from Part 1: `PER_BED`, `WHOLE_ROOM`, `WHOLE_UNIT`.

### 2. Endpoints overview

(`P` = `/api/v1/owner/organisations/{organisationId}/properties/{propertyId}`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | P/floors | Create floor | OWNER |
| GET | P/floors | List floors | OWNER |
| PATCH | P/floors/{floorId} | Update floor | OWNER |
| DELETE | P/floors/{floorId} | Delete empty floor | OWNER |
| POST | P/rooms | Create room (optionally with beds) | OWNER |
| GET | P/rooms | List rooms | OWNER |
| GET | P/rooms/{roomId} | Room detail | OWNER |
| PATCH | P/rooms/{roomId} | Update room | OWNER |
| DELETE | P/rooms/{roomId} | Archive or delete room | OWNER |
| POST | P/rooms/{roomId}/beds | Create beds | OWNER |
| PATCH | P/beds/{bedId} | Update bed | OWNER |
| POST | P/beds/{bedId}/status | Change bed status | OWNER |
| POST | P/beds/{bedId}/blocks | Block bed (date range) | OWNER |
| DELETE | P/beds/{bedId}/blocks/{blockId} | Unblock | OWNER |
| PUT | P/rooms/{roomId}/pricing | Set room pricing | OWNER |
| PUT | P/beds/{bedId}/pricing | Set bed pricing override | OWNER |
| GET | P/inventory | Full inventory tree | OWNER |
| GET | P/inventory/stats | Occupancy statistics | OWNER |
| GET | P/availability | Availability for date range | OWNER |

### 3. Detailed endpoint contracts

**POST P/floors** Body `{ "label": "Ground Floor", "level": 0, "notes": null }`. `label` 1 to 50 unique per property, `level` integer -3 to 60 unique per property. Returns floor with `roomCount: 0`. Error 409 `FLOOR_ALREADY_EXISTS`. DB: `floors`.
**GET P/floors** Query `limit`, `cursor`, `sortBy=level`. **PATCH** label and notes only; level change allowed if not clashing. **DELETE** returns 422 `FLOOR_NOT_EMPTY` if rooms exist (archive rooms first).

**POST P/rooms**
Request:
```json
{
  "floorId": "0192f1e0-0001-7000-8000-0000000000f1",
  "roomNumber": "101",
  "roomType": "DOUBLE_SHARING",
  "rentalMode": "PER_BED",
  "capacity": 2,
  "areaSqFt": 140,
  "hasAttachedBathroom": true,
  "isAc": true,
  "furnishing": "FULLY_FURNISHED",
  "amenityCodes": ["WARDROBE", "STUDY_TABLE"],
  "createBeds": true,
  "pricing": { "billingCycle": "MONTHLY", "rentPerBed": { "amount": 850000, "currency": "INR" }, "securityDeposit": { "amount": 850000, "currency": "INR" }, "bookingAmount": { "amount": 200000, "currency": "INR" }, "maintenanceCharge": { "amount": 0, "currency": "INR" } }
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| floorId | uuid | no | Belongs to property | Optional for single-level units |
| roomNumber | string | yes | 1 to 20, unique within property | Label |
| roomType | enum | yes | `SINGLE`, `DOUBLE_SHARING`, `TRIPLE_SHARING`, `QUAD_SHARING`, `DORMITORY`, `STUDIO`, `ONE_BHK`, `TWO_BHK`, `THREE_BHK`, `ENTIRE_UNIT` | Type |
| rentalMode | enum | yes | `PER_BED`, `WHOLE_ROOM`, `WHOLE_UNIT` | See Part 1 |
| capacity | int | yes | 1 to 40 (dorm) | People |
| areaSqFt | number | no | 20 to 10000 | |
| createBeds | boolean | no | Only valid when `PER_BED`; creates `capacity` beds labelled `101-A`, `101-B` | Convenience |
| pricing | object | no | See pricing contract | Optional here; required before verification |

Cross-field rules: `SINGLE` requires `capacity` 1; `DOUBLE_SHARING` 2; `TRIPLE_SHARING` 3; `QUAD_SHARING` 4; `DORMITORY` 5 to 40 and `PER_BED`; `ENTIRE_UNIT`, `ONE_BHK` to `THREE_BHK` require `WHOLE_UNIT` or `WHOLE_ROOM`; `PER_BED` rejects `ENTIRE_UNIT`. Property type constraint: `PG`, `HOSTEL`, `DORMITORY`, `COLIVING` allow `PER_BED` or `WHOLE_ROOM`; `FLAT`, `RENTAL_HOUSE` allow only `WHOLE_UNIT`; `INDEPENDENT_ROOM` allows `WHOLE_ROOM`; `SHARED_APARTMENT` allows all. Violations return 422 `ROOM_MODE_NOT_ALLOWED` or `ROOM_TYPE_CAPACITY_MISMATCH`.

Success 201:
```json
{
  "id": "0192f1e1-9000-7000-8000-000000000101",
  "roomNumber": "101",
  "floorId": "0192f1e0-0001-7000-8000-0000000000f1",
  "roomType": "DOUBLE_SHARING",
  "rentalMode": "PER_BED",
  "capacity": 2,
  "status": "ACTIVE",
  "beds": [
    { "id": "0192f1e1-9001-7000-8000-000000000a01", "label": "101-A", "status": "AVAILABLE" },
    { "id": "0192f1e1-9002-7000-8000-000000000a02", "label": "101-B", "status": "AVAILABLE" }
  ],
  "pricing": { "billingCycle": "MONTHLY", "rentPerBed": { "amount": 850000, "currency": "INR" } },
  "version": 1
}
```
Errors: 409 `ROOM_NUMBER_EXISTS`, 422 as above, 422 `PLAN_LIMIT_EXCEEDED` (beds or rooms cap per plan).
Rules: transactional create of room, beds, pricing. Plan limits are checked by `EntitlementService` inside the transaction. DB: `rooms`, `beds`, `room_pricing`, `bed_pricing`, `property_inventory_summary`.

**GET P/rooms** Query: `floorId`, `roomType`, `rentalMode`, `status` (`ACTIVE`, `ARCHIVED`, `UNDER_MAINTENANCE`), `availability` (`AVAILABLE`, `PARTIAL`, `FULL`), `minRent`, `maxRent`, `q`, `limit`, `cursor`, `sortBy` (`roomNumber`, `createdAt`, `rent`). **PATCH P/rooms/{roomId}** updates descriptive fields plus `version`; changing `rentalMode` or `capacity` fails with 422 `ROOM_HAS_ACTIVE_OCCUPANCY` if any hold, booking, tenancy or block exists; reducing capacity below bed count fails 422 `CAPACITY_BELOW_BED_COUNT`. **DELETE P/rooms/{roomId}**: hard delete only when no history, otherwise archive (status `ARCHIVED`); refused with 422 `ROOM_HAS_ACTIVE_OCCUPANCY` when occupied or booked; response 204 for delete and 200 with `{ "status": "ARCHIVED" }` for archive (query `mode=archive|delete`, default `archive`).

**POST P/rooms/{roomId}/beds** Body `{ "beds": [ { "label": "101-C", "bedType": "BUNK_UPPER" } ] }`. `bedType` enum: `SINGLE_BED`, `BUNK_UPPER`, `BUNK_LOWER`, `DOUBLE_BED`. Only for `PER_BED` rooms (422 `ROOM_NOT_BED_LEVEL`); total beds cannot exceed capacity (422 `BED_COUNT_EXCEEDS_CAPACITY`). New beds inherit room pricing. **PATCH P/beds/{bedId}** label and bedType only.

**POST P/beds/{bedId}/status**
Request: `{ "targetStatus": "UNDER_MAINTENANCE", "reason": "Mattress replacement", "until": "2026-11-20" }`. Owner-settable statuses: `AVAILABLE`, `UNDER_MAINTENANCE`, `INACTIVE`. Statuses `HELD`, `BOOKED`, `OCCUPIED` are system-controlled and rejected with 422 `STATUS_SYSTEM_MANAGED`. Transition to `UNDER_MAINTENANCE` or `INACTIVE` is refused (422 `BED_HAS_ACTIVE_OCCUPANCY`) if an overlapping hold, booking or tenancy exists. Full transition table in Part 7.

**POST P/beds/{bedId}/blocks** Body `{ "startDate": "2026-12-01", "endDate": "2026-12-15", "reason": "OWNER_USE" }`; `reason` enum `OWNER_USE`, `MAINTENANCE`, `OTHER`; end after start; max 180 days. Creates an `inventory_occupancy` row with `source_type = BLOCK`; exclusion constraint produces 409 `INVENTORY_UNAVAILABLE` on overlap with holds, bookings or tenancies. Returns `{ "blockId", ... }`. **DELETE blocks/{blockId}** releases it. This is how temporary unavailability (edge case 19) is modelled without changing room or listing status.

**PUT P/rooms/{roomId}/pricing**
```json
{
  "billingCycle": "MONTHLY",
  "rent": { "amount": 850000, "currency": "INR" },
  "securityDeposit": { "amount": 850000, "currency": "INR" },
  "bookingAmount": { "amount": 200000, "currency": "INR" },
  "maintenanceCharge": { "amount": 50000, "currency": "INR" },
  "electricityBilling": "INCLUDED",
  "effectiveFrom": "2026-12-01",
  "discounts": [ { "type": "LONG_STAY", "minMonths": 6, "percent": 5 } ]
}
```
Validation: `billingCycle` `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`; `rent` 100000 to 20000000 paise (INR 1,000 to 2,00,000); `securityDeposit` 0 to 6x monthly rent; `bookingAmount` at most 1x monthly rent and part of first payment; `electricityBilling` `INCLUDED`, `METERED`, `FIXED_MONTHLY`; `effectiveFrom` today or later; `percent` 0 to 30. Pricing is versioned: a new row is created with `effectiveFrom`; old rows kept. Existing bookings and tenancies keep their price snapshot (edge case 25). Response returns the full pricing timeline. Errors 422 `DEPOSIT_EXCEEDS_LIMIT`, 422 `EFFECTIVE_DATE_IN_PAST`. **PUT P/beds/{bedId}/pricing** same shape, creates a bed-level override (used for different rent for upper bunk or window bed); absent override means inherit from room. Price displayed in search is the minimum effective bed or room price.

**GET P/inventory** Returns the tree `floors → rooms → beds` with status, current occupant reference (tenancy ID only, no personal data), pricing summary. Query: `status`, `floorId`, `includeArchived`. Not paginated beyond a hard limit of 1000 beds; larger properties use `GET P/rooms`.

**GET P/inventory/stats**
```json
{
  "totalRooms": 18, "totalBeds": 42,
  "byStatus": { "AVAILABLE": 9, "HELD": 1, "BOOKED": 3, "OCCUPIED": 27, "UNDER_MAINTENANCE": 2, "INACTIVE": 0 },
  "occupancyRate": 0.64,
  "revenuePotential": { "amount": 35700000, "currency": "INR" },
  "asOf": "2026-11-10T18:30:00Z"
}
```
`occupancyRate = OCCUPIED beds / (total beds - INACTIVE beds)`; whole-room units are counted by capacity. Computed live from `inventory_occupancy`.

**GET P/availability**
Query: `from` (date, required), `to` (date, required, max 365 days from `from`), `roomType`, `rentalMode`, `unitType` (`ROOM`, `BED`), `groupBy` (`UNIT`, `DAY`). Response (`groupBy=UNIT`):
```json
{
  "from": "2026-12-01", "to": "2026-12-31",
  "units": [
    { "unitType": "BED", "bedId": "0192...a01", "label": "101-A", "roomNumber": "101",
      "freeRanges": [ { "from": "2026-12-01", "to": "2026-12-14" }, { "from": "2026-12-21", "to": "2026-12-31" } ],
      "occupiedRanges": [ { "from": "2026-12-15", "to": "2026-12-20", "sourceType": "BOOKING" } ] }
  ]
}
```
Owner view includes source types; public availability (Module 5) only shows counts.

### 4. Workflow
Create floors, rooms (beds auto-created), set pricing; inventory summary feeds listing completeness, booking (Module 7) and analytics (Module 20). Whole-room rentals: booking item points to the room and the occupancy ledger writes one claim per bed (or per room for `WHOLE_UNIT`).

### 5. Edge cases
Owner converts a PG room from per-bed to whole-room while one bed is occupied (refused); a bed is blocked while a tenant has a hold on it (409); owner reduces rent while bookings exist (prices snapshotted); two requests create room `101` concurrently (unique constraint, one gets 409); owner deletes a room with tenancy history (becomes archive).

---

# MODULE 5: Marketplace and listing discovery

### 1. Purpose
Public discovery of accommodation, tenant-side favourites, reviews and reports, and the owner-side listing lifecycle. Only `APPROVED` properties with `PUBLISHED` listings are publicly visible.

### 2. Endpoints overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /public/listings/search | Advanced search (complex filters, map) | PUBLIC |
| GET | /public/listings | Simple search via query string | PUBLIC |
| GET | /public/listings/{listingIdOrSlug} | Listing details | PUBLIC (enriched if authenticated) |
| GET | /public/listings/{listingId}/availability | Availability summary for dates | PUBLIC |
| GET | /public/listings/{listingId}/similar | Similar listings | PUBLIC |
| GET | /public/listings/featured | Featured listings | PUBLIC |
| GET | /public/localities | Localities for a city | PUBLIC |
| GET | /public/cities | Supported cities | PUBLIC |
| GET | /public/listings/{listingId}/reviews | Reviews | PUBLIC |
| GET | /me/favourites | My favourites | USER |
| PUT | /me/favourites/{listingId} | Add favourite (idempotent) | USER |
| DELETE | /me/favourites/{listingId} | Remove | USER |
| POST | /public/listings/{listingId}/reports | Report listing (anonymous allowed with captcha) | PUBLIC or USER |
| POST | /owner/organisations/{organisationId}/properties/{propertyId}/listing/publish | Publish | OWNER |
| POST | .../listing/unpublish | Unpublish | OWNER |
| PATCH | .../listing | Edit listing presentation | OWNER |
| GET | .../listing | Owner view of listing and stats | OWNER |

Review submission, editing and moderation endpoints are specified in Module 17 (Part 5); report handling in Modules 17 and 19.

### 3. Detailed endpoint contracts

**Endpoint:** POST /api/v1/public/listings/search
**Access:** PUBLIC. No authentication required; if a valid token is sent, `isFavourite` is populated. **Purpose:** Scalable search contract supporting all filters in one body (a GET equivalent exists with the same parameters flattened for the simple cases and for SEO or caching).

Request:
```json
{
  "city": "Indore",
  "localityIds": ["0192a000-0000-7000-8000-0000000000a1"],
  "near": { "latitude": 22.7533, "longitude": 75.8937, "radiusMeters": 3000 },
  "bounds": null,
  "propertyTypes": ["PG", "HOSTEL"],
  "sharingTypes": ["DOUBLE_SHARING", "TRIPLE_SHARING"],
  "genderPreference": "MALE_ONLY",
  "budget": { "min": 500000, "max": 1000000 },
  "amenityCodes": ["WIFI", "AC"],
  "amenityMatch": "ALL",
  "foodAvailability": ["VEG_ONLY", "BOTH"],
  "availability": { "from": "2026-12-01", "to": null, "minAvailableUnits": 1 },
  "verifiedOnly": true,
  "minRating": 4.0,
  "q": "near IPS Academy",
  "sortBy": "RELEVANCE",
  "sortOrder": "DESC",
  "limit": 20,
  "cursor": null
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| city | string | no | Supported city (launch: Indore) | Required unless `near` or `bounds` is set |
| localityIds | uuid[] | no | max 10 | Filter by locality |
| near | object | no | lat/lng in range, `radiusMeters` 100 to 25000 | Radius search |
| bounds | object | no | `{ north, south, east, west }`, area max 100 km square | Map viewport; mutually exclusive with `near` |
| propertyTypes | enum[] | no | PropertyType values | |
| sharingTypes | enum[] | no | `SINGLE`, `DOUBLE_SHARING`, `TRIPLE_SHARING`, `QUAD_SHARING`, `DORMITORY`, `WHOLE_UNIT` | Matches available units, not just any room |
| genderPreference | enum | no | `MALE_ONLY`, `FEMALE_ONLY`, `UNISEX` | |
| budget.min / max | paise | no | `min <= max`, each 0 to 20000000 | Monthly rent per bed or unit |
| amenityCodes | string[] | no | max 20 | |
| amenityMatch | enum | no | `ALL` (default), `ANY` | |
| availability.from | date | no | today to +365 days | Move-in date |
| availability.to | date | no | after `from`, max 365 days | Optional stay end |
| verifiedOnly | boolean | no | default false | Verified badge |
| minRating | number | no | 1 to 5 | |
| q | string | no | 2 to 100 | Name or locality text |
| sortBy | enum | no | `RELEVANCE`, `PRICE`, `DISTANCE`, `RATING`, `NEWEST`; `DISTANCE` requires `near` | |
| limit | int | no | 1 to 50, default 20 | |
| cursor | string | no | opaque signed | |

Success:
```json
{
  "items": [
    {
      "listingId": "0192f200-0000-7000-8000-000000000001",
      "slug": "sharma-boys-pg-vijay-nagar",
      "name": "Sharma Boys PG, Vijay Nagar",
      "propertyType": "PG",
      "genderPreference": "MALE_ONLY",
      "locality": { "id": "0192a000-...", "name": "Vijay Nagar" },
      "approxLocation": { "latitude": 22.753, "longitude": 75.894 },
      "distanceMeters": 850,
      "priceFrom": { "amount": 750000, "currency": "INR", "per": "MONTH" },
      "sharingOptions": [ { "sharingType": "DOUBLE_SHARING", "priceFrom": { "amount": 850000, "currency": "INR" }, "availableUnits": 3 } ],
      "amenities": ["WIFI", "AC", "POWER_BACKUP"],
      "coverImage": { "url": "https://cdn.example.com/p/b1/cover.webp", "thumbnailUrl": "https://cdn.example.com/p/b1/cover_t.webp" },
      "rating": { "average": 4.3, "count": 27 },
      "isVerified": true,
      "isFeatured": false,
      "availabilityBadge": "AVAILABLE_FROM_2026-12-01",
      "isFavourite": false
    }
  ],
  "facets": { "propertyType": { "PG": 41, "HOSTEL": 9 }, "sharingType": { "DOUBLE_SHARING": 33 }, "priceBuckets": [ { "min": 0, "max": 500000, "count": 12 } ] }
}
```
`meta.pagination` carries `limit`, `nextCursor`, `hasMore`. `facets` only on the first page (when `cursor` is null) to save work.
Errors: 400 `VALIDATION_ERROR` (conflicting `near` and `bounds`, `DISTANCE` sort without `near`), 400 `MALFORMED_REQUEST` (cursor from a different sort), 429.
Business rules: only listings with `status = PUBLISHED`, property `APPROVED`, organisation `ACTIVE`; search ranking default blends text relevance, distance, rating, recency and a paid `featured` boost capped so that featured items occupy at most the top 2 slots of page 1 and are labelled `isFeatured`; the availability filter uses `listing_availability` (denormalised, refreshed by events and a 5 minute job); results are advisory and booking re-checks authoritatively. Exact address, owner contact (unless `showPhonePublicly`), documents, internal notes and organisation tax IDs are never in search payloads; coordinates are rounded to 3 decimals (about 100 m).
Database: reads `listings`, `properties`, `listing_availability`, `property_amenities`, `reviews` aggregates. At scale: Postgres with PostGIS and trigram or full-text indexes for MVP; move to a search engine (OpenSearch or Typesense) when search load or ranking complexity warrants (P2), keeping this contract unchanged.
Security: IP rate limit 120 per minute; no user identifiers cached in shared CDN responses; the authenticated variant sets `Cache-Control: private`.

**GET /api/v1/public/listings** Flat query parameters with the same names: `city`, `localityId`, `lat`, `lng`, `radius`, `propertyType`, `sharingType`, `gender`, `minPrice`, `maxPrice`, `amenities` (comma list), `availableFrom`, `availableTo`, `verifiedOnly`, `minRating`, `q`, `sortBy`, `sortOrder`, `limit`, `cursor`. Cacheable (`Cache-Control: public, max-age=60`). Anonymous results only; `isFavourite` not populated.

**GET /api/v1/public/listings/{listingIdOrSlug}**
Path: UUID or slug. Success (public shape, with tenant additions marked):
```json
{
  "listingId": "0192f200-0000-7000-8000-000000000001",
  "slug": "sharma-boys-pg-vijay-nagar",
  "name": "Sharma Boys PG, Vijay Nagar",
  "description": "Fully furnished PG ...",
  "propertyType": "PG",
  "genderPreference": "MALE_ONLY",
  "foodAvailability": "VEG_ONLY",
  "foodIncluded": true,
  "locality": { "id": "...", "name": "Vijay Nagar" },
  "city": "Indore",
  "approxLocation": { "latitude": 22.753, "longitude": 75.894 },
  "images": [ { "id": "...", "url": "...", "thumbnailUrl": "...", "caption": "Double sharing room" } ],
  "amenities": [ { "code": "WIFI", "label": "Wi-Fi", "category": "SERVICES" } ],
  "rules": { "gateClosingTime": "23:00", "visitorsAllowed": true, "smokingAllowed": false, "noticePeriodDays": 30, "minStayMonths": 3 },
  "pricing": [ { "sharingType": "DOUBLE_SHARING", "rent": { "amount": 850000, "currency": "INR" }, "securityDeposit": { "amount": 850000, "currency": "INR" }, "bookingAmount": { "amount": 200000, "currency": "INR" }, "availableUnits": 3, "billingCycle": "MONTHLY" } ],
  "rating": { "average": 4.3, "count": 27, "distribution": { "5": 15, "4": 8, "3": 3, "2": 1, "1": 0 } },
  "isVerified": true,
  "owner": { "displayName": "Sharma Student Living", "memberSince": "2026", "responseTimeHours": 3 },
  "contact": { "phoneVisible": false },
  "viewer": { "isFavourite": false, "hasEnquired": false, "hasBooking": false, "canReview": false, "exactAddress": null }
}
```
`viewer` appears only when authenticated. Rule: `viewer.exactAddress` and the `contact.phone` are populated only after a confirmed visit or booking for that listing (authenticated tenant tier); owner tier data (documents, internal notes, org IDs, verification detail) is never returned. Errors: 404 `RESOURCE_NOT_FOUND` for unpublished, suspended or archived listings (identical to non-existence). Side effect: view counter incremented asynchronously, deduplicated per session.

**GET .../listings/{listingId}/availability** Query `from`, `to` (max 120 days), optional `sharingType`. Returns per sharing type `availableUnits` and `nextAvailableDate`, never individual bed IDs. Cached 60 seconds. Booking flow then asks for specific beds or lets owner or system assign (Module 7).

**GET .../similar** Query `limit` (max 12). Similar means same city, same property type, overlapping price band (within 25 percent), within 5 km, excluding the source and unpublished listings; ordered by rating and distance.

**GET /public/listings/featured** Query `city`, `limit` (max 12). Only listings with an active paid feature slot (Module 18) or admin curation, labelled `isFeatured: true`. Rotation is randomised per request within the paid pool to be fair.

**GET /public/cities** and **GET /public/localities** (query `cityId`, `q`, `limit`, `cursor`): reference data, returns `id`, `name`, `slug`, `centroid`, `listingCount`; cached for 1 hour.

**GET .../listings/{listingId}/reviews** Query `limit`, `cursor`, `sortBy` (`NEWEST`, `HIGHEST`, `LOWEST`), `minRating`. Items show `rating`, `title`, `comment`, `reviewerDisplayName` (first name and initial only, e.g. "Rahul K."), `stayMonth`, `isVerifiedStay`, `ownerReply`. Reviewer identity beyond that is never exposed. Review creation rules are in Module 17.

**Favourites.** `PUT /me/favourites/{listingId}` is idempotent, returns 200 `{ "listingId", "favouritedAt" }`; 404 if listing not public; max 200 favourites (422 `FAVOURITES_LIMIT_EXCEEDED`). `GET /me/favourites` query `limit`, `cursor`, `sortBy=favouritedAt`; unpublished listings are returned with `listingStatus: "UNAVAILABLE"` and minimal fields so the tenant understands why it vanished. DB: `favourites` unique `(user_id, listing_id)`.

**POST /public/listings/{listingId}/reports**
Request:
```json
{
  "reason": "FRAUDULENT_OR_FAKE",
  "details": "Owner asked for advance via UPI before visit, photos match another PG.",
  "evidenceUploadIds": ["upl_01JC9Z1"],
  "reporterContact": null,
  "captchaToken": null
}
```
`reason` enum: `FRAUDULENT_OR_FAKE`, `INCORRECT_INFORMATION`, `PRICE_MISMATCH`, `ALREADY_RENTED`, `INAPPROPRIATE_CONTENT`, `DISCRIMINATION`, `OTHER`; `details` 10 to 1000 chars; max 3 evidence files. Anonymous reports require `captchaToken`; authenticated users limited to 5 per day, one open report per listing per user (409 `REPORT_ALREADY_OPEN`). Response 201 `{ "reportId", "status": "OPEN" }`. Reporter identity is hidden from the owner. Three distinct reporters with reason `FRAUDULENT_OR_FAKE` auto-flags the listing for priority admin review without auto-removal (edge case 24; admin handling in Module 19). DB: `listing_reports`, `audit_logs`.

**POST .../listing/publish** Access: OWNER, `@RequiresActiveOrganisation`. Request `{ "headline": "AC PG near Vijay Nagar Square, meals included", "publicDescription": "...", "showPhonePublicly": false, "version": 4 }`. Preconditions: property `APPROVED`, at least one rentable unit with pricing, at least 3 images, subscription entitlement (`activeListingLimit`), organisation `ACTIVE`. Errors: 422 `PROPERTY_NOT_APPROVED`, 422 `LISTING_INCOMPLETE` (with `details`), 422 `PLAN_LIMIT_EXCEEDED`, 403 `ORGANISATION_SUSPENDED`. Success `{ "status": "PUBLISHED", "publishedAt": "...", "publicUrl": "/pg/indore/sharma-boys-pg-vijay-nagar" }`. Event `ListingPublished`; search index and `listing_availability` refreshed. **unpublish** sets `UNPUBLISHED` (reason required) without touching bookings or tenancies; if the subscription expires (edge case 21) a job moves excess listings to `UNPUBLISHED_PLAN_LIMIT` while occupancy and tenancies continue untouched. **PATCH listing** edits presentation fields only. **GET listing** returns `status`, `views30d`, `enquiries30d`, `favourites`, `searchImpressions30d`, `featuredUntil`.

### 4. Workflow
Owner publishes (after verification) → public search shows it → tenant favourites, enquires (Module 6), books (Module 7). Price or availability changes publish events that refresh `listing_availability`.

### 5. Edge cases
Listing unpublished while a tenant is viewing it (detail returns 404, booking creation fails 422 `LISTING_NOT_AVAILABLE`); search result says 3 beds available but all are taken by the time of booking (hold insert returns 409); owner phone scraping (hidden by default, rate limits, no bulk endpoints); duplicate listing of same address by two organisations (flagged by address and coordinate similarity for admin review); map search with huge viewport (rejected by area cap); cursor reused after sort change (400).

---

# PART 2 STATUS

**Completed:** Modules 1 to 5 contracts: authentication/profile, organisation, property (including verification, media and documents), inventory (floors, rooms, beds, pricing, availability), marketplace (search contract, details, favourites, reports, publishing).

**Remaining:** Part 3 (Modules 6 to 9: enquiries, visits, booking, tenant, tenancy), Part 4 (10 to 13), Part 5 (14 to 18), Part 6 (19, 20), Part 7 (enums, state machines, edge cases), Part 8 (NestJS, Turborepo, OpenAPI, testing, priorities).

**Assumptions and new tables introduced in Part 2**

| ID | Item | Decision needed |
|---|---|---|
| A11 | Edits to an approved property's sensitive fields move it to `CHANGES_PENDING_REVIEW` but keep it listed | Keep listed, or delist until re-approved? |
| A12 | Max 3 organisations per user; FREE plan = 1 property | Confirm plan limits (Module 18) |
| A13 | Account deactivation reactivatable for 90 days; deletion has 30 day cooling period with anonymisation, financial records retained | Confirm retention periods with legal advice |
| A14 | Public coordinates rounded to about 100 m; exact address only after confirmed visit or booking | Or exact address after enquiry? |
| A15 | Search starts in PostgreSQL (PostGIS plus trigram), contract stays stable for a later search engine | Confirm |
| A16 | Anonymous listing reports allowed with captcha | Or require login? |
| New tables | `user_auth_identities`, `idempotency_keys`, `outbox_events`, `notification_preferences`, `account_deletion_requests`, `inventory_occupancy`, `property_inventory_summary` | Approve additions |

