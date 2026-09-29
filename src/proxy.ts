import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { jwtVerify } from "jose";

const STUDENT_COOKIE = "qp_student_session";

async function isValidStudentSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let response = NextResponse.next({ request: req });

  // ---- Teacher routes: require a valid Supabase Auth session ----
  if (pathname.startsWith("/teacher")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            response = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ---- Student routes: require a valid signed session cookie ----
  if (pathname.startsWith("/student") && pathname !== "/student/login") {
    const ok = await isValidStudentSession(req);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/student/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*"],
};
