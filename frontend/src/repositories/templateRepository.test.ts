import { describe, expect, it } from "vitest";

import {
  deserializeTemplate,
  type BookTemplate,
} from "@/repositories/templateRepository";

function storedTemplate(presentation: Record<string, unknown>): BookTemplate {
  return {
    id: 1,
    book_id: 1,
    title_format: null,
    body_format: null,
    image_rules: null,
    numbering_rules: null,
    page_rules: { presentation },
  };
}

describe("template title surface", () => {
  it("preserves the existing scenic-theme default for older saved templates", () => {
    expect(
      deserializeTemplate(storedTemplate({ template_id: "summer-forest" }))
        .titleSurfaceEnabled,
    ).toBe(true);
    expect(
      deserializeTemplate(storedTemplate({ template_id: "nordic-forest" }))
        .titleSurfaceEnabled,
    ).toBe(false);
  });

  it("allows every theme to explicitly enable the surface and set opacity", () => {
    const template = deserializeTemplate(
      storedTemplate({
        template_id: "nordic-forest",
        title_surface_enabled: true,
        title_surface_opacity: 35,
      }),
    );

    expect(template.titleSurfaceEnabled).toBe(true);
    expect(template.titleSurfaceOpacity).toBe(35);
  });
});

describe("template page chrome surface", () => {
  it("uses the compatible default and preserves a saved opacity", () => {
    expect(deserializeTemplate(storedTemplate({})).chromeSurfaceOpacity).toBe(70);
    expect(
      deserializeTemplate(
        storedTemplate({ chrome_surface_opacity: 45 }),
      ).chromeSurfaceOpacity,
    ).toBe(45);
  });

  it("clamps invalid saved opacity percentages", () => {
    expect(
      deserializeTemplate(
        storedTemplate({ chrome_surface_opacity: 140 }),
      ).chromeSurfaceOpacity,
    ).toBe(100);
  });
});

describe("template footer typography", () => {
  it("uses compatible defaults for older templates", () => {
    const template = deserializeTemplate(storedTemplate({}));

    expect(template.footerFont.family).toBe("sans-serif");
    expect(template.footerSize).toBe(8);
  });

  it("preserves a saved footer font and clamps its size", () => {
    const template = deserializeTemplate(
      storedTemplate({
        footer_font: {
          family: "serif",
          fullName: "System Serif",
          postscriptName: "system-serif",
          style: "Regular",
        },
        footer_size: 24,
      }),
    );

    expect(template.footerFont.fullName).toBe("System Serif");
    expect(template.footerSize).toBe(18);
  });
});

describe("template quote style", () => {
  it("enables quote styling for templates that do not have a saved preference", () => {
    expect(deserializeTemplate(storedTemplate({})).quoteStyle).toBe(true);
  });

  it("preserves an explicitly disabled saved preference", () => {
    expect(
      deserializeTemplate(storedTemplate({ quote_style: false })).quoteStyle,
    ).toBe(false);
  });
});

describe("template layout contract", () => {
  it("ignores the removed legacy publication category", () => {
    const template = deserializeTemplate(
      storedTemplate({ preset: "collection", columns: 1 }),
    );

    expect("preset" in template).toBe(false);
    expect(template.columns).toBe(1);
  });
});
