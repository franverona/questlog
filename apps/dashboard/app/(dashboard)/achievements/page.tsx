import { get } from '@/lib/api'
import { AchievementsClient } from './achievements-client'

export type AchievementRow = {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  points: number
  createdAt: string
}

async function getAchievements(): Promise<AchievementRow[]> {
  const res = await get<AchievementRow[]>('/v1/achievements').catch(() => ({ data: [] }))
  return res.data
}

export default async function AchievementsPage() {
  const achievements = await getAchievements()
  return <AchievementsClient initialAchievements={achievements} />
}
