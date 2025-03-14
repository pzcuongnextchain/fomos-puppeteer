export class NumberNormalizer {
  public static normalize(
    text: string | null | undefined,
    options: {
      defaultValue?: number;
      removeNonNumeric?: boolean;
      decimalSeparator?: string;
      thousandsSeparator?: string;
    } = {}
  ): number | null {
    if (text === null || text === undefined || text.trim() === "") {
      return options.defaultValue ?? null;
    }

    const {
      removeNonNumeric = true,
      decimalSeparator = ".",
      thousandsSeparator = ",",
    } = options;

    let cleanedText = text.trim();

    cleanedText = cleanedText.replace(
      new RegExp(`\\${thousandsSeparator}`, "g"),
      ""
    );

    if (decimalSeparator !== ".") {
      cleanedText = cleanedText.replace(
        new RegExp(`\\${decimalSeparator}`, "g"),
        "."
      );
    }

    if (removeNonNumeric) {
      cleanedText = cleanedText.replace(/[^\d.-]/g, "");
    }

    const result = parseFloat(cleanedText);

    return isNaN(result) ? options.defaultValue ?? null : result;
  }

  public static normalizeInteger(
    text: string | null | undefined,
    options: {
      defaultValue?: number;
      removeNonNumeric?: boolean;
      thousandsSeparator?: string;
    } = {}
  ): number {
    const result = this.normalize(text, options);
    if (result === null) return options.defaultValue ?? 0;
    return Math.floor(result);
  }
}
