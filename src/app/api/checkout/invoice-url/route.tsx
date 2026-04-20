import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { connectToDatabase } from "@/lib/database/mongoose";
import Transaction from "@/lib/database/models/transaction.model";
import { requireEnv } from "@/lib/utils/require-env";
import { nonEmptyStringSchema } from "@/lib/utils/validation-schemas";

export const maxDuration = 60;

interface TransactionOwnershipRecord {
  clerkId: string;
  stripeInvoiceId?: string;
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

    const invoiceId = req.nextUrl.searchParams.get("invoice_id");
    const parsedInvoiceId = nonEmptyStringSchema.safeParse(invoiceId);

    if (!parsedInvoiceId.success) {
      return NextResponse.json(
        { error: "A valid invoice_id is required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const transaction = (await Transaction.findOne(
      { stripeInvoiceId: parsedInvoiceId.data, clerkId: userId },
      "clerkId stripeInvoiceId",
      { lean: true },
    )) as TransactionOwnershipRecord | null;

    if (!transaction) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const invoice = await stripe.invoices.retrieve(parsedInvoiceId.data);

    const url = invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null;

    if (!url) {
      return NextResponse.json(
        { error: "Invoice URL is not available." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { url },
      { status: 200, headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (error) {
    process.stderr.write(
      `[api/checkout/invoice-url] failed: ${
        error instanceof Error ? error.message : "unknown"
      }\n`,
    );
    return NextResponse.json(
      { error: "Failed to retrieve invoice." },
      { status: 500 },
    );
  }
}
