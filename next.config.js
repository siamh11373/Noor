/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

const sharedSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self)' },
]

// CSP + HSTS are enforced in production only. In development, a strict CSP can prevent
// Next.js from attaching styles/scripts correctly (unstyled HTML / broken HMR) depending
// on browser and Next version; localhost should not send HSTS anyway.
const productionCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    if (isDev) {
      return [{ source: '/:path*', headers: sharedSecurityHeaders }]
    }

    return [
      {
        source: '/:path*',
        headers: [
          ...sharedSecurityHeaders,
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: productionCsp },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' }
    return config
  },
}

module.exports = nextConfig
