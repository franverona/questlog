import { get } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type StatsData = {
  totalEvents: number;
  totalAchievements: number;
  totalActiveUsers: number;
};

async function getStats(): Promise<StatsData> {
  const response = await get<{ total_events: number; total_achievements: number; total_users_with_achievements: number }>('/v1/stats')

  return {
    totalEvents: response.data.total_events,
    totalAchievements: response.data.total_achievements,
    totalActiveUsers: response.data.total_users_with_achievements,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">Your gamification platform at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Achievements" value={stats.totalAchievements} />
        <StatCard title="Total Events" value={stats.totalEvents} />
        <StatCard title="Active Users" value={stats.totalActiveUsers} description="Users with points" />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
