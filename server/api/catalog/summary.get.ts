import { defineEventHandler } from 'h3';
import { PriceListItem } from '#models';

export default defineEventHandler(async () => {
  const [totalItems, projectIds] = await Promise.all([
    PriceListItem.estimatedDocumentCount(),
    PriceListItem.distinct('project_id'),
  ]);

  return {
    total_items: totalItems,
    total_projects: projectIds.length,
    business_units: [],
  };
});
