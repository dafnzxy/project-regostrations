import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyAdminSessionToken } from "@/lib/auth-token";

const PUBLIC_SLUG_COOKIE = "yorindo_public_slug";

function applySecurityHeaders(response: NextResponse, isPublicRoute = false) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  if (isPublicRoute) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const isAuthenticated = verifyAdminSessionToken(token);

  // 1. Proteksi API khusus Admin (/api/upload dan /api/events/*/export)
  if (
    pathname.startsWith("/api/upload") ||
    (pathname.startsWith("/api/events/") && pathname.endsWith("/export"))
  ) {
    if (!isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Akses ditolak: Hanya Admin yang memiliki izin." },
          { status: 401 }
        )
      );
    }
  }

  // 2. Jika peserta membuka link registrasi (/e/[slug]), catat slug-nya di cookie
  //    agar jika peserta mengutak-atik URL menjadi "/" atau "/dashboard", mereka dikembalikan ke form registrasi!
  if (pathname.startsWith("/e/")) {
    const slug = pathname.split("/")[2];
    const response = applySecurityHeaders(NextResponse.next(), true);

    if (slug && !isAuthenticated) {
      response.cookies.set(PUBLIC_SLUG_COOKIE, slug, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 12, // 12 jam
        path: "/",
      });
    }
    return response;
  }

  if (pathname.startsWith("/ticket/")) {
    return applySecurityHeaders(NextResponse.next(), true);
  }

  // 3. Jika seseorang mencoba membuka "/e" atau "/ticket" tanpa parameter, blokir ke 404
  if (pathname === "/e" || pathname === "/ticket") {
    return applySecurityHeaders(
      NextResponse.rewrite(new URL("/not-found", request.url)),
      true
    );
  }

  // 4. Root path "/"
  if (pathname === "/") {
    if (isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
    // Jika pengunjung berasal dari link registrasi peserta, kembalikan ke halaman registrasi event-nya
    const lastPublicSlug = request.cookies.get(PUBLIC_SLUG_COOKIE)?.value;
    if (lastPublicSlug) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(`/e/${lastPublicSlug}`, request.url))
      );
    }
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard/login", request.url))
    );
  }

  // 5. Proteksi penuh seluruh rute "/dashboard/*" kecuali "/dashboard/login"
  if (pathname.startsWith("/dashboard") && pathname !== "/dashboard/login") {
    if (!isAuthenticated) {
      const lastPublicSlug = request.cookies.get(PUBLIC_SLUG_COOKIE)?.value;
      if (lastPublicSlug) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(`/e/${lastPublicSlug}`, request.url))
        );
      }
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/dashboard/login", request.url))
      );
    }
  }

  // 6. Jika sudah login sebagai Admin dan membuka "/dashboard/login", langsung masuk ke "/dashboard"
  if (pathname === "/dashboard/login" && isAuthenticated) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
