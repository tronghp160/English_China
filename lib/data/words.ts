import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getWord = cache(async (wordId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(wordId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("words").select("*").eq("id", wordId).maybeSingle();
  return data;
});
