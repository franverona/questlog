import { get } from "@/lib/api";
import { RulesClient } from "./rules-client";

export type RuleRow = {
  id: string;
  achievementId: string;
  condition: unknown;
  createdAt: string;
  achievementName: string;
};

export type AchievementOption = {
  id: string;
  name: string;
};

async function getData() {
  const [rulesRes, achievementsRes] = await Promise.all([
    get<RuleRow[]>("/v1/rules").catch(() => ({ data: [] })),
    get<AchievementOption[]>("/v1/achievements").catch(() => ({ data: [] })),
  ]);
  return { rules: rulesRes.data, achievements: achievementsRes.data };
}

export default async function RulesPage() {
  const { rules, achievements } = await getData();
  return <RulesClient initialRules={rules} achievements={achievements} />;
}
