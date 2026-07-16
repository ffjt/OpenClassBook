import { describe, expect, it } from "vitest";

import {
  generateArticleNumbers,
  normalizeArticleNumbers,
  readArticleNumberFile,
} from "@/lib/article-numbers";

describe("article number helpers", () => {
  it("generates a padded inclusive range", () => {
    expect(generateArticleNumbers(1, 3)).toEqual(["001", "002", "003"]);
  });

  it("rejects an invalid range", () => {
    expect(generateArticleNumbers(5, 4)).toEqual([]);
    expect(generateArticleNumbers(0, 4)).toEqual([]);
  });

  it("normalizes numeric cells and keeps custom identifiers", () => {
    expect(normalizeArticleNumbers([1, " 02 ", "A-3"])).toEqual([
      "001",
      "002",
      "A-3",
    ]);
  });

  it("rejects duplicate numbers after normalization", () => {
    expect(() => normalizeArticleNumbers(["1", "001"])).toThrow(
      "duplicate_article_number",
    );
  });

  it("reads quoted CSV cells with the established parser", async () => {
    const file = {
      name: "numbers.csv",
      text: async () => '"1","A-2"\n"003","B-4"',
    } as File;

    await expect(readArticleNumberFile(file)).resolves.toEqual([
      "001",
      "A-2",
      "003",
      "B-4",
    ]);
  });

  it("reads whitespace-separated TXT lists", async () => {
    const file = {
      name: "numbers.txt",
      text: async () => "1\n2 3",
    } as File;

    await expect(readArticleNumberFile(file)).resolves.toEqual([
      "001",
      "002",
      "003",
    ]);
  });
});
