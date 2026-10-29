import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { cjkFontVariables } from "@/lib/fonts";

/** Pages reachable without an account: shared decks (/d) and invites (/join). */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  return (
    <div className={`${cjkFontVariables} mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16`}>
      <header className="flex h-16 items-center justify-between">
        <Link href={user ? "/today" : "/"} className="rounded-md" aria-label="Sổ Từ">
          <Logo />
        </Link>
        <Button asChild variant="ghost">
          <Link href={user ? "/today" : "/login"}>{user ? "Vào Sổ Từ" : "Đăng nhập"}</Link>
        </Button>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
