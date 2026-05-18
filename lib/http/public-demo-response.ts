import { NextResponse } from "next/server";
import { PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS } from "@/lib/constants/public-demo-cache";

export function publicDemoJsonResponse<T>(
  body: T,
  isPublicDemoDataset: boolean
): NextResponse {
  const res = NextResponse.json(body);
  if (isPublicDemoDataset) {
    res.headers.set(
      "Cache-Control",
      `public, s-maxage=${PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=120`
    );
  } else {
    res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  }
  return res;
}
