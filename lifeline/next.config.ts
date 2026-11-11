import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'",
  // Next.js needs inline bootstrap scripts; a nonce-based policy is a production-readiness item.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}${process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? ' https://plausible.io' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src 'self'${process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? ' https://plausible.io' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' }, // consent and acknowledgment links carry tokens in the path
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    }];
  },
};
export default config;
