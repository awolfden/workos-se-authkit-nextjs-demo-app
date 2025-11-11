"use client";

import { useEffect, useState } from "react";
import {
  Flex,
  Text,
  Card,
  Badge,
  Button,
  Separator,
  Table,
  IconButton,
  Code,
} from "@radix-ui/themes";
import {
  PersonIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  GlobeIcon,
  DesktopIcon,
  CopyIcon,
} from "@radix-ui/react-icons";

interface User {
  id: string;
  userId: string;
  organizationId: string;
  status: string;
  role: string | { slug: string };
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface Session {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string;
  userAgent?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface UserWithSessions extends User {
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsExpanded: boolean;
}

interface TeamUserSessionsProps {
  currentUserId?: string;
  currentSessionId?: string;
}

export function TeamUserSessions({
  currentUserId,
  currentSessionId,
}: TeamUserSessionsProps = {}) {
  const [users, setUsers] = useState<UserWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/list-organization-users");
      if (!response.ok) {
        throw new Error("Failed to fetch organization users");
      }
      const data = await response.json();
      const usersWithSessions: UserWithSessions[] = data.users
        .map((user: User) => ({
          ...user,
          sessions: [],
          sessionsLoading: false,
          sessionsExpanded: false,
        }))
        .sort((a: UserWithSessions, b: UserWithSessions) => {
          // Sort by name if available, otherwise by email
          const aName =
            a.user?.firstName && a.user?.lastName
              ? `${a.user.firstName} ${a.user.lastName}`
              : a.user?.email || a.userId;
          const bName =
            b.user?.firstName && b.user?.lastName
              ? `${b.user.firstName} ${b.user.lastName}`
              : b.user?.email || b.userId;
          return aName.localeCompare(bName);
        });
      setUsers(usersWithSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSessions = async (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.userId === userId ? { ...user, sessionsLoading: true } : user
      )
    );

    try {
      const response = await fetch(`/api/list-user-sessions?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user sessions");
      }
      const data = await response.json();

      setUsers((prev) =>
        prev.map((user) =>
          user.userId === userId
            ? {
                ...user,
                sessions: data.sessions,
                sessionsLoading: false,
                sessionsExpanded: true,
              }
            : user
        )
      );
    } catch (err) {
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === userId ? { ...user, sessionsLoading: false } : user
        )
      );
      setError("Failed to fetch user sessions");
    }
  };

  const revokeAllUserSessions = async (userId: string) => {
    setRevokingUserId(userId);
    try {
      const response = await fetch(
        `/api/revoke-all-user-sessions?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to revoke all user sessions");
      }

      const data = await response.json();

      // If the API indicates the user should be logged out
      if (data.shouldLogout) {
        // Force a full page reload to clear any cached auth state
        window.location.href = "/api/auth/logout";
        return;
      }

      // Refresh sessions for this user
      await fetchUserSessions(userId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to revoke sessions"
      );
    } finally {
      setRevokingUserId(null);
    }
  };

  const toggleUserSessions = async (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    if (!user) return;

    if (user.sessionsExpanded) {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, sessionsExpanded: false } : u
        )
      );
    } else {
      await fetchUserSessions(userId);
    }
  };

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

  const getUserDisplayName = (user: User) => {
    // Always show name if available, otherwise show email
    if (user.user?.firstName && user.user?.lastName) {
      return `${user.user.firstName} ${user.user.lastName}`;
    }
    // Should always have email from organization membership data
    return user.user?.email || "Unknown User";
  };

  const getUserSubtitle = (user: User) => {
    const role =
      typeof user.role === "object"
        ? user.role?.slug || "Unknown Role"
        : user.role;

    // If we have a name, show email + role in subtitle
    // If we only have email, just show role in subtitle
    if (user.user?.firstName && user.user?.lastName && user.user?.email) {
      return `${user.user.email} • ${role}`;
    }

    // If we're showing email as the display name, just show role
    return role;
  };

  const getSessionDisplayName = (session: Session) => {
    if (session.user?.firstName && session.user?.lastName) {
      return `${session.user.firstName} ${session.user.lastName}`;
    }
    return session.user?.email || `Session ${session.id.slice(-8)}`;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Flex direction="column" gap="3">
        <Text size="3" color="gray">
          Loading team users...
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

  if (users.length === 0) {
    return (
      <Flex direction="column" gap="3">
        <Text size="3" color="gray">
          No team members found.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Text size="2" weight="regular" color="gray">
        ({users.length} users)
      </Text>

      <Flex direction="column" gap="2">
        <Table.Root
          variant="surface"
          size="1"
          style={{ fontSize: "11px", lineHeight: 1.2 }}
        >
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Email/Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Sessions</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ width: "120px" }}>
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {users.map((user) => {
              const displayName = getUserDisplayName(user);
              const subtitle = getUserSubtitle(user);
              return (
                <>
                  <Table.Row key={user.userId}>
                    <Table.RowHeaderCell style={{ whiteSpace: "nowrap" }}>
                      <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                        <PersonIcon width="14" height="14" />
                        <Flex
                          direction="row"
                          gap="2"
                          align="center"
                          style={{ minWidth: 0 }}
                        >
                          <Text
                            size="1"
                            weight="bold"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "220px",
                            }}
                          >
                            {displayName}
                          </Text>
                          {user.userId === currentUserId && (
                            <Badge color="blue" variant="soft" size="1">
                              You
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell style={{ whiteSpace: "nowrap" }}>
                      <Text
                        size="1"
                        color="gray"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "260px",
                        }}
                      >
                        {subtitle}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={user.status === "active" ? "green" : "gray"}
                        variant="soft"
                        size="1"
                      >
                        {user.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="1">{user.sessions.length}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2" align="center">
                        <IconButton
                          size="1"
                          variant="soft"
                          onClick={() => toggleUserSessions(user.userId)}
                          disabled={user.sessionsLoading}
                          title={
                            user.sessionsExpanded
                              ? "Hide sessions"
                              : "Show sessions"
                          }
                          aria-label={
                            user.sessionsExpanded
                              ? "Hide sessions"
                              : "Show sessions"
                          }
                        >
                          {user.sessionsExpanded ? (
                            <ChevronDownIcon />
                          ) : (
                            <ChevronRightIcon />
                          )}
                        </IconButton>
                        {user.sessions.length > 0 && (
                          <IconButton
                            size="1"
                            color="red"
                            variant="soft"
                            onClick={() => revokeAllUserSessions(user.userId)}
                            disabled={revokingUserId === user.userId}
                            title="Revoke all sessions"
                            aria-label="Revoke all sessions"
                          >
                            <TrashIcon width="12" height="12" />
                          </IconButton>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>

                  {user.sessionsExpanded && (
                    <Table.Row key={`${user.userId}-details`}>
                      <Table.Cell colSpan={5} style={{ padding: 0 }}>
                        {user.sessions.length === 0 ? (
                          <Text
                            size="1"
                            color="gray"
                            style={{
                              padding: "6px 12px",
                              marginLeft: "20px",
                              borderLeft: "2px solid var(--gray-6)",
                              display: "block",
                            }}
                          >
                            No active sessions
                          </Text>
                        ) : (
                          <div
                            style={{
                              padding: "6px 8px",
                              marginLeft: "20px",
                              borderLeft: "2px solid var(--gray-6)",
                              backgroundColor: "var(--gray-1)",
                            }}
                          >
                            <Table.Root
                              variant="ghost"
                              size="1"
                              style={{ fontSize: "11px", lineHeight: 1.2 }}
                            >
                              <Table.Body>
                                {user.sessions.map((session) => (
                                  <Table.Row key={session.id}>
                                    <Table.RowHeaderCell>
                                      <Flex align="center" gap="2">
                                        <DesktopIcon width="12" height="12" />
                                        <Flex align="center" gap="1">
                                          <TruncatedId
                                            id={session.id}
                                            max={35}
                                          />
                                        </Flex>
                                      </Flex>
                                    </Table.RowHeaderCell>
                                    <Table.Cell>
                                      <Text size="1" color="gray">
                                        {formatDate(session.createdAt)}
                                      </Text>
                                    </Table.Cell>
                                    {/* <Table.Cell>
                                      <Text size="1" color="gray">
                                        {session.ipAddress || "-"}
                                      </Text>
                                    </Table.Cell> */}
                                    <Table.Cell>
                                      {session.userAgent ? (
                                        <Flex gap="1">
                                          <Badge
                                            color="blue"
                                            variant="soft"
                                            size="1"
                                          >
                                            {getBrowserFromUserAgent(
                                              session.userAgent
                                            )}
                                          </Badge>
                                          <Badge
                                            color="purple"
                                            variant="soft"
                                            size="1"
                                          >
                                            {getOSFromUserAgent(
                                              session.userAgent
                                            )}
                                          </Badge>
                                        </Flex>
                                      ) : (
                                        <Text size="1" color="gray">
                                          -
                                        </Text>
                                      )}
                                    </Table.Cell>
                                    <Table.Cell>
                                      <Badge
                                        color="green"
                                        variant="soft"
                                        size="1"
                                      >
                                        Active
                                      </Badge>
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </div>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Flex>
  );
}

function TruncatedId({ id, max = 8 }: { id: string; max?: number }) {
  const display = id.length > max ? `…${id.slice(-max)}` : id;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
    } catch (e) {
      // no-op
    }
  };
  return (
    <Flex align="center" gap="1">
      <Code size="1" title={id} style={{ cursor: "text", userSelect: "text" }}>
        {display}
      </Code>
      <IconButton
        size="1"
        variant="soft"
        title="Copy ID"
        aria-label="Copy ID"
        onClick={copy}
      >
        <CopyIcon width="12" height="12" />
      </IconButton>
    </Flex>
  );
}
