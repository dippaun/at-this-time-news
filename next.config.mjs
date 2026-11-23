/** @type {import('next').NextConfig} */
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {
  ...(base ? { basePath: base } : {}),
  trailingSlash: process.env.NEXT_PUBLIC_STATIC === '1',
  serverExternalPackages: ['better-sqlite3', '@resvg/resvg-js', 'node-cron'],
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
