export default function Loading() {
  return (
    <section className="AccountLoadingSkeleton flex w-full flex-col gap-6 p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-48 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
        <div className="h-4 w-full max-w-2xl rounded bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
        <div className="h-4 w-3/4 max-w-xl rounded bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="animate-pulse rounded-3xl border border-lightBorders-400 bg-white/75 p-6 shadow-sm dark:border-darkBorders-500 dark:bg-jwdMarine-900/75">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-40 rounded bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
              <div className="h-4 w-56 rounded bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-24 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="h-24 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="h-24 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="h-24 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
          </div>
        </div>

        <div className="animate-pulse rounded-3xl border border-lightBorders-400 bg-white/75 p-6 shadow-sm dark:border-darkBorders-500 dark:bg-jwdMarine-900/75">
          <div className="mb-4 h-5 w-32 rounded bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="h-20 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
            <div className="h-20 rounded-2xl bg-lightSecondary-300/80 dark:bg-darkSecondary-500/35" />
          </div>
        </div>
      </div>
    </section>
  );
}
