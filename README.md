# NextGen Learning Platform

> **"Leading Today, Shaping Tomorrow."**

A simple, fast, and accessible Udemy-style online learning web application built for NextGen. Powered by React, Vite, Tailwind CSS, and Supabase.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Architecture](#project-architecture)
3. [Environment Configuration & Secrets](#environment-configuration--secrets)
4. [Supabase Database Setup & Migration](#supabase-database-setup--migration)
5. [Creating the First Administrator](#creating-the-first-administrator)
6. [Phone Authentication Modes (`PHONE_AUTH_MODE`)](#phone-authentication-modes-phone_auth_mode)
7. [Running Locally](#running-locally)
8. [Testing & Build](#testing--build)
9. [Admin Panel Guide](#admin-panel-guide)
10. [Payment Service Layer & Future Gateways](#payment-service-layer--future-gateways)
11. [Deploying to Vercel](#deploying-to-vercel)

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router 7, Lucide Icons
- **Backend & Database**: Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions)
- **Deployment Target**: Vercel (SPA routing configured via `vercel.json`)
- **Testing**: Vitest

---

## Project Architecture

```
learning-site/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vercel.json                  # Single-Page App rewrites for Vercel
├── vite.config.ts
├── .env.example                 # Committed example env template
├── supabase/
│   ├── schema.sql               # Complete SQL migration: tables, triggers, RLS, storage
│   └── functions/
│       └── admin-reset-password/
│           └── index.ts         # Edge function for admin-initiated password resets
├── src/
│   ├── types/                   # TypeScript interfaces (Course, Lesson, Order, Profile, etc.)
│   ├── lib/
│   │   ├── supabase.ts          # Persistent Supabase client initialization
│   │   ├── phoneUtils.ts        # Indian mobile validation (+91), E.164, and detection
│   │   └── phoneUtils.test.ts   # Unit tests for phone parsing & validation
│   ├── contexts/
│   │   └── AuthContext.tsx      # Unified Auth provider (Email + Phone, persistent session)
│   ├── services/
│   │   ├── courseService.ts     # Public & Admin course CRUD and thumbnail uploads
│   │   ├── lessonService.ts     # Lesson CRUD, video uploads, curriculum reordering & progress
│   │   ├── enrollmentService.ts # Enrollment checks and manual grant/revoke operations
│   │   ├── orderService.ts      # Orders management & automatic enrollment on payment
│   │   ├── paymentService.ts    # Payment service layer with editable instructions
│   │   └── studentService.ts    # Student directory, course ownership, & password reset
│   ├── components/
│   │   ├── common/              # Navbar, Footer, ProtectedRoute, AdminRoute
│   │   └── course/              # CourseCard, CurriculumAccordion
│   ├── pages/
│   │   ├── public/              # HomePage, CourseListPage, CourseDetailPage, AuthPage, ForgotPasswordPage
│   │   ├── student/             # MyCoursesPage, CoursePlayerPage, ProfilePage
│   │   └── admin/               # AdminLayout, Dashboard, Courses, CourseEditor, Lessons, Students, Orders
│   ├── App.tsx                  # Main router configuration
│   └── main.tsx
```

---

## Environment Configuration & Secrets

Frontend secrets are never committed. Only the Supabase URL and anonymous key live in the client environment.

Create your `.env` file from the provided `.env.example`:

```bash
cp .env.example .env
```

Set the following variables in `.env`:

```env
# Supabase Project Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Phone Authentication Mode: "simple" (default) or "otp"
VITE_PHONE_AUTH_MODE=simple
```

> **Note:** `.gitignore` is pre-configured to strictly ignore `.env` and `.env*.local`.

---

## Supabase Database Setup & Migration

The entire database schema, triggers, Row Level Security (RLS) policies, and storage bucket definitions are packaged in [`supabase/schema.sql`](supabase/schema.sql).

### How to apply the migration:
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project, navigate to the **SQL Editor** tab from the left sidebar.
3. Click **New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.

### What this sets up automatically:
- **`profiles` Table**: Connected to `auth.users`. Automatically created on user sign-up with a strict `student` role default. Database triggers explicitly prevent users from escalating their own role to `admin`.
- **`courses` Table**: Public/students can only read published courses (`is_published = true`). Only admins can create, modify, or delete courses.
- **`lessons` Table**: Protected by RLS. The full lesson details (including `video_url`) can only be read by enrolled students or admins. A secure `get_course_curriculum()` function allows prospective students to see lesson titles and order without exposing video links.
- **`enrollments` Table**: Tracks student course ownership. Only admins can insert or update enrollments.
- **`lesson_progress` Table**: Tracks completed lessons per student.
- **`orders` Table**: Students can only create their own `pending` orders. Only admins can mark orders `paid` or `failed`.
- **Storage Buckets**:
  - `course-thumbnails` (Public bucket for course cover images).
  - `course-videos` (Private bucket for hosted video lessons; accessible via signed URLs).

---

## Creating the First Administrator

Nobody can register as an admin through the signup form (enforced at both database and UI levels).

To create your first admin:
1. Sign up on the web app using your email or phone number.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run this single documented line:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

*(If you signed up with a phone number in simple mode, use:)*
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE phone = '+919876543210';
```

Now reload the page and visit `/admin`. You will have full administrative access.

---

## Phone Authentication Modes (`PHONE_AUTH_MODE`)

The application supports both modes with **zero code rewrites**. Toggle between them using `VITE_PHONE_AUTH_MODE` in `.env`:

### 1. `"simple"` (Default - Recommended for launch without SMS bills)
- **No SMS provider required.**
- During sign up, the user provides their 10-digit Indian mobile number (+91).
- Behind the scenes, NextGen creates the Supabase account with an internal placeholder email (`91XXXXXXXXXX@phone.nextgen.local`) and stores the phone number in the user's profile.
- On login, the user simply enters their 10-digit phone number and password. The system auto-detects that it is a phone number.
- **Password Resets**: Handled securely by the administrator directly inside the Admin Panel at `/admin/students` (or via the Supabase SQL editor).

### 2. `"otp"` (Native SMS OTP Mode)
- Uses Supabase Phone Auth with SMS OTP verification.
- When an SMS provider (Twilio, MSG91, etc.) is configured in Supabase Auth settings, set:
  ```env
  VITE_PHONE_AUTH_MODE=otp
  ```
- The login and signup flows will automatically present an SMS OTP entry screen.

---

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:5173`.

---

## Testing & Build

- **Run Unit & Integrity Tests**:
  ```bash
  npm test
  ```
  Runs Vitest test suites covering Indian phone number validation (+91 parsing, E.164 conversion, identifier detection), payment service invariants, and database schema integrity.

- **Build for Production**:
  ```bash
  npm run build
  ```
  Runs TypeScript type checking (`tsc -b`) and bundles with Vite into the `dist/` folder.

---

## Admin Panel Guide

The Admin Panel is located at `/admin`.
- **Access Rule**: It is not linked on the public student navigation. You reach it by navigating to `/admin` in the browser URL bar.
- **Security**: Access is enforced by both the `AdminRoute` component and Postgres Row Level Security. Non-admin users are immediately redirected to the home page.

### Features:
1. **Dashboard**: View high-level metrics (Courses, Students, Active Enrollments, Pending Orders) and perform 1-click approvals for recent pending orders.
2. **Course Management**: Create, edit, and delete courses. Upload thumbnail images to Supabase Storage. Toggle published status with one click.
3. **Curriculum & Lesson Builder**: Reorder lessons using Up/Down arrow buttons (positions are updated automatically). Attach unlisted YouTube URLs, Vimeo URLs, or upload MP4 videos directly to the private Supabase Storage bucket.
4. **Student Management**: Search students by name, email, or mobile number. View owned courses and grant or revoke course access. Reset student passwords for phone accounts.
5. **Orders & Enrollments**: Filter orders by status (`pending`, `paid`, `failed`). Marking an order as "Paid" automatically creates the student's active enrollment.

---

## Payment Service Layer & Future Gateways

Payments are managed through an isolated payment service layer located at [`src/services/paymentService.ts`](src/services/paymentService.ts):

### Current Flow (Manual / UPI / Offline Order Approval):
1. A student clicks **Buy / Enroll** on a course.
2. A `pending` order is created in the database.
3. The student is presented with clear, editable payment instructions (UPI ID, bank account details, and support contact).
4. The administrator verifies receipt of payment in the Admin Panel (`/admin/orders`) and clicks **Mark Paid & Enroll**.
5. The enrollment is immediately activated for the student.

### Future Gateway Integration:
- To add Razorpay, Stripe, or Cashfree, update the methods inside [`src/services/paymentService.ts`](src/services/paymentService.ts).
- Webhook confirmations must be verified server-side inside a Supabase Edge Function using HMAC/signature verification. The frontend is never trusted to confirm payments.

---

## Deploying to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. In **Build and Output Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `VITE_PHONE_AUTH_MODE`: `simple` (or `otp`)
5. Click **Deploy**.
6. The included [`vercel.json`](vercel.json) automatically routes all paths (`/admin`, `/courses/*`, `/profile`) to `index.html` for clean client-side routing.
