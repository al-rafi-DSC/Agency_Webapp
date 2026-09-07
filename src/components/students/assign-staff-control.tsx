"use client";

/**
 * Reassign a student to a staff member (Admin only, PRD §4.1).
 *
 * ── This control does not save yet, and says so ──────────────────────────────
 * Writing an assignment is a Server Action, and an `actions.ts` file is hand-written
 * territory (see AGENTS.md) that lands in Phase 3. So the select changes, tells
 * the user plainly that nothing was saved, and reverts. A control that silently
 * did nothing would be worse than no control at all.
 *
 * ── And it encodes no assignment RULES ───────────────────────────────────────
 * PRD §3 and §10: assignment is manual by Admin in v1, and the matching rules
 * "will be written later". There is deliberately no suggestion, no ranking, no
 * "least loaded staff" default here. Picking one would be inventing policy.
 */

import { useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "@/types/db";

const UNASSIGNED = "unassigned";

export function AssignStaffControl({
  staff,
  assignedStaffId,
  studentName,
}: {
  staff: Staff[];
  assignedStaffId: string | null;
  studentName: string;
}) {
  const [value, setValue] = useState(assignedStaffId ?? UNASSIGNED);

  const options = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...staff.map((member) => ({ value: member.id, label: member.full_name })),
  ];
  const items = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  function onValueChange(next: unknown) {
    const nextValue = String(next);
    const label = items[nextValue] ?? "Unassigned";

    // Show the intent, then revert — the source of truth has not changed.
    setValue(nextValue);
    toast.info("Assignment not saved", {
      description: `Reassigning ${studentName} to ${label} needs the Server Action that lands in Phase 3.`,
    });
    setValue(assignedStaffId ?? UNASSIGNED);
  }

  return (
    <Select items={items} value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" aria-label={`Assigned staff for ${studentName}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
