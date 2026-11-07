# Hujju INR Subscription & Multi-Platform UPI Payment Gateway Architecture

This plan introduces a four-tier Indian Rupee (`INR` / `₹`) subscription and billing system (**Free**, **1 Month**, **3 Months**, and **1 Year**) powered by **UPI (`9975649957@mbk`)**, combining the official MobiKwik merchant QR code, NPCI `upi://pay` deep-link intents for Android APK and Mobile PWA, and online payment gateway flows (**Razorpay** and **Cashfree**) with real-time cross-device entitlement synchronization.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and pricing decisions were confirmed during our interactive planning review and govern the implementation across Desktop Web, Mobile PWA, and Android APK:

- **Confirmed Decision 1 — INR Subscription Tiers & Pricing**:
  - **Free Version (`₹0`)**: Forever free tier with daily usage quotas (15 AI Assistant & Voice interactions/day, 3 Document Intelligence analyses/day, basic workspace notes).
  - **1 Month Pro (`₹299 / month`)**: Full monthly access to unlimited Gemini Live Voice, Multi-LLM Router, Creative Media Studio, E2EE Cloud Sync, and Android APK node sync.
  - **3 Months Pro (`₹799 / 3 months`)**: Quarterly plan (`₹266/mo` effective rate, saving ~11%) with all Pro entitlements and priority multi-model routing.
  - **1 Year Annual Pro (`₹2,499 / year`)**: Annual flagship plan (`₹208/mo` effective rate, saving ~30%) with all Pro entitlements, unlimited E2EE vault storage, and dedicated enterprise audit logs.
- **Confirmed Decision 2 — Merchant UPI Identity & Multi-Gateway Checkout**:
  - All payments route to the verified merchant UPI ID **`9975649957@mbk`** and display the attached MobiKwik QR code (`/assets/aistudio/6303194498267288848_b8e510aa.jpg`) alongside dynamic NPCI `upi://pay` links pre-populated with the exact INR plan amount and order reference.
  - Supports three safe online-compatible checkout channels: **Direct UPI QR & App Intent (GPay / PhonePe / Paytm / MobiKwik / BHIM)**, **Razorpay UPI Standard Checkout (UPI Collect / VPA & QR)**, and **Cashfree Payments UPI Gateway**, verified via 12-digit NPCI UTR (Unique Transaction Reference) or gateway HMAC signature.
- **Confirmed Decision 3 — Cross-Platform Entitlement Enforcement**:
  - Subscription state and transaction receipts persist to both **Firebase Firestore** (real-time device sync across Web, Mobile PWA, and Android APK) and **Cloud SQL PostgreSQL** (immutable relational billing & invoice ledger).

---

## 1. Overview & Core Concept

- **What It Does**: Provides an end-to-end subscription management, quota metering, and UPI payment checkout experience tailored for Indian Rupee (`INR`) transactions across desktop browsers, mobile web PWAs, and packaged Android APKs.
- **Target Audience / Persona**: Individual professionals, developers, and teams using Hujju across desktop workstations and Android handsets who want frictionless INR upgrades via UPI (`9975649957@mbk`) and trusted Indian payment gateways.
- **Key Value**: Eliminates friction between desktop QR scanning and mobile one-tap UPI app switching while maintaining cryptographic receipt auditability and instant cross-device Pro activation.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Plan Discovery & Comparison**: Users open the **Subscriptions & UPI Billing** studio (or click the plan status indicator) to compare the **Free (`₹0`)**, **1 Month (`₹299`)**, **3 Months (`₹799`)**, and **1 Year (`₹2,499`)** plans in a 4-column pricing matrix with concrete quota figures.
  2. **Unified UPI & Gateway Checkout Modal**: Selecting a paid tier generates a server-signed Order ID (`ORD_HUJJU_...`) and opens the **Secure INR UPI Checkout** modal with three selectable gateway modes:
     - **Scan MobiKwik UPI QR & App Deep Links**: Displays the merchant QR (`/assets/aistudio/6303194498267288848_b8e510aa.jpg`), copyable UPI ID **`9975649957@mbk`**, and one-tap mobile intent launchers (**Google Pay**, **PhonePe**, **Paytm**, **MobiKwik**, **BHIM UPI**) with exact INR amount pre-filled (`am=299.00&cu=INR`).
     - **Razorpay Secure UPI Checkout**: Online compatible gateway flow supporting VPA Collect (`user@okaxis`, `user@ybl`, etc.) and instant UPI callback verification.
     - **Cashfree Payments Seamless UPI**: Online compatible gateway flow with order token generation, UPI Intent/Collect status polling, and HMAC-SHA256 receipt verification.
  3. **Instant Verification & Receipt Issuance**: Users complete payment and submit/verify their 12-digit NPCI UTR number or complete the online gateway callback. The server validates the transaction, upgrades the user's active tier (`1m`, `3m`, or `1y`), calculates the exact expiration timestamp, syncs across all connected devices, and generates a downloadable GST/INR tax invoice receipt.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-trust fintech & enterprise SaaS precision matching Hujju's dark-slate (`#0B0F19` / `#0F172A`) and crisp light (`#F8FAFC` / `#FFFFFF`) dual-theme architecture.
  - *Color Palette & Mood*: 60% neutral slate canvas, 30% structured 1px-bordered surfaces, and 10% warm amber (`#D97706`) & emerald (`#16A34A`) semantic accents for verified UPI security states and active plan indicators.
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for plan headings and INR price callouts, `DM Sans` for feature matrices, and `JetBrains Mono` (`tabular-nums`) for INR prices (`₹299`, `₹799`, `₹2,499`), 12-digit UTR references, UPI IDs (`9975649957@mbk`), and countdown/renewal dates.
  - *Component Styling & Layout*: Single-elevation cards with clean unboxed metadata (`·` separators), high-contrast QR presentation frame for reliable mobile camera scanning in both dark and light modes, and single-line action buttons.
- **Interactive Feedback & Motion**:
  - One-click UPI ID copy with instant confirmation feedback, live order timer, real-time gateway verification state transitions, and immediate quota bar updates upon plan activation.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Hybrid NPCI UPI Deep Links + Online Gateway Abstraction (Razorpay & Cashfree)**:
  - *Chosen Approach*: Combine direct NPCI `upi://pay` URI generation and the official MobiKwik QR (`/assets/aistudio/6303194498267288848_b8e510aa.jpg`) for `9975649957@mbk` with server-side Razorpay and Cashfree order/verification endpoints and 12-digit UTR verification.
  - *Why*: On mobile web and Android APK, `upi://pay?pa=9975649957@mbk...` invokes installed UPI apps natively with zero intermediary redirect delay; on desktop web, users can scan the MobiKwik QR code with their phone or use Razorpay/Cashfree UPI Collect requests.
  - *Alternatives Considered*: Redirect-only web checkout was passed over because native UPI intent deep links provide significantly higher completion rates on Android devices and PWAs.
- **Decision 2 — Dual Persistence in Firestore + Cloud SQL PostgreSQL**:
  - *Chosen Approach*: Store active user subscription entitlements and UPI transaction history in Firestore for instant real-time `onSnapshot` synchronization across Desktop, PWA, and Android APK nodes, while logging immutable payment audit records in Cloud SQL PostgreSQL.
  - *Why*: Ensures offline-capable real-time entitlement checks on every device while maintaining a relational financial audit trail in `europe-west1`.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-PLATFORM CLIENT LAYER (WEB / PWA / ANDROID APK)                  │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────────┐  │
│  │ 4-Tier INR Plan Matrix    │ │ UPI & Gateway Checkout    │ │ Quota & Billing Ledger  │  │
│  │ • Free (₹0)               │ │ • QR: 9975649957@mbk      │ │ • Daily Free Usage Meter│  │
│  │ • 1 Month (₹299)          │ │ • NPCI upi://pay Intents  │ │ • Active Plan Badge     │  │
│  │ • 3 Months (₹799)         │ │ • Razorpay & Cashfree Flow│ │ • GST/INR Invoice Export│  │
│  │ • 1 Year (₹2,499)         │ │ • 12-Digit UTR Verifier   │ │ • Renewal Countdown     │  │
│  └─────────────┬─────────────┘ └─────────────┬─────────────┘ └────────────┬────────────┘  │
└────────────────┼─────────────────────────────┼────────────────────────────┼───────────────┘
                 │                             │                            │
                 ▼                             ▼                            ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                      SERVER-SIDE PAYMENT & ENTITLEMENT ENGINE (EXPRESS)                   │
│  • POST /api/payments/create-order  ──► Generates signed Order ID & NPCI UPI Intent URI   │
│  • POST /api/payments/verify-upi    ──► Validates 12-digit UTR & HMAC-SHA256 Signature    │
│  • GET  /api/payments/config        ──► Returns Merchant VPA (9975649957@mbk) & Gateways  │
└──────────────────────────────┬────────────────────────────────────────────┬───────────────┘
                               │                                            │
                               ▼                                            ▼
┌─────────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│     FIREBASE FIRESTORE (REAL-TIME SYNC)     │  │     CLOUD SQL POSTGRESQL (EUROPE-WEST1)  │
│  • /subscriptions/{subId} (Active Tier,     │  │  • Relational Billing & Transaction      │
│    ExpiresAt, Quota, UPI UTR, Gateway)      │  │    Audit Ledger (INR Amount, UTR, Plan)  │
└─────────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

### Data Model & State

1. **Subscription Plan Catalog (`INR_SUBSCRIPTION_PLANS`)**:
   - `free`: `₹0`, duration `forever`, daily quota `15` AI interactions, `3` document analyses.
   - `1m`: `₹299`, duration `30 days`, unlimited AI, voice, media, router, and E2EE sync.
   - `3m`: `₹799`, duration `90 days`, unlimited AI + quarterly savings (`₹266/mo`).
   - `1y`: `₹2,499`, duration `365 days`, unlimited AI + annual best-value savings (`₹208/mo`).
2. **Firestore `subscriptions` Collection & Security Rules**:
   - Schema fields: `planId` (`'free' | '1m' | '3m' | '1y'`), `planName`, `amountInr` (`0 | 299 | 799 | 2499`), `currency` (`'INR'`), `merchantUpiId` (`'9975649957@mbk'`), `gateway` (`'upi_qr_intent' | 'razorpay' | 'cashfree'`), `utrNumber` (12-digit numeric string), `orderId`, `status` (`'active' | 'expired'`), `startedAt`, `expiresAt`, `ownerId`.
3. **Android APK & Mobile PWA UPI Intent Integration**:
   - Updates the Android TWA manifest and service worker rules to allow seamless external protocol navigation for `upi://pay`, `tez://upi/pay`, `phonepe://pay`, and `paytmmp://pay` so clicking any UPI app button on Android launches the installed payment app directly with `pa=9975649957@mbk&am=<INR_AMOUNT>&cu=INR`.

### Interactive Component & State Mapping

- **Plan Selection Handler**: Clicking `"Upgrade via UPI (₹299 / ₹799 / ₹2,499)"` calls `POST /api/payments/create-order`, locks in the plan amount in INR, computes the dynamic `upi://pay?pa=9975649957@mbk...` URI, and opens the checkout modal.
- **Gateway Mode Switcher**: Toggles between **Direct MobiKwik QR & UPI App Intents**, **Razorpay UPI Checkout**, and **Cashfree UPI Gateway** without losing the active order context.
- **UTR & Gateway Verification Handler**: Validates the 12-digit NPCI UTR (`/^\d{12}$/`) or gateway payment token via `POST /api/payments/verify-upi`, writes the verified subscription record to Firestore and Cloud SQL, unlocks unlimited platform quotas immediately, and renders a printable INR receipt.
