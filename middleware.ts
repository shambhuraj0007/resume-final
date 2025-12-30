import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Routes that are completely public (viewable by anyone)
        const publicViewRoutes = [
          "/",              // Homepage
          "/about",         // About page
          "/pricing",       // ✅ ADDED - Pricing page (public view)
          "/signin",        // Sign in page
          "/verify-email",  // Email verification
          "/api/auth",      // Auth API routes
          "/api/payment/packages", // ✅ ADDED - Pricing API
          "/api/payment/verify-signature", // ✅ ADDED - Payment webhook
          "/api/payment/verify-paypal", // ✅ ADDED - PayPal verification
        ];

        // Routes that require authentication to access
        const protectedRoutes = [
          "/profile",       // User profile
          "/resume",        // Resume builder/viewer
          "/ats-checker",   // ATS checker
          "/dashboard",     // Dashboard
          "/settings",      // Settings
        ];

        // Check if current path is completely public
        const isPublicView = publicViewRoutes.some((route) =>
          pathname === route || pathname.startsWith(route)
        );

        // Allow public view routes for everyone
        if (isPublicView) {
          return true;
        }

        // Check if current path is protected
        const isProtected = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        // Require authentication for protected routes
        if (isProtected) {
          return !!token;
        }

        // For any other routes, allow access (but they can check auth client-side)
        return true;
      },
    },
    pages: {
      signIn: "/signin",
    },
  }
);

// Only protect specific routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
