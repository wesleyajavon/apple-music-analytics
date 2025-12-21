import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const page = searchParams.get("page") || "1";

    return NextResponse.json({
      message: "Last.fm API integration pending",
      limit,
      page,
      data: [],
    });
  } catch (error) {
    console.error("Error fetching Last.fm data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Last.fm data" },
      { status: 500 }
    );
  }
}

