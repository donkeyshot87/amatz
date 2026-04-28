# Stage Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the flat stage timeline into an accordion where each stage expands to show role-gated notes, stage-scoped files, and (stage 1 only) finance data.

**Architecture:** Three changes in sequence — add `canViewStage()` to permissions, build `StagePanel` client component, then wire `StageTimeline` into an accordion that uses it. The top-level Files section in `ProjectDetail` is removed; files now live inside each stage panel.

**Tech Stack:** Next.js 16 App Router, React client components, Supabase client, TypeScript, Tailwind CSS.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/permissions.ts` | Modify | Add `canViewStage(role, stageNumber)` |
| `components/StagePanel.tsx` | Create | Notes editor + FileList + FileUpload + optional finance fields |
| `components/StageTimeline.tsx` | Modify | Accordion shell — open/close per stage, pass filtered attachments to StagePanel |
| `app/projects/[id]/ProjectDetail.tsx` | Modify | Pass `attachments` and `project` to StageTimeline; remove top-level Files section |

---

## Task 1: Add `canViewStage` to permissions

**Files:**
- Modify: `lib/permissions.ts`

- [ ] **Step 1: Add the function**

Open `lib/permissions.ts`. The current content ends at line 27. Add after the last function:

```typescript
const STAGE_VIEW_MAP: Record<UserRole, number[]> = {
  developer:          [1, 2, 3, 4, 5, 6, 7],
  admin:              [1, 2, 3, 4, 5, 6, 7],
  coordinator:        [1, 2, 3, 4, 5, 6, 7],
  production:         [2, 4, 5],
  production_manager: [2, 4, 5],
  field_manager:      [3, 6, 7],
  finance:            [1],
}

export function canViewStage(role: UserRole, stageNumber: number): boolean {
  return STAGE_VIEW_MAP[role]?.includes(stageNumber) ?? false
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz"
git add lib/permissions.ts
git commit -m "feat: add canViewStage permission function"
```

---

## Task 2: Create `StagePanel` component

**Files:**
- Create: `components/StagePanel.tsx`

This component handles the expanded content of one stage: editable notes, file list, file upload, and (for stage 1 + finance roles) contract/cost fields.

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attachment, Project, UserRole } from '@/lib/types'
import { FileUpload } from './FileUpload'
import { FileList } from './FileList'
import { formatCurrency } from '@/lib/formatters'
import { can, FINANCE_ROLES } from '@/lib/permissions'

interface Props {
  stageId: string
  projectId: string
  stageNumber: number
  initialNotes: string | null
  attachments: Attachment[]
  project: Project
  currentUserRole: UserRole
  onUpdated: () => void
}

export function StagePanel({
  stageId, projectId, stageNumber, initialNotes,
  attachments, project, currentUserRole, onUpdated,
}: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function saveNotes() {
    const trimmed = notes.trim()
    if (trimmed === (initialNotes ?? '').trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('project_stages').update({ notes: trimmed || null }).eq('id', stageId)
    setSaving(false)
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-4">
      {/* Notes */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">הערות</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={saving}
          rows={3}
          placeholder="הוסף הערות לשלב..."
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Finance data — stage 1 only, finance roles only */}
      {stageNumber === 1 && can(currentUserRole, FINANCE_ROLES) && (
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-3">
          <div>
            <p className="text-xs text-gray-500">ערך חוזה</p>
            <p className="font-semibold text-sm">{formatCurrency(project.contract_value)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">עלות מוערכת</p>
            <p className="font-semibold text-sm">{formatCurrency(project.cost_estimate)}</p>
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">קבצים</p>
        <FileList attachments={attachments} />
        <div className="mt-3">
          <FileUpload projectId={projectId} stageId={stageId} onUploaded={onUpdated} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz"
git add components/StagePanel.tsx
git commit -m "feat: add StagePanel component with notes, files, finance"
```

---

## Task 3: Convert `StageTimeline` to accordion

**Files:**
- Modify: `components/StageTimeline.tsx`

The timeline receives `attachments` and `project` as new props. Each stage row becomes a clickable header. If `canViewStage` returns true, clicking toggles the `StagePanel` open/closed.

- [ ] **Step 1: Rewrite `StageTimeline.tsx`**

Replace the entire file content with:

```typescript
'use client'

import { useState } from 'react'
import { ProjectStage, UserRole, Attachment, Project } from '@/lib/types'
import { STAGE_STATUS_LABELS, formatDate } from '@/lib/formatters'
import { StageUpdateButton } from './StageUpdateButton'
import { StagePanel } from './StagePanel'
import { canViewStage } from '@/lib/permissions'

const STAGE_OWNERS: Record<number, string> = {
  1: 'איציק',
  2: 'נמרוד',
  3: 'סלאח',
  4: 'נמרוד',
  5: 'יעקב',
  6: 'סלאח',
  7: 'סלאח',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

interface Props {
  stages: ProjectStage[]
  attachments: Attachment[]
  project: Project
  currentUserId: string
  currentUserRole: UserRole
  onStageUpdated: (message: string) => void
  onRefresh: () => void
}

export function StageTimeline({ stages, attachments, project, currentUserId, currentUserRole, onStageUpdated, onRefresh }: Props) {
  const [openStage, setOpenStage] = useState<number | null>(null)
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)

  function toggleStage(stageNumber: number) {
    if (!canViewStage(currentUserRole, stageNumber)) return
    setOpenStage(prev => prev === stageNumber ? null : stageNumber)
  }

  return (
    <div className="space-y-3">
      {sorted.map(stage => {
        const canView = canViewStage(currentUserRole, stage.stage_number)
        const isOpen = openStage === stage.stage_number
        const stageAttachments = attachments.filter(a => a.stage_id === stage.id)

        return (
          <div key={stage.id} className="bg-white rounded-xl border overflow-hidden">
            <div
              className={`p-4 flex items-start gap-4 ${canView ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => toggleStage(stage.stage_number)}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {stage.stage_number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[stage.status]}`}>
                    {STAGE_STATUS_LABELS[stage.status]}
                  </span>
                  <span className="text-xs text-gray-400">{STAGE_OWNERS[stage.stage_number]}</span>
                  {stage.billing_pct > 0 && (
                    <span className="text-xs text-gray-400">{stage.billing_pct}%</span>
                  )}
                </div>
                {stage.completed_at && (
                  <p className="text-xs text-gray-700 mt-0.5">הושלם: {formatDate(stage.completed_at)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <StageUpdateButton
                  stageId={stage.id}
                  stageNumber={stage.stage_number}
                  currentStatus={stage.status}
                  ownerId={stage.owner_id}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  billingPct={stage.billing_pct}
                  onUpdated={onStageUpdated}
                />
              </div>
              {canView && (
                <span className="text-gray-400 text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              )}
            </div>

            {isOpen && (
              <div className="px-4 pb-4">
                <StagePanel
                  stageId={stage.id}
                  projectId={project.id}
                  stageNumber={stage.stage_number}
                  initialNotes={stage.notes}
                  attachments={stageAttachments}
                  project={project}
                  currentUserRole={currentUserRole}
                  onUpdated={onRefresh}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz" && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about `StageTimeline` missing new props — these will be fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz"
git add components/StageTimeline.tsx
git commit -m "feat: convert StageTimeline to accordion with StagePanel"
```

---

## Task 4: Wire `ProjectDetail` — pass new props, remove top-level Files

**Files:**
- Modify: `app/projects/[id]/ProjectDetail.tsx`

Two changes: (1) pass `attachments` and `project` to `StageTimeline`, add `onRefresh`, (2) remove the standalone `<div>` block for Files (the `<FileUpload>` + `<FileList>` top-level section).

- [ ] **Step 1: Update `StageTimeline` call and remove top-level Files section**

In `ProjectDetail.tsx`, find and replace the `{/* Stage timeline */}` section:

```tsx
      {/* Stage timeline */}
      <h2 className="text-lg font-semibold mb-3">שלבי הפרויקט</h2>
      <StageTimeline
        stages={stages}
        attachments={attachments}
        project={project}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onStageUpdated={handleStageUpdated}
        onRefresh={() => router.refresh()}
      />
```

Then remove this entire block (the top-level Files section):

```tsx
      {/* Files */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">קבצים</h2>
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <FileUpload projectId={project.id} onUploaded={() => router.refresh()} />
          <FileList attachments={attachments} />
        </div>
      </div>
```

Also remove the now-unused imports `FileUpload` and `FileList` from the top of the file.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz" && npm run dev
```

Open `http://localhost:3000` and log in. Navigate to any project. Verify:
- All 7 stages show (as ניר/admin)
- Clicking a stage header opens the panel
- Notes textarea appears, type something, click away — reload and confirm it saved
- File upload in panel works and appears in the file list
- Log in as סלאח — only stages 3, 6, 7 show the ▼ arrow and open; others do not expand
- Stage 1 panel shows contract/cost for finance role but not for סלאח

- [ ] **Step 4: Commit**

```bash
cd "/Users/nirsoffer/Documents/Claude Projects/Amatz/amatz"
git add app/projects/[id]/ProjectDetail.tsx
git commit -m "feat: wire stage drill-down into ProjectDetail, remove top-level files"
```
