"use client";

import { useEffect, useState } from "react";
import { Flex, Text, Card, Badge, Button, Separator } from "@radix-ui/themes";
import { 
  PersonIcon, 
  TrashIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  CalendarIcon,
  GlobeIcon,
  DesktopIcon
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

export function TeamUserSessions({ currentUserId, currentSessionId }: TeamUserSessionsProps = {}) {
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
        .sort((a, b) => {
          // Sort by name if available, otherwise by email
          const aName = a.user?.firstName && a.user?.lastName 
            ? `${a.user.firstName} ${a.user.lastName}` 
            : a.user?.email || a.userId;
          const bName = b.user?.firstName && b.user?.lastName 
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
    setUsers(prev => prev.map(user => 
      user.userId === userId 
        ? { ...user, sessionsLoading: true } 
        : user
    ));

    try {
      const response = await fetch(`/api/list-user-sessions?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user sessions");
      }
      const data = await response.json();
      
      setUsers(prev => prev.map(user => 
        user.userId === userId 
          ? { ...user, sessions: data.sessions, sessionsLoading: false, sessionsExpanded: true }
          : user
      ));
    } catch (err) {
      setUsers(prev => prev.map(user => 
        user.userId === userId 
          ? { ...user, sessionsLoading: false }
          : user
      ));
      setError("Failed to fetch user sessions");
    }
  };

  const revokeAllUserSessions = async (userId: string) => {
    setRevokingUserId(userId);
    try {
      const response = await fetch(`/api/revoke-all-user-sessions?userId=${userId}`, {
        method: "DELETE",
      });
      
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
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setRevokingUserId(null);
    }
  };

  const toggleUserSessions = async (userId: string) => {
    const user = users.find(u => u.userId === userId);
    if (!user) return;

    if (user.sessionsExpanded) {
      setUsers(prev => prev.map(u => 
        u.userId === userId 
          ? { ...u, sessionsExpanded: false }
          : u
      ));
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
    return user.user?.email || 'Unknown User';
  };

  const getUserSubtitle = (user: User) => {
    const role = typeof user.role === 'object' ? user.role?.slug || 'Unknown Role' : user.role;
    
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
      <Text size="3" color="gray">
        Manage sessions for all team members. Admins can view and revoke sessions for any user.
      </Text>
      
      <Text size="4" weight="bold">
        Team Member Sessions ({users.length} users)
      </Text>

      <Flex direction="column" gap="3">
        {users.map((user) => (
          <Card key={user.userId} style={{ padding: "16px" }}>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <PersonIcon />
                  <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">
                      {getUserDisplayName(user)}
                      {user.userId === currentUserId && (
                        <Badge color="blue" variant="soft" size="1" style={{ marginLeft: "8px" }}>
                          You
                        </Badge>
                      )}
                    </Text>
                    <Text size="2" color="gray">
                      {getUserSubtitle(user)}
                    </Text>
                  </Flex>
                </Flex>
                <Flex align="center" gap="2">
                  <Badge 
                    color={user.status === "active" ? "green" : "gray"} 
                    variant="soft"
                  >
                    {user.status}
                  </Badge>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => toggleUserSessions(user.userId)}
                    disabled={user.sessionsLoading}
                  >
                    {user.sessionsLoading ? (
                      "Loading..."
                    ) : (
                      <>
                        {user.sessionsExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        {user.sessionsExpanded ? "Hide" : "Show"} Sessions
                      </>
                    )}
                  </Button>
                  {user.sessions.length > 0 && (
                    <Button
                      size="1"
                      color="red"
                      variant="soft"
                      onClick={() => revokeAllUserSessions(user.userId)}
                      disabled={revokingUserId === user.userId}
                    >
                      {revokingUserId === user.userId ? (
                        "Revoking..."
                      ) : (
                        <>
                          <TrashIcon width="12" height="12" />
                          Revoke All Sessions
                        </>
                      )}
                    </Button>
                  )}
                </Flex>
              </Flex>

              {user.sessionsExpanded && (
                <Flex direction="column" gap="2" style={{ marginTop: "12px" }}>
                  <Separator />
                  {user.sessions.length === 0 ? (
                    <Text size="2" color="gray" style={{ padding: "8px 0" }}>
                      No active sessions
                    </Text>
                  ) : (
                    <Flex direction="column" gap="2">
                      <Text size="2" weight="medium" color="gray">
                        Active Sessions ({user.sessions.length})
                      </Text>
                      {user.sessions.map((session) => (
                        <Card key={session.id} style={{ padding: "12px", backgroundColor: "var(--gray-1)" }}>
                          <Flex direction="column" gap="2">
                            <Flex justify="between" align="center">
                              <Flex align="center" gap="2">
                                <DesktopIcon width="14" height="14" />
                                <Text size="2" weight="medium">
                                  {getSessionDisplayName(session)}
                                </Text>
                              </Flex>
                              <Badge color="green" variant="soft" size="1">
                                Active
                              </Badge>
                            </Flex>
                            
                            <Flex direction="column" gap="1">
                              <Flex align="center" gap="2">
                                <CalendarIcon width="12" height="12" />
                                <Text size="1" color="gray">
                                  Created: {formatDate(session.createdAt)}
                                </Text>
                              </Flex>
                              {session.ipAddress && (
                                <Flex align="center" gap="2">
                                  <GlobeIcon width="12" height="12" />
                                  <Text size="1" color="gray">
                                    IP: {session.ipAddress}
                                  </Text>
                                </Flex>
                              )}
                              {session.userAgent && (
                                <Flex gap="1">
                                  <Badge color="blue" variant="soft" size="1">
                                    {getBrowserFromUserAgent(session.userAgent)}
                                  </Badge>
                                  <Badge color="purple" variant="soft" size="1">
                                    {getOSFromUserAgent(session.userAgent)}
                                  </Badge>
                                </Flex>
                              )}
                            </Flex>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  )}
                </Flex>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}