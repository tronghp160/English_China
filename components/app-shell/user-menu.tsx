"use client";

import { LogOut, MessageSquareHeart, Palette, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt="" />}
      {/* Initials as CSS content: decorative (the name is always next to it or in the label),
          and not text that would clash with the trigger aria-label (WCAG 2.5.3). */}
      <AvatarFallback
        data-initials={initials(name)}
        className="bg-primary-soft text-sm font-semibold text-primary after:content-[attr(data-initials)]"
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-11 place-items-center rounded-full"
        aria-label="Tài khoản và cài đặt"
      >
        <UserAvatar name={displayName} url={avatarUrl} className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-medium text-fg">{displayName}</span>
          <span className="block text-sm text-fg-muted">@{username}</span>
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
