import Link from "next/link";
import type { ReactNode } from "react";

export interface ArchivedItem {
  id: string;
  label: string;
  detail: string;
  href?: string;
  /** The restore control, supplied by the page. */
  action?: ReactNode;
}

/** Archived records with their restore controls. Renders nothing when empty. */
export function ArchivedList({ items, title }: { items: ArchivedItem[]; title?: string }) {
  if (!items.length) return null;
  const list = <ul className="divide-y">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      {item.href ? <Link href={item.href} className="break-words text-sm font-medium underline-offset-4 hover:underline">{item.label}</Link>
        : <p className="break-words text-sm font-medium">{item.label}</p>}
      <p className="text-xs text-muted-foreground">{item.detail}</p>
    </div>
    {item.action}
  </li>)}</ul>;
  if (!title) return list;
  return <details className="rounded-lg border px-4 py-3">
    <summary className="cursor-pointer text-sm font-medium">{title} <span className="text-muted-foreground tabular-nums">({items.length})</span></summary>
    <div className="mt-2">{list}</div>
  </details>;
}
