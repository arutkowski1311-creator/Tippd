/**
 * Dynamic Pricing Signal Engine — Blueprint Section 11
 *
 * Four live signals feed pricing recommendations:
 *   1. View-to-book conversion rate
 *   2. Fuel price monitoring
 *   3. Booking velocity (high demand)
 *   4. Low demand / slow periods
 *
 * All recommendations require owner approval. Prices never change automatically.
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface PricingSignal {
  signal_type: "conversion_drop" | "fuel_increase" | "high_demand" | "low_demand";
  title: string;
  observation: string;
  math: string;
  proposed_action: string;
  dollar_impact: number;
}

/**
 * Signal 1: View-to-Book Conversion Drop
 * Compares this week's funnel conversion vs 90-day average.
 */
export async function checkConversionSignal(
  supabase: SupabaseClient,
  operatorId: string
): Promise<PricingSignal | null> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

  // This week's funnel
  const { data: thisWeek } = await supabase
    .from("booking_funnel_events")
    .select("event")
    .eq("operator_id", operatorId)
    .gte("created_at", weekAgo.toISOString());

  // 90-day baseline
  const { data: baseline } = await supabase
    .from("booking_funnel_events")
    .select("event")
    .eq("operator_id", operatorId)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .lt("created_at", weekAgo.toISOString());

  if (!thisWeek?.length || !baseline?.length) return null;

  const calcConversion = (events: any[]) => {
    const views = events.filter((e) => e.event === "pricing_viewed").length;
    const bookings = events.filter((e) => e.event === "booking_complete").length;
    return views > 0 ? bookings / views : 0;
  };

  const currentRate = calcConversion(thisWeek);
  const baselineRate = calcConversion(baseline);

  // Flag if conversion dropped more than 15% from baseline
  if (baselineRate > 0 && currentRate < baselineRate * 0.85) {
    const dropPct = Math.round((1 - currentRate / baselineRate) * 100);
    return {
      signal_type: "conversion_drop",
      title: `Booking conversion down ${dropPct}%`,
      observation: `${Math.round(currentRate * 100)}% of visitors completing bookings this week vs ${Math.round(baselineRate * 100)}% average. Drop-off at pricing step.`,
      math: `Conversion rate: ${Math.round(currentRate * 100)}% vs ${Math.round(baselineRate * 100)}% baseline (${dropPct}% decline)`,
      proposed_action: "Consider a limited-time promo or testing a lower rate on 10yd for 2 weeks.",
      dollar_impact: 0, // Hard to estimate without more data
    };
  }

  return null;
}

/**
 * Signal 2: Fuel Price Increase
 * Compares current diesel price vs 30-day average.
 */
export async function checkFuelSignal(
  supabase: SupabaseClient,
  operatorId: string
): Promise<PricingSignal | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const { data: fuelPrices } = await supabase
    .from("fuel_price_log")
    .select("price_per_gallon, week_of")
    .order("week_of", { ascending: false })
    .limit(5);

  if (!fuelPrices || fuelPrices.length < 2) return null;

  const current = fuelPrices[0].price_per_gallon;
  const avg30 = fuelPrices.reduce((s: number, p: any) => s + p.price_per_gallon, 0) / fuelPrices.length;
  const increase = current - avg30;

  if (increase > 0.25) {
    // Estimate monthly cost increase based on route volume
    const { count } = await supabase
      .from("routes")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operatorId)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    const routesPerMonth = count || 20;
    const estimatedGallonsPerRoute = 25;
    const monthlyCostIncrease = Math.round(increase * estimatedGallonsPerRoute * routesPerMonth);
    const surchargePerJob = Math.round(monthlyCostIncrease / (routesPerMonth * 4)); // ~4 jobs per route

    return {
      signal_type: "fuel_increase",
      title: `Diesel up $${increase.toFixed(2)}/gal over 30 days`,
      observation: `Current: $${current.toFixed(2)}/gal. 30-day avg: $${avg30.toFixed(2)}/gal. Extra cost: ~$${monthlyCostIncrease}/month.`,
      math: `${routesPerMonth} routes/month × ~${estimatedGallonsPerRoute} gal/route × $${increase.toFixed(2)} increase = $${monthlyCostIncrease}/month`,
      proposed_action: `Add $${surchargePerJob}/job fuel surcharge to recover costs.`,
      dollar_impact: monthlyCostIncrease,
    };
  }

  return null;
}

/**
 * Signal 3: High Demand (booking velocity above historical)
 */
export async function checkHighDemandSignal(
  supabase: SupabaseClient,
  operatorId: string
): Promise<PricingSignal | null> {
  const now = new Date();
  const nextWeekStart = new Date(now);
  nextWeekStart.setDate(now.getDate() + (8 - now.getDay())); // Next Monday
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 5);

  // Count jobs scheduled for next week
  const { count: nextWeekJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId)
    .gte("requested_drop_start", nextWeekStart.toISOString())
    .lt("requested_drop_start", nextWeekEnd.toISOString())
    .neq("status", "cancelled");

  // Historical average (same day count, 8 weeks back)
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
  const { count: historicalJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId)
    .gte("created_at", eightWeeksAgo.toISOString())
    .lt("created_at", now.toISOString())
    .neq("status", "cancelled");

  const weeklyAvg = (historicalJobs || 0) / 8;
  const current = nextWeekJobs || 0;

  if (weeklyAvg > 0 && current > weeklyAvg * 1.4) {
    const fillRate = Math.round((current / weeklyAvg) * 100);
    const suggestedIncrease = 25;
    const estimatedGain = suggestedIncrease * (current - Math.round(weeklyAvg));

    return {
      signal_type: "high_demand",
      title: `Next week ${fillRate}% of avg — demand elevated`,
      observation: `${current} jobs booked vs ${Math.round(weeklyAvg)} weekly average. Booking velocity is ${fillRate - 100}% above normal.`,
      math: `${current} bookings vs ${Math.round(weeklyAvg)} avg = ${fillRate}% fill rate`,
      proposed_action: `A $${suggestedIncrease} rate increase this week could generate ~$${estimatedGain} in additional revenue with minimal booking risk.`,
      dollar_impact: estimatedGain,
    };
  }

  return null;
}

/**
 * Signal 4: Low Demand / Slow Period
 */
export async function checkLowDemandSignal(
  supabase: SupabaseClient,
  operatorId: string
): Promise<PricingSignal | null> {
  const now = new Date();
  const nextWeekStart = new Date(now);
  nextWeekStart.setDate(now.getDate() + (8 - now.getDay()));
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 5);

  const { count: nextWeekJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId)
    .gte("requested_drop_start", nextWeekStart.toISOString())
    .lt("requested_drop_start", nextWeekEnd.toISOString())
    .neq("status", "cancelled");

  // Historical average
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
  const { count: historicalJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId)
    .gte("created_at", eightWeeksAgo.toISOString())
    .neq("status", "cancelled");

  const weeklyAvg = (historicalJobs || 0) / 8;
  const current = nextWeekJobs || 0;

  if (weeklyAvg > 0 && current < weeklyAvg * 0.6) {
    const fillRate = Math.round((current / weeklyAvg) * 100);

    return {
      signal_type: "low_demand",
      title: `Next week only ${fillRate}% booked — slow period`,
      observation: `${current} jobs booked vs ${Math.round(weeklyAvg)} weekly average. Demand is ${100 - fillRate}% below normal.`,
      math: `${current} bookings vs ${Math.round(weeklyAvg)} avg = ${fillRate}% fill rate`,
      proposed_action: "Consider: 1) Targeted promo to top customers, 2) Google Ads push in high-density zones, 3) Contractor outreach for those inactive 30+ days.",
      dollar_impact: 0,
    };
  }

  return null;
}

/**
 * Run all pricing signals and store any new recommendations.
 */
export async function runPricingSignalCheck(
  supabase: SupabaseClient,
  operatorId: string
): Promise<number> {
  const signals = await Promise.all([
    checkConversionSignal(supabase, operatorId),
    checkFuelSignal(supabase, operatorId),
    checkHighDemandSignal(supabase, operatorId),
    checkLowDemandSignal(supabase, operatorId),
  ]);

  let created = 0;
  for (const signal of signals) {
    if (!signal) continue;

    // Check if a similar pending recommendation already exists
    const { data: existing } = await supabase
      .from("pricing_recommendations")
      .select("id")
      .eq("operator_id", operatorId)
      .eq("signal_type", signal.signal_type)
      .eq("status", "pending")
      .limit(1);

    if (existing?.length) continue; // Don't duplicate

    await supabase.from("pricing_recommendations").insert({
      operator_id: operatorId,
      ...signal,
    } as any);
    created++;
  }

  return created;
}
