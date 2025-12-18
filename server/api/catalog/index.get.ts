import { defineEventHandler, getQuery } from 'h3';
import { PriceListItem } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event);
  const filters: any = {};

  if (queryParams.search) {
    const regex = new RegExp(String(queryParams.search), 'i');
    filters.$or = [
      { code: regex },
      { description: regex },
      { long_description: regex },
    ];
  }

  if (queryParams.project_id) {
    filters.project_id = queryParams.project_id;
  }

  if (queryParams.business_unit) {
    filters.business_unit = queryParams.business_unit;
  }

  const items = await PriceListItem.find(filters).sort({ created_at: -1 }).lean();
  return serializeDocs(items);
});
