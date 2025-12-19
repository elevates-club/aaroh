# AAROH Arts Management System - Feature-Wise Guide

This guide provides a detailed breakdown of the system's features, role-specific capabilities, and the underlying database structure.

---

## � Core Features Breakdown

### 1. Authentication & Security
- **Secure Access**: Powered by Supabase Auth with email/password protection.
- **Dynamic Signup**: Administrators can toggle public registration on or off via system settings.
- **RBAC (Role-Based Access Control)**: Every action is guarded by user roles, ensuring data privacy across academic years.

### 2. Student Management
- **Centralized Database**: Stores student name, roll number, department, and academic year.
- **Bulk Operations**: Admin can import hundreds of students at once via **CSV Upload**.
- **Year Isolation**: Coordinators can only see and manage students within their assigned academic year.
- **Data Export**: Export student lists to CSV for offline reporting or external verification.

### 3. Arts & Games Management
- **Event Catalog**: Categorization of events into **Games** (Team) or **Athletics** (Individual).
- **Control Panel**: Admins can set registration deadlines, event dates, venues, and maximum participant caps.
- **Real-time Status**: Events automatically transition from "Open" to "Closed" based on deadlines.
- **Participant Lists**: Instant generation of **PDF participant lists** for event organizers.

### 4. Registration System
- **Smart Validation**: 
  - Prevents double registration for the same event.
  - Enforces system-wide limits (e.g., max 2 games and 3 athletics per student).
- **Approval Workflow**:
  - **Coordinators**: Submit registrations for their year's students.
  - **Admins**: Approve or Reject pending registrations (optional, can be set to Auto-Approve).
- **Conflict Prevention**: Prevents registrations after the event deadline has passed.

### 5. Audit & Activity Logging
- **Detailed Tracking**: Every login, creation, update, and deletion is recorded.
- **Metadata Capture**: Logs include IP address, browser type, OS, and device type (Mobile/Desktop).
- **Transparency**: High-level summaries for coordinators; deep forensic logs for administrators.

---

## � Dashboard Differences (Role-Based)

### 👑 System Administrator
- **Summary**: Global view of the entire campus arts ecosystem.
- **Stats**: Total counts across all 4 years.
- **Access**: Full access to all Sidebar menus (Students, Arts, Registrations, Logs, Settings).
- **Capabilities**: Can modify any data and override system configurations.

### 🎓 Year Coordinator (1st, 2nd, 3rd, 4th)
- **Summary**: Localized view focused on their specific academic responsibilities.
- **Stats**: Total counts filtered to **their year only**.
- **Access**: Restricted view of Students and Registrations.
- **Capabilities**: Can register students from their year but cannot delete arts events or change system global settings.

---

## 🗄️ Database Architecture

### Table Dictionary
| Table | Description | Key Relationships |
| :--- | :--- | :--- |
| **`profiles`** | User metadata & Roles | `user_id` -> `auth.users` |
| **`students`** | Student records | - |
| **`arts`** | Event details & Rules | `created_by` -> `profiles` |
| **`registrations`**| Enrollment records | `student_id`, `sport_id`, `registered_by` |
| **`activity_logs`**| Audit trail | `user_id` -> `profiles` |
| **`settings`** | Global configuration | `updated_by` -> `profiles` |

### Database Automations (Triggers)
1. **`on_auth_user_created`**: When a user signs up, a trigger automatically inserts a record into `public.profiles`.
2. **`log_registration_activity`**: Automatically creates an entry in `activity_logs` whenever a student is registered or status changes.
3. **`update_updated_at_column`**: Ensures every record change is timestamped precisely.

### Security Layers (RLS)
The database enforces security at the **row level**:
- **Coordinators**: `SELECT` where `student.year = coordinator.year`.
- **Admins**: `SELECT *` (unrestricted).
- **Anonymity**: Public/Unauthenticated users have zero access to database tables.
