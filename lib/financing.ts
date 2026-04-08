/**
 * Embedded Financing — Blueprint Section 10
 *
 * Wisetack integration for customer pay-over-time options.
 * Owner gets paid immediately — Wisetack takes the credit risk.
 *
 * Flow:
 *   1. Invoice over threshold shows financing option
 *   2. Customer applies through Wisetack hosted flow
 *   3. Approved or denied in real time
 *   4. Owner paid in full immediately
 *
 * NOTE: Requires a Wisetack partner account and API credentials.
 * This module provides the integration scaffolding. Set WISETACK_API_KEY
 * and WISETACK_MERCHANT_ID in environment variables to activate.
 */

const WISETACK_API_BASE = "https://api.wisetack.com/v1";

interface FinancingEligibility {
  eligible: boolean;
  reason?: string;
  plans?: FinancingPlan[];
}

interface FinancingPlan {
  months: number;
  monthly_payment: number;
  apr: number;
}

interface FinancingApplication {
  application_url: string;
  application_id: string;
}

/**
 * Check if Wisetack is configured for this operator.
 */
export function isFinancingEnabled(): boolean {
  return !!(process.env.WISETACK_API_KEY && process.env.WISETACK_MERCHANT_ID);
}

/**
 * Check if an invoice amount qualifies for financing.
 * Default threshold: $300
 */
export function isFinancingEligible(
  amount: number,
  threshold: number = 300
): FinancingEligibility {
  if (!isFinancingEnabled()) {
    return { eligible: false, reason: "Financing not configured" };
  }

  if (amount < threshold) {
    return { eligible: false, reason: `Amount below $${threshold} minimum` };
  }

  // Estimate plans (actual rates come from Wisetack API)
  const plans: FinancingPlan[] = [
    { months: 3, monthly_payment: Math.round((amount / 3) * 100) / 100, apr: 0 },
    { months: 6, monthly_payment: Math.round((amount * 1.05 / 6) * 100) / 100, apr: 9.99 },
    { months: 12, monthly_payment: Math.round((amount * 1.10 / 12) * 100) / 100, apr: 14.99 },
  ];

  return { eligible: true, plans };
}

/**
 * Create a Wisetack financing application for an invoice.
 * Returns a URL the customer clicks to apply.
 */
export async function createFinancingApplication(params: {
  invoiceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
}): Promise<FinancingApplication> {
  if (!isFinancingEnabled()) {
    throw new Error("Wisetack financing is not configured");
  }

  const response = await fetch(`${WISETACK_API_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WISETACK_API_KEY}`,
    },
    body: JSON.stringify({
      merchant_id: process.env.WISETACK_MERCHANT_ID,
      amount: params.amount,
      purpose: "Dumpster rental service",
      customer: {
        first_name: params.customerName.split(" ")[0],
        last_name: params.customerName.split(" ").slice(1).join(" ") || "",
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      metadata: {
        invoice_id: params.invoiceId,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Wisetack API error: ${err}`);
  }

  const result = await response.json();
  return {
    application_url: result.consumer_url || result.url,
    application_id: result.id,
  };
}
