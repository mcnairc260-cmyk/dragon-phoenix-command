import type { MetadataRoute } from 'next';

const site = process.env.APP_URL ?? 'http://localhost:3000';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/pricing', '/security', '/terms', '/privacy'].map((p) => ({ url: `${site}${p}`, changeFrequency: 'monthly' }));
}
