import type { ColumnFilterOperator } from '~/types/data-grid';

const normalize = (value: string | null | undefined) => (value ?? '').toString().trim().toLowerCase();

/**
 * Pure operator matcher used for both option filtering and row-level checks.
 */
export function matchesOperator(value: string | null | undefined, query: string, operator: ColumnFilterOperator) {
  const v = normalize(value);
  const q = normalize(query);

  switch (operator) {
    case 'contains':
      return q === '' ? true : v.includes(q);
    case 'not_contains':
      return q === '' ? true : !v.includes(q);
    case 'starts_with':
      return q === '' ? true : v.startsWith(q);
    case 'equals':
      return q === '' ? false : v === q;
    case 'is_empty':
      return v === '';
    case 'is_not_empty':
      return v !== '';
    default:
      return true;
  }
}
