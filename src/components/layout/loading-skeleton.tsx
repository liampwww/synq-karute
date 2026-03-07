export function LoadingSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:flex w-[260px] flex-col border-r border-border bg-sidebar p-4 gap-6">
        <div className="flex items-center gap-2.5 px-1">
          <div className="size-9 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 w-28 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            >
              <div className="size-5 rounded bg-muted animate-pulse" />
              <div
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${60 + ((i * 23) % 40)}px` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <div className="h-6 w-40 rounded bg-muted animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-lg bg-muted animate-pulse" />
            <div className="size-7 rounded-lg bg-muted animate-pulse" />
            <div className="size-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] rounded-xl bg-muted/60 animate-pulse"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[280px] rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-[280px] rounded-xl bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
