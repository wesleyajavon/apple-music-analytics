/**
 * Swagger/OpenAPI configuration for API documentation.
 * Convention: API docs are kept in English (standard for developer-facing technical documentation).
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Apple Music Analytics API',
      version: '1.0.0',
      description: 'API for the music analytics dashboard. Provides listening stats, genre distribution, timelines, and Apple Music Replay data.',
      contact: {
        name: 'Apple Music Analytics',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
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
            totalPlayTime: { type: 'integer', description: 'Total listening time in seconds' },
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
            nodes: {
              type: 'array',
              items: { $ref: '#/components/schemas/ArtistNode' },
            },
            edges: {
              type: 'array',
              items: { $ref: '#/components/schemas/ArtistEdge' },
            },
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
    './app/api/**/*.ts', // Files containing Swagger JSDoc annotations
  ],
};

module.exports = swaggerJsdoc(options);



