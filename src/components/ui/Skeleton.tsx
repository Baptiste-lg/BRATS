interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/10 ${className}`}
      aria-hidden="true"
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-white/5 p-3">
      <Skeleton className="h-5 w-3/4" />
      <div className="my-1 h-px bg-white/5" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}

export function BracketSkeleton() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 3 }, (_, col) => (
        <div key={col} className="flex min-w-[180px] flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          {Array.from({ length: 4 - col }, (_, row) => (
            <MatchCardSkeleton key={row} />
          ))}
        </div>
      ))}
    </div>
  );
}
