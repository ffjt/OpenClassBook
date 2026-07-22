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

const localizedFontNames: Array<[RegExp, string]> = [
  [/^LXGW\s*WenKai\s*Lite/i, "霞鹜文楷 轻便版"],
  [/^LXGW\s*WenKai/i, "霞鹜文楷"],
  [/^Source\s*Han\s*Serif\s*SC/i, "思源宋体"],
  [/^Source\s*Han\s*Sans\s*SC/i, "思源黑体"],
  [/^Noto\s*Serif\s*CJK\s*SC/i, "思源宋体"],
  [/^Noto\s*Sans\s*CJK\s*SC/i, "思源黑体"],
  [/^Microsoft\s*YaHei/i, "微软雅黑"],
  [/^SimSun/i, "宋体"], [/^SimHei/i, "黑体"], [/^KaiTi/i, "楷体"], [/^FangSong/i, "仿宋"],
];

export function getLocalizedFontName(font: FontSelection) {
  const candidate = `${font.fullName} ${font.family}`;
  return localizedFontNames.find(([pattern]) => pattern.test(candidate))?.[1] ?? font.fullName;
}

/**
 * Include the localized display name (and the common 鶩/鹭 spelling variant)
 * in font search. `queryLocalFonts()` only returns the installed English
 * family name for LXGW WenKai Lite, so searching the label alone used to fail.
 */
export function getFontSearchText(font: FontSelection) {
  const localizedName = getLocalizedFontName(font);
  const aliases = localizedName.includes("霞鹜文楷")
    ? "霞鹜文楷 霞鹭文楷"
    : "";
  return `${localizedName} ${aliases} ${font.fullName} ${font.family} ${font.style} ${font.postscriptName}`
    .toLocaleLowerCase();
}

export function sortFontOptions(fonts: FontSelection[]) {
  return [...fonts].sort((left, right) => {
  const leftName = getLocalizedFontName(left);
  const rightName = getLocalizedFontName(right);
  return leftName.localeCompare(rightName, "zh-Hans-CN", { sensitivity: "base" })
    || left.fullName.localeCompare(right.fullName, "zh-Hans-CN", { sensitivity: "base" });
  });
}

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
      const uniqueFonts = sortFontOptions(Array.from(
        new Map(
          localFonts
            .filter(({ family, fullName, postscriptName }) =>
              Boolean(family && fullName && postscriptName),
            )
            .map((font) => [font.postscriptName, font]),
        ).values(),
      ));

      setFontOptions(uniqueFonts);
      setStatus("loaded");
    } catch {
      setStatus("denied");
    }
  }, []);

  return { fontOptions, loadSystemFonts, status };
}
