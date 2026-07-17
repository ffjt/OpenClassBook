import { describe, expect, it } from "vitest";

import { defaultTemplate } from "@/mock/template";

import {
  getPreviewColumnCount,
  paginateArticle,
} from "./live-article-preview";

describe("paginateArticle", () => {
  it("keeps two-column pagination within the same printable page capacity", () => {
    const body = "啊".repeat(2_000);
    const singleColumnPages = paginateArticle(body, "", -1, {
      ...defaultTemplate,
      bodySize: 10.5,
      columns: 1,
    });
    const twoColumnPages = paginateArticle(body, "", -1, {
      ...defaultTemplate,
      bodySize: 10.5,
      columns: 2,
    });

    expect(twoColumnPages).toHaveLength(singleColumnPages.length);
    expect(twoColumnPages.length).toBeGreaterThan(2);
  });

  it("keeps the configured two-column layout active for short pages", () => {
    const template = { ...defaultTemplate, columns: 2 as const };

    expect(getPreviewColumnCount(template)).toBe(2);
    expect(getPreviewColumnCount({ ...template, columns: 1 })).toBe(1);
  });
});
