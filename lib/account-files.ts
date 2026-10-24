import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKETS = ["avatars", "word-images"] as const;

/** Removes every file under `<userId>/` in the user's storage buckets. */
export async function removeUserFiles(userId: string) {
  const storage = createAdminClient().storage;
  for (const bucket of BUCKETS) {
    for (;;) {
      const { data, error } = await storage.from(bucket).list(userId, { limit: 1000 });
      if (error) throw error;
      if (!data?.length) break;
      const { error: rmError } = await storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
      if (rmError) throw rmError;
      if (data.length < 1000) break;
    }
  }
}
