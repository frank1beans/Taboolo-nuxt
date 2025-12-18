/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Normalize textual fields (short/long description, unit) from heterogeneous importer payloads.
 */
export const normalizeTextFields = (entry: any) => {
  const short_description =
    entry?.short_description ??
    entry?.description ??
    entry?.descrizione ??
    entry?.code ??
    entry?.codice ??
    '';

  const long_description =
    entry?.long_description ??
    entry?.description_extended ??
    entry?.descrizione_estesa ??
    entry?.extraDescription ??
    entry?.longDescription ??
    null;

  const unit =
    entry?.unit ??
    entry?.unit_measure ??
    entry?.unit_label ??
    entry?.unita_misura ??
    null;

  return {
    short_description,
    long_description: long_description || short_description,
    unit,
  };
};
