import type { Metadata } from "next";
import { TutorWorkspacePage } from "@/components/chat/tutor-workspace-page";
import { requireMe } from "@/lib/auth";

export const metadata: Metadata = { title: "Gia sư" };

/** Opens straight on the chat window, ready to ask. */
export default async function ChatHomePage({ searchParams }: PageProps<"/chat">) {
  const [me, sp] = await Promise.all([requireMe(), searchParams]);
  return (
    <>
      {sp.error && <p className="mb-4 text-sm text-danger-fg">Không mở được cuộc trò chuyện mới. Thử lại.</p>}
      <TutorWorkspacePage me={me} thread={null} />
    </>
  );
}
