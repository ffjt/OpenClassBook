import type {
  BookCreateInput,
  NumberMode,
} from "@/repositories/bookRepository";

export interface NumberingSettingsValue {
  claimNumberEnd: number;
  claimNumberStart: number;
  numberDigits: number;
  numberMode: NumberMode;
  numberPrefix: string;
}

export const defaultNumberingSettings: NumberingSettingsValue = {
  claimNumberEnd: 100,
  claimNumberStart: 1,
  numberDigits: 3,
  numberMode: "none",
  numberPrefix: "",
};

export function numberingSettingsToPayload(
  value: NumberingSettingsValue,
): Pick<
  BookCreateInput,
  | "number_mode"
  | "claim_number_start"
  | "claim_number_end"
  | "number_prefix"
  | "number_digits"
> {
  return {
    number_mode: value.numberMode,
    claim_number_start: value.claimNumberStart,
    claim_number_end: value.claimNumberEnd,
    number_prefix:
      value.numberMode === "automatic" ? value.numberPrefix.trim() : "",
    number_digits:
      value.numberMode === "automatic" ? value.numberDigits : 3,
  };
}
