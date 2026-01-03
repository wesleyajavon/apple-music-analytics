import { NextResponse } from 'next/server';

/**
 * GET /api/swagger
 * 
 * Retourne la spécification OpenAPI/Swagger au format JSON
 */
export async function GET() {
  try {
    // Dynamic import pour éviter les problèmes de build
    const swaggerJsdoc = (await import('swagger-jsdoc')).default;
    const path = await import('path');

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Apple Music Analytics API',
          version: '1.0.0',
          description: 'API pour le tableau de bord d\'analyse musicale. Permet de récupérer les statistiques d\'écoute, la distribution par genres, les timelines, et les données Apple Music Replay.',
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Serveur de développement',
          },
        ],
        components: {
          schemas: {
            Error: {
              type: 'object',
              properties: {
                error: { type: 'string', description: 'Message d\'erreur' },
                code: { type: 'string', description: 'Code d\'erreur' },
                details: { type: 'object', description: 'Détails supplémentaires de l\'erreur' },
              },
            },
            ListenDto: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                trackTitle: { type: 'string' },
                artistName: { type: 'string' },
                playedAt: { type: 'string', format: 'date-time' },
                source: { type: 'string', enum: ['lastfm', 'apple_music_replay'] },
              },
            },
            OverviewStats: {
              type: 'object',
              properties: {
                totalListens: { type: 'integer' },
                uniqueArtists: { type: 'integer' },
                uniqueTracks: { type: 'integer' },
                totalPlayTime: { type: 'integer', description: 'Temps total en secondes' },
              },
            },
            GenreDistribution: {
              type: 'object',
              properties: {
                genre: { type: 'string' },
                count: { type: 'integer' },
                percentage: { type: 'number', format: 'float' },
              },
            },
            ArtistNetworkGraph: {
              type: 'object',
              properties: {
                nodes: { type: 'array', items: { $ref: '#/components/schemas/ArtistNode' } },
                edges: { type: 'array', items: { $ref: '#/components/schemas/ArtistEdge' } },
                metadata: { type: 'object' },
              },
            },
            ArtistNode: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                genre: { type: 'string' },
                playCount: { type: 'integer' },
              },
            },
            ArtistEdge: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                target: { type: 'string' },
                weight: { type: 'number' },
                type: { type: 'string', enum: ['genre', 'proximity', 'both'] },
              },
            },
          },
        },
      },
      apis: [
        path.join(process.cwd(), 'app/api/**/*.ts'),
      ],
    };

    const swaggerSpec = swaggerJsdoc(options);
    return NextResponse.json(swaggerSpec);
  } catch (error) {
    console.error('Error generating Swagger spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate Swagger specification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

