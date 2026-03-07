"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Condition } from "@questlog/types";

type ConditionType = "event_count" | "streak" | "combination";

interface Props {
  condition: Condition;
  onChange: (c: Condition) => void;
  depth?: number;
}

function defaultCondition(type: ConditionType): Condition {
  switch (type) {
    case "event_count":
      return { type: "event_count", event_name: "", threshold: 1 };
    case "streak":
      return { type: "streak", event_name: "", days: 7 };
    case "combination":
      return {
        type: "combination",
        operator: "AND",
        conditions: [{ type: "event_count", event_name: "", threshold: 1 }],
      };
  }
}

export function ConditionBuilder({ condition, onChange, depth = 0 }: Props) {
  const indent = depth * 16;

  return (
    <div
      className="border rounded-md p-3 space-y-3 bg-card"
      style={{ marginLeft: indent > 0 ? indent : undefined }}
    >
      <div className="space-y-1">
        <Label>Condition type</Label>
        <Select
          value={condition.type}
          onValueChange={(val) => onChange(defaultCondition(val as ConditionType))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event_count">Event Count</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
            <SelectItem value="combination">Combination (AND / OR)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {condition.type === "event_count" && (
        <>
          <div className="space-y-1">
            <Label>Event name</Label>
            <Input
              value={condition.event_name}
              onChange={(e) => onChange({ ...condition, event_name: e.target.value })}
              placeholder="e.g. user.login"
            />
          </div>
          <div className="space-y-1">
            <Label>Threshold</Label>
            <Input
              type="number"
              min={1}
              value={condition.threshold}
              onChange={(e) =>
                onChange({ ...condition, threshold: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>
        </>
      )}

      {condition.type === "streak" && (
        <>
          <div className="space-y-1">
            <Label>Event name</Label>
            <Input
              value={condition.event_name}
              onChange={(e) => onChange({ ...condition, event_name: e.target.value })}
              placeholder="e.g. user.login"
            />
          </div>
          <div className="space-y-1">
            <Label>Consecutive days</Label>
            <Input
              type="number"
              min={1}
              value={condition.days}
              onChange={(e) =>
                onChange({ ...condition, days: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>
        </>
      )}

      {condition.type === "combination" && (
        <>
          <div className="space-y-1">
            <Label>Operator</Label>
            <Select
              value={condition.operator}
              onValueChange={(val) =>
                onChange({ ...condition, operator: val as "AND" | "OR" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND (all must match)</SelectItem>
                <SelectItem value="OR">OR (any must match)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sub-conditions</Label>
            {condition.conditions.map((sub, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <ConditionBuilder
                    condition={sub}
                    depth={depth + 1}
                    onChange={(updated) => {
                      const newConditions = [...condition.conditions];
                      newConditions[i] = updated;
                      onChange({ ...condition, conditions: newConditions });
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  disabled={condition.conditions.length <= 1}
                  onClick={() => {
                    const newConditions = condition.conditions.filter((_, idx) => idx !== i);
                    onChange({ ...condition, conditions: newConditions });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...condition,
                  conditions: [
                    ...condition.conditions,
                    { type: "event_count", event_name: "", threshold: 1 },
                  ],
                })
              }
            >
              + Add sub-condition
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
