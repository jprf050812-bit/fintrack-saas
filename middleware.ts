export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/investments/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/couple/:path*",
    "/settings/:path*",
  ],
}
