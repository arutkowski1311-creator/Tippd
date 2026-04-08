import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip auth if Supabase isn't configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected route checks
  const path = request.nextUrl.pathname;

  const isProtectedDashboard = path.startsWith("/dashboard");
  const isProtectedDriver = path.startsWith("/driver") && path !== "/driver/login";
  const isProtectedPortal =
    path.startsWith("/portal") &&
    path !== "/portal" &&
    path !== "/portal/signup";

  if (!user && (isProtectedDashboard || isProtectedDriver || isProtectedPortal)) {
    const loginUrl = request.nextUrl.clone();
    if (isProtectedDriver) {
      loginUrl.pathname = "/driver/login";
    } else if (isProtectedPortal) {
      loginUrl.pathname = "/portal";
    } else {
      loginUrl.pathname = "/login";
    }
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
