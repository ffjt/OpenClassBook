import { describe, expect, it } from "vitest";

import { defaultTemplate } from "@/mock/template";

import {
  buildFlowPreviewBody,
  getPreviewColumnCount,
  paginateArticle,
} from "./live-article-preview";

describe("buildFlowPreviewBody", () => {
  it("keeps the first body as body text and marks every later article title", () => {
    const body = buildFlowPreviewBody("First body", [
      { body: "Second body", title: "Second title" },
      { body: "Third body", title: "Third title" },
    ]);

    expect(body).not.toContain("First title");
    expect(body).toContain("openclassbook-flow-title:0\nSecond body");
    expect(body).toContain("openclassbook-flow-title:1\nThird body");
  });
});

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
