"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConditionBuilder } from "./condition-builder";
import type { RuleRow, AchievementOption } from "./page";
import type { Condition } from "@questlog/types";

type Props = {
  initialRules: RuleRow[];
  achievements: AchievementOption[];
};

function conditionSummary(cond: unknown): string {
  const c = cond as Condition;
  if (c.type === "event_count")
    return `${c.event_name} ≥ ${c.threshold}×`;
  if (c.type === "streak")
    return `${c.event_name} streak ≥ ${c.days} days`;
  if (c.type === "combination")
    return `${c.operator}(${c.conditions.map(conditionSummary).join(", ")})`;
  return "Unknown";
}

// Group rules by achievement
function groupByAchievement(rules: RuleRow[]) {
  const map = new Map<string, { name: string; rules: RuleRow[] }>();
  for (const rule of rules) {
    const existing = map.get(rule.achievementId);
    if (existing) {
      existing.rules.push(rule);
    } else {
      map.set(rule.achievementId, { name: rule.achievementName, rules: [rule] });
    }
  }
  return [...map.entries()].map(([id, v]) => ({ id, ...v }));
}

const DEFAULT_CONDITION: Condition = {
  type: "event_count",
  event_name: "",
  threshold: 1,
};

export function RulesClient({ initialRules, achievements }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [achievementId, setAchievementId] = useState("");
  const [condition, setCondition] = useState<Condition>(DEFAULT_CONDITION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const grouped = groupByAchievement(initialRules);

  function openCreate() {
    setEditing(null);
    setAchievementId(achievements[0]?.id ?? "");
    setCondition(DEFAULT_CONDITION);
    setError("");
    setOpen(true);
  }

  function openEdit(rule: RuleRow) {
    setEditing(rule);
    setAchievementId(rule.achievementId);
    setCondition(rule.condition as Condition);
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!achievementId) {
      setError("Please select an achievement");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const url = editing ? `/api/rules/${editing.id}` : "/api/rules";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId, condition }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message ?? d.message ?? "Request failed");
      }

      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rules</h1>
          <p className="text-muted-foreground mt-1">Grouped by achievement</p>
        </div>
        <Button onClick={openCreate}>New Rule</Button>
      </div>

      {grouped.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No rules yet. Create your first rule!
        </p>
      )}

      {grouped.map((group) => (
        <div key={group.id} className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 font-semibold">{group.name}</div>
          <div className="divide-y">
            {group.rules.map((rule) => (
              <div key={rule.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <code className="text-sm font-mono">{conditionSummary(rule.condition)}</code>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rule)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(rule.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rule" : "New Rule"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Achievement</Label>
              <Select value={achievementId} onValueChange={setAchievementId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select achievement..." />
                </SelectTrigger>
                <SelectContent>
                  {achievements.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <ConditionBuilder condition={condition} onChange={setCondition} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
