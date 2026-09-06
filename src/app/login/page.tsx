import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Placeholder login screen.
 *
 * The form UI is Phase 2 work. The auth wiring behind it is hand-written
 * (Supabase Auth, email/password, invite-only — no public self-signup, per
 * PRD §7). This stub exists so the proxy's redirect target resolves.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Login form not built yet — Phase 2.</p>
          <p>
            Accounts are created by Admin invite only. There is no public
            sign-up, by design.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
