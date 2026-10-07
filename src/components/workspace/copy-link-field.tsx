"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A read-only link the viewer can copy or open. Not a form field: it has no `name`, so it is never submitted. */
export function CopyLinkField({ id, label, href, hint, emptyText }: {
  id: string; label: string; href: string | null | undefined; hint?: string; emptyText: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* Clipboard blocked: the text stays selectable in the box. */ }
  }
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {href ? <div className="flex gap-2">
      <Input id={id} value={href} readOnly onFocus={(e) => e.currentTarget.select()} className="bg-muted/50" />
      <Button type="button" variant="outline" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <CheckIcon /> : <CopyIcon />}{copied ? "Copied" : "Copy"}
      </Button>
      <Button nativeButton={false} variant="outline" aria-label={`Open ${label}`}
        render={<a href={href} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon /></a>} />
    </div> : <p id={id} className="text-sm text-muted-foreground">{emptyText}</p>}
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>;
}
