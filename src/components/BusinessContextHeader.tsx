import { createServerSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase-config";

// When a customer arrives at /login or /signup from a business's booking
// page (next=/<slug>/book), remind them whose page they're booking with:
// the business's logo + name above the form. Anything unexpected: no
// next, a reserved path, an unknown or unpublished slug, a database
// error: renders nothing extra.
const RESERVED_SEGMENTS = new Set([
  "login",
  "signup",
  "owner",
  "explore",
  "about",
  "terms",
  "privacy",
  "contact",
  "my-appointments",
  "auth",
]);

export default async function BusinessContextHeader({ next }: { next?: string }) {
  if (!next || !isSupabaseConfigured()) return null;
  const segment = next.replace(/^\//, "").split("/")[0];
  if (!segment || RESERVED_SEGMENTS.has(segment)) return null;

  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("businesses")
      .select("name, logo_url")
      .eq("slug", segment)
      .eq("published", true)
      .maybeSingle();
    if (!data) return null;
    return (
      <div className="center" style={{ marginBottom: 16 }}>
        {data.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logo_url}
            alt=""
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 14,
              marginBottom: 8,
            }}
          />
        )}
        <p className="small" style={{ margin: 0 }}>
          You&apos;re booking with <strong>{data.name}</strong>
        </p>
      </div>
    );
  } catch {
    return null;
  }
}
