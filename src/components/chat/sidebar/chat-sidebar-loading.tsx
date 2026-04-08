import LoadingBubbles from "@/components/shared/loading-bubbles";

export default function ChatSidebarLoading() {
  return (
    <aside
      className="ChatSidebarLoading app-sidebar lg:w-56"
      aria-label="Loading sidebar"
      aria-busy="true"
    >
      <div className="ChatSidebarLoadingHead flex w-full items-center px-4 py-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-lavenderHaze-300 dark:bg-nightIndigo-600"></div>
      </div>

      <div className="ChatSidebarLoadingBody flex min-h-0 flex-1 flex-col gap-6 px-3 py-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-lavenderHaze-300 dark:bg-nightIndigo-600"></div>
          <div className="h-8 w-full animate-pulse rounded-lg bg-lavenderHaze-200 dark:bg-nightIndigo-700"></div>
          <div className="h-8 w-full animate-pulse rounded-lg bg-lavenderHaze-200 dark:bg-nightIndigo-700"></div>
          <div className="h-8 w-full animate-pulse rounded-lg bg-lavenderHaze-200 dark:bg-nightIndigo-700"></div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="h-3 w-16 animate-pulse rounded bg-lavenderHaze-300 dark:bg-nightIndigo-600"></div>
          <div className="h-10 w-full animate-pulse rounded-lg bg-lavenderHaze-200 dark:bg-nightIndigo-700"></div>
          <div className="h-10 w-full animate-pulse rounded-lg bg-lavenderHaze-200 dark:bg-nightIndigo-700"></div>
        </div>

        <LoadingBubbles size="small" />
      </div>
    </aside>
  );
}
