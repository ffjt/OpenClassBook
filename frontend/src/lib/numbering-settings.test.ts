import { describe, expect, it } from "vitest";

import {
  defaultNumberingSettings,
  numberingSettingsToPayload,
} from "@/lib/numbering-settings";

describe("numbering settings payload", () => {
  it("disables every numbering source for books without numbers", () => {
    expect(numberingSettingsToPayload(defaultNumberingSettings)).toEqual({
      existing_number_mode: null,
      number_digits: 3,
      number_mode: "none",
      number_pool: [],
      number_prefix: "",
    });
  });

  it("keeps automatic layout formatting", () => {
    expect(numberingSettingsToPayload({
      ...defaultNumberingSettings,
      numberDigits: 4,
      numberMode: "automatic",
      numberPrefix: "NO- ",
    })).toMatchObject({
      existing_number_mode: null,
      number_digits: 4,
      number_mode: "automatic",
      number_pool: [],
      number_prefix: "NO-",
    });
  });

  it("keeps an imported pool only for existing-number import mode", () => {
    expect(numberingSettingsToPayload({
      ...defaultNumberingSettings,
      existingNumberMode: "import",
      numberMode: "existing",
      numberPool: ["001", "017"],
    })).toMatchObject({
      existing_number_mode: "import",
      number_mode: "existing",
      number_pool: ["001", "017"],
    });
  });
});
