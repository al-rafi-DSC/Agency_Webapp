#!/usr/bin/env node
/**
 * Security guardrails — mechanical enforcement of the boundaries in AGENTS.md.
 *
 * These are the rules that must not depend on someone remembering to check them
 * during review of a generated pull request. Run locally with
 * `npm run guardrails`; CI runs it on every PR.
 *
 * Exits non-zero on any violation.
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Only this file may reference the service role key. */
const SERVICE_ROLE_ALLOWLIST = ["src/lib/supabase/admin.ts"];

/** Modules a Client Component must never import. */
const SERVER_ONLY_MODULES = [
  "@/lib/supabase/server",
  "@/lib/supabase/admin",
  "server-only",
];

const violations = [];

function report(file, rule, detail) {
  violations.push({ file, rule, detail });
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isClientComponent(source) {
  // "use client" must be the first statement, so checking the head is enough.
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(source);
}

function importsModule(source, moduleName) {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`from\\s+["']${escaped}["']|require\\(["']${escaped}["']\\)|import\\s+["']${escaped}["']`).test(
    source,
  );
}

const files = await collectFiles(SRC);

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const source = readFileSync(file, "utf8");

  // 1. The service role key bypasses RLS entirely. One file may name it.
  if (source.includes("SUPABASE_SERVICE_ROLE_KEY") && !SERVICE_ROLE_ALLOWLIST.includes(rel)) {
    report(
      rel,
      "service-role-key",
      `SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security. Reference it only in ${SERVICE_ROLE_ALLOWLIST.join(", ")}.`,
    );
  }

  // 2. A NEXT_PUBLIC_ alias would ship the key to the browser.
  if (/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/.test(source)) {
    report(
      rel,
      "service-role-key",
      "A NEXT_PUBLIC_ variable is inlined into the browser bundle. The service role key must never be one.",
    );
  }

  // 3. Client Components must not reach server-only modules.
  if (isClientComponent(source)) {
    for (const moduleName of SERVER_ONLY_MODULES) {
      if (importsModule(source, moduleName)) {
        report(
          rel,
          "client-imports-server",
          `Client Component imports "${moduleName}". Fetch in a Server Component and pass typed props down instead.`,
        );
      }
    }
  }

  // 4. The admin client bypasses RLS, so its callers must be server-only.
  if (
    importsModule(source, "@/lib/supabase/admin") &&
    !/import\s+["']server-only["']/.test(source) &&
    rel !== "src/lib/supabase/admin.ts"
  ) {
    report(
      rel,
      "admin-client-not-server-only",
      'Files using createAdminClient() must start with: import "server-only";',
    );
  }

  // 5. Components stay presentational — data access belongs in pages/actions.
  const isComponent = rel.startsWith("src/components/");
  const isUiPrimitive = rel.startsWith("src/components/ui/");
  if (isComponent && !isUiPrimitive) {
    for (const moduleName of ["@/lib/supabase/server", "@/lib/supabase/client", "@/lib/supabase/admin", "@supabase/ssr", "@supabase/supabase-js"]) {
      if (importsModule(source, moduleName)) {
        report(
          rel,
          "component-fetches-data",
          `Components take typed props and render. Move the "${moduleName}" usage into a Server Component page or a Server Action.`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\n✖ Guardrail violations\n");
  for (const { file, rule, detail } of violations) {
    console.error(`  ${file}`);
    console.error(`    [${rule}] ${detail}\n`);
  }
  console.error(`${violations.length} violation(s). See AGENTS.md for the boundaries.\n`);
  process.exit(1);
}

console.log(`✔ Guardrails passed (${files.length} files checked).`);
