import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { getEstimateById } from '#services/EstimateService';
import { serializeDoc } from '#utils/serialize';

export default createQueryHandler(defineQuery({
  id: QueryKeys.ESTIMATE_DETAILS,
  scope: 'public',
  handler: async (_event, args) => {
    const estimate = await getEstimateById(args.id);
    const serialized = serializeDoc(estimate);
    return {
      ...serialized,
      project_id: estimate.project_id?.toString?.() ?? serialized?.project_id,
    };
  },
}));
