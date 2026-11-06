import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloneChat } from "@/components/clone/clone-chat";
import { requireMe } from "@/lib/auth";
import { aiProvider, cloneConfig } from "@/lib/env";
import { readPrefs } from "@/lib/validation";

export async function generateMetadata(): Promise<Metadata> {
  const config = cloneConfig();
  return { title: config ? `Tâm sự với ${config.name}` : "Tâm sự" };
}

/**
 * "<name> (bản AI)": a chat companion for anyone signed in. Hidden (404) when CLONE_PROFILE is not set.
 * Only the display name goes to the browser; the profile never leaves the server (lib/ai/clone/prompt.ts).
 */
export default async function TamSuPage() {
  const me = await requireMe();
  const config = cloneConfig();
  if (!config) notFound();

  const prefs = readPrefs(me.settings.prefs);
  const provider = aiProvider()?.provider;

  return (
    <CloneChat
      userId={me.user.id}
      cloneName={config.name}
      displayName={me.profile.display_name}
      providerLabel={provider === "google" ? "Google Gemini" : "Anthropic Claude"}
      tutorName={prefs.mascot ? prefs.mascot_name : "Gia sư"}
    />
  );
}
