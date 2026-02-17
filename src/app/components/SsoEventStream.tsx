"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Text, Flex, Badge, Box, Button } from "@radix-ui/themes";

type SsoEvent = {
  id: string;
  event: string;
  data: Record<string, unknown>;
  createdAt: string;
};

type EventResponse = {
  events: SsoEvent[];
  listMetadata: { after?: string } | null;
};

function formatEventType(event: string): string {
  return event
    .replace(/^connection\./, "connection ")
    .replace(/^authentication\./, "auth ")
    .replace(/\./g, " ")
    .replace(/_/g, " ");
}

function getEventBadgeColor(event: string): "green" | "blue" | "orange" | "red" | "gray" {
  if (event === "connection.activated" || event === "authentication.sso_succeeded") return "green";
  if (event === "connection.deactivated") return "orange";
  if (event === "connection.deleted" || event === "authentication.sso_failed") return "red";
  return "gray";
}

function formatEventSummary(event: string, data: Record<string, unknown>): string {
  if (event.startsWith("connection.")) {
    const name = (data?.name as string) ?? data?.domain ?? data?.id;
    return String(name ?? "—");
  }
  if (event.startsWith("authentication.sso_")) {
    const email = (data?.email ?? data?.user?.email) as string | undefined;
    const user = data?.user as Record<string, unknown> | undefined;
    const userEmail = user?.email as string | undefined;
    return email ?? userEmail ?? (data?.id as string) ?? "—";
  }
  return (data?.id as string) ?? "—";
}

export function SsoEventStream({ organizationId }: { organizationId: string }) {
  const [events, setEvents] = useState<SsoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedOnce = useRef(false);

  const fetchEvents = useCallback(
    async (cursor?: string | null) => {
      const isLoadMore = Boolean(cursor);
      if (isLoadMore) setLoadingMore(true);
      else if (!hasLoadedOnce.current) setLoading(true);
      try {
        const params = new URLSearchParams({
          organizationId,
          limit: "50",
        });
        if (cursor) params.set("after", cursor);
        const res = await fetch(`/api/admin/sso-events?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch events");
        const json: EventResponse = await res.json();
        const list = json.events ?? [];
        if (isLoadMore) {
          setEvents((prev) => [...prev, ...list]);
        } else {
          setEvents(list);
        }
        setAfter(json.listMetadata?.after ?? null);
        setError(null);
        hasLoadedOnce.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [organizationId]
  );

  useEffect(() => {
    fetchEvents(null);
    const interval = setInterval(() => fetchEvents(null), 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  if (loading && events.length === 0) {
    return (
      <Text size="3" color="gray">
        Loading SSO events…
      </Text>
    );
  }

  if (error && events.length === 0) {
    return (
      <Text size="3" color="red">
        {error}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between" mb="2" wrap="wrap" gap="2">
        <Text size="2" color="gray">
          WorkOS Events API · Auto-refresh every 10s · Last 7 days
        </Text>
        <Text size="2" color="gray">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </Text>
      </Flex>
      <Box
        style={{
          maxHeight: "420px",
          overflowY: "auto",
          border: "1px solid var(--gray-5)",
          borderRadius: "var(--radius-3)",
          backgroundColor: "var(--gray-1)",
        }}
      >
        {events.length === 0 ? (
          <Box p="4">
            <Text size="3" color="gray">
              No SSO events yet. Configure SSO in Settings → Enterprise Integrations and sign in via SSO to see events.
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="0">
            {events.map((ev) => (
              <Box
                key={ev.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--gray-4)",
                }}
              >
                <Flex align="center" gap="3" wrap="wrap">
                  <Badge color={getEventBadgeColor(ev.event)} size="1">
                    {formatEventType(ev.event)}
                  </Badge>
                  <Text size="2" style={{ flex: 1, minWidth: 120 }}>
                    {formatEventSummary(ev.event, ev.data)}
                  </Text>
                  <Text size="1" color="gray">
                    {new Date(ev.createdAt).toLocaleString()}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        )}
      </Box>
      {after && events.length > 0 && (
        <Flex justify="center" mt="2">
          <Button
            variant="soft"
            size="2"
            disabled={loadingMore}
            onClick={() => fetchEvents(after)}
          >
            {loadingMore ? "Loading…" : "Load more (Events API cursor)"}
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
