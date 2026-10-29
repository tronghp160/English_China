"use client";

import { BotMessageSquare } from "lucide-react";
import { PettablePup } from "@/components/mascot/pettable-pup";
import { IconTile } from "@/components/ui/icon-tile";

export function TutorHero({
  tutorName = "Bin",
  mascot = true,
  children,
}: {
  tutorName?: string;
  mascot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-primary p-5 text-on-primary shadow-hero lg:p-8">
      {/* Background decoration & Mascot */}
      {mascot ? (
        <>
          <div className="absolute right-4 -bottom-3 hidden lg:block">
            <PettablePup name={tutorName} mood="wave" size={112} />
          </div>
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold opacity-90">Gia sư AI · {tutorName}</span>
            <PettablePup name={tutorName} mood="wave" size={72} />
          </div>
        </>
      ) : (
        <div className="absolute right-6 top-6 hidden ring-2 ring-white/40 rounded-lg lg:block">
          <IconTile icon={BotMessageSquare} solid tone="blue" size={48} />
        </div>
      )}

      <div className="relative z-10 max-w-xl">
        {mascot && (
          <p className="hidden text-sm font-semibold opacity-90 lg:block">
            Gia sư AI · {tutorName}
          </p>
        )}
        {!mascot && (
          <p className="text-sm font-semibold opacity-90">
            Gia sư AI
          </p>
        )}

        <h1 className="mt-1 font-display text-[1.75rem] leading-tight text-white lg:text-4xl">
          Hỏi {tutorName} bất cứ điều gì
        </h1>

        <p className="mt-2 text-sm opacity-90 sm:text-base leading-relaxed">
          Tiếng Anh hay tiếng Trung: nghĩa từ, ngữ pháp, sửa câu, luyện nói. {tutorName} biết những từ
          trong sổ của bạn.
        </p>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
