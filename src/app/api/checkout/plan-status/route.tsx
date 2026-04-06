import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/utils/require-active-user";
import { connectToDatabase } from "@/lib/database/mongoose";
import User from "@/lib/database/models/user.model";
import { PlanName } from "@/types/PlanData.d";

const checkoutPlanStatusQuerySchema = z
  .object({
    session_id: z.string().trim().min(1).max(255),
  })
  .strict();

type CheckoutPlanStatusQuery = z.infer<typeof checkoutPlanStatusQuerySchema>;

interface UserPlanStatusProjection {
  plan?: {
    name?: PlanName;
    stripeId?: string | null;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const activeUser = await requireActiveUser(userId);
    if (activeUser.status === "not_provisioned") {
      return NextResponse.json(
        {
          error: "Account not yet provisioned. Please try again in a moment.",
        },
        { status: 503 },
      );
    }
    if (activeUser.status === "suspended") {
      return NextResponse.json(
        { error: "Account suspended." },
        { status: 403 },
      );
    }

    const parsedQuery = checkoutPlanStatusQuerySchema.safeParse({
      session_id: req.nextUrl.searchParams.get("session_id"),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "A valid session_id is required." },
        { status: 400 },
      );
    }

    const { session_id: sessionId }: CheckoutPlanStatusQuery = parsedQuery.data;

    await connectToDatabase();
    const user = (await User.findOne({ clerkId: userId })
      .select("plan.name plan.stripeId")
      .lean()) as UserPlanStatusProjection | null;

    if (!user) {
      return NextResponse.json(
        {
          error: "Account not yet provisioned. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    const confirmed = user.plan?.stripeId === sessionId;
    const planName: PlanName = user.plan?.name ?? "Lite";

    return NextResponse.json(
      {
        confirmed,
        planName,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    process.stderr.write(
      `[api/checkout/plan-status] failed: ${
        error instanceof Error ? error.message : "unknown"
      }\n`,
    );
    return NextResponse.json(
      { error: "Failed to load checkout plan status." },
      { status: 500 },
    );
  }
}
