import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 w-full rounded-xl lg:col-span-3" />
          <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    </>
  );
}
