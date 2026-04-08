import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/user";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Get authenticated user + their operator_id, or return error response
export async function getAuthContext(requiredRoles?: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: error("Unauthorized", 401) } as const;
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!user) {
    return { error: error("User profile not found", 404) } as const;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return { error: error("Forbidden", 403) } as const;
  }

  if (!user.operator_id) {
    return { error: error("No operator associated", 400) } as const;
  }

  return {
    user,
    operatorId: user.operator_id as string,
    supabase,
  } as const;
}
