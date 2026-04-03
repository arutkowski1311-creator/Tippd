import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NominationScore, RankedNominee, CPICategory } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cycle_id = searchParams.get("cycle_id");
  const category = searchParams.get("category") as CPICategory | null;

  if (!cycle_id) {
    return NextResponse.json(
      { error: "cycle_id is required" },
      { status: 400 }
    );
  }

  // Get all scored nominations for this cycle
  let query = supabase
    .from("nominations")
    .select("*, nominee:users!nominee_id(*), reviews(*)")
    .eq("cycle_id", cycle_id)
    .in("status", ["scored", "eligible", "recognized"]);

  if (category) query = query.eq("category", category);

  const { data: nominations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate scores for each nomination
  const scores: NominationScore[] = (nominations || []).map((nom) => {
    const validReviews = (nom.reviews || []).filter(
      (r: { is_valid: boolean; strength_score: number | null; impact_score: number | null }) =>
        r.is_valid && r.strength_score != null && r.impact_score != null
    );

    const avgStrength =
      validReviews.length > 0
        ? validReviews.reduce((sum: number, r: { strength_score: number }) => sum + r.strength_score, 0) /
          validReviews.length
        : 0;

    const avgImpact =
      validReviews.length > 0
        ? validReviews.reduce((sum: number, r: { impact_score: number }) => sum + r.impact_score, 0) /
          validReviews.length
        : 0;

    return {
      nomination_id: nom.id,
      average_score: (avgStrength + avgImpact) / 2,
      average_strength: avgStrength,
      average_impact: avgImpact,
      review_count: validReviews.length,
      unique_nominators: 0, // calculated below
    };
  });

  // Group by nominee for rankings
  const nomineeMap = new Map<string, RankedNominee>();

  for (const nom of nominations || []) {
    const score = scores.find((s) => s.nomination_id === nom.id);
    const existing = nomineeMap.get(nom.nominee_id);

    if (existing) {
      existing.nominations.push(nom);
      existing.total_nominations++;
      if (score && score.average_score > existing.best_score) {
        existing.best_score = score.average_score;
      }
      if (!existing.categories.includes(nom.category)) {
        existing.categories.push(nom.category);
      }
    } else {
      nomineeMap.set(nom.nominee_id, {
        user: nom.nominee,
        nominations: [nom],
        total_nominations: 1,
        unique_nominators: 0,
        best_score: score?.average_score || 0,
        average_score: score?.average_score || 0,
        categories: [nom.category],
      });
    }
  }

  // Sort by best score, then by impact (tie-break #1), then unique nominators (tie-break #2)
  const rankings = Array.from(nomineeMap.values()).sort((a, b) => {
    if (b.best_score !== a.best_score) return b.best_score - a.best_score;
    // Tie-break: compare average impact across their best nominations
    const aImpact = scores.find(
      (s) =>
        a.nominations.some((n) => n.id === s.nomination_id) &&
        s.average_score === a.best_score
    );
    const bImpact = scores.find(
      (s) =>
        b.nominations.some((n) => n.id === s.nomination_id) &&
        s.average_score === b.best_score
    );
    if ((bImpact?.average_impact || 0) !== (aImpact?.average_impact || 0)) {
      return (bImpact?.average_impact || 0) - (aImpact?.average_impact || 0);
    }
    // Tie-break #2: more unique nominators
    return b.unique_nominators - a.unique_nominators;
  });

  return NextResponse.json({ scores, rankings });
}
