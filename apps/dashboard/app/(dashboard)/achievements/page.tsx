import { get, type PaginationMeta } from '@/lib/api'
import { AchievementsClient } from './achievements-client'

export type AchievementRow = {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  points: number
  createdAt: string
}

async function getAchievements(page: string, perPage: string) {
  const res = await get<AchievementRow[]>(`/v1/achievements?page=${page}&perPage=${perPage}`).catch(
    () => ({ data: [], meta: null }),
  )
  return res
}

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>
}) {
  const { page = '1', perPage = '20' } = await searchParams
  const { data, meta } = await getAchievements(page, perPage)
  return <AchievementsClient initialAchievements={data} meta={meta as PaginationMeta | null} />
}
