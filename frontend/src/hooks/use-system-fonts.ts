import { useCallback, useState } from "react";

import type { FontSelection } from "@/components/dashboard/format-settings/format-settings-types";

interface LocalFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

export type SystemFontStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "denied"
  | "unsupported";

export function useSystemFonts() {
  const [fontOptions, setFontOptions] = useState<FontSelection[]>([]);
  const [status, setStatus] = useState<SystemFontStatus>("idle");

  const loadSystemFonts = useCallback(async () => {
    if (typeof window.queryLocalFonts !== "function") {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");

    try {
      const localFonts = await window.queryLocalFonts();
      const uniqueFonts = Array.from(
        new Map(
          localFonts
            .filter(({ family, fullName, postscriptName }) =>
              Boolean(family && fullName && postscriptName),
            )
            .map((font) => [font.postscriptName, font]),
        ).values(),
      ).sort((left, right) =>
        left.fullName.localeCompare(right.fullName, navigator.language),
      );

      setFontOptions(uniqueFonts);
      setStatus("loaded");
    } catch {
      setStatus("denied");
    }
  }, []);

  return { fontOptions, loadSystemFonts, status };
}
