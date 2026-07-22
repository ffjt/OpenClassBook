import { afterEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl } from "@/repositories/apiClient";

import { exportRepository } from "./exportRepository";

describe("exportRepository.ensureFileAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks the inline PDF with HEAD without downloading its body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: { "Content-Type": "application/pdf" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const url = await exportRepository.ensureFileAvailable(
      "/api/v1/books/7/export/abc/download",
      { inline: true },
    );

    expect(url).toBe(
      `${apiBaseUrl}/api/v1/books/7/export/abc/download?inline=true`,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(url, {
      cache: "no-store",
      method: "HEAD",
      signal: undefined,
    });
  });

  it("rejects a missing artifact instead of reporting success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      exportRepository.ensureFileAvailable(
        "/api/v1/books/7/export/missing/download",
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a successful response that is not a PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          headers: { "Content-Type": "text/html" },
          status: 200,
        }),
      ),
    );

    await expect(
      exportRepository.ensureFileAvailable(
        "/api/v1/books/7/export/not-pdf/download",
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
});
