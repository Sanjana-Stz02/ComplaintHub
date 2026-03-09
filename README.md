# MERN MVC Demo - Features Implemented: Status Tracking + Priority Level System

This project implements **two Sprint 2 features** using MERN Stack and MVC architecture:

- **Status Tracking**: Track complaint progress through stages:
  - Pending
  - Assigned
  - In Progress
  - Resolved
  - Rejected
- **Priority Level System**: Admin can set complaint priority:
  - Low
  - Medium
  - High
  - Emergency

It also includes basic complaint creation (with unique complaint ID) so status tracking can be tested immediately.

## Architecture

- **Backend (Express + MongoDB)**:
  - **Models** in `backend/src/models` (e.g., `Complaint.js`) define the data structure and validation.
  - **Controllers** in `backend/src/controllers` (e.g., `complaintController.js`) contain the request-handling logic and call the models.
  - **Routes** in `backend/src/routes` (e.g., `complaintRoutes.js`) map HTTP endpoints to controller functions.
- **Frontend (React SPA)**:
  - The **View** is implemented as React components in `frontend/src` (e.g., `App.jsx`), which render the UI.
  - The frontend never accesses the database directly; it calls the backend controllers through API helper functions in `frontend/src/api/complaintApi.js`.

## Project Structure

```text
Project_demo/
  backend/
    src/
      app.js
      config/db.js
      models/Complaint.js
      controllers/complaintController.js
      routes/complaintRoutes.js
  frontend/
    src/
      api/complaintApi.js
      App.jsx
      main.jsx
      styles.css
```

## How This Follows MVC

### Model (M)
- File: `backend/src/models/Complaint.js`
- Defines complaint data schema and business constraints:
  - `complaintId`, `title`, `description`, `status`, `priority`
  - Allowed statuses via enum:
    `Pending | Assigned | In Progress | Resolved | Rejected`
- Allowed priorities via enum:
  `Low | Medium | High | Emergency`

### Controller (C)
- File: `backend/src/controllers/complaintController.js`
- Handles request logic and coordination with model:
  - `createComplaint` creates a complaint and generates a unique ID.
  - `getComplaintStatusById` returns current status for a complaint.
  - `updateComplaintStatus` validates new status and updates it.
  - `updateComplaintPriority` validates new priority and updates it.
  - `getAllComplaints` returns complaint history list.

### View (V)
- Frontend files: `frontend/src/App.jsx`, `frontend/src/api/complaintApi.js`
- React UI renders forms and status results:
  - Citizen submits complaint
  - Citizen tracks status and priority by complaint ID
  - Admin updates complaint status and priority
- View does not access DB directly; it calls controller endpoints via API.

### Router (MVC Wiring)
- File: `backend/src/routes/complaintRoutes.js`
- Maps HTTP endpoints to controller actions:
  - `POST /api/complaints`
  - `GET /api/complaints`
  - `GET /api/complaints/:complaintId/status`
  - `PATCH /api/complaints/:complaintId/status`
  - `PATCH /api/complaints/:complaintId/priority`

## Setup and Run

## 1) Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`

## 2) Frontend

Open a second terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173`

## API Quick Test Flow

1. Create complaint from UI.
2. Copy generated `complaintId`.
3. Track status using that ID.
4. Use admin section to change status and priority.
5. Track again to confirm both updates.
