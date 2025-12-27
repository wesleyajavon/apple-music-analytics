/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimisations de production
  swcMinify: true,
  
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },
  
  // Configuration des images (si vous utilisez next/image)
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimisation du build
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'recharts', 'd3'],
  },
}

module.exports = nextConfig

