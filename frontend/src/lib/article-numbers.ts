import Papa from "papaparse";

export const maxArticleNumbers = 2_000;
export const supportedNumberFileExtensions = [".xlsx", ".csv", ".txt"] as const;

export function generateArticleNumbers(start: number, end: number) {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end > 999 ||
    start > end
  ) {
    return [];
  }
  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index).padStart(3, "0"),
  );
}

export function normalizeArticleNumbers(values: unknown[]) {
  const numbers = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .map((value) => (/^\d{1,3}$/.test(value) ? value.padStart(3, "0") : value));

  if (!numbers.length || numbers.length > maxArticleNumbers) {
    throw new Error("invalid_number_count");
  }
  if (numbers.some((number) => number.length > 50)) {
    throw new Error("invalid_number_length");
  }
  if (new Set(numbers).size !== numbers.length) {
    throw new Error("duplicate_article_number");
  }
  return numbers;
}

export async function readArticleNumberFile(file: File) {
  const extension = supportedNumberFileExtensions.find((candidate) =>
    file.name.toLowerCase().endsWith(candidate),
  );
  if (!extension) throw new Error("unsupported_number_file");

  if (extension === ".xlsx") {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const rows = await readXlsxFile(file);
    return normalizeArticleNumbers(rows.flat());
  }

  const text = await file.text();
  if (extension === ".txt") {
    return normalizeArticleNumbers(text.split(/[\s,;，；]+/));
  }

  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error("invalid_csv");
  return normalizeArticleNumbers(parsed.data.flat());
}
