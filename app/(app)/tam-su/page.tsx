import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloneChat } from "@/components/clone/clone-chat";
import { requireMe } from "@/lib/auth";
import { cloneAvailable } from "@/lib/clone/access";
import { aiProvider, cloneConfig } from "@/lib/env";
import { readPrefs } from "@/lib/validation";

export async function generateMetadata(): Promise<Metadata> {
  const config = cloneConfig();
  return { title: config ? `Tâm sự với ${config.name}` : "Tâm sự" };
}

/**
 * "<name> (bản AI)": a chat companion for admins and the accounts an admin switched it on for (table clone_access).
 * 404 for everybody else and when CLONE_PROFILE is not set.
 * Only the display name goes to the browser; the profile never leaves the server (lib/ai/clone/prompt.ts).
 */
export default async function TamSuPage() {
  const me = await requireMe();
  const config = cloneConfig();
  // Not switched on for this account: the same plain 404 as a page that does not exist.
  if (!config || !(await cloneAvailable())) notFound();

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
