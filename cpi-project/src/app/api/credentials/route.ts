import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateCredentialCode } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { outcome_id, user_id, category, level, citation } = body;

  const uniqueCode = generateCredentialCode();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cpi.org";
  const verificationUrl = `${baseUrl}/verify/${uniqueCode}`;

  const { data: credential, error } = await supabase
    .from("credentials")
    .insert({
      unique_code: uniqueCode,
      outcome_id,
      user_id,
      category,
      level: level || "local",
      citation,
      verification_url: verificationUrl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update nomination status
  const { data: outcome } = await supabase
    .from("recognition_outcomes")
    .select("nomination_id")
    .eq("id", outcome_id)
    .single();

  if (outcome) {
    await supabase
      .from("nominations")
      .update({ status: "recognized" })
      .eq("id", outcome.nomination_id);
  }

  return NextResponse.json(credential);
}
