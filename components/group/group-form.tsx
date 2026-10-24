"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGroup, updateGroup } from "@/lib/actions/groups";

/** Create (then open the group) or edit name + description. */
export function GroupForm({
  groupId,
  initial,
  onDone,
}: {
  groupId?: string;
  initial?: { name: string; description: string | null };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErrors({ name: "Nhập tên nhóm" });
    start(async () => {
      const input = { name, description };
      if (groupId) {
        const res = await updateGroup(groupId, input);
        if (!res.ok) return void (setErrors(res.fieldErrors ?? {}), toast.error(res.error));
        toast.success("Đã lưu nhóm");
        router.refresh();
      } else {
        const res = await createGroup(input);
        if (!res.ok) return void (setErrors(res.fieldErrors ?? {}), toast.error(res.error));
        router.push(`/groups/${res.data.id}`);
      }
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="group-name">Tên nhóm</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Lớp HSK 3 tối thứ Năm"
          maxLength={60}
          aria-invalid={Boolean(errors.name) || undefined}
          autoFocus={!groupId}
        />
        {errors.name && <p className="text-sm text-danger-fg">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="group-desc">Mô tả (không bắt buộc)</Label>
        <Textarea
          id="group-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={2}
        />
        {errors.description && <p className="text-sm text-danger-fg">{errors.description}</p>}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:px-8">
        {groupId ? "Lưu" : "Tạo nhóm"}
      </Button>
    </form>
  );
}
