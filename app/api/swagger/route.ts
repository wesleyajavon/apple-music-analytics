import { NextResponse } from 'next/server';

/**
 * GET /api/swagger
 *
 * Returns the OpenAPI/Swagger specification in JSON format
 */
export async function GET() {
  try {
    const swaggerSpec = (await import('@/swagger.config.js')).default;
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
