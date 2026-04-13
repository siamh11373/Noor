/** @type {import('next').NextConfig} */
const nextConfig = {
  // SECURITY FIX: suppress X-Powered-By header to avoid advertising the Next.js version
  poweredByHeader: false,
  reactStrictMode: true,
  // SECURITY FIX: add security headers to every response (CSP, HSTS, clickjacking, MIME sniffing)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME-type sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking via iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Enforce HTTPS for 1 year, including subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Limit referrer information on cross-origin navigation
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Allow geolocation only from this origin (required for prayer time calculation)
          { key: 'Permissions-Policy', value: 'geolocation=(self)' },
          // Content Security Policy — restricts resource origins
          // 'unsafe-inline' on script-src is required for Next.js inline hydration scripts
          // and the theme bootstrap script in app/layout.tsx
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // Supabase REST + WebSocket connections for auth and data sync
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    // Large dependency strings (e.g. prayer tables) trigger noisy cache warnings; build is unaffected.
    config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' }
    return config
  },
}

module.exports = nextConfig
