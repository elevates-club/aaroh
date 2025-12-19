# Sports Management System - System Overview & RBAC Documentation

This document provides a comprehensive technical overview of the Sports Management System, focusing on its architecture, features, and Role-Based Access Control (RBAC) implementation.

---

## 🚀 Tech Stack

- **Frontend**: 
  - **Framework**: React 18 with Vite
  - **Language**: TypeScript
  - **UI Library**: shadcn/ui (Tailwind CSS + Radix UI)
  - **State Management**: React Context API
  - **Routing**: React Router DOM
- **Backend (BaaS)**: 
  - **Service**: Supabase
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth (JWT based)
  - **Storage**: Supabase Storage
- **Tools**:
  - **Validation**: Zod
  - **Forms**: React Hook Form
  - **Icons**: Lucide React
  - **Notifications**: Sonner

---

## 🏗️ System Architecture

The system follows a modern client-server architecture where the frontend interacts directly with Supabase via the client SDK. Security is handled at the database level using **Row Level Security (RLS)**.

### 🔐 Authentication Flow
1. User signs in/up via `Auth.tsx`.
2. Supabase Auth handles the credentials and returns a session.
3. A trigger `on_auth_user_created` in the database automatically creates a related profile in the `public.profiles` table.
4. `AuthProvider` fetches this profile and provides it globally to the application.

---

## 👥 Role-Based Access Control (RBAC)

The system defines specific roles to separate responsibilities. Each role has distinct permissions enforced at the database layer.

### User Roles
1.  **Administrator (`admin`)**:
    - Full control over the entire system.
    - Can manage all students, sports events, and global settings.
    - Can view all activity logs and registration statistics.
2.  **Year Coordinators (`first_year_coordinator` to `fourth_year_coordinator`)**:
    - Specialized roles for managing specific academic years.
    - Permissions are strictly isolated to their assigned year.

### 🛡️ RBAC Permissions Matrix

| Feature | Administrator | Year Coordinator |
| :--- | :--- | :--- |
| **Manage Students** | All Years | Assigned Year Only |
| **Manage Registrations** | All Years | Assigned Year Only |
| **Manage Sports Events** | Create/Edit/Delete | View Only |
| **System Settings** | Full Control | No Access |
| **Activity Logs** | Global View | Own Activity Only |

### 🛑 Database Security (RLS)
The RBAC is primarily enforced using PostgreSQL RLS policies. For example:
- **Student Access Policy**: 
  - Admins: `USING (true)` (Can see all).
  - Coordinators: `USING (p.role = 'first_year_coordinator' AND year = 'first')` (and similarly for others).

---

## 📊 Database Schema

### Core Tables
- `auth.users`: Managed by Supabase (Credentials).
- `public.profiles`: Extends user data with roles and names.
- `public.students`: Stores student info, roll numbers, and academic years.
- `public.sports`: Stores event details (Games/Athletics), dates, and venues.
- `public.registrations`: Links students to sports events.
- `public.activity_logs`: Audit trail for actions (Logins, CRUD operations).
- `public.settings`: Global toggles (e.g., Enable Signup, Registration limits).

---

## ✨ Key Features

1.  **Dynamic Dashboard**: Role-aware statistics for students, sports, and registrations.
2.  **Student Management**: Roll-number based tracking with filtering by department and year.
3.  **Sports Event Registration**: 
    - Validation of registration deadlines.
    - Limit on number of games/athletic events per student (configurable).
4.  **Audit Trail**: Every significant action is logged with user info, IP address, and device metadata.
5.  **PDF Reports**: Generate and export registration reports for different sports and years.

---

## 🛠️ Global Settings
Administrators can configure the system through the **Settings** page:
- **Sign Up Toggle**: Enable or disable public user registration.
- **Registration Limits**: Set the maximum number of games and athletic events a single student can join.
