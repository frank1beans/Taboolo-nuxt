import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapComputoToEstimate } from '#utils/python-mappers';

type OfferEstimate = {
  estimate_id?: string;
  mode?: string;
  company?: string;
  round_number?: number;
  total_amount?: number | null;
  items?: unknown[];
  [key: string]: unknown;
};

const fieldMap = (name: string) => {
  switch (name) {
    case 'company':
      return 'impresa';
    case 'price_column':
      return 'price_column';
    case 'quantity_column':
      return 'quantity_column';
    case 'progressive_column':
      return 'progressive_column';
    case 'round_number':
      return 'round_number';
    case 'round_mode':
      return 'round_mode';
    case 'discipline':
      return 'disciplina';
    default:
      return name;
  }
};

const valueMap = (name: string, value: string) => {
  if (name === 'code_columns' || name === 'description_columns') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(',');
    } catch {
      // fallback: return as-is
    }
  }
  return value;
};

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  // Proxy all offer imports (LC/MC) to Python importer
  const result = await proxyMultipartToPython(event, `/commesse/${projectId}/ritorni`, { method: 'POST', mapFieldName: fieldMap, mapFieldValue: valueMap });
  const mapped = mapComputoToEstimate(result) as OfferEstimate;

  console.log('[offers.post] Mapped result:', {
    total_amount: mapped.total_amount,
    itemsCount: mapped.items?.length ?? 0
  });

  // Extract estimate_id (baseline) from form data provided by proxy logic or ensure we pass it correctly?
  // The proxy logic extracts fields via parseMultipartFormData internally or we can parse it here.
  // Actually, proxyMultipartToPython forwards everything to python, but we need the ID here for persistence.

  // Since we proxy, we can't easily read the body stream twice unless we intercept differently.
  // BUT: proxyMultipartToPython in current implementation returns the JSON result from Python.
  // It does NOT return the form fields sent by the client.
  // We need to pass the ID via query param OR extract it if possible.
  // To avoid breaking proxy, let's look at how we get the result. 
  // We need the ID for `persistOffer`.

  // Alternative: The client can send `estimate_id` in the query string? 
  // Let's check `api-client.ts`. It sends it in FormData.
  // The `proxyMultipartToPython` might consume the stream.
  // If so, we can't read `estimate_id` from body easily.

  // Let's check `python-proxy.ts` utils? 
  // Wait, if Python doesn't return the estimate_id back in the result, we lose it.
  // We should pass it as a Query Parameter to be safe and easy to read!

  // REVERTING Client Change to pass as Query Param? Or reading from query?
  // Let's check how to read multipart fields non-destructively or if we can use getRouterParam/getQuery.

  // Plan: Update `api-client.ts` to ALSO pass it as query param `estimate_id` for easier access here.
  // OR simply read it from the query if I update client.

  // Let's assume for now I will update client to pass it in query string too.
  const query = getQuery(event);
  const sourceEstimateId = query.estimate_id as string | undefined;
  const importMode = query.mode as string | undefined;

  // Use the new Persistence Service for Offer Importing
  const { persistOffer } = await import('#services/ImportPersistenceService');

  // Read metadata from query and override/augment result
  if (query.company) {
    mapped.company = String(query.company);
  }
  if (query.round_number) {
    mapped.round_number = Number(query.round_number);
  }

  // Construct a pseudo-payload
  const payload = {
    project: {},
    groups: [],
    price_list: {},
    estimate: {
      ...mapped,
      type: 'offer',
      // Prioritize query mode, then python-mapped mode, then default
      mode: importMode || mapped.mode || 'detailed'
    }
  };

  // Pass explicit baseline ID to persistOffer
  // We need to modify persistOffer signature or put it in payload?
  // persistOffer currently does: const baselineEstId = payload.estimate?.estimate_id || ...
  // So we can inject it into valid payload.

  if (sourceEstimateId) {
    payload.estimate = { ...payload.estimate, estimate_id: sourceEstimateId };
  }

  const persistenceResult = await persistOffer(payload, projectId);

  return persistenceResult;
});
