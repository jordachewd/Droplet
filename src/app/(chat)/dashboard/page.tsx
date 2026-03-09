import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PageWrapper from "@/components/layout/page-wrapper";
import PageHead from "@/components/layout/page-head";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import Task from "@/lib/database/models/tasks.model";
import Transaction from "@/lib/database/models/transaction.model";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/403");
  }

  await connectToDatabase();

  const [usersCount, conversationsCount, paidTransactionsCount] =
    await Promise.all([
      User.countDocuments({}),
      Task.countDocuments({}),
      Transaction.countDocuments({}),
    ]);

  const stats = [
    {
      label: "Users",
      value: usersCount,
      icon: "bi bi-people",
    },
    {
      label: "Conversations",
      value: conversationsCount,
      icon: "bi bi-chat-left-text",
    },
    {
      label: "Transactions",
      value: paidTransactionsCount,
      icon: "bi bi-credit-card",
    },
  ];

  return (
    <PageWrapper id="DashboardPage" scrollable>
      <section className="DashboardPage mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
        <PageHead
          title="Admin Dashboard"
          subtitle="Minimal operational surface with real live counts."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-xl border border-lightBorders-400 bg-white/70 p-4 shadow-sm dark:border-darkBorders-500 dark:bg-jwdMarine-900/70"
            >
              <p className="mb-2 flex items-center gap-2 text-sm opacity-70">
                <i className={stat.icon}></i>
                <span>{stat.label}</span>
              </p>
              <p className="heading-4">{stat.value}</p>
            </article>
          ))}
        </div>
      </section>
    </PageWrapper>
  );
}
