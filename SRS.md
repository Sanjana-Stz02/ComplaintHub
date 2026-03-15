# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for ComplaintHub, a local problem reporting and complaint management system built with the MERN stack: MongoDB, Express.js, React.js, and Node.js.

The purpose of ComplaintHub is to help citizens report local issues, track complaint progress, and support efficient complaint resolution through structured workflows for citizens, workers, and administrators.

### 1.2 Scope
ComplaintHub is intended to provide a centralized platform for reporting, managing, and resolving civic issues such as road damage, garbage problems, drainage issues, or similar community complaints.

The system supports four primary actors:

- Citizens who submit complaints, upload evidence, and track complaint progress.
- Workers who handle assigned complaints, update statuses, and post progress updates.
- Admins who manage complaints, assign workers or departments, monitor performance, and generate reports.
- System services that automate notifications, tracking, authentication support, and role-based access control.

The scope of this project includes system design, development, testing, and deployment of the ComplaintHub platform.

## 2. Overall Description

### 2.1 Product Perspective
ComplaintHub is a standalone web application developed using the MERN stack. It enables citizens to report local infrastructure or service-related issues and monitor how those issues are addressed. The system can integrate with external services such as map providers, OTP delivery services, and report export utilities.

### 2.2 Product Features
The core planned product features are:

1. Complaint Submission  
Citizens can submit complaints with a title, description, supporting photo evidence, and location. A unique complaint ID is generated after submission.

2. Complaint Duplicate Prevention (Smart Suggestion)  
The system suggests similar complaints based on title or description to reduce duplicate submissions.

3. User Verification (Email or Phone)  
Users can register and log in using OTP-based verification through email or phone.

4. Complaints FAQ (Help Center)  
The system provides guidance for common user questions and complaint submission issues.

5. Location-Based Complaints with Map Integration  
Citizens can select or confirm complaint location using map-based interaction or geolocation.

6. Status Tracking  
Complaints move through statuses such as Pending, Assigned, In Progress, Resolved, and Rejected.

7. Admin Assign Worker/Department  
Admins can assign complaints to workers or departments responsible for resolution.

8. Progress Updates (Logs)  
Workers can post textual and image-based updates as work progresses.

9. Comment/Discussion Section  
Citizens, workers, and admins can communicate through complaint-specific discussions.

10. Category-wise Reports  
Admins can generate reports by complaint category such as Road, Garbage, or Drain.

11. Priority Level System  
Admins can assign priority levels including Low, Medium, High, and Emergency.

12. Complaint Search and Filter  
Admins and workers can filter complaints by status, category, area, priority, or date.

13. Real-time Notifications  
Users receive notifications when complaints are created, assigned, or updated.

14. Worker Dashboard  
Workers can view assigned complaints, deadlines, and resolution history.

15. Deadline and SLA Tracking  
Admins can define due dates, and the system can identify overdue complaints automatically.

16. Citizen Feedback and Rating  
Citizens can rate the complaint resolution process after a complaint is resolved.

17. Analytics Dashboard  
Admins can review charts and metrics such as complaint volume, resolution time, priority spread, and worker performance.

18. Complaint History and Archive  
Citizens can view their complaint history, and admins can access historical complaint records.

19. Export Reports (CSV/PDF)  
Admins can export filtered reports for reporting or record-keeping.

20. Role-Based Access Control (RBAC)  
The system enforces permissions for Citizen, Worker, Admin, and Super Admin roles.

### 2.3 User Classes and Characteristics

#### Citizens
- Non-technical users.
- Submit complaints and track progress.
- May upload photos and provide location information.

#### Workers
- Operational users responsible for field or desk resolution work.
- Update complaint statuses and progress logs.
- Need access to assigned tasks and deadlines.

#### Admins
- System managers who oversee complaints, users, assignments, and reports.
- Require filtering, analytics, reporting, and assignment controls.

#### System
- Automated services responsible for sending notifications, tracking states, and enforcing security and permissions.

## 3. System Requirements

### 3.1 Functional Requirements

#### 3.1.1 Complaint Submission
- FR-1: The system shall allow citizens to submit complaints with a title, description, photos, and location.
- FR-2: The system shall generate a unique complaint ID upon successful submission.

#### 3.1.2 Complaint Duplicate Prevention
- FR-3: The system shall suggest similar existing complaints based on complaint title or description before final submission.

#### 3.1.3 User Verification
- FR-4: The system shall support OTP-based login and registration through email or phone number.

#### 3.1.4 Location-Based Complaints
- FR-5: The system shall allow citizens to attach location data using map selection or geolocation.

#### 3.1.5 Status Tracking
- FR-6: The system shall track complaint status through the following states: Pending, Assigned, In Progress, Resolved, and Rejected.

#### 3.1.6 Assignment and Work Management
- FR-7: The system shall allow admins to assign complaints to workers or departments.
- FR-8: The system shall allow workers to update assigned complaints.
- FR-9: The system shall allow workers to post progress updates with text and optional photo evidence.

#### 3.1.7 Complaint Communication
- FR-10: The system shall provide a comment or discussion section for complaint-related communication among authorized users.

#### 3.1.8 Search, Filter, and Reporting
- FR-11: The system shall allow admins and workers to search and filter complaints by status, category, area, priority, and date.
- FR-12: The system shall generate category-wise complaint reports.
- FR-13: The system shall export reports in CSV and PDF formats.

#### 3.1.9 Priority and Deadlines
- FR-14: The system shall allow admins to assign complaint priority as Low, Medium, High, or Emergency.
- FR-15: The system shall allow admins to set deadlines or SLA targets for complaints.
- FR-16: The system shall identify and flag overdue complaints automatically.

#### 3.1.10 Notifications and Feedback
- FR-17: The system shall send notifications to users on relevant complaint events such as status changes or assignments.
- FR-18: The system shall allow citizens to provide feedback and ratings for resolved complaints.

#### 3.1.11 History and Dashboards
- FR-19: The system shall maintain complaint history and archive data for citizens and admins.
- FR-20: The system shall provide a personalized dashboard for workers.
- FR-21: The system shall provide an analytics dashboard for admins.

#### 3.1.12 Security and Access Control
- FR-22: The system shall implement role-based access control for Citizen, Worker, Admin, and Super Admin roles.

### 3.2 Non-Functional Requirements

#### 3.2.1 Usability
- NFR-1: The user interface shall be simple and understandable for non-technical users.
- NFR-2: Complaint submission and status tracking shall be accessible from desktop and mobile browsers.

#### 3.2.2 Performance
- NFR-3: The system should respond to normal user actions within an acceptable time under regular load.
- NFR-4: Search and filter operations should remain efficient as complaint volume grows.

#### 3.2.3 Reliability
- NFR-5: Complaint records and status history shall be stored consistently without data loss under normal operation.
- NFR-6: The system shall preserve complaint state transitions accurately.

#### 3.2.4 Security
- NFR-7: The system shall protect authenticated routes and sensitive actions through authorization checks.
- NFR-8: User credentials, OTP workflows, and personal data shall be handled securely.

#### 3.2.5 Maintainability
- NFR-9: The system shall follow a modular MERN-based architecture to support future feature expansion.
- NFR-10: Backend APIs and frontend components should remain organized to simplify testing and maintenance.

#### 3.2.6 Scalability
- NFR-11: The architecture should support increasing numbers of users, complaints, and departments with minimal redesign.

## 4. Technology Stack and Architectural Overview

### 4.1 MERN Stack Components
- MongoDB: Stores complaint records, user accounts, status history, comments, and metadata.
- Express.js: Provides backend routing, API endpoints, validation, and business logic integration.
- React.js: Implements the client-side interface for citizens, workers, and admins.
- Node.js: Runs the backend application and service logic.

### 4.2 High-Level Architecture
- Presentation Layer: React.js handles forms, dashboards, tracking views, and user interactions.
- Business Logic Layer: Express.js and Node.js process requests, enforce rules, and manage workflows.
- Data Layer: MongoDB stores application data such as complaints, users, assignments, and logs.

## 5. Development Plan

### 5.1 Sprint Breakdown

#### Sprint 1 (Weeks 1-2)
1. Submit Complaint with unique complaint ID generation.
2. User Verification using email or phone OTP.
3. Complaint Duplicate Prevention using smart suggestions.
4. Complaint History and Archive.
5. Help Center (FAQ).

#### Sprint 2 (Weeks 3-4)
1. Location-Based Complaints with map integration.
2. Status Tracking.
3. Admin Assign Worker or Department.
4. Progress Updates (Logs).
5. Priority Level System.

#### Sprint 3 (Weeks 5-6)
1. Complaint Search and Filter.
2. Real-time Notifications.
3. Worker Dashboard.
4. Comment and Discussion Section.
5. Category-wise Reports.

#### Sprint 4 (Weeks 7-8)
1. Analytics Dashboard.
2. Deadline and SLA Tracking.
3. Export Reports in CSV and PDF.
4. Citizen Feedback and Rating.
5. Role-Based Access Control (RBAC).

### 5.2 Deliverables
- A working complaint submission and tracking system.
- Admin capabilities for complaint management and worker assignment.
- Role-based access control for multiple user roles.
- Reporting, analytics, and export features.

## 6. Conclusion
This SRS describes the intended scope and requirements for ComplaintHub, a MERN-based complaint management system for local issue reporting and resolution. The platform is designed to improve citizen engagement, strengthen administrative oversight, and streamline worker operations through structured complaint handling, reporting, and role-based workflows.

The sprint-based development plan organizes the 20 planned features into manageable phases so the system can evolve incrementally while maintaining usability, scalability, and maintainability.