import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Clears a session whose account no longer exists (see requireMe). getUser()
 * asks the auth server, so a live account is never signed out by this GET
 * (a link or <img> pointing here can't log someone out).
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (data.user && !error) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (profile) return NextResponse.redirect(`${origin}/today`);
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return NextResponse.redirect(`${origin}/login`);
}
