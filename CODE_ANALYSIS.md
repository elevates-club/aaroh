# AAROH Arts Festival - Complete Code Analysis

## Executive Summary

**Aaroh** is a sophisticated, role-based event management and registration platform designed for arts festivals and competitions. It provides comprehensive functionality for administrators, event managers, year coordinators, and students to manage registrations, events, and participation tracking with real-time monitoring and audit logging.

### Key Stats
- **Framework**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Supported Roles**: 7 (Admin, Event Manager, 4 Year Coordinators, Student)
- **Database Tables**: 6 core tables (profiles, students, events, registrations, activity_logs, settings)
- **Migration Count**: 50+ migrations with schema evolution

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Technology Stack

```
Frontend Layer:
├── React 18 (UI components)
├── TypeScript (type safety)
├── Vite (build tool)
├── React Router (navigation)
└── TanStack Query (data fetching)

Styling Layer:
├── Tailwind CSS (utility-first styling)
├── Radix UI (headless components)
├── Lucide React (icons)
└── shadcn/ui (component library)

State Management:
├── React Context API (Auth, Role, Theme)
├── React Hook Form (form state)
├── Zod (validation)
└── localStorage (session persistence)

Backend:
├── Supabase (BaaS)
├── PostgreSQL (database)
├── JWT Auth (authentication)
├── Row Level Security (authorization)
└── Realtime subscriptions
```

### 1.2 Project Structure

```
src/
├── App.tsx                 # Main routing and provider setup
├── main.tsx                # Vite entry point
├── contexts/               # Global state providers
│   ├── AuthContext.tsx    # Authentication & user profile
│   ├── RoleContext.tsx    # Active role management
│   └── ThemeContext.tsx   # Dark/light theme
├── pages/                 # Route-level components
│   ├── Auth.tsx           # Login/signup page
│   ├── Dashboard.tsx      # Role-aware dashboard selector
│   ├── Students.tsx       # Student management
│   ├── Events.tsx         # Event management
│   ├── Registrations.tsx  # Registration management
│   ├── ActivityLogs.tsx   # Audit trail viewer
│   ├── Settings.tsx       # Global settings
│   ├── Profile.tsx        # User profile
│   └── admin/             # Admin-specific pages
├── components/
│   ├── dashboards/        # Role-specific dashboards
│   │   ├── AdminDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── CoordinatorDashboard.tsx
│   │   └── EventManagerDashboard.tsx
│   ├── forms/             # Form components
│   ├── dialogs/           # Modal components
│   ├── layout/            # Layout components
│   └── ui/                # Atomic UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
│   ├── constants.ts       # Role and status enums
│   ├── roleUtils.ts       # Role checking utilities
│   ├── registration-limits.ts
│   └── settings.ts        # System settings fetcher
├── utils/
│   ├── activityLogger.ts  # Activity logging
│   └── pdfGeneratorV2.ts  # PDF generation
└── integrations/
    └── supabase/
        ├── client.ts      # Supabase client
        └── types.ts       # Auto-generated types
```

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 Authentication Flow

1. **Signup/Login**: User enters credentials in Auth.tsx
2. **Supabase Auth**: Returns JWT session token
3. **Profile Creation**: `handle_new_user()` trigger automatically creates profile
4. **Profile Fetch**: AuthContext fetches profile with role(s)
5. **Role Selection**: RoleContext selects appropriate role from array
6. **Route Protection**: ProtectedRoute ensures user is authenticated

### 2.2 Role-Based Access Control (RBAC)

**User Roles** (defined in `lib/constants.ts`):
```typescript
admin                       // Full system control
event_manager               // Event lifecycle management
first_year_coordinator      // First year students only
second_year_coordinator     // Second year students only
third_year_coordinator      // Third year students only
fourth_year_coordinator     // Fourth year students only
student                     // Self-registration & viewing
```

**Multi-Role Support**:
- Users can have multiple roles (stored as TEXT[] array in database)
- RoleContext intelligently selects active role with priority:
  1. admin
  2. event_manager
  3. coordinators (any year)
  4. student

**Authorization Implementation**:
- **Database Level**: PostgreSQL RLS policies using `role @> ARRAY['admin']`
- **Frontend Level**: `hasRole()` utility checks in components
- **Example Policy**: Only admins see all students; coordinators see only their year

### 2.3 Key Authentication Files

| File | Purpose |
|------|---------|
| AuthContext.tsx | Session, user, profile state management |
| RoleContext.tsx | Active role selection from available roles |
| ProtectedRoute.tsx | Route-level access control |
| roleUtils.ts | Role checking helper functions |

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

#### **profiles**
- Maps Supabase auth.users to application users
- Stores: user_id, email, full_name, role (TEXT[])
- Trigger: `handle_new_user()` creates profile on signup

#### **students**
- Student information for the festival
- Fields: id, name, roll_number, department, year, user_id, phone_number, gender
- year enum: first, second, third, fourth
- Indexed by: roll_number (unique), year, user_id

#### **events**
- Festival events/competitions
- Fields: id, name, description, category, mode, registration_method, min_team_size, max_team_size, max_entries_per_year, registration_deadline, event_date, venue, is_active, created_by, created_at
- Enums:
  - category: on_stage | off_stage
  - mode: individual | group
  - registration_method: student | coordinator

#### **registrations**
- Links students to events
- Fields: id, student_id, event_id, group_id, registered_by, status, created_at
- Constraint: UNIQUE(student_id, event_id) - each student once per event
- Validation trigger: `validate_aaroh_registration()` enforces participation limits
- Status enum: pending | approved | rejected

#### **activity_logs**
- Audit trail for all significant actions
- Fields: id, user_id, action, details, ip_address, user_agent, created_at
- Details: JSONB for flexible logging of action-specific data

#### **settings**
- Global system configuration
- Fields: id, key, value, updated_by, updated_at
- Key examples: max_on_stage_registrations, max_off_stage_registrations, sign_up_enabled, global_registration_open, scoreboard_visible

### 3.2 Key Enums

```sql
user_role: admin, first_year_coordinator, ..., student
academic_year: first, second, third, fourth
event_category: on_stage, off_stage
event_mode: individual, group
registration_method: student, coordinator
registration_status: pending, approved, rejected
```

### 3.3 Key Triggers & Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Creates profile when user signs up |
| `validate_aaroh_registration()` | Enforces participation limits & role-based access |
| `update_updated_at_column()` | Auto-updates timestamps |
| `log_user_login()` | RPC for login activity logging |
| `log_user_logout()` | RPC for logout activity logging |

---

## 4. AUTHENTICATION CONTEXT (AuthContext.tsx)

### 4.1 Context Structure

```typescript
interface AuthContextType {
  user: User | null;              // Supabase auth user
  session: Session | null;        // JWT session
  profile: Profile | null;        // User profile with role
  loading: boolean;               // Initial load state
  signingOut: boolean;            // Logout in progress
  signIn: (email, password) => Promise
  signUp: (email, password, fullName, role) => Promise
  signOut: () => Promise<void>
}
```

### 4.2 Key Features

1. **Session Management**:
   - Uses `onAuthStateChange()` listener to track auth state
   - Persists session in localStorage
   - Handles token refresh automatically

2. **Profile Fetching**:
   - Fetches user profile from `profiles` table
   - Stores in context for global access
   - Updates on role changes

3. **Activity Logging**:
   - Logs login via `logUserLogin()` RPC
   - Logs logout via `logUserLogout()` RPC
   - Prevents duplicate logins using sessionStorage

4. **Error Handling**:
   - Shows toast notifications on auth errors
   - Clears profile on fetch errors
   - Has recovery logic for stuck states

### 4.3 Critical Code Flow

```
User submits form
    ↓
signIn/signUp function
    ↓
Supabase Auth (returns session)
    ↓
onAuthStateChange listener triggered
    ↓
fetchProfile(userId) from profiles table
    ↓
setProfile(data) → triggers role selection
    ↓
logUserLogin activity → context updated
    ↓
User can access protected routes
```

---

## 5. ROLE CONTEXT (RoleContext.tsx)

### 5.1 Purpose

Manages which role is "active" when a user has multiple roles.

### 5.2 Features

1. **Smart Role Selection**:
   ```
   Priority: admin > event_manager > coordinators > student
   ```

2. **Role Switching**:
   - Users can call `setActiveRole(role)` to switch
   - Only works if role is in `availableRoles`

3. **Debugging**:
   - Console logs role changes
   - Helps troubleshoot permission issues

### 5.3 Usage Pattern

```tsx
const { activeRole, setActiveRole, availableRoles } = useRole();

// Check current role
if (hasRole(activeRole, USER_ROLES.ADMIN)) {
  // Show admin features
}

// Switch role
setActiveRole('student');
```

---

## 6. PAGES & FEATURES

### 6.1 Auth Page (Auth.tsx)

**Purpose**: User authentication (signin/signup)

**Features**:
- Tab switching between Sign In and Sign Up
- Email/password validation
- Role selection on signup (defaults to first_year_coordinator)
- SignUp toggle (controllable via settings)
- Show/hide password toggles
- Responsive design with card layout

**Key State**:
- activeTab: "signin" | "signup"
- formData: { email, password, fullName, role }
- loading: boolean

**Navigation**:
- Redirects to `/dashboard` on successful login
- Listens for user changes to prevent re-renders

### 6.2 Dashboard Page (Dashboard.tsx)

**Purpose**: Role-aware dashboard selector

**Logic**:
```typescript
if (hasRole(activeRole, USER_ROLES.STUDENT)) 
  → StudentDashboard
else if (hasRole(activeRole, USER_ROLES.ADMIN)) 
  → AdminDashboard
else if (hasRole(activeRole, USER_ROLES.EVENT_MANAGER))
  → EventManagerDashboard
else 
  → CoordinatorDashboard
```

**Each Dashboard**:
- Shows role-specific statistics
- Recent activity
- Quick actions
- Performance metrics

### 6.3 Students Page (Students.tsx)

**Purpose**: Student records management

**Features**:
- **View**: Paginated table with search & filters
- **Filter**: By year (first/second/third/fourth)
- **Search**: By name, roll number, department
- **Add Student**: Modal dialog
- **Edit Student**: Inline editing
- **Delete Student**: With confirmation
- **CSV Upload**: Bulk import
- **View Registrations**: Popup showing student's event registrations

**Permissions**:
- Admins: See all students
- Year Coordinators: See only their year
- Students: Cannot access

**Key State**:
- students: Student[]
- searchTerm, yearFilter
- viewingStudent (for registration details modal)
- deletingId (for delete confirmation)

**Activity Logging**:
- CRUD operations logged via `logStudentActivity()`

### 6.4 Events Page (Events.tsx)

**Purpose**: Event lifecycle management

**Features**:
- **View**: Paginated events with category/status filters
- **Create Event**: Form dialog for new events
- **Edit Event**: Modify event details
- **Delete Event**: With confirmation
- **Register Students**: Bulk registration dialog
- **Student Self-Registration**: Allows students to self-register
- **Event Details**: Modal showing full event info
- **PDF Export**: Download event registrations

**Event Properties**:
- Name, description, category (on_stage/off_stage)
- Mode (individual/group)
- Registration method (student/coordinator)
- Team sizes (min/max)
- Max entries per year
- Registration deadline
- Event date, venue
- Active status

**Permissions**:
- Admins & Event Managers: Full CRUD
- Coordinators: View only
- Students: View and self-register (if enabled)

**Key State**:
- events: Event[]
- categoryFilter, statusFilter
- globalRegistrationOpen (setting)
- scoreboardVisible (setting)

### 6.5 Registrations Page (Registrations.tsx)

**Purpose**: Manage and monitor registrations

**Features**:
- **View Modes**: Students list, On-Stage registrations, Off-Stage registrations
- **Filters**: Status (pending/approved/rejected), student year
- **Search**: By student name, roll number, event name
- **Approve/Reject**: Change registration status
- **Delete**: Remove registration
- **PDF Export**: Generate registration reports
- **Registration Limits**: Display current vs max for students

**Validation**:
- Respects registration limits (max_on_stage, max_off_stage)
- Prevents duplicate student-event registrations
- Enforces role-based access

**Key State**:
- registrations: Registration[]
- viewMode: 'students' | 'on_stage' | 'off_stage'
- statusFilter
- studentRegistrationCounts (tracks current usage)

**Activity Logging**:
- Status changes logged via `logRegistrationActivity()`

### 6.6 My Registrations (MyRegistrations.tsx)

**Purpose**: Student's personal registration view

**Features**:
- Shows only logged-in student's registrations
- Grouped by category (on_stage, off_stage, group)
- Cancel registration option
- Status indicators
- Event details (date, venue)

### 6.7 Activity Logs Page (ActivityLogs.tsx)

**Purpose**: Audit trail viewer

**Features**:
- **Pagination**: 10 logs per page
- **Filters**: By action type
- **Search**: Full-text search across logs
- **Details Modal**: Expandable log details
- **Realtime Updates**: Subscribes to new logs
- **Refresh**: Manual refresh button

**Permissions**:
- Admins: See all activity
- Others: See only their own activity

**Key State**:
- logs: ActivityLog[]
- currentPage, totalPages
- searchTerm, actionFilter
- selectedLog (for modal)

**Real-time**:
- Subscribes to INSERT events on activity_logs
- Auto-refetches if on page 1 with no filters

### 6.8 Settings Page (Settings.tsx)

**Purpose**: Global system configuration

**Features**:
- **Registration Limits**: Max on-stage and off-stage registrations per student
- **Auto-Approve**: Toggle automatic approval of registrations
- **Sign Up**: Enable/disable public registration
- **Statistics**: View current counts
- **Update Settings**: Save changes with logging

**Permissions**:
- Admins only

**Key Settings**:
```typescript
max_on_stage_registrations: number
max_off_stage_registrations: number
auto_approve_registrations: boolean
sign_up_enabled: boolean
global_registration_open: boolean
scoreboard_visible: boolean
```

### 6.9 User Management (UserManagement.tsx)

**Purpose**: Manage system users and their roles

**Features**:
- List all users with roles
- Edit user roles
- Delete users
- Assign multiple roles
- Activity tracking

**Permissions**:
- Admins only

### 6.10 Profile Page (Profile.tsx)

**Purpose**: Personal user profile management

**Features**:
- View profile information
- Edit phone number and gender
- Change password
- View student info (if applicable)
- View roles

**Data**:
- Personal: Full name, email, phone, gender
- Academic: Roll number, department, year (if student)
- System: Roles, created date

---

## 7. COMPONENTS

### 7.1 Layout Components

**AppLayout.tsx**:
- Main layout wrapper
- Sidebar navigation
- Header with user menu
- Outlet for route content

### 7.2 Dashboard Components

Located in `components/dashboards/`:

**AdminDashboard.tsx**:
- System statistics (students, events, registrations)
- Year-wise breakdown
- Recent activity feed
- Pending registrations
- Events requiring attention (at capacity, low participation)
- Quick action buttons

**StudentDashboard.tsx**:
- Student's registrations summary
- Upcoming events
- Registration status
- Quick registration options

**CoordinatorDashboard.tsx**:
- Year-specific statistics
- Student list (their year only)
- Pending approvals
- Recent activities

**EventManagerDashboard.tsx**:
- Global event overview
- Event participation stats
- Registration by category
- Performance metrics

### 7.3 Form Components

Located in `components/forms/`:

**CreateEventForm/Dialog**:
- Event creation with all fields
- Validation using React Hook Form + Zod
- Category and mode selection

**EditEventForm/Dialog**:
- Modify existing event
- Conditional fields based on mode

**StudentRegistrationForm/Dialog**:
- Admin/coordinator registration interface
- Student selection
- Event selection
- Validation against limits

**StudentSelfRegistrationDialog**:
- Students register themselves
- Limited to available events
- Respects registration deadlines

**AddStudentForm/Dialog**:
- Manual student entry
- Roll number validation
- Department & year selection

**EditStudentDialog**:
- Update student information
- Roll number management

**CSVUploadDialog**:
- Bulk student import
- CSV validation
- Error reporting

### 7.4 Dialog Components

**EventDetailsDialog**:
- Modal showing full event information
- Registrations count
- Event status

**RegistrationStatsComponent**:
- Shows current vs max registrations
- Visual progress indicators
- Category breakdown

### 7.5 UI Components

shadcn/ui components including:
- Button, Input, Label
- Card, Dialog, Drawer
- Table (with pagination support)
- Badge, Separator
- Select, Checkbox, Radio, Switch
- Alert, Toast notifications
- Tabs, Accordion
- Scroll areas, Tooltips

---

## 8. HOOKS

### 8.1 Custom Hooks

**useAuth()**:
- Returns: { user, session, profile, loading, signingOut, signIn, signUp, signOut }
- Must be within AuthProvider

**useRole()**:
- Returns: { activeRole, setActiveRole, availableRoles }
- Must be within RoleProvider

**use-mobile.tsx**:
- Media query hook for responsive design
- Returns: boolean (isMobile)

**use-toast.ts**:
- Toast notification hook
- Returns: toast function

### 8.2 React Query (TanStack Query)

- QueryClient setup in App.tsx
- Used for API data fetching
- Caching and background refetching
- Configured with sensible defaults

---

## 9. UTILITIES

### 9.1 Activity Logger (activityLogger.ts)

**Functions**:

| Function | Purpose |
|----------|---------|
| `logActivity()` | Generic activity logging |
| `logUserLogin()` | RPC call to log login |
| `logUserLogout()` | RPC call to log logout |
| `logStudentActivity()` | Student CRUD logging |
| `logRegistrationActivity()` | Registration status changes |
| `logEventActivity()` | Event management logging |

**Implementation**:
- Uses RPC calls to database functions
- Automatically captures user_agent
- Stores JSON details for flexibility
- Non-blocking (doesn't throw on failure)

### 9.2 PDF Generator (pdfGeneratorV2.ts)

**Class**: `PDFGeneratorV2`

**Methods**:
- `addHeader(title, subtitle)`: Styled header
- `addFooter()`: Page number and footer
- `createTableHTML()`: Convert data to HTML table
- `generateRegistrationReport()`: Create registration PDF
- `generateEventRoster()`: Create event roster PDF

**Features**:
- Branded headers with Aaroh colors
- Pagination support
- Formatted tables
- Generated timestamp
- Professional styling

### 9.3 Registration Limits (registration-limits.ts)

**Functions**:
- `fetchRegistrationLimits()`: Get max_on_stage, max_off_stage
- `getStudentRegistrationInfo()`: Student usage vs limits
- `checkStudentRegistrationLimits()`: Validate registration possible

**Data Structures**:
```typescript
interface StudentRegistrationInfo {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  currentCount: number;
  limit: number;
  registrations: Array<{ event_name, category }>
}
```

### 9.4 Role Utilities (roleUtils.ts)

**Functions**:

| Function | Purpose |
|----------|---------|
| `hasRole(userRole, targetRole)` | Check if user has specific role |
| `hasAnyRole(userRole, targetRoles)` | Check if user has any of roles |
| `getCoordinatorYear(userRole)` | Extract year from coordinator role |
| `getRoleDisplay(userRole)` | Get formatted role display |

**Examples**:
```typescript
// Check role
hasRole('admin', 'admin') → true
hasRole(['admin', 'student'], 'admin') → true

// Get coordinator year
getCoordinatorYear('first_year_coordinator') → 'first'

// Display roles
getRoleDisplay(['admin', 'student'], getRoleLabel) → "Administrator, Student"
```

### 9.5 Constants (lib/constants.ts)

**Exports**:
- `USER_ROLES`: Role enum
- `ACADEMIC_YEARS`: Year mapping
- `EVENT_CATEGORIES`: on_stage, off_stage
- `EVENT_MODES`: individual, group
- `REGISTRATION_METHODS`: student, coordinator
- `REGISTRATION_STATUS`: pending, approved, rejected
- `getRoleLabel()`: Role → human label
- `getYearLabel()`: Year → human label

### 9.6 Settings (lib/settings.ts)

**Functions**:
- `fetchSystemSettings()`: Load sign_up_enabled setting
- Returns default values on error for graceful degradation

---

## 10. KEY FEATURES

### 10.1 Multi-Role Support

- Users can have multiple roles (admin, event_manager, coordinators, student)
- Stored as TEXT[] array in database
- Smart selection prioritizes higher roles
- Frontend respects role-based access at all levels

### 10.2 Registration Limits

**Per Category Limits**:
- Max on-stage events per student
- Max off-stage events per student
- Configurable via Settings page

**Validation**:
- Database trigger enforces at insertion
- Frontend validation before submission
- Prevents exceeding limits

**Group Events**:
- Special handling for group registrations
- Max 1 group per year per event
- Team size validation

### 10.3 Real-Time Features

**Activity Log Subscriptions**:
- `supabase.channel()` for realtime updates
- Auto-refresh on new logs
- Triggered on INSERT events

**Settings Subscriptions**:
- Can subscribe to setting changes
- Events page checks global_registration_open
- Scoreboard visibility setting

### 10.4 PDF Generation

**Report Types**:
1. **Registration Report**: Student-centric view
   - Student name, roll, department, year
   - Event details, venue, date
   - Registration status

2. **Event Roster**: Event-centric view
   - All students registered for event
   - Grouped by year
   - Professional formatting

**Technical Implementation**:
- html2canvas for DOM → canvas
- jsPDF for PDF generation
- Client-side processing (no server needed)

### 10.5 Activity Logging

**What Gets Logged**:
- User logins/logouts
- Student CRUD operations
- Registration approvals/rejections
- Event creation/updates
- Settings changes
- User management actions

**Log Structure**:
```typescript
{
  id: UUID,
  user_id: UUID,          // Who did it
  action: string,         // What action
  details: JSONB,         // Action-specific data
  ip_address: string,     // Auto-captured
  user_agent: string,     // Auto-captured
  created_at: timestamp
}
```

**Permissions**:
- Admins: See all activity
- Others: See only their own

### 10.6 Validation

**Frontend** (React Hook Form + Zod):
- Email format
- Password strength
- Required fields
- Unique roll numbers

**Backend** (Database Triggers):
- Registration participation limits
- Event capacity validation
- Role-based access enforcement
- Unique constraints

---

## 11. DATABASE MIGRATIONS

### 11.1 Migration Categories

**Schema Migrations**:
- 20251220000000_aaroh_schema.sql: Core schema definition
- 20251221000002_rename_sports_to_events.sql: Refactoring
- 20251221000012_add_event_categories.sql: Feature additions

**Security Migrations**:
- 20251221000011_multi_role_support.sql: Array-based roles
- 20251221000016_event_manager_policies.sql: RLS policies
- 20251223000001_fix_settings_rls.sql: Settings access control

**Feature Migrations**:
- 20251223000004_create_event_results.sql: Result tracking
- 20251221000028_update_registration_limits.sql: Limit configuration
- 20251221000026_import_off_stage_events.sql: Data import

**Function Migrations**:
- 20251221000006_create_log_user_login_function.sql: RPC functions
- 20251221000013_fix_link_student_function.sql: Student linking
- 20251221000017_add_email_update_rpc.sql: Email sync

### 11.2 Important Migrations

**20251221000011_multi_role_support.sql**:
- Converts role from single enum to TEXT[] array
- Recreates all RLS policies
- Uses `role @> ARRAY['admin']` for checks

**20251221000014_fix_auth_trigger_multi_role.sql**:
- Updates `handle_new_user()` to support role arrays

**20251223000001_fix_settings_rls.sql**:
- Ensures settings table is protected properly
- Only admins can update settings

---

## 12. CONFIGURATION & ENV

### 12.1 Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 12.2 Build Configuration

**vite.config.ts**:
```typescript
- Host: "::" (IPv6)
- Port: 8080
- Plugin: @vitejs/plugin-react-swc (fast builds)
- Alias: "@" → src/
```

**tsconfig.json**:
- TypeScript 5.x
- React 18 JSX mode
- Path alias for "@"

**tailwind.config.ts**:
- Content: src/**/*.tsx
- Theme customization
- Plugin support

**eslint.config.js**:
- ES2020 target
- React plugin enabled
- TypeScript support

---

## 13. SECURITY CONSIDERATIONS

### 13.1 Authentication

✅ **JWT-based**: Supabase auth handles token management
✅ **Session Persistence**: localStorage with auto-refresh
✅ **Password Security**: Server-side hashing via Supabase
⚠️ **Password Change**: Requires identity verification (considered)

### 13.2 Authorization

✅ **Row Level Security**: All tables have RLS policies
✅ **Role-based Access**: Enforced at database level
✅ **Frontend Checks**: hasRole() utility prevents accidental access
✅ **API-level**: Only RPC functions callable by users

### 13.3 Data Protection

✅ **Activity Logs**: Complete audit trail
✅ **Timestamps**: All modifications tracked
✅ **User Agent**: Device identification
✅ **IP Address**: Network tracking
⚠️ **Sensitive Data**: Stored in JSONB details

### 13.4 Potential Improvements

1. **Rate Limiting**: Add on RPC functions
2. **CSRF Protection**: Consider for state-changing ops
3. **Input Sanitization**: Zod already validates
4. **Encryption**: For sensitive activity log details
5. **Logging Retention**: Policy for data cleanup
6. **2FA**: Not yet implemented
7. **Session Timeout**: Could add inactivity logout

---

## 14. PERFORMANCE CONSIDERATIONS

### 14.1 Optimizations

✅ **Lazy Loading**: Code splitting via React Router
✅ **Pagination**: Activity logs use offset-limit
✅ **Caching**: React Query handles data caching
✅ **Realtime Filtering**: Debounced search (400ms)
✅ **Component Memoization**: Partial in dashboards
✅ **CSS-in-JS**: Minimal Tailwind output

### 14.2 Potential Issues

⚠️ **Large CSV Imports**: No streaming/chunking
⚠️ **PDF Generation**: Client-side can be slow
⚠️ **Search**: Uses OR with multiple filters (complex queries)
⚠️ **Real-time**: Subscribes but may miss updates if limit exceeded

### 14.3 Optimization Opportunities

1. Server-side CSV import
2. Pagination for large result sets
3. Virtual scrolling for tables
4. Query result caching
5. Debounced search improvements
6. Image compression for exports

---

## 15. ERROR HANDLING

### 15.1 Error Types

**Authentication Errors**:
- Invalid credentials
- Session expired
- Profile fetch failed

**Validation Errors**:
- Form validation (Zod)
- Database constraints
- Business logic violations

**Network Errors**:
- Supabase connection failure
- Timeout errors
- Offline mode

**Permission Errors**:
- RLS policy violations
- Insufficient role
- Unauthorized action

### 15.2 Error Handling Patterns

**Toast Notifications**:
```typescript
toast({
  title: 'Error',
  description: error.message,
  variant: 'destructive'
})
```

**Try-Catch Blocks**:
- All async operations wrapped
- Logging to console for debugging
- User-friendly messages

**Graceful Degradation**:
- Settings fetch returns defaults on error
- Missing data doesn't crash component
- Fallback UI provided

### 15.3 Debugging Tools

- Console logging throughout
- ActivityLogs page for audit trail
- React DevTools for state inspection
- Network tab for API calls
- Supabase dashboard for database

---

## 16. TESTING CONSIDERATIONS

### 16.1 Testing Areas

**Unit Tests** (Not present, recommended):
- Role utilities
- Validation functions
- Utility functions

**Integration Tests** (Not present, recommended):
- Auth flow (login/signup/logout)
- Registration creation and validation
- Activity logging
- Settings updates

**E2E Tests** (Not present, recommended):
- Complete user flows
- Role switching
- Multi-year coordinator access
- PDF generation

### 16.2 Test Data

Available scripts for testing:
- seed-test-data.mjs: Create test records
- create-student-accounts.mjs: Bulk user creation
- debug-login-flow.mjs: Auth debugging

---

## 17. DEPLOYMENT

### 17.1 Build Process

```bash
npm run build      # Production build
npm run build:dev  # Development build
npm run dev        # Dev server
npm run preview    # Preview production build
npm run lint       # ESLint check
```

### 17.2 Deployment Configuration

**vercel.json**:
- Optimized for Vercel deployment
- Environment variable configuration
- Build command settings

### 17.3 Build Output

- Vite creates optimized bundles
- Code splitting for route components
- CSS purging via Tailwind
- Asset optimization

---

## 18. CODE QUALITY

### 18.1 Type Safety

✅ **TypeScript**: Strict mode enabled
✅ **Zod**: Runtime validation
✅ **Types**: Auto-generated from Supabase schema
⚠️ **Any Types**: Some usage in older code

### 18.2 Code Organization

✅ **Component Separation**: Atomic design
✅ **Utility Extraction**: Reusable functions
✅ **Type Definitions**: Interfaces for all data
⚠️ **File Size**: Some pages are large (600+ lines)

### 18.3 Naming Conventions

✅ **Components**: PascalCase
✅ **Functions**: camelCase
✅ **Constants**: UPPER_SNAKE_CASE
✅ **Files**: Descriptive names

---

## 19. KEY INSIGHTS & BEST PRACTICES

### 19.1 Patterns Used

1. **Context API for Global State**: Auth, Role, Theme
2. **Custom Hooks**: Encapsulate logic
3. **Database Triggers**: Server-side validation
4. **RLS Policies**: Row-level security
5. **Activity Logging**: Complete audit trail
6. **Pagination**: For large datasets
7. **Modal Dialogs**: For confirmations and forms
8. **Real-time Subscriptions**: Live updates

### 19.2 Strengths

✅ Comprehensive role-based access control
✅ Extensive audit logging and activity tracking
✅ Multi-role support with intelligent selection
✅ Strong database-level security with RLS
✅ Form validation at multiple levels
✅ Responsive UI with shadcn/ui
✅ TypeScript for type safety
✅ Modular component structure
✅ Real-time capabilities

### 19.3 Areas for Improvement

1. **Testing**: No test suite present
2. **Error Boundaries**: Component error handling missing
3. **Performance**: Some queries could be optimized
4. **Documentation**: Inline comments sparse
5. **Accessibility**: ARIA labels could be more comprehensive
6. **Loading States**: Some pages lack skeleton loaders
7. **Email Notifications**: Not implemented
8. **Offline Support**: Not implemented
9. **Internationalization**: Not implemented

---

## 20. MIGRATION NOTES

### 20.1 Database Evolution

The codebase shows evidence of significant refactoring:
- Original "sports" terminology renamed to "events"
- Single roles evolved to multi-role support
- Settings structure unified and simplified
- Auth trigger updated for role arrays
- RLS policies recreated multiple times for correctness

### 20.2 Breaking Changes

- Role column now expects TEXT[] (array)
- Old single-role logic may fail
- Migrations must run in order
- Settings keys standardized

---

## 21. QUICK REFERENCE

### 21.1 Common Tasks

**Add New Role**:
1. Add to USER_ROLES in constants.ts
2. Add enum in migration
3. Update RLS policies
4. Update RoleContext prioritization
5. Create dashboard component

**Add New Setting**:
1. Define key in Settings page
2. Create migration to insert default
3. Fetch in relevant pages
4. Add to settings.ts if global

**Add New Event Category**:
1. Update event_category enum
2. Add to constants
3. Update validation logic
4. Create new dashboard/report sections

**Log New Activity**:
1. Call logActivity() or specific log function
2. Include meaningful action name
3. Store relevant details in JSON

**Create New Page**:
1. Add route in App.tsx
2. Create file in src/pages/
3. Wrap in ProtectedRoute if needed
4. Add navigation link
5. Implement access control

### 21.2 Useful Utilities

| Utility | Import | Use Case |
|---------|--------|----------|
| hasRole | lib/roleUtils | Check user role |
| logActivity | utils/activityLogger | Log actions |
| fetchRegistrationLimits | lib/registration-limits | Get limits |
| getRoleLabel | lib/constants | Format role |
| toast | hooks/use-toast | Show notification |
| supabase | integrations/supabase/client | DB queries |

---

## 22. FILE TREE SUMMARY

```
aaroh/
├── src/
│   ├── App.tsx ........................... Main app with routes
│   ├── main.tsx .......................... Entry point
│   ├── contexts/
│   │   ├── AuthContext.tsx ............. Auth state
│   │   ├── RoleContext.tsx ............. Active role
│   │   └── ThemeContext.tsx ............ Theme state
│   ├── pages/
│   │   ├── Auth.tsx .................... Login/signup
│   │   ├── Dashboard.tsx ............... Role selector
│   │   ├── Students.tsx ................ Student mgmt
│   │   ├── Events.tsx .................. Event mgmt
│   │   ├── Registrations.tsx ........... Registration mgmt
│   │   ├── ActivityLogs.tsx ............ Audit trail
│   │   ├── Settings.tsx ................ System config
│   │   ├── Profile.tsx ................. User profile
│   │   ├── MyRegistrations.tsx ......... Student registrations
│   │   ├── EventSettings.tsx ........... Event config
│   │   ├── Scoreboard.tsx .............. Results view
│   │   ├── UserManagement.tsx .......... User admin
│   │   ├── EventActivity.tsx ........... Event tracking
│   │   └── admin/ ....................... Admin-specific
│   ├── components/
│   │   ├── dashboards/ ................. Dashboard variants
│   │   ├── forms/ ...................... Form components
│   │   ├── dialogs/ .................... Modal components
│   │   ├── layout/ ..................... Layout wrapper
│   │   └── ui/ ......................... Atomic UI
│   ├── hooks/ .......................... Custom hooks
│   ├── lib/ ............................ Utilities
│   └── utils/ .......................... Helpers
├── supabase/
│   ├── migrations/ ..................... 50+ SQL files
│   └── config.toml ..................... Supabase config
├── scripts/ ............................ Node scripts
├── package.json ........................ Dependencies
├── vite.config.ts ...................... Build config
├── tsconfig.json ....................... TypeScript config
└── tailwind.config.ts .................. Styling config
```

---

## CONCLUSION

**Aaroh** is a well-architected, feature-rich event management platform that demonstrates:

- Professional React/TypeScript development practices
- Comprehensive role-based access control
- Extensive activity logging and audit capabilities
- Multi-role user support with intelligent selection
- Strong database security with RLS policies
- Responsive, accessible UI using modern component libraries

The codebase is production-ready with opportunities for enhancement in testing, performance optimization, and additional features like email notifications and offline support.

**Best Practices Demonstrated**:
✅ Separation of concerns
✅ Type safety with TypeScript
✅ Security at multiple levels
✅ Comprehensive logging
✅ Component reusability
✅ Context for global state
✅ Custom hooks for logic
✅ Database-level validation
✅ User-friendly error handling
✅ Responsive design
