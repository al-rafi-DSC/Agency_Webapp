"use client";
import { useActionState, useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormAction } from "@/types/workspace";

export function MutationForm({ action, children, submitLabel = "Save changes", className = "", disabled = false, variant = "default", size = "default" }: {
  action: FormAction; children?: ReactNode; submitLabel?: string; className?: string; disabled?: boolean;
  variant?: "default" | "outline"; size?: "default" | "sm";
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return <form action={formAction} aria-label={submitLabel} className={`flex flex-col gap-4 ${className}`}>
    <fieldset disabled={pending || disabled} className="contents">{children}
      <Button className="w-fit" type="submit" variant={variant} size={size} disabled={pending || disabled}>{pending ? "Saving…" : submitLabel}</Button>
    </fieldset>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : state.message ? <p role="status" className="text-sm text-success-soft-foreground">{state.message}</p> : null}
  </form>;
}
export function SelectField({ name, label, options, defaultValue = "" }: {
  name: string; label: string; options: { value: string; label: string }[]; defaultValue?: string;
}) {
  const id = useId();
  const empty = "__unset";
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>
    <Select name={name} defaultValue={defaultValue || empty} items={Object.fromEntries(options.map((o) => [o.value || empty, o.label]))}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value || empty} value={o.value || empty}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}
export function CheckField({ name, label, defaultChecked = false, value, disabled = false }: {
  name: string; label: string; defaultChecked?: boolean; value?: string; disabled?: boolean;
}) {
  const id = useId();
  return <div className="flex items-center gap-2"><Checkbox id={id} name={name} value={value ?? "on"} defaultChecked={defaultChecked} disabled={disabled} /><Label htmlFor={id}>{label}</Label></div>;
}
