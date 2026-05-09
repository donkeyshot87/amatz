# Amatz — Aluminum Project Management System

A full-stack web application for managing aluminum fabrication and installation projects, built for a real operational team. The system tracks projects from quote through delivery, manages production stages, handles billing, and coordinates field operations.

## Features

- **Project dashboard** — filterable, searchable list of all projects with status, stage, and delivery date
- **Stage management** — step-by-step production pipeline with contract values, billing percentages, and pulse tracking
- **Additions (תוספות)** — sub-projects within a parent project with their own stage tracking
- **Tail issues (גמרים)** — post-delivery service call management with open/in-progress/closed status
- **File attachments** — upload and manage documents per project and per stage
- **Billing alerts** — visual indicators for billing milestones and overdue items
- **Role-based permissions** — view-only vs. edit access, with admin controls for user management and project deletion
- **Hebrew UI** — full Hebrew interface designed for Israeli business users

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend / Auth / DB | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
  dashboard/       # Project list with filtering and sorting
  projects/        # Individual project pages with stage management
  field/           # Field operation views
  production/      # Production tracking
  billing/         # Billing overview
  admin/           # User management (admin only)
  login/           # Authentication
components/        # Shared UI components
lib/               # Supabase client, types, permissions
```

## Deployment

Deploy on [Vercel](https://vercel.com) — connect your repo, add the environment variables, and it works out of the box.
