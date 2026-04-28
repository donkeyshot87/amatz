# Amatz Aluminum — V2 Feature Set Design Spec
**Version:** 1.0  
**Date:** 2026-04-28  
**Status:** Approved for implementation

---

## 1. Overview

This spec covers the second major iteration of the Amatz Aluminum project management system, based on feedback collected from Itzik and a team member. It introduces 10 feature areas across 5 implementation phases.

**All UI text is in Hebrew. English appears only in code identifiers (table names, variables, etc.).**

---

## 2. Feature Areas

1. Theme — replace dark mode with standard light design system
2. Data model additions — pulses, additions (sub-projects), tail_issue_id on attachments, can_edit on user_profiles
3. Unified filter bar — status, text search, sort by date — across all screens
4. Stage editing — contract value, billing %, pulse management, category quantities
5. Additions (תוספות) — sub-projects within a parent project
6. גמרים (formerly זנבות) — renamed + enhanced post-delivery service calls
7. Permissions — simplified 2-level model (view / view+edit)
8. Project deletion — admin/developer only with confirmation
9. File upload — fix existing broken upload flow
10. Status display order — consistent across all UI

---

## 3. Theme & Design System

### 3.1 Goal
Replace the custom "industrial-luxe" dark theme with a standard, clean light design system familiar to business users.

### 3.2 New CSS Variables (replaces entire :root block in globals.css)

```css
--bg-page:       #f5f7fa;
--bg-surface:    #ffffff;
--bg-card:       #ffffff;
--bg-raised:     #f9fafb;
--bg-hover:      #f3f4f6;

--border-subtle: #e5e7eb;
--border-mid:    #d1d5db;
--border-accent: #9ca3af;

--text-primary:  #111827;
--text-secondary:#374151;
--text-muted:    #6b7280;
--text-inverse:  #ffffff;

--brand:         #2563eb;
--brand-hover:   #1d4ed8;
--brand-light:   #eff6ff;
--brand-border:  #bfdbfe;

--status-active:   #2563eb;
--status-issues:   #ef4444;
--status-closed:   #6b7280;
--status-pending:  #f59e0b;
--status-done:     #22c55e;
--status-blocked:  #ef4444;
--status-in-progress: #3b82f6;

--font-display: 'Heebo', sans-serif;
--font-body:    'Rubik', sans-serif;

--radius-sm:    4px;
--radius-md:    8px;
--radius-lg:    12px;
--radius-pill:  999px;

--shadow-card:  0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
--shadow-raised: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
```

### 3.3 Base Styles
- `body` background: `var(--bg-page)` (light grey)
- Cards: white background, 1px `var(--border-subtle)` border, `var(--shadow-card)`
- Primary buttons: `var(--brand)` background, white text
- Secondary buttons: white background, `var(--border-mid)` border, `var(--text-primary)` text
- Inputs: white background, `var(--border-mid)` border, focus ring `var(--brand-border)`
- NavBar: white background with bottom border

### 3.4 Scope
Many CSS variable names are reused (e.g. `--bg-card`, `--bg-raised`, `--border-subtle`) but their values change from dark to light. Variables that are removed entirely and must be replaced: `--bg-deep` → `--bg-page`, `--gold` / `--gold-bright` / `--gold-dim` / `--gold-glow` → `--brand` / `--brand-light` / `--brand-border`. Every component and page that hardcodes a removed variable name must be updated.

---

## 4. Data Model Changes

### 4.1 New table: stage_pulses

```sql
CREATE TABLE stage_pulses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id     uuid NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pulse_number integer NOT NULL,
  name         text,
  billing_pct  integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','blocked')),
  -- Installation (stage 6) category quantities
  qty_openings_planned  integer,
  qty_openings_actual   integer DEFAULT 0,
  qty_windows_planned   integer,
  qty_windows_actual    integer DEFAULT 0,
  qty_showcases_planned integer,
  qty_showcases_actual  integer DEFAULT 0,
  qty_curtain_planned   integer,
  qty_curtain_actual    integer DEFAULT 0,
  -- Blind frame (stage 3) category quantity
  qty_blind_frame_planned integer,
  qty_blind_frame_actual  integer DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(stage_id, pulse_number)
);
```

**Which stages use pulses:** Stage 3 (blind frame / משקוף עיוור) and Stage 6 (installation / התקנה) only.

**Categories per stage:**
- Stage 6: פתחים (openings), חלונות (windows), ויטרינות (showcases), קירות מסך (curtain walls)
- Stage 3: משקוף עיוור only

**Billing:** When a pulse moves to `in_progress`, a `billing_alerts` record is created with `amount = project.contract_value × pulse.billing_pct / 100`. The parent stage's `billing_pct` is set to 0 for stages 3 and 6 (billing handled at pulse level).

**Status flow:** ממתין → בתהליך → הושלם → חסום (can move to blocked from any state).

### 4.2 New table: additions

```sql
CREATE TABLE additions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  contract_value        numeric,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','completed','cancelled')),
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
```

Each addition gets 5 stages automatically on creation (see section 7).

### 4.3 New table: addition_stages

Billing alerts for addition stages use the existing `billing_alerts` table. Two nullable columns are added to `billing_alerts`: `addition_id` and `addition_stage_id`, so the billing screen can display the source (main project stage or addition stage) with the correct label.

```sql
ALTER TABLE billing_alerts ADD COLUMN addition_id uuid REFERENCES additions(id);
ALTER TABLE billing_alerts ADD COLUMN addition_stage_id uuid REFERENCES addition_stages(id);
```

When an addition stage is completed and has `billing_pct > 0`, a billing alert is created with `amount = addition.contract_value × billing_pct / 100`. The billing screen shows the addition name as the source label.

### 4.3 New table: addition_stages

```sql
CREATE TABLE addition_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addition_id  uuid NOT NULL REFERENCES additions(id) ON DELETE CASCADE,
  stage_number integer NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  stage_name   text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','blocked')),
  notes        text,
  billing_pct  integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(addition_id, stage_number)
);
```

Addition stages: 1-הסכם, 2-שרטוטים, 3-ייצור, 4-התקנה, 5-מסירה.

### 4.4 Altered table: attachments

```sql
ALTER TABLE attachments ADD COLUMN tail_issue_id uuid REFERENCES tail_issues(id);
```

Allows files to be attached to a specific גמר (tail issue) call.

### 4.5 Altered table: user_profiles

```sql
ALTER TABLE user_profiles ADD COLUMN can_edit boolean NOT NULL DEFAULT true;
```

`true` = view + edit. `false` = view only.

### 4.6 No changes to: projects, project_stages, stage_history, billing_alerts, tail_issues

The `tail_issues` table keeps its current column names. The rename from "זנבות" to "גמרים" is UI-only.

---

## 5. Status Display Order

Across all screens, status values are always displayed in this order:
1. ממתין (pending)
2. בתהליך (in_progress)
3. הושלם (completed)
4. חסום (blocked)

This applies to filter bars, dropdowns, and status selectors.

---

## 6. Unified Filter Bar

### 6.1 Component: FilterBar (replaces StatusFilterBar)

Used on: dashboard, production screen, field screen, admin screen.

**Controls:**
- **Text search input** — filters projects by name, client name. Client-side, real-time.
- **Status filter pills** — ממתין / בתהליך / הושלם / חסום. Multi-select (existing behavior on production/field screens). "הכל" clears selection.
- **Sort dropdown** — options: "תאריך יצירה (חדש ראשון)", "תאריך יצירה (ישן ראשון)", "תאריך מסירה (קרוב ראשון)", "תאריך מסירה (רחוק ראשון)".

**State:** URL query params (`?q=`, `?s=`, `?sort=`) — consistent with existing `?s=` param pattern.

### 6.2 Project card additions
- Display `created_at` date on project cards
- Display `planned_delivery_date` (already shown) and `actual_delivery_date` when set

---

## 7. Stage Editing

### 7.1 Stage 1 — contract value & billing percentages
Users with `can_edit = true` and role in `FINANCE_ROLES` (`developer`, `admin`) can edit:
- `projects.contract_value` — inline editable field in the stage 1 panel
- `project_stages.billing_pct` per stage — shown as a list in the stage 1 panel, editable for stages without pulses (stages 1, 2, 4, 5, 7)

### 7.2 All stages — notes editing
Already implemented. No change.

### 7.3 Pulse management (stages 3 & 6)

**Admin/developer only can:**
- Add a new pulse (button: "הוסף פעימה")
- Set pulse name, billing %, and planned category quantities per pulse
- Delete a pulse (only if status is `pending`)

**Workers (can_edit = true) can:**
- Update actual category quantities per pulse
- Change pulse status

**Pulse panel shows:**
- Pulse name + billing % + status selector
- Per-category rows: "מתוך X הותקנו Y" with an editable actual quantity field
- Progress indicator: actual/planned per category

---

## 8. Additions (תוספות)

### 8.1 Creation
- Admin/developer only
- Button "הוסף תוספת" in the project page
- Form: name, description (optional), contract value (optional)
- On save: 5 addition_stages created automatically with names: הסכם, שרטוטים, ייצור, התקנה, מסירה and billing_pct = 0 (admin sets percentages later)

### 8.2 Display
- Section titled "תוספות" appears on the project page below the main stage timeline
- Each addition is an accordion card showing: name, status summary, contract value (finance roles only)
- Expanded: shows its 5 stages (same accordion pattern as main stages)
- Billing alerts from addition stages flow into the existing billing screen, labeled with the addition name

### 8.3 Permissions
- Create/delete addition: `developer`, `admin` only
- Edit addition stages: same rules as main project stages (`can_edit = true`)
- View: all authenticated users

---

## 9. גמרים (formerly זנבות)

### 9.1 Rename
All UI references to "זנבות" → "גמרים". Table name `tail_issues` stays unchanged in DB.

### 9.2 Enhanced entry fields
Each גמר entry displays:
- Description
- `created_at` — "נפתח ב-"
- `assigned_to` (renamed label: "מטפל")
- Status: פתוח / בטיפול / טופל
- `resolved_at` — "טופל ב-" (shown when status = resolved)
- File attachments (via `attachments.tail_issue_id`)
- Count of files attached

### 9.3 Project card badge
Shows count of open גמרים (status = open or in_progress). Same as current open tail_issues badge.

---

## 10. Permissions — 2-Level Model

### 10.1 Levels
- **View only** (`can_edit = false`): user can expand all stages visible to their role and read all details. No edit controls rendered.
- **View + Edit** (`can_edit = true`, default): full edit access as defined by existing role rules.

### 10.2 Implementation
- `can_edit` boolean column on `user_profiles` (default `true`)
- All edit controls (status selectors, note inputs, file upload buttons, pulse quantity inputs) check `can_edit` before rendering
- Billing permissions are unaffected — they remain governed by `BILLING_ROLES` as before

### 10.3 Admin UI
User management screen (admin/developer only) gains a toggle per user: "עריכה מופעלת / כבויה"

---

## 11. Project Deletion

- Delete button visible only for `role IN ('developer', 'admin')`
- Appears on the project detail page
- Clicking shows a confirmation dialog: "האם אתה בטוח שברצונך למחוק את הפרויקט? פעולה זו אינה הפיכה."
- On confirm: `DELETE FROM projects WHERE id = ?` (cascades to all related tables via ON DELETE CASCADE)
- After deletion: redirect to dashboard

---

## 12. File Upload Fix

The existing `FileUpload` component is broken. The fix involves:
- Verifying Supabase Storage bucket `project-attachments` exists and has correct RLS
- Ensuring the upload path `{project_id}/{stage_id?}/{file_name}` is valid
- Fixing any client-side error that prevents upload completion
- This is a bug fix — no design change to the component's UI

---

## 13. Implementation Phases

### Phase 1 — Theme
- Rewrite `globals.css` CSS variables and base styles
- Update all components and pages to use new variables
- Update NavBar styling

### Phase 2 — Data Model
- Migration: create `stage_pulses`, `additions`, `addition_stages` tables
- Migration: alter `attachments` (add `tail_issue_id`), alter `user_profiles` (add `can_edit`)
- Update RLS policies for new tables
- Update TypeScript types in `lib/types.ts`

### Phase 3 — Filters, Sorting & Project Cards
- Build `FilterBar` component (replaces `StatusFilterBar`)
- Add to dashboard, production, field, admin screens
- Add `created_at` display to project cards
- Ensure consistent status order in all filter/select UIs

### Phase 4 — Stage Editing, Pulses & Additions
- Stage 1 inline editing (contract value, billing %)
- Pulse management UI for stages 3 & 6
- Additions section on project page
- Addition creation form and stage display

### Phase 5 — Permissions, Deletion, גמרים & File Fix
- `can_edit` permission check throughout all edit controls
- Project delete button + confirmation
- Rename זנבות → גמרים throughout UI
- Enhanced גמר entry display (dates, handler, file count)
- File attachment support on גמר entries
- Fix file upload bug
- User management: can_edit toggle

---

## 14. What Does NOT Change

- Supabase Auth (email + password login)
- `billing_alerts` table and billing flow for non-pulse stages
- RTL layout
- Role-based data visibility (finance data, history log)
- NavBar navigation structure
- `stage_history` logging
- Automatic project status transitions (active → delivered_with_issues → closed)
- Project creation flow (7 stages auto-created)
