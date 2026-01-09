/**
 * Configuration Next.js avec Sentry (optionnel)
 * 
 * Pour activer l'upload automatique des source maps vers Sentry:
 * 1. Renommez ce fichier en next.config.js (faites une sauvegarde de l'original)
 * 2. Configurez SENTRY_AUTH_TOKEN dans vos variables d'environnement
 * 3. Configurez SENTRY_ORG et SENTRY_PROJECT dans vos variables d'environnement
 * 
 * Note: L'upload des source maps est optionnel. Sentry fonctionne sans cette configuration.
 * Cette configuration est utile pour avoir des stack traces détaillés en production.
 */

const { withSentryConfig } = require('@sentry/nextjs');

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
};

// Configuration Sentry pour l'upload des source maps
const sentryWebpackPluginOptions = {
  // Options silencieuses pour réduire le bruit dans les logs
  silent: true,
  
  // Upload des source maps (recommandé pour la production)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Variables d'environnement requises:
  // SENTRY_AUTH_TOKEN: Token d'authentification Sentry (créé dans Settings > Auth Tokens)
  // SENTRY_ORG: Nom de votre organisation Sentry
  // SENTRY_PROJECT: Nom de votre projet Sentry
};

// Export avec Sentry config (uncomment pour activer)
// module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);

// Export standard (configuration actuelle)
module.exports = nextConfig;
