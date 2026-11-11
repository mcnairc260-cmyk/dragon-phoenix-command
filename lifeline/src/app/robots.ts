import type { MetadataRoute } from 'next';

const site = process.env.APP_URL ?? 'http://localhost:3000';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/api', '/onboarding', '/consent', '/ack', '/reset', '/recover', '/verify-email'] }], sitemap: `${site}/sitemap.xml` };
}
