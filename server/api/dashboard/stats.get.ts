import { Project } from '@/server/models/project.schema'
import { Estimate } from '@/server/models/estimate.schema'

export default defineEventHandler(async () => {
  // Basic counts
  const [projects, estimates] = await Promise.all([
    Project.find().lean(),
    Estimate.find().lean(),
  ])

  const active_projects = projects.filter((p) => p.status !== 'closed').length
  const loaded_estimates = estimates.length
  const offers = estimates.filter((e) => e.type === 'offer').length
  const generated_reports = 0

  // Recent activity: last 10 estimates (project or offer)
  const recentRaw = await Estimate.find().sort({ created_at: -1 }).limit(10).lean()

  // Build project lookup for codes/names
  const projectMap = new Map<string, { id: string; code?: string; name?: string }>()
  projects.forEach((p: any) => {
    const id = p._id?.toString()
    if (id) {
      projectMap.set(id, { id, code: p.code, name: p.name })
    }
  })

  const recent_activity = recentRaw.map((item: any) => {
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
