import "server-only";
import { callModel, checkQuota, recordUsage } from "@/lib/ai/enrich";
import { binStoryPrompt, binStorySystem } from "@/lib/ai/prompts";
import { binStorySchema } from "@/lib/ai/schemas";
import { templateStory, type BinStory } from "@/lib/bin/trip";
import type { LangCode } from "@/lib/lang/types";
import { seedOf } from "@/lib/mascot/lines";
import { createAdminClient } from "@/lib/supabase/admin";

export async function writeTripStory(i: {
  userId: string;
  tripId: string;
  lang: LangCode;
  placeName: string;
  landmark: string;
  term: string | null;
  meaningVi: string | null;
  pinyin: string | null;
  name: string;
}): Promise<void> {
  const admin = createAdminClient();

  const saveFallback = async () => {
    try {
      const fallback = templateStory({
        lang: i.lang,
        placeName: i.placeName,
        landmark: i.landmark,
        term: i.term,
        reading: i.pinyin,
        meaningVi: i.meaningVi,
        name: i.name,
        seed: seedOf(i.tripId),
      });
      await admin.from("bin_trips").update({ story: fallback }).eq("id", i.tripId).is("story", null);
    } catch (e) {
      console.error("[bin] story fallback error", e);
    }
  };

  if (!i.term) {
    await saveFallback();
    return;
  }

  try {
    try {
      await checkQuota(i.userId);
    } catch {
      await saveFallback();
      return;
    }

    const system = binStorySystem({
      name: i.name,
      lang: i.lang,
      place: i.placeName,
      landmark: i.landmark,
      term: i.term,
    });
    const prompt = binStoryPrompt({
      term: i.term,
      meaningVi: i.meaningVi,
      place: i.placeName,
      landmark: i.landmark,
    });

    const { output } = await callModel(binStorySchema, system, prompt, 400);

    // Verify that at least one target line contains the term
    const term = i.term;
    let matches = false;
    if (i.lang === "zh") {
      matches = output.lines.some((l) => l.target.includes(term));
    } else {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}(s|es|ed|ing|d)?\\b`, "i");
      matches = output.lines.some((l) => re.test(l.target) || l.target.toLowerCase().includes(term.toLowerCase()));
    }

    if (!matches) {
      await saveFallback();
      return;
    }

    const stripEmoji = (s: string) => s.replace(/\p{Extended_Pictographic}/gu, "").trim();

    const cleanedLines = output.lines.map((l) => ({
      target: stripEmoji(l.target),
      vi: stripEmoji(l.vi),
    }));
    const cleanedPinyin = output.pinyin?.map(stripEmoji);

    const story: BinStory = {
      lines: cleanedLines,
      pinyin: cleanedPinyin,
      source: "ai",
    };

    const { error: updateError } = await admin
      .from("bin_trips")
      .update({ story })
      .eq("id", i.tripId)
      .is("story", null);

    if (!updateError) {
      recordUsage(i.userId);
    }
  } catch (err) {
    console.error("[bin] story", err);
    await saveFallback();
  }
}
