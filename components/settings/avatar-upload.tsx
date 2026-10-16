"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { updateAvatar } from "@/lib/actions/profile";
import { compressImage, extensionFor } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chọn một file ảnh.");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file, { maxSize: 256, maxBytes: 200 * 1024, square: true });
      const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const res = await updateAvatar(url);
      if (!res.ok) throw new Error(res.error);
      setPreview(url);
      toast.success("Đã đổi ảnh đại diện");
      router.refresh();
    } catch {
      toast.error("Không tải được ảnh lên. Thử ảnh khác hoặc thử lại sau.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={displayName} url={preview} className="size-16 text-lg" />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        id="avatar-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <label
        htmlFor="avatar-input"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-rule bg-surface px-4 text-sm font-medium text-ink hover:bg-muted"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-4" aria-hidden />
        )}
        Đổi ảnh đại diện
      </label>
    </div>
  );
}
