import type {
  BookCreateInput,
  ExistingNumberMode,
  NumberMode,
} from "@/repositories/bookRepository";

export interface NumberingSettingsValue {
  existingNumberMode: ExistingNumberMode;
  numberDigits: number;
  numberMode: NumberMode;
  numberPool: string[];
  numberPrefix: string;
}

export const defaultNumberingSettings: NumberingSettingsValue = {
  existingNumberMode: "claim",
  numberDigits: 3,
  numberMode: "none",
  numberPool: [],
  numberPrefix: "",
};

export function numberingSettingsToPayload(
  value: NumberingSettingsValue,
): Pick<
  BookCreateInput,
  | "number_mode"
  | "existing_number_mode"
  | "number_pool"
  | "number_prefix"
  | "number_digits"
> {
  return {
    number_mode: value.numberMode,
    existing_number_mode:
      value.numberMode === "existing" ? value.existingNumberMode : null,
    number_pool:
      value.numberMode === "existing" &&
      value.existingNumberMode === "import"
        ? value.numberPool
        : [],
    number_prefix:
      value.numberMode === "automatic" ? value.numberPrefix.trim() : "",
    number_digits:
      value.numberMode === "automatic" ? value.numberDigits : 3,
  };
}
