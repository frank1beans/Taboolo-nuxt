import type { ColumnFilterOperator } from '~/types/data-grid';

const normalize = (value: string | null | undefined) => (value ?? '').toString().trim().toLowerCase();

const parseNumber = (raw: string | null | undefined) => {
  if (raw === null || raw === undefined) return null;
  const str = raw.toString().trim();
  if (!str) return null;

  const direct = Number(str);
  if (!Number.isNaN(direct)) return direct;

  const normalized = str.replace(/\./g, '').replace(',', '.');
  const alt = Number(normalized);
  return Number.isNaN(alt) ? null : alt;
};

/**
 * Pure operator matcher used for both option filtering and row-level checks.
 */
export function matchesOperator(value: string | null | undefined, query: string, operator: ColumnFilterOperator) {
  const v = normalize(value);
  const q = normalize(query);

  // Numeric comparisons
  if (
    operator === 'greater_than' ||
    operator === 'less_than' ||
    operator === 'greater_than_or_equal' ||
    operator === 'less_than_or_equal' ||
    operator === 'not_equals' ||
    operator === 'in_range'
  ) {
    const numVal = parseNumber(value);
    const numQuery = parseNumber(query);
    if (numVal === null || numQuery === null) return false;

    switch (operator) {
      case 'greater_than':
        return numVal > numQuery;
      case 'less_than':
        return numVal < numQuery;
      case 'greater_than_or_equal':
        return numVal >= numQuery;
      case 'less_than_or_equal':
        return numVal <= numQuery;
      case 'not_equals':
        return numVal !== numQuery;
      case 'in_range':
        // Expect query in "min,max" form; fall back to equals if not provided
        const [minRaw, maxRaw] = q.split(',').map((part) => part.trim());
        const min = parseNumber(minRaw);
        const max = parseNumber(maxRaw);
        if (min !== null && max !== null) return numVal >= min && numVal <= max;
        if (min !== null) return numVal >= min;
        if (max !== null) return numVal <= max;
        return false;
    }
  }

  switch (operator) {
    case 'contains':
      return q === '' ? true : v.includes(q);
    case 'not_contains':
      return q === '' ? true : !v.includes(q);
    case 'starts_with':
      return q === '' ? true : v.startsWith(q);
    case 'equals': {
      if (q === '') return false;
      const numVal = parseNumber(value);
      const numQuery = parseNumber(query);
      if (numVal !== null && numQuery !== null) return numVal === numQuery;
      return v === q;
    }
    case 'is_empty':
      return v === '';
    case 'is_not_empty':
      return v !== '';
    default:
      return true;
  }
}
