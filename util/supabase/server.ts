import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Accept the Next.js `cookies()` return directly (type may vary across Next versions)
export const createClient = (cookieStore: any) => {
  // Some Next.js environments return a cookie store with different
  // shapes across versions. If `getAll` is not available, fall back
  // to creating a server client without cookie sync to avoid runtime
  // errors in API routes.
  if (!cookieStore || typeof cookieStore.getAll !== 'function') {
    // Provide a minimal cookie implementation that no-ops so the
    // server client can be created without relying on Next's cookie
    // helpers in environments where they differ.
    return createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          /* noop */
        },
      },
    } as any);
  }

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};