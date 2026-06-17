# Pulse Brokerage App - Full Stack Implementation Plan

This document outlines the architecture and execution plan to transform our approved UI prototype into a production-grade, full-stack web application.

> [!NOTE]
> The UI/UX prototype has been fully approved by the user and their father. The complex business logic (partial loading, traditional ditto-mark invoices, split brokerage billing) is finalized. We will now replicate this exact logic in a robust backend.

## 1. Technology Stack

*   **Backend:** Java 21 with Spring Boot 3
*   **Database:** H2 Database (for initial local development/testing) migrating to PostgreSQL (for production). Spring Data JPA for ORM.
*   **Frontend:** React 18 with Vite
*   **Styling:** Tailwind CSS (reusing the exact CSS and design system from our prototype)
*   **Build Tools:** Maven (Backend) and npm (Frontend)

## 2. Proposed Architecture & Data Models

### Mobile Strategy & Free Cloud Deployment
Your goals to eventually have an Android app and host everything for free fit perfectly with this plan. 
*   **Android Ready:** Because we are separating the backend (Spring Boot API) from the frontend (React), the backend will serve as a universal REST API. When you are ready for an Android app, you can either wrap the React app using **Capacitor/Ionic** to create a mobile app quickly, or build a native Android app that talks to this exact same backend. No backend rewrite will be needed!
*   **Free Cloud Hosting:**
    *   **Frontend (React):** We can deploy this completely free on **Vercel** or **Netlify**.
    *   **Backend (Spring Boot):** We can deploy this on **Render** (free tier) or **Oracle Cloud Always Free** (which gives you a completely free permanent server, perfect for Java).
    *   **Database (PostgreSQL):** We will use a free cloud database like **Supabase** or **Neon**.

### Entities
1.  **Item:** `id`, `name`
2.  **Marka:** `id`, `name`
3.  **Contact:** `id`, `name`, `phone`, `city`
4.  **Firm:** `id`, `contact_id` (Many-to-One), `name`, `defaultBrokType` (enum: PERCENT, FIXED), `defaultBrokVal`
5.  **Deal:** 
    *   `id`, `dealDate`, `loadDate`
    *   `purchaser_id` (Firm), `seller_id` (Firm)
    *   `item_id` (Item), `marka_id` (Marka)
    *   `weight`, `rate`
    *   `pBrokerage`, `sBrokerage`
    *   `status` (enum: PENDING, LOADED)
    *   `brokeragePayer` (enum: SEPARATE, PURCHASER_BOTH, SELLER_BOTH)

> [!IMPORTANT]
> To ensure the system behaves exactly like the prototype the father approved, **Partial Loading** will be handled in the backend by literally splitting the `Deal` entity. A dispatch will create a new `LOADED` Deal row with the dispatched weight, and mathematically reduce the `weight` and brokerage of the original `PENDING` Deal row.

## 3. Execution Phases

### Phase 1: Backend Initialization
*   Initialize the Spring Boot project (`pulse-broker-api`).
*   Configure Maven, application properties, and H2 database.
*   Create JPA Entities and Repositories.
*   Implement REST Controllers (`/api/firms`, `/api/deals`, etc.).
*   Implement the complex `loadDeal` business logic service to handle partial dispatches safely in a transactional boundary.

### Phase 2: Frontend Initialization
*   Initialize the React project using Vite (`pulse-broker-ui`).
*   Configure Tailwind CSS and migrate our prototype's custom color palette (`primary`, `secondary`, `moneyGreen`, etc.).
*   Setup Axios for API communication and React Router for navigation.

### Phase 3: Component Migration
*   Translate the prototype's monolithic HTML into reusable React components (e.g., `DealForm`, `LedgerTable`, `InvoicePrinter`, `PartialLoadModal`).
*   Implement the dual-language (English/Hindi) system using a clean React Context provider.

### Phase 4: Integration & Testing
*   Connect the React frontend to the Spring Boot backend.
*   Verify the math and edge cases (especially the B/W Dalali billing and partial dispatching).

## User Review Required

> [!WARNING]  
> We will be initializing two new projects inside the current directory (`/Users/deepakmaheshwari/Documents/father_project`):
> 1. `pulse-broker-api` (Spring Boot backend API - ready for Web and future Android App)
> 2. `pulse-broker-ui` (React web frontend)

## Open Questions

1.  **Java Version:** I will default to using Java 21, which is the current Long-Term Support (LTS) release. Is this acceptable, or do you have a specific version of JDK installed that you want me to use?
2.  **Database:** I will start with a local file-based database (H2) so you don't have to install any external database software right now to test it. We can easily switch it to PostgreSQL/MySQL when you deploy it. Does this sound good?

Please review the plan above. If you are ready, simply say "Approved" or answer the questions, and I will begin Phase 1!
