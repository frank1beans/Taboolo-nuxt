

/**
 * Normalize textual fields (short/long description, unit) from heterogeneous importer payloads.
 */
export const normalizeTextFields = (entry: Record<string, unknown>) => {
  const short_description =
    entry?.short_description ??
    entry?.description ??
    entry?.descrizione ??
    entry?.code ??
    entry?.codice ??
    '';

  // Check longDescription (camelCase from Pydantic) earlier in the chain
  const long_description =
    entry?.longDescription ??      // camelCase from Pydantic serialization
    entry?.long_description ??     // snake_case
    entry?.description_extended ??
    entry?.descrizione_estesa ??
    entry?.extraDescription ??
    null;

  const unit =
    entry?.unit ??
    entry?.unit_measure ??
    entry?.unit_label ??
    entry?.unita_misura ??
    null;

  // DO NOT fallback long_description to short_description!
  // They are distinct fields and should stay separate.
  return {
    short_description,
    long_description,
    unit,
  };
};
