"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";
import { AudioPlayerProvider } from "@/lib/audio-player";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    </SessionProvider>
  );
}
