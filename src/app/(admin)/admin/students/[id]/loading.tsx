import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-28" />

      <div className="surface-panel flex flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-9 w-72" />

      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
