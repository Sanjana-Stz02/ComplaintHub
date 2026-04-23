# ComplaintHub (MERN + MVC)

Local problem reporting system built with the MERN stack and an MVC-style layout on the server, plus a React SPA as the view.

> **Branch `mitul`:** Extended features below (maps, geocoding, worker assignment, progress logs, stricter admin APIs) live on the `mitul` branch. `main` may differ until merged.

## Features

### Authentication and roles

- **Sign up / log in** (email + password; optional **OTP** flow for login).
- **Roles:** Citizen, Worker, Leader, Admin, Super Admin (admins can change roles in **User Management**).
- **Default admin** is created on server start if missing (see below).

### Complaints (Citizens)

- Submit a complaint with **title**, **description**, and a unique **complaint ID**.
- Optional **photo** (stored as a data URL on the complaint).
- Optional **location** for maps:
  - **Typed address:** the backend calls **OpenStreetMap Nominatim** to resolve coordinates (with cleanup for Plus Codes / unit prefixes when needed). Works best with a clear street or area (e.g. `1 Kuratoli, Dhaka 1229`).
  - **GPS:** “Use my current location” sends lat/lng directly; you can still add an address label.
- **Similar complaint** suggestions while typing the title (text search).

### Maps

- **Complaint History:** each row shows its own **mini map** when that complaint has saved coordinates; otherwise a short “no map location” note.
- **Track by ID:** full detail view includes a larger map when coordinates exist.

### Status and priority (Admins only)

- **Status:** Pending → Assigned → In Progress → Resolved / Rejected (and archive rules for resolved/rejected).
- **Priority:** Low, Medium, High, Emergency.
- API requires **`adminId`** on status/priority updates so only Admin / Super Admin can change them. Anyone can **read** status via **Track by ID**.

### Assignment (Admins)

- Assign a complaint to a user with role **Worker** or **Leader**; status is set to **Assigned**.

### Worker / Leader progress

- Assigned users see their complaints in **history** and in **Progress updates**.
- Add **text** and optional **photo** proof, or use **Task completed** (logged with type `completed`).

### History and archive

- **Citizens:** own complaints; filters All / Active / Archived.
- **Admins:** all complaints.
- **Workers / Leaders:** complaints **assigned to them**, with the same filters.

### Help

- **FAQ** section for citizens and workers (not shown on admin-only-focused copy where applicable).

### Analytics and reporting (Admins)

- **Analytics dashboard:** 14-day complaint volume, resolution rate, average resolution time, status/priority/category breakdowns, worker performance, and average citizen rating.
- **Category reports:** resolution rate per category with horizontal bars.
- **Exports:** download the current filtered complaint set as **CSV** or **PDF** directly from **Reports** or **Analytics**.

### Citizen feedback and rating

- After a complaint is **Resolved**, the complaint owner can submit a **1–5 star rating** with an optional comment.
- Ratings show as pills on complaint cards and feed into the admin analytics dashboard.

### Deadline and SLA tracking

- Admins can set or edit a complaint **deadline** during assignment or later from **Controls**.
- Worker dashboard highlights **Overdue** and **Due soon** tasks; notifications are sent when a deadline changes.

### Role-Based Access Control (RBAC)

- **Citizen:** submit, track, comment, submit feedback on own complaints.
- **Worker / Leader:** view & update assigned complaints, post progress, comment.
- **Admin:** everything above, plus assign, update status/priority/deadline, view reports/analytics, export, search & filter.
- **Super Admin:** all admin capabilities, plus assign roles.
- All admin endpoints (`filter`, `category-reports`, `analytics`, `export/csv`, `export/pdf`, status/priority/deadline/assign) enforce the caller's role server-side via `requesterId` / `adminId`.

---

## Project structure

```text
Project_demo/
  backend/
    src/
      app.js
      config/db.js
      utils/geocode.js          # Nominatim address → lat/lng
      models/User.js
      models/Complaint.js
      controllers/authController.js
      controllers/complaintController.js
      routes/authRoutes.js
      routes/complaintRoutes.js
  frontend/
    src/
      api/complaintApi.js
      components/ComplaintsMap.jsx   # Leaflet + OpenStreetMap tiles
      App.jsx
      main.jsx
      styles.css
```

---

## How this follows MVC

### Model

- **`backend/src/models/Complaint.js`:** `complaintId`, `title`, `description`, `citizenId`, `submittedBy`, `status`, `priority`, `isArchived`, `location` (`lat`, `lng`, `address`), `submissionPhoto`, `assignedTo`, `workerTaskCompleted`, `progressLogs` (nested: text, photoUrl, author, entry type, timestamps).
- **`backend/src/models/User.js`:** users, passwords (hashed in auth flow), roles, OTP fields.

### Controller

- **`complaintController.js`:** create (with optional geocode), read status/history/search, admin-only status/priority (`adminId`), assign worker/leader, worker progress posts, map locations list (API), etc.
- **`authController.js`:** signup, login, OTP, users list, role updates, default admin.

### View

- React **`App.jsx`** + **`complaintApi.js`**: UI by role; no direct DB access.

### Routes (complaints)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/complaints/map/locations` | All complaints with coordinates (pins) |
| POST | `/api/complaints` | Create complaint |
| GET | `/api/complaints` | List all (raw) |
| GET | `/api/complaints/history` | Filtered history (`userId`, `role`, `archived`) |
| GET | `/api/complaints/search` | Similar complaints (`q`) |
| PATCH | `/api/complaints/:complaintId/assign` | Admin assigns Worker/Leader |
| POST | `/api/complaints/:complaintId/progress` | Worker/Leader update or complete |
| GET | `/api/complaints/:complaintId/status` | Public read by complaint ID |
| PATCH | `/api/complaints/:complaintId/status` | Admin only (`adminId` + `status`) |
| PATCH | `/api/complaints/:complaintId/priority` | Admin only (`adminId` + `priority`) |
| PATCH | `/api/complaints/:complaintId/deadline` | Admin only (`adminId` + `deadline`) |
| POST | `/api/complaints/:complaintId/comments` | Add discussion comment (any auth'd user) |
| GET | `/api/complaints/:complaintId/comments` | List discussion comments |
| POST | `/api/complaints/:complaintId/feedback` | Citizen (owner, after Resolved) submits rating |
| GET | `/api/complaints/filter` | Admin filter / search (`requesterId`) |
| GET | `/api/complaints/category-reports` | Admin category breakdown (`requesterId`) |
| GET | `/api/complaints/worker-dashboard` | Worker/Leader stats (`workerId`) |
| GET | `/api/complaints/analytics` | Admin analytics (`requesterId`) |
| GET | `/api/complaints/export/csv` | Admin CSV export (`requesterId` + filters) |
| GET | `/api/complaints/export/pdf` | Admin PDF export (`requesterId` + filters) |

Auth routes remain under `/api/auth/*` (signup, login, OTP, users, role patch).

---

## Geocoding note

- The backend must reach **`https://nominatim.openstreetmap.org`** for typed-address lookup.
- Follow [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) (demo / low volume is fine; identify the app via `User-Agent` in code).
- If lookup fails, the complaint is still saved with the **address text** but may have **no pin** until coordinates exist.

---

## Setup and run

### 1) Backend

```bash
cd backend
npm install
# create backend/.env manually (see below)
npm run dev
```

Backend listens on **`http://localhost:5000`** (see `app.js` for bind address).

**`backend/.env` example:**

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

Large JSON bodies are allowed for photo payloads (`express.json` limit increased).

### 2) Frontend

```bash
cd frontend
npm install
# optional: frontend/.env with VITE_API_BASE_URL if API is not default
npm run dev
```

Frontend: **`http://localhost:5173`**

Dependencies include **Leaflet** and **react-leaflet** for maps.

---

## Default admin (demo)

Created on first boot if missing:

```text
Email: adminus@elonmusk.com
Password: we_the_people
```

Use **User Management** to promote accounts to **Worker** or **Leader** for assignment testing.

---

## Quick test flow

1. Sign up as a **Citizen** (or log in).
2. Submit a complaint with an **address** and/or **GPS**, optional **photo**.
3. Open **Complaint History** — confirm **mini map** on rows that have coordinates.
4. **Track** by `complaintId` — see details, map, assignment, progress log.
5. Log in as **admin** — set **priority** / **status**, **assign** to a Worker/Leader.
6. Log in as **Worker** — add **progress** with optional photo; use **Task completed** when done.
7. Switch history filters (**All / Active / Archived**) and confirm list + maps stay in sync for that view.
