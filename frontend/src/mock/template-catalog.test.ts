import { describe, expect, it } from "vitest";

import {
  getTemplateAssetUrl,
  templateCatalog,
} from "@/mock/template-catalog";

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("template catalog", () => {
  it("contains every named first-party PRD theme", () => {
    expect(templateCatalog.map((template) => template.id)).toEqual([
      "spring-blossom",
      "summer-forest",
      "autumn-ginkgo",
      "winter-sun",
      "misty-mountain",
      "rice-paper",
      "new-chinese",
      "campus-morning",
      "graduation",
      "youth-dream",
      "nordic-forest",
      "ocean-fairytale",
      "starry-dream",
    ]);
  });

  it("resolves safe first-party asset URLs", () => {
    expect(getTemplateAssetUrl("campus-morning", "chapter")).toBe(
      "/templates/campus-morning/chapter.png",
    );
    expect(getTemplateAssetUrl("../../outside", "cover")).toBe(
      "/templates/spring-blossom/cover.png",
    );
  });

  it("keeps every default accent readable on its template surface", () => {
    for (const template of templateCatalog) {
      expect(
        contrastRatio(template.accentColor, template.secondaryColor),
        template.id,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses high-contrast author colors for the refined themes", () => {
    const refinedThemeIds = new Set(["spring-blossom", "summer-forest", "rice-paper"]);

    for (const template of templateCatalog.filter(({ id }) => refinedThemeIds.has(id))) {
      expect(
        contrastRatio(template.accentColor, template.secondaryColor),
        template.id,
      ).toBeGreaterThanOrEqual(7);
    }
  });

});
