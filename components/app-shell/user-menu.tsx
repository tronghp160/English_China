"use client";

import { Bone, LogOut, MessageSquareHeart, Palette, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import { useBinHome } from "@/components/mascot/bin-home-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/profile";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function UserAvatar({
  name,
  url,
  seed,
  className,
}: {
  name: string;
  url: string | null;
  /** Picks the avatar hue (the user id or username); same seed, same color */
  seed?: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt="" />}
      {/* Initials as CSS content: decorative (the name is always next to it or in the label),
          and not text that would clash with the trigger aria-label (WCAG 2.5.3). */}
      <AvatarFallback
        seed={seed ?? name}
        data-initials={initials(name)}
        className="after:content-[attr(data-initials)]"
      />
    </Avatar>
  );
}

export function UserMenu({
  displayName,
  username,
  avatarUrl,
}: {
  displayName: string;
  username: string;
  avatarUrl: string | null;
}) {
  // The menu content only renders once it is opened, so reading the saved preference here never reaches the server render.
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const me = useOptionalMe();
  const binHome = useBinHome();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-11 place-items-center rounded-full"
        aria-label="Tài khoản và cài đặt"
      >
        <UserAvatar name={displayName} url={avatarUrl} seed={username} className="size-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <UserAvatar name={displayName} url={avatarUrl} seed={username} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate font-bold text-fg">{displayName}</span>
            <span className="block truncate text-sm text-fg-muted">@{username}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings#ho-so">
            <User aria-hidden /> Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden /> Cài đặt
          </Link>
        </DropdownMenuItem>
        {me?.prefs.mascot && binHome && (
          <DropdownMenuItem onSelect={binHome.open}>
            <Bone aria-hidden /> Góc của {me.prefs.mascot_name}
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette aria-hidden /> Giao diện
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(v) => {
                setTheme(v as ThemePreference);
                applyThemePreference(v as ThemePreference);
              }}
            >
              <DropdownMenuRadioItem value="light">Sáng</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Tối</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">Theo hệ thống</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link href="/lien-he">
            <MessageSquareHeart aria-hidden /> Liên hệ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
