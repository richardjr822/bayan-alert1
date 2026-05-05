@AGENTS.md

# BayanAlert

## Overview

BayanAlert is a web-based community emergency reporting and response system designed to improve how incidents are reported and managed at the barangay level. The platform allows residents to quickly submit emergency reports with automatic location tagging and enables barangay officials to monitor and respond through a centralized dashboard.

The system aims to reduce delays caused by traditional reporting methods such as verbal communication or phone calls by providing a fast, accessible, and real-time digital solution.

---

## Objectives

- Design and develop a functional web-based emergency reporting system
- Reduce delays in reporting incidents at the barangay level
- Provide a centralized dashboard for real-time monitoring
- Improve communication between residents and barangay officials
- Enhance response efficiency and public safety

---

## Scope

### Included Features
- Resident registration and login (custom authentication)
- Emergency report submission
- Automatic geolocation tagging (browser-based)
- Real-time report monitoring dashboard
- Report status tracking
- Basic notification through UI updates

### Limitations
- Barangay-level implementation only
- Requires stable internet connection
- No integration with national emergency hotlines
- No SMS-based reporting
- No AI-based analysis
- System effectiveness depends on active usage

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

### Backend / Database
- Supabase (database only, no Supabase Auth)

### Authentication
- Custom authentication (email + password with hashing)

### Deployment
- Vercel

---

## Environment Variables


NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=


---

## Database Structure

### users
- id (uuid)
- full_name
- email (unique)
- password_hash
- contact_number
- role (resident, admin)
- created_at

### reports
- id (uuid)
- user_id (nullable)
- reporter_name
- contact_number
- incident_type
- description
- latitude
- longitude
- address
- status (pending, verified, in_progress, resolved, rejected)
- priority (low, medium, high, critical)
- created_at
- updated_at

### status_updates
- id (uuid)
- report_id
- status
- remarks
- updated_by
- created_at

---

## Application Flow

### 1. Visitor
- Opens landing page
- Can view system information
- Can navigate to:
  - Report page
  - Dashboard page
  - Login/Register

---

### 2. Resident

#### Registration & Login
- Creates account using:
  - Full name
  - Email
  - Contact number
  - Password
- Logs in using email and password

#### Submit Report
- Navigates to `/report`
- Fills out emergency form:
  - Incident type
  - Description
  - Contact number
- Uses browser geolocation to capture:
  - Latitude
  - Longitude
- Submits report

#### Result
- Report is saved in database
- Status is set to `pending`
- Resident can track report status

---

### 3. Admin / Barangay Official

#### Dashboard (`/dashboard`)
- Views all reports in real time
- Sees:
  - Total reports
  - Active reports
  - Resolved reports
- Reviews report details

#### Actions
- Updates report status:
  - pending
  - verified
  - in_progress
  - resolved
  - rejected
- Each update is stored in `status_updates`

---

## Pages Structure


/ Landing page
/login Login page
/register Register page
/report Emergency report page
/dashboard Monitoring dashboard


---

## UI/UX Rules

- Clean, modern, minimal interface
- Designed for fast interaction during emergencies
- Mobile-first responsive design
- Clear call-to-action buttons
- Reduced cognitive load

---

## Design System

### Color Tokens


--red: #D4AA00
--red-dark: #B98F00
--bg-gray: #f2f3f5
--card: #ffffff
--text: #2f3f57
--muted: #687689
--line: #e3e6eb
--dark: #1f2d42
--green-soft: #d8f5e6
--green: #20a45d


### Typography
- Font: Poppins
- Weights: 400, 500, 600, 700, 800

### Layout
- Max width: 1200px
- Section padding: 88px
- Responsive: mobile, tablet, desktop

---

## Coding Standards

- Use Next.js App Router
- Use TypeScript strictly
- Use functional components only
- Use Tailwind CSS for styling
- Use server components by default
- Use client components only when needed
- Avoid direct DOM manipulation
- Avoid unnecessary useEffect
- Avoid using any type
- Keep components small and reusable
- Clean folder structure

---

## Important Constraints

- No Supabase Auth
- No external authentication providers
- No comments in generated code

---

## Current Development Phase

- UI structure completed
- Supabase database connected
- Next step:
  - Authentication (register/login)
  - Report submission integration
  - Dashboard data integration

---

## Goal

Build a fast, reliable, and easy-to-use emergency reporting system that improves coordination and response time at the barangay level.