import { get } from '@/lib/api'
import type { LeaderboardEntry } from '@questlog/types'

export default async function LeaderboardPage() {
  const res = await get<LeaderboardEntry[]>('/v1/leaderboard')
  const entries = res.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top users by total points</p>
      </div>
      <div className="border rounded-lg divide-y">
        {entries.map((entry) => (
          <div key={entry.external_user_id} className="flex items-center gap-4 px-4 py-3">
            <span className="text-2xl font-bold w-8 text-muted-foreground">#{entry.rank}</span>
            <code className="flex-1">{entry.external_user_id}</code>
            <span className="font-semibold">{entry.total_points} pts</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No data yet</p>
        )}
      </div>
    </div>
  )
}
