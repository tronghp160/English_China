import type { Metadata } from "next";
import { PLACES } from "@/lib/bin/places";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { readPrefs } from "@/lib/validation";
import { PostcardsGallery, type CollectedTripRow } from "@/components/mascot/postcards-gallery";

export const metadata: Metadata = { title: "Bưu thiếp của Bin" };

export default async function PostcardsPage() {
  const user = await requireUser();
  const admin = createAdminClient();
  const [{ data: settings }, { data: trips }] = await Promise.all([
    admin.from("user_settings").select("prefs").eq("user_id", user.id).maybeSingle(),
    admin
      .from("bin_trips")
      .select("id, place_id, lang, study_day, word_term, story")
      .eq("user_id", user.id)
      .not("collected_at", "is", null)
      .order("collected_at", { ascending: false }),
  ]);
  const prefs = readPrefs(settings?.prefs);
  const name = prefs.mascot_name;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <PostcardsGallery
        name={name}
        places={PLACES}
        trips={(trips as unknown as CollectedTripRow[]) ?? []}
      />
    </div>
  );
}
