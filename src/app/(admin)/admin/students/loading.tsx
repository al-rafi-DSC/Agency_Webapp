import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the reference screen. Every route that awaits data should
 * ship one of these — it is the convention generated screens are expected to
 * follow, not an optional extra.
 */
export default function Loading() {
  return (
    <>
      <PageHeader title="Students" />
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </>
  );
}
