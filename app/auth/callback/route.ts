import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
