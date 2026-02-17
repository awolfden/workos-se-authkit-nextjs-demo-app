"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Text, Flex, Badge, Box, Button } from "@radix-ui/themes";

type DsyncEvent = {
  id: string;
  event: string;
  data: Record<string, unknown>;
  createdAt: string;
};

/** previousAttributes is present on dsync.user.updated and dsync.group.updated */
function getPreviousAttributes(data: Record<string, unknown>): Record<string, unknown> | null {
  const prev = data?.previousAttributes ?? data?.previous_attributes;
  if (prev && typeof prev === "object" && !Array.isArray(prev)) return prev as Record<string, unknown>;
  return null;
}

function EventDelta({ ev }: { ev: DsyncEvent }) {
  const { event: eventType, data } = ev;
  const prev = getPreviousAttributes(data);
  const isUser = eventType.startsWith("dsync.user.");
  const isGroup = eventType.startsWith("dsync.group.");

  if (eventType === "dsync.user.created" || eventType === "dsync.group.created") {
    const label = isUser ? "New user" : "New group";
    const name = isUser
      ? [data.firstName, data.lastName].filter(Boolean).join(" ") || (data.email as string) || data.id
      : (data.name as string) || data.id;
    return (
      <Text size="1" color="gray" style={{ marginTop: 4 }}>
        {label}: {String(name)}
      </Text>
    );
  }

  if (eventType === "dsync.user.deleted" || eventType === "dsync.group.deleted") {
    const name = isUser
      ? [data.firstName, data.lastName].filter(Boolean).join(" ") || (data.email as string) || data.id
      : (data.name as string) || data.id;
    return (
      <Text size="1" color="gray" style={{ marginTop: 4 }}>
        Removed: {String(name)}
      </Text>
    );
  }

  if ((eventType === "dsync.user.updated" || eventType === "dsync.group.updated") && prev) {
    const camelToSnake: Record<string, string> = { firstName: "first_name", lastName: "last_name", jobTitle: "job_title", idpId: "idp_id" };
    const snakeToCamel: Record<string, string> = { first_name: "firstName", last_name: "lastName", job_title: "jobTitle", idp_id: "idpId" };
    const skipKeys = new Set(["previousAttributes", "previous_attributes", "rawAttributes", "raw_attributes", "customAttributes", "custom_attributes"]);
    // Use keys that are actually in previous_attributes so "Before" always has content when the API sends it
    const keysFromPrev = Object.keys(prev).filter((k) => !skipKeys.has(k));
    if (keysFromPrev.length === 0) return null;

    const getVal = (obj: Record<string, unknown>, key: string): unknown =>
      obj[key] ?? obj[camelToSnake[key]] ?? obj[snakeToCamel[key]];
    const formatVal = (v: unknown): string =>
      v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v);

    return (
      <Box style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--gray-4)" }}>
        <Flex gap="4" wrap="wrap">
          <Box>
            <Text size="1" weight="bold" color="gray">Before</Text>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11 }}>
              {keysFromPrev.map((k) => {
                const v = getVal(prev, k);
                if (v === undefined) return null;
                return <li key={k}>{k}: {formatVal(v)}</li>;
              })}
            </ul>
          </Box>
          <Box>
            <Text size="1" weight="bold" color="gray">After</Text>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11 }}>
              {keysFromPrev.map((k) => {
                const curVal = getVal(data as Record<string, unknown>, k);
                return <li key={k}>{k}: {formatVal(curVal !== undefined ? curVal : prev[k])}</li>;
              })}
            </ul>
          </Box>
        </Flex>
      </Box>
    );
  }

  if ((eventType === "dsync.group.user_added" || eventType === "dsync.group.user_removed") && data.user && data.group) {
    const user = data.user as Record<string, unknown>;
    const group = data.group as Record<string, unknown>;
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || (user.email as string) || user.id;
    const groupName = (group.name as string) || group.id;
    return (
      <Text size="1" color="gray" style={{ marginTop: 4 }}>
        {eventType === "dsync.group.user_added" ? "Added" : "Removed"} user {String(userName)} {eventType === "dsync.group.user_added" ? "to" : "from"} group {String(groupName)}
      </Text>
    );
  }

  return null;
}

type EventResponse = {
  events: DsyncEvent[];
  listMetadata: { after?: string } | null;
};

function formatEventType(event: string): string {
  return event
    .replace(/^dsync\./, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ");
}

function getEventBadgeColor(event: string): "green" | "blue" | "orange" | "red" | "gray" | "purple" {
  if (event.includes(".created") || event === "dsync.activated") return "green";
  if (event.includes(".updated") || event.includes(".user_added")) return "blue";
  if (event.includes(".deleted") || event.includes(".user_removed") || event === "dsync.deleted") return "red";
  if (event.includes(".deactivated")) return "orange";
  return "gray";
}

function formatEventSummary(event: string, data: Record<string, unknown>): string {
  const user = data?.user as Record<string, unknown> | undefined;
  const group = data?.group as Record<string, unknown> | undefined;
  const email = (data?.email ?? user?.email) as string | undefined;
  const name = (data?.first_name || data?.last_name)
    ? `${(data?.first_name as string) || ""} ${(data?.last_name as string) || ""}`.trim()
    : (user?.email as string) || email;
  const groupName = (group?.name ?? data?.name) as string | undefined;

  if (event === "dsync.user.created" || event === "dsync.user.updated" || event === "dsync.user.deleted") {
    return name || email || (data?.id as string) || "—";
  }
  if (event === "dsync.group.created" || event === "dsync.group.updated" || event === "dsync.group.deleted") {
    return groupName || (data?.id as string) || "—";
  }
  if (event === "dsync.group.user_added" || event === "dsync.group.user_removed") {
    const u = name || email || (user?.id as string);
    const g = groupName || (group?.id as string);
    return u && g ? `${u} ↔ ${g}` : groupName || (data?.id as string) || "—";
  }
  if (event === "dsync.activated" || event === "dsync.deleted") {
    return (data?.domain as string) || (data?.id as string) || "—";
  }
  return (data?.id as string) || "—";
}

export function DsyncEventStream({ organizationId }: { organizationId: string }) {
  const [events, setEvents] = useState<DsyncEvent[]>([]);
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
        const res = await fetch(`/api/admin/dsync-events?${params.toString()}`);
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
        Loading directory sync events…
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
              No directory sync events yet. Connect a directory in the Admin Portal and make changes (e.g. add/update users or groups) to see events here.
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
                <EventDelta ev={ev} />
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
