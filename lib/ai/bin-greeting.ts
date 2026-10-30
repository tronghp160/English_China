import "server-only";
import { after } from "next/server";
import { callModel, checkQuota, recordUsage } from "@/lib/ai/enrich";
import { binGreetingPrompt, binGreetingSystem } from "@/lib/ai/prompts";
import { binGreetingSchema } from "@/lib/ai/schemas";
import { greetingContext } from "@/lib/data/bin";
import { say, seedOf, type PupMood } from "@/lib/mascot/lines";
import { createAdminClient } from "@/lib/supabase/admin";
import { readPrefs } from "@/lib/validation";

export type DailyGreetingResult = {
  text: string;
  mood: PupMood;
  wordId: string | null;
};

export async function getOrWriteGreeting(
  userId: string,
  today: string,
): Promise<DailyGreetingResult | null> {
  const admin = createAdminClient();

  try {
    // 1. Check existing greeting for (userId, today)
    const { data: existing } = await admin
      .from("bin_daily")
      .select("greeting, mood, word_id")
      .eq("user_id", userId)
      .eq("study_day", today)
      .maybeSingle();

    if (existing) {
      return {
        text: existing.greeting,
        mood: existing.mood as PupMood,
        wordId: existing.word_id,
      };
    }

    // 2. Check user prefs
    const { data: settings } = await admin
      .from("user_settings")
      .select("prefs")
      .eq("user_id", userId)
      .maybeSingle();

    const prefs = readPrefs(settings?.prefs);
    if (!prefs.mascot || !prefs.bin_ai_greeting) {
      return null;
    }

    // 3. Greeting context
    const ctx = await greetingContext(userId, today);

    const saveTemplate = async (): Promise<DailyGreetingResult> => {
      const text = say("greetDaily", { seed: seedOf(`${userId}:${today}`), name: ctx.name });
      const mood: PupMood = "happy";
      await admin
        .from("bin_daily")
        .upsert(
          {
            user_id: userId,
            study_day: today,
            greeting: text,
            mood,
            word_id: null,
            source: "template",
          },
          { onConflict: "user_id,study_day", ignoreDuplicates: true },
        );

      const { data: saved } = await admin
        .from("bin_daily")
        .select("greeting, mood, word_id")
        .eq("user_id", userId)
        .eq("study_day", today)
        .single();

      return {
        text: saved?.greeting ?? text,
        mood: (saved?.mood as PupMood) ?? mood,
        wordId: saved?.word_id ?? null,
      };
    };

    // If neither hard words nor yesterday's new words exist, fallback to template to save quota
    if (ctx.hardWords.length === 0 && ctx.newYesterday.length === 0) {
      return await saveTemplate();
    }

    // 4. Check quota
    try {
      await checkQuota(userId);
    } catch {
      return await saveTemplate();
    }

    // 5. Call AI model
    const system = binGreetingSystem(ctx.name);
    const prompt = binGreetingPrompt(ctx);
    const { output } = await callModel(binGreetingSchema, system, prompt, 300);

    // 6. Post-processing & verification
    let text = output.text.replace(/\p{Extended_Pictographic}/gu, "").trim();

    // Verify word_id
    let wordId: string | null = null;
    if (output.word_id) {
      const allWords = [...ctx.hardWords, ...ctx.newYesterday];
      const found = allWords.find((w) => w.id === output.word_id);
      if (found && text.toLowerCase().includes(found.term.toLowerCase())) {
        wordId = found.id;
      }
    }

    // Check for hallucinated numbers
    const numbersInText = text.match(/\d+/g)?.map(Number) ?? [];
    const allowedNumbers = [ctx.streak, ctx.dueToday, ctx.reviewedToday];
    const hasHallucinatedNumber = numbersInText.some((n) => !allowedNumbers.includes(n));
    if (hasHallucinatedNumber || text.length < 5) {
      return await saveTemplate();
    }

    if (text.length > 200) {
      text = text.slice(0, 200);
    }

    // 7. Insert row and read back
    await admin
      .from("bin_daily")
      .upsert(
        {
          user_id: userId,
          study_day: today,
          greeting: text,
          mood: output.mood,
          word_id: wordId,
          source: "ai",
        },
        { onConflict: "user_id,study_day", ignoreDuplicates: true },
      );

    try {
      after(() => recordUsage(userId));
    } catch {
      void recordUsage(userId);
    }

    const { data: saved } = await admin
      .from("bin_daily")
      .select("greeting, mood, word_id")
      .eq("user_id", userId)
      .eq("study_day", today)
      .single();

    return {
      text: saved?.greeting ?? text,
      mood: (saved?.mood as PupMood) ?? (output.mood as PupMood),
      wordId: saved?.word_id ?? wordId,
    };
  } catch (e) {
    console.error("[bin] greeting", e);
    return null;
  }
}
