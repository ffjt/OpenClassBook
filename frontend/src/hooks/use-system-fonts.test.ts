import { describe, expect, it } from "vitest";

import {
  getFontSearchText,
  getLocalizedFontName,
  sortFontOptions,
} from "./use-system-fonts";

const liteWenKai = {
  family: "LXGW WenKai Lite",
  fullName: "LXGW WenKai Lite",
  postscriptName: "LXGWWenKaiLite-Regular",
  style: "Regular",
};

describe("system font localization", () => {
  it("labels the installed Lite family in Chinese and searches both Chinese spellings", () => {
    expect(getLocalizedFontName(liteWenKai)).toBe("霞鹜文楷 轻便版");
    expect(getFontSearchText(liteWenKai)).toContain("霞鹜文楷");
    expect(getFontSearchText(liteWenKai)).toContain("霞鹭文楷");
  });

  it("sorts localized Chinese font names by their displayed Chinese name", () => {
    const fonts = sortFontOptions([
      liteWenKai,
      { family: "SimSun", fullName: "SimSun", postscriptName: "SimSun", style: "Regular" },
    ]);

    expect(fonts.map(getLocalizedFontName)).toEqual(["宋体", "霞鹜文楷 轻便版"]);
  });
});
