/**
 * The IT Uni Consultancy mark — graduation cap with the gold tassel — redrawn
 * as inline SVG from the owner's logo (public/logo.jpg) so it stays sharp at
 * icon size. The wordmark is left out on purpose: it is unreadable this small.
 *
 * The colours are the logo's own (charcoal #222222, gold #ECB212), not theme
 * tokens, so place it on a light surface — the brand tiles are white.
 */

import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="262 168 676 476"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d="M278 437 311 387 345 437V629H278Z" fill="#ECB212" />
      <path
        d="M615 184 921 349 615 517 308 349Z"
        fill="#222222"
        stroke="#222222"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <g
        fill="none"
        stroke="#222222"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M391 434V508L615 629 838 508V434" />
        <path d="M885 392V595" />
        <path d="M885 595 851 628H919Z" />
      </g>
    </svg>
  );
}
