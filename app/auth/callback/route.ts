import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    
    // Use server-side client to exchange auth code for a session
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false
        }
      });
      await supabaseServer.auth.exchangeCodeForSession(code);
    }
  }

  // Redirect user to the target path (usually Home or the return customizer page)
  return NextResponse.redirect(new URL(next, request.url));
}
