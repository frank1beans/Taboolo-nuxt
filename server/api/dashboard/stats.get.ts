import { defineEventHandler } from 'h3';
import { Project } from '../../models/project.schema'
import { Estimate } from '../../models/estimate.schema'
import { Offer } from '../../models/offer.schema'
import { UserContext } from '../../models/user-context.schema'

type LeanEstimate = {
  _id?: { toString(): string }
  name?: string
  type?: string
  project_id?: { toString?: () => string }
  created_at?: Date | string
}

export default defineEventHandler(async () => {
  // Basic counts
  const [projectsCount, estimatesCount, approvedOffersCount, uniqueUsersCount, recentEstimates] = await Promise.all([
    // Active projects (not closed)
    Project.countDocuments({ status: { $ne: 'closed' } }),

    // Total estimates
    Estimate.countDocuments(),

    // Approved offers
    Offer.countDocuments({ status: 'accepted' }),

    // Active users (unique user_ids in context)
    UserContext.distinct('user_id').then(ids => ids.length),

    // Recent activity: last 10 estimates (project or offer)
    Estimate.find().sort({ created_at: -1 }).limit(10).lean()
  ]);

  const active_projects = projectsCount
  const loaded_estimates = estimatesCount
  const approved_offers = approvedOffersCount
  const active_users = uniqueUsersCount

  // Build project lookup for codes/names for recent activity
  const projectIds = new Set<string>()
  recentEstimates.forEach((item: LeanEstimate) => {
    const startId = item.project_id
    if (startId) projectIds.add(startId.toString())
  })

  const relevantProjects = await Project.find({ _id: { $in: Array.from(projectIds) } }).lean()
  const projectMap = new Map<string, { id: string; code?: string; name?: string }>()

  relevantProjects.forEach((p) => {
    const id = p._id?.toString()
    if (id) {
      projectMap.set(id, { id, code: p.code, name: p.name })
    }
  })

  const recent_activity = recentEstimates.map((item: LeanEstimate) => {
    const projectId = item.project_id?.toString() || ''
    const project = projectMap.get(projectId)
    return {
      estimate_id: item._id?.toString() || '',
      estimate_name: item.name || 'N/D',
      type: item.type || 'project',
      project_id: projectId,
      project_code: project?.code || '—',
      project_name: project?.name || '—',
      created_at: item.created_at instanceof Date ? item.created_at.toISOString() : String(item.created_at ?? ''),
    }
  })

  return {
    active_projects,
    loaded_estimates,
    approved_offers,
    active_users,
    recent_activity,
  }
})
