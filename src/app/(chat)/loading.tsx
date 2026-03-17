export default function Loading() {
  return (
    <div className="ChatLoadingSkeleton relative flex h-dvh w-full flex-col overflow-hidden">
      <div className="absolute left-0 right-0 top-0 z-20 flex w-full border-b border-slate-300/70 bg-lightBackground-100/85 px-3 py-2.5 backdrop-blur-lg dark:border-slate-500 dark:bg-darkBackground-900/55">
        <div className="animate-pulse flex w-full items-center justify-between gap-4">
          <div className="h-8 w-28 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            <div className="h-9 w-9 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
          </div>
        </div>
      </div>

      <div className="mt-14 flex h-full w-full">
        <aside className="hidden w-72 shrink-0 border-r border-slate-400 bg-lightBackground-200 px-3 py-4 lg:flex lg:flex-col dark:border-slate-500 dark:bg-darkBackground-1000">
          <div className="animate-pulse flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-16 rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-10 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-10 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-10 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="h-3 w-14 rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-12 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-12 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-12 w-full rounded-lg bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            </div>

            <div className="mt-auto h-24 w-full rounded-2xl bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col px-3 pb-4 pt-2 lg:px-5">
          <div className="animate-pulse flex flex-wrap gap-2">
            <div className="h-9 w-28 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            <div className="h-9 w-24 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            <div className="h-9 w-32 rounded-full bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
          </div>

          <div className="animate-pulse flex flex-1 flex-col justify-center gap-4 py-6">
            <div className="h-6 w-40 rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            <div className="max-w-xl space-y-3">
              <div className="h-4 w-full rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-4 w-11/12 rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-4 w-4/5 rounded bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="h-16 w-44 rounded-2xl bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-16 w-44 rounded-2xl bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
              <div className="h-16 w-44 rounded-2xl bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
            </div>
          </div>

          <div className="animate-pulse rounded-[1.75rem] border border-slate-400 bg-lightBackground-100/80 p-4 shadow-sm dark:border-slate-500 dark:bg-darkBackground-900/75">
            <div className="h-12 w-full rounded-2xl bg-lightBackground-300/80 dark:bg-darkBackground-500/35" />
          </div>
        </main>
      </div>
    </div>
  );
}
