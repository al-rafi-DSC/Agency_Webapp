import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
