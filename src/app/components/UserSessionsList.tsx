"use client";

import { useEffect, useState } from "react";
import { Flex, Text, Card, Badge, Separator, Button } from "@radix-ui/themes";
import { CalendarIcon, GlobeIcon, DesktopIcon, TrashIcon } from "@radix-ui/react-icons";

interface Session {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
  object: string;
}

interface SessionsData {
  sessions: Session[];
  metadata: {
    listMetadata: {
      before?: string;
      after?: string;
    };
  };
}

export function UserSessionsList() {
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/list-sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      setSessionsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const response = await fetch(`/api/revoke-session?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to revoke session");
      }
      
      // Refresh the sessions list after successful revocation
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <Flex direction="column" gap="3">
        <Text size="3" color="gray">
          Loading user sessions...
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" gap="3">
        <Text size="3" color="red">
          Error: {error}
        </Text>
      </Flex>
    );
  }

  if (!sessionsData || sessionsData.sessions.length === 0) {
    return (
      <Flex direction="column" gap="3">
        <Text size="3" color="gray">
          No active sessions found.
        </Text>
      </Flex>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getBrowserFromUserAgent = (userAgent?: string) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Other";
  };

  const getOSFromUserAgent = (userAgent?: string) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iOS")) return "iOS";
    return "Other";
  };

  return (
    <Flex direction="column" gap="4">
      <Text size="3" color="gray">
        Active user sessions retrieved via WorkOS userManagement.listSessions API
      </Text>
      
      <Text size="4" weight="bold">
        Sessions ({sessionsData.sessions.length})
      </Text>

      <Flex direction="column" gap="3">
        {sessionsData.sessions.map((session) => (
          <Card key={session.id} style={{ padding: "16px" }}>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <DesktopIcon />
                  <Text size="3" weight="bold">
                    Session {session.id.slice(-8)}
                  </Text>
                </Flex>
                <Flex align="center" gap="2">
                  <Badge color="green" variant="soft">
                    Active
                  </Badge>
                  <Button
                    size="1"
                    color="red"
                    variant="soft"
                    onClick={() => revokeSession(session.id)}
                    disabled={revokingSessionId === session.id}
                  >
                    {revokingSessionId === session.id ? (
                      "Revoking..."
                    ) : (
                      <>
                        <TrashIcon width="12" height="12" />
                        Revoke
                      </>
                    )}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CalendarIcon width="14" height="14" />
                  <Text size="2" color="gray">
                    Created: {formatDate(session.createdAt)}
                  </Text>
                </Flex>
                <Flex align="center" gap="2">
                  <CalendarIcon width="14" height="14" />
                  <Text size="2" color="gray">
                    Updated: {formatDate(session.updatedAt)}
                  </Text>
                </Flex>
                {session.ipAddress && (
                  <Flex align="center" gap="2">
                    <GlobeIcon width="14" height="14" />
                    <Text size="2" color="gray">
                      IP: {session.ipAddress}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {session.userAgent && (
                <Flex direction="column" gap="1">
                  <Text size="2" weight="medium">
                    Device Info:
                  </Text>
                  <Flex gap="2">
                    <Badge color="blue" variant="soft">
                      {getBrowserFromUserAgent(session.userAgent)}
                    </Badge>
                    <Badge color="purple" variant="soft">
                      {getOSFromUserAgent(session.userAgent)}
                    </Badge>
                  </Flex>
                  <Text size="1" color="gray" style={{ maxWidth: "100%", wordBreak: "break-all" }}>
                    {session.userAgent}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>

      <Separator />

      <Flex direction="column" gap="3">
        <Text size="4" weight="bold">
          Raw API Response
        </Text>
        <Text size="2" color="gray">
          Complete response from WorkOS userManagement.listSessions()
        </Text>
        <pre
          style={{
            backgroundColor: "var(--gray-2)",
            padding: "16px",
            borderRadius: "var(--radius-3)",
            border: "1px solid var(--gray-5)",
            overflow: "auto",
            fontSize: "11px",
            lineHeight: "1.4",
            maxHeight: "400px",
          }}
        >
          {JSON.stringify(sessionsData, null, 2)}
        </pre>
      </Flex>
    </Flex>
  );
}