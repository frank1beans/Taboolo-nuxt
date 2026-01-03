import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { PriceListItem } from '#models/price-list-item.schema';

export default createQueryHandler(defineQuery({
    id: QueryKeys.CATALOG_SUMMARY,
    scope: 'authenticated',
    handler: async (_event, _args) => {
        const [totalItems, projects, businessUnits] = await Promise.all([
            PriceListItem.countDocuments({}),
            PriceListItem.distinct('project_id'),
            PriceListItem.distinct('business_unit')
        ]);

        return {
            total_items: totalItems,
            total_projects: projects.length,
            business_units: businessUnits.filter(Boolean) as string[]
        };
    }
}));
