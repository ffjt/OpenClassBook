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
