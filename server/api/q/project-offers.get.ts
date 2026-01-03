import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { Offer } from '#models';
import { serializeDocs } from '#utils/serialize';
import { requireObjectId, toObjectId } from '#utils/validate';

export default createQueryHandler(defineQuery({
  id: QueryKeys.PROJECT_OFFERS,
  scope: 'public',
  handler: async (_event, args) => {
    const projectId = requireObjectId(args.project_id, 'Project ID');
    const filter: Record<string, unknown> = { project_id: toObjectId(projectId) };

    if (args.estimate_id) {
      filter.estimate_id = toObjectId(requireObjectId(args.estimate_id, 'Estimate ID'));
    }

    const offers = await Offer.find(filter)
      .select('_id estimate_id round_number company_name name status total_amount mode')
      .sort({ round_number: 1, company_name: 1 })
      .lean();

    const serialized = serializeDocs(offers).map((offer) => ({
      ...offer,
      estimate_id: offer.estimate_id ? String(offer.estimate_id) : undefined,
    }));

    return {
      items: serialized,
    };
  },
}));
