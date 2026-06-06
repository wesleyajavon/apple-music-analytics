const createNextIntlPlugin = require('next-intl/plugin');
const { buildSecurityHeaders } = require('./lib/security/security-headers.js');

const withNextIntl = createNextIntlPlugin();

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
        headers: buildSecurityHeaders(),
      },
    ];
  },
  
  // Configuration des images (si vous utilisez next/image)
  images: {
    domains: [],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  
  // Optimisation du build
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'recharts',
      'd3',
      'swagger-ui-react',
      '@react-pdf/renderer',
      'react-force-graph-2d',
      '@sentry/nextjs',
      'sonner',
    ],
    // Active le hook d'instrumentation pour Sentry
    instrumentationHook: true,
    // Turbopack (dev avec --turbo) : évite l'avertissement
    // « Webpack is configured while Turbopack is not ». Pas de règles custom nécessaires.
    turbo: {},
  },

  // Configuration Webpack pour next build : ignorer les avertissements Sentry/require-in-the-middle
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        {
          module: /require-in-the-middle/,
          message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
        },
      ];
    }
    return config;
  },
}

module.exports = withNextIntl(nextConfig)

