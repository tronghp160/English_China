import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LangCode } from "@/lib/lang/types";

export type TripCandidateWord = {
  id: string;
  term: string;
  meaning_vi: string;
  language: LangCode;
  reading: string | null;
  lapses: number;
  state: string;
  last_review: string | null;
};

export async function tripWordCandidates(userId: string): Promise<TripCandidateWord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bin_trip_candidates", { p_user: userId });
  if (error || !data) return [];
  return data as TripCandidateWord[];
}
