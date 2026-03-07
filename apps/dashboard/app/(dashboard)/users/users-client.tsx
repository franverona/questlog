"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Achievement = {
  id: string;
  name: string;
  points: number;
  iconUrl: string | null;
  description: string | null;
};

type UserEvent = {
  id: string;
  eventName: string;
  metadata: unknown;
  createdAt: string;
};

type UserData = {
  achievements: Achievement[];
  events: UserEvent[];
};

export function UsersClient() {
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setUserData(null);

    try {
      const [achRes, eventsRes] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(query)}/achievements`),
        fetch(`/api/users/${encodeURIComponent(query)}/events`),
      ]);

      if (!achRes.ok || !eventsRes.ok) {
        throw new Error("Failed to load user data");
      }

      const [achData, eventsData] = await Promise.all([
        achRes.json(),
        eventsRes.json(),
      ]);

      setUserId(query);
      setUserData({
        achievements: achData.data ?? [],
        events: eventsData.data ?? [],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Search by external user ID</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="user_alice"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {userData && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Results for: <code>{userId}</code></h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Achievements ({userData.achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userData.achievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No achievements unlocked yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userData.achievements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-muted text-sm"
                    >
                      {a.iconUrl && <Image src={a.iconUrl} alt="" width={16} height={16} />}
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="secondary" className="text-xs">{a.points} pts</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recent Events (last {userData.events.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userData.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded</p>
              ) : (
                <div className="divide-y text-sm">
                  {userData.events.map((e) => (
                    <div key={e.id} className="py-2 flex items-center justify-between gap-4">
                      <code className="font-mono">{e.eventName}</code>
                      <span className="text-muted-foreground text-xs">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
