import { describe, expect, it } from "vitest";

import {
  defaultNumberingSettings,
  numberingSettingsToPayload,
} from "@/lib/numbering-settings";

describe("numbering settings payload", () => {
  it("sends the default claim range when numbering is disabled", () => {
    expect(numberingSettingsToPayload(defaultNumberingSettings)).toEqual({
      claim_number_end: 100,
      claim_number_start: 1,
      number_digits: 3,
      number_mode: "none",
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
      claim_number_end: 100,
      claim_number_start: 1,
      number_digits: 4,
      number_mode: "automatic",
      number_prefix: "NO-",
    });
  });

  it("sends the configured claim range", () => {
    expect(numberingSettingsToPayload({
      ...defaultNumberingSettings,
      claimNumberEnd: 42,
      claimNumberStart: 17,
      numberMode: "existing",
    })).toMatchObject({
      claim_number_end: 42,
      claim_number_start: 17,
      number_mode: "existing",
    });
  });
});
