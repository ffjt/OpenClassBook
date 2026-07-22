import { describe, expect, it } from "vitest";

import {
  applyTemplateAppearanceColorDefaults,
  getTemplateAssetUrl,
  templateCatalog,
} from "@/mock/template-catalog";
import { defaultTemplate } from "@/mock/template";

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

  it("keeps every Monet-derived accent highly readable on its template surface", () => {
    for (const template of templateCatalog) {
      expect(
        contrastRatio(template.accentColor, template.secondaryColor),
        template.id,
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it("keeps every default text color highly readable on its template surface", () => {
    for (const template of templateCatalog) {
      expect(
        contrastRatio(template.textColor, template.secondaryColor),
        template.id,
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it("provides explicit defaults for both cover text surfaces", () => {
    for (const template of templateCatalog) {
      expect(template.coverTextColor, `${template.id} cover`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(template.backCoverTextColor, `${template.id} back cover`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(template.spineColor, `${template.id} spine`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(template.coverTextColor).toBe(template.backCoverTextColor);
    }
  });

  it("uses each template's cover and back-cover default for its spine font", () => {
    for (const theme of templateCatalog) {
      const appearance = applyTemplateAppearanceColorDefaults(defaultTemplate.appearance, theme);
      const expectedFontFamily = theme.titleFont?.family ?? theme.fontFamily;

      expect(appearance.frontCover.palette.text, theme.id).toBe(theme.coverTextColor);
      expect(appearance.spine.backgroundColor, theme.id).toBe(theme.spineColor);
      expect(appearance.spine.textColor, theme.id).toBe(theme.coverTextColor);
      expect(appearance.spine.canvasObjects.every(({ color }) => color === theme.coverTextColor), theme.id).toBe(true);
      expect(appearance.spine.canvasObjects.every(({ fontFamily }) => fontFamily?.family === expectedFontFamily), theme.id).toBe(true);
      expect(appearance.frontCover.canvasObjects.filter(({ type }) => type !== "line").every(({ color }) => color === theme.coverTextColor), theme.id).toBe(true);
      expect(appearance.backCover.canvasObjects.filter(({ type }) => type !== "line").every(({ color }) => color === theme.backCoverTextColor), theme.id).toBe(true);
      expect([
        ...appearance.frontCover.canvasObjects,
        ...appearance.backCover.canvasObjects,
      ].filter(({ type }) => type !== "line").every(({ fontFamily }) => fontFamily?.family === expectedFontFamily), theme.id).toBe(true);
      expect(appearance.backCover.canvasObjects.find(({ type }) => type === "line")?.color, theme.id).toBeUndefined();
    }
  });

});
