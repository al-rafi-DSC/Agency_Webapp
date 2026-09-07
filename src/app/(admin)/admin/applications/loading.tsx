import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Applications" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="space-y-2 rounded-xl border p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}
