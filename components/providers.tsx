"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setupPwa } from "@/lib/pwa";
import { applyThemePreference, readThemePreference } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );

  useEffect(setupPwa, []);

  // Follow OS theme changes while the preference is "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              // Inverted: ink background, paper text. Errors get a seal bar on the left.
              toast: "!bg-fg !text-canvas !border-0 !rounded-md !font-sans !text-sm !shadow-lift",
              description: "!text-canvas/70",
              error: "!border-l-[3px] !border-solid !border-l-danger",
              icon: "!hidden",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
