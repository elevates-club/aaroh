# Aaroh Arts Festival

A comprehensive event management and registration platform designed for educational festivals and competitions. Built with modern web technologies, Aaroh provides a seamless experience for administrators, event managers, coordinators, and students.

## 🚀 Project Overview

Aaroh (meaning "Ascent") is a sophisticated web application that streamlines the entire lifecycle of an arts festival—from student enrollment and event scheduling to real-time participation monitoring and automated reporting.

## ✨ Key Features

- **Role-Based Access Control:** Dedicated dashboards for Admins, Event Managers, Coordinators, and Students.
- **Dynamic Event Management:** Create and manage diverse event categories with custom capacity limits and registration deadlines.
- **Real-Time Monitoring:** Live tracking of event participation levels (Low Participation vs. At Capacity).
- **Automated Registrations:** Smart validation for on-stage and off-stage event limits per student.
- **Operational Oversight:** Comprehensive Audit Logs to monitor system-wide configuration changes and user logins.
- **Professional Reporting:** Integrated PDF generation for student registrations and event rosters.
- **Responsive Experience:** Optimized for both desktop administration and mobile student registration.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeSript
- **UI Framework:** shadcn/ui, Tailwind CSS, Lucide React
- **Backend:** Supabase (Database, Auth, Real-time)
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form, Zod (Validation)
- **Utilities:** date-fns, jsPDF, Recharts

## 📦 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/elevates-club/aaroh.git
   cd aaroh
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

- `src/components/dashboards`: Role-specific dashboard implementations.
- `src/components/ui`: Atomic UI components powered by shadcn/ui.
- `src/hooks`: Custom hooks for Auth, Roles, and Data fetching.
- `src/integrations/supabase`: Database client and auto-generated types.
- `src/lib`: Logic for role utilities and registration limits.
- `src/pages`: Main application routes and views.
- `supabase/migrations`: SQL schema evolutions and RLS policies.

## 📄 License

This project is specialized for the Aaroh Arts Festival.

---
Built with ❤️ for excellence in event management.