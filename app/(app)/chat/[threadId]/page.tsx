import { redirect } from "next/navigation";
import { chatUrl } from "@/lib/ai/tutor/chat-url";

/** Old address of a conversation: every conversation now opens on /chat?c=<id> (see lib/ai/tutor/chat-url.ts). */
export default async function ChatThreadPage({ params, searchParams }: PageProps<"/chat/[threadId]">) {
  const [{ threadId }, sp] = await Promise.all([params, searchParams]);
  redirect(chatUrl(threadId, typeof sp.q === "string" ? sp.q : undefined));
}
