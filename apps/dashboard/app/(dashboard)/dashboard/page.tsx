import { get } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatsData = {
  totalEvents: number;
  totalAchievements: number;
  totalActiveUsers: number;
};

async function getStats(): Promise<StatsData> {
  const [achievementsRes, leaderboardRes] = await Promise.all([
    get<{ id: string }[]>("/v1/achievements").catch(() => ({ data: [] })),
    get<{ external_user_id: string; total_points: number }[]>("/v1/leaderboard").catch(() => ({
      data: [],
    })),
  ]);

  return {
    totalEvents: 0, // Tracked separately; API doesn't expose a count endpoint
    totalAchievements: achievementsRes.data.length,
    totalActiveUsers: leaderboardRes.data.length,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">Your gamification platform at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Achievements" value={stats.totalAchievements} />
        <StatCard title="Active Users" value={stats.totalActiveUsers} description="Users with points" />
        <StatCard title="Leaderboard Size" value={stats.totalActiveUsers} description="Ranked users" />
      </div>
    </div>
  );
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
  );
}
