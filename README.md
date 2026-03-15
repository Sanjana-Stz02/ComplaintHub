# MERN MVC Demo - Features Implemented: Login/Signup + Complaint History + Status Tracking + Priority

This project implements the following features using MERN Stack and MVC architecture:

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
- **Complaint History & Archive**:
  - Citizens can view their own complaint history
  - Admins can view all complaint records and archived complaints
- **Sign Up and Login**:
  - Citizens can create an account with name, email, optional phone, and password
  - Users can log in with email or phone plus password
  - A default admin account is available for demo use

It also includes complaint creation with a unique complaint ID, complaint search suggestions, and a simple FAQ so the new flows can be tested in a single app.

## Project Structure

```text
Project_demo/
  backend/
    src/
      app.js
      config/db.js
      models/User.js
      models/Complaint.js
      controllers/authController.js
      controllers/complaintController.js
      routes/authRoutes.js
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
  - `citizenId`, `submittedBy`, `isArchived`
  - Allowed statuses via enum:
    `Pending | Assigned | In Progress | Resolved | Rejected`
- Allowed priorities via enum:
  `Low | Medium | High | Emergency`

### Model (M) - User
- File: `backend/src/models/User.js`
- Defines user records for login and role tracking:
  - `fullName`, `email`, `phone`, `password`, `role`
  - `lastLoginAt`

### Controller (C)
- File: `backend/src/controllers/complaintController.js`
- Handles request logic and coordination with model:
  - `createComplaint` creates a complaint and generates a unique ID.
  - `getComplaintStatusById` returns current status for a complaint.
  - `updateComplaintStatus` validates new status and updates it.
  - `updateComplaintPriority` validates new priority and updates it.
  - `getComplaintHistory` returns citizen-specific or admin-wide complaint history.

### Controller (C) - Auth
- File: `backend/src/controllers/authController.js`
- Handles signup, login, and default admin creation:
  - `signUp` creates a citizen account.
  - `login` authenticates by email or phone with password.
  - `ensureDefaultAdmin` creates the default admin if it does not exist.

### View (V)
- Frontend files: `frontend/src/App.jsx`, `frontend/src/api/complaintApi.js`
- React UI renders forms and status results:
  - Citizen registers or logs in using OTP
  - Citizen submits complaint
  - Citizen tracks status and priority by complaint ID
  - Citizen views complaint history and archive
  - Admin updates complaint status and priority
  - Admin views all complaint history and archived records
- View does not access DB directly; it calls controller endpoints via API.

### Router (MVC Wiring)
- File: `backend/src/routes/complaintRoutes.js`
- Maps HTTP endpoints to controller actions:
  - `POST /api/complaints`
  - `GET /api/complaints`
  - `GET /api/complaints/history`
  - `GET /api/complaints/:complaintId/status`
  - `PATCH /api/complaints/:complaintId/status`
  - `PATCH /api/complaints/:complaintId/priority`

### Router (MVC Wiring) - Auth
- File: `backend/src/routes/authRoutes.js`
- Maps authentication endpoints:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`

## Setup and Run

## 1) Backend

```bash
cd backend
npm install
# create a .env file manually in the backend folder
npm run dev
```

Backend runs on `http://localhost:5000`

Required backend `.env` values:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## 2) Frontend

Open a second terminal:

```bash
cd frontend
npm install
# (optional) create a .env file manually in the frontend folder if you want to override defaults
npm run dev
```

Frontend runs on `http://localhost:5173`

## Default Admin Account

The backend seeds a default admin account when the server starts if it does not already exist:

```text
Email: adminus@elonmusk.com
Password: we_the_people
```

## API Quick Test Flow

1. Sign up as a citizen or log in using an existing account.
2. Submit a complaint after logging in.
4. Copy the generated `complaintId`.
5. Track status using that ID.
6. Log in as the default admin to update status and priority.
7. Open the history section to view active and archived complaints.
