import { defineEventHandler } from 'h3';
import { Project } from '../../models/project.schema'
import { Estimate } from '../../models/estimate.schema'

type LeanProject = {
  _id?: { toString(): string }
  code?: string
  name?: string
  status?: string
}

type LeanEstimate = {
  _id?: { toString(): string }
  name?: string
  type?: string
  project_id?: { toString?: () => string }
  created_at?: Date | string
}

export default defineEventHandler(async () => {
  // Basic counts
  const [projects, estimates, offers] = await Promise.all([
    Project.find().lean(),
    Estimate.find().lean(),
    Offer.find().lean(),
  ]);

  const active_projects = projects.filter((p) => p.status !== 'closed').length
  const loaded_estimates = estimates.length
  const offers_count = offers.length // Renamed to avoid conflict with the 'offers' array
  const generated_reports = 0

  // Recent activity: last 10 estimates (project or offer)
  const recentRaw: LeanEstimate[] = await Estimate.find().sort({ created_at: -1 }).limit(10).lean()

  // Build project lookup for codes/names
  const projectMap = new Map<string, { id: string; code?: string; name?: string }>()
  projects.forEach((p) => {
    const id = p._id?.toString()
    if (id) {
      projectMap.set(id, { id, code: p.code, name: p.name })
    }
  })

  const recent_activity = recentRaw.map((item) => {
    const projectId = item.project_id?.toString?.() || ''
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
    offers,
    generated_reports,
    recent_activity,
  }
})
