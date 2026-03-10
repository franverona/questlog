import { get, type PaginationMeta } from '@/lib/api'
import { RulesClient } from './rules-client'

export type RuleRow = {
  id: string
  achievementId: string
  condition: unknown
  createdAt: string
  achievementName: string
}

export type AchievementOption = {
  id: string
  name: string
}

async function getData(page: string, perPage: string) {
  const [rulesRes, achievementsRes] = await Promise.all([
    get<RuleRow[]>(`/v1/rules?page=${page}&perPage=${perPage}`).catch(() => ({
      data: [],
      meta: null,
    })),
    get<AchievementOption[]>('/v1/achievements?perPage=100').catch(() => ({
      data: [],
      meta: null,
    })),
  ])
  return { rules: rulesRes.data, meta: rulesRes.meta, achievements: achievementsRes.data }
}

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string }>
}) {
  const { page = '1', perPage = '20' } = await searchParams
  const { rules, meta, achievements } = await getData(page, perPage)
  return (
    <RulesClient
      initialRules={rules}
      meta={meta as PaginationMeta | null}
      achievements={achievements}
    />
  )
}
