import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      message: "Apple Music Replay import pending",
      received: body,
    });
  } catch (error) {
    console.error("Error importing Replay data:", error);
    return NextResponse.json(
      { error: "Failed to import Replay data" },
      { status: 500 }
    );
  }
}

