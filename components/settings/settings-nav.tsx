"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky table of contents of the settings page (wide screens): the section in view is marked. */
export function SettingsNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="Các mục cài đặt" className="sticky top-20 hidden self-start lg:block">
      <ul className="space-y-0.5 border-l border-rule">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                active === i.id ? "border-ink-violet font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
