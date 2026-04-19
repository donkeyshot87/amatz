# Stage Drill-Down Design

**Goal:** Each stage in the project timeline becomes an expandable accordion with role-based visibility, free-text notes, and stage-scoped file attachments.

**Architecture:** Pure UI change — no DB schema changes required. `notes` and `stage_id` already exist. A `canViewStage()` permission function gates which stages expand per role. `StagePanel` renders the expanded content inside the project detail view. `FieldStageCard` renders the same expanded content in the field and production views.

**Tech Stack:** Next.js App Router, React (client components), Supabase, custom CSS design system (industrial-luxe dark theme), TypeScript.

---

## Role → Visible Stages

| Role | Stages with drill-down |
|------|------------------------|
| developer, admin | 1, 2, 3, 4, 5, 6, 7 |
| coordinator | 1, 2, 3, 4, 5, 6, 7 |
| production, production_manager | 2, 4, 5 |
| field_manager | 3, 6, 7 |
| finance | 1 |

Stages the user cannot view show no expand indicator and clicking does nothing.

---

## Panel Content

Every expanded stage panel shows:

1. **Notes** — inline editable free-text field, saved to `project_stages.notes` on blur. Saving/saved indicators shown inline.
2. **Files** — list of attachments filtered by `stage_id`, plus an upload button that tags the file to this stage.
3. **Sensitive data** (stage 1 only, FINANCE_ROLES) — contract value and cost estimate pulled from the project record.

---

## Files

### Modified
- **`lib/permissions.ts`** — added `canViewStage(role, stageNumber): boolean` and `canCompleteStage(role, stageNumber): boolean`
- **`components/StageTimeline.tsx`** — each stage row is an accordion; passes `attachments` filtered by `stage_id` into `StagePanel`; passes `project` for stage-1 finance data
- **`app/projects/[id]/ProjectDetail.tsx`** — passes `attachments` and `project` into `StageTimeline`
- **`app/field/page.tsx`** — groups stages by project, fetches attachments, passes to `FieldStageCard`
- **`app/production/page.tsx`** — same as field; includes stage 2 (שרטוטים) in addition to stages 4 and 5

### Created
- **`components/StagePanel.tsx`** — client component: notes editor + saving indicator + file list + file upload + optional finance fields (stage 1, finance roles)
- **`components/FieldStageCard.tsx`** — client component shared by `/field` and `/production`. Shows all stages for a project as expandable rows. Each row has inline status select (for authorized users) + `StagePanel` when open. Shows `ConfirmationToast` on status update.
- **`components/StatusFilterBar.tsx`** — pill filter bar for status selection (pending, in_progress, done, etc.) used on `/field` and `/production`

---

## Behavior Details

- **Accordion:** Multiple stages can be open simultaneously; default all closed.
- **Notes save:** On blur. No explicit save button. `savedNotes` state tracks last-saved value to prevent redundant DB writes.
- **File upload:** Existing `FileUpload` component reused, passing `stageId` so the attachment is tagged to the stage.
- **File list:** Existing `FileList` component reused, filtered to `stage_id`.
- **No DB changes:** `project_stages.notes` (text, nullable) and `attachments.stage_id` (uuid, nullable) already existed.

---

## Screens Using Stage Drill-Down

| Screen | Component | Stages shown |
|--------|-----------|--------------|
| `/projects/[id]` | `StageTimeline` + `StagePanel` | All 7 stages (role-gated) |
| `/field` | `FieldStageCard` | 3, 6, 7 |
| `/production` | `FieldStageCard` | 2, 4, 5 |
