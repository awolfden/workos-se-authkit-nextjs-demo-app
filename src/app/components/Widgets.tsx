"use client";

import {
  UsersManagement,
  UserProfile,
  UserSecurity,
  UserSessions,
  WorkOsWidgets,
  ApiKeys,
} from "@workos-inc/widgets";
import { Card, Text, Flex, Box } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Import the client component with dynamic import
const OrganizationSwitcherClient = dynamic(
  () => import("./OrganizationSwitcher"),
  { ssr: false }
);

export function UserTable({ token }: { token: string }) {
  return (
    <WorkOsWidgets>
      <UsersManagement authToken={token} />
    </WorkOsWidgets>
  );
}

export function TeamManagementWidget({
  token,
  organizationId,
}: {
  token: string;
  organizationId: string;
}) {
  const [isDirectoryManaged, setIsDirectoryManaged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDirectoryStatus = async () => {
      try {
        const response = await fetch(
          `/api/admin/list-directories?organizationId=${organizationId}`
        );
        const data = await response.json();
        setIsDirectoryManaged(data.dsyncEnabled);
      } catch (error) {
        console.error("Error checking directory status:", error);
        setIsDirectoryManaged(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkDirectoryStatus();
  }, [organizationId]);

  if (isLoading) {
    return (
      <Flex direction="column" gap="4">
        <Card size="2">
          <Flex align="center" gap="2" p="3">
            <InfoCircledIcon />
            <Text size="2" color="gray">
              Checking directory sync status...
            </Text>
          </Flex>
        </Card>
        <WorkOsWidgets>
          <UsersManagement authToken={token} />
        </WorkOsWidgets>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {isDirectoryManaged && (
        <Card
          size="2"
          style={{
            backgroundColor: "var(--accent-2)",
            border: "1px solid var(--accent-6)",
          }}
        >
          <Flex align="center" gap="2" p="3">
            <InfoCircledIcon style={{ color: "var(--accent-11)" }} />
            <Text
              size="2"
              style={{ color: "var(--accent-11)" }}
              weight="medium"
            >
              This team is managed by the IT system directory
            </Text>
          </Flex>
        </Card>
      )}
      <Box
        style={{
          opacity: isDirectoryManaged ? 0.5 : 1,
          pointerEvents: isDirectoryManaged ? "none" : "auto",
        }}
      >
        <WorkOsWidgets>
          <UsersManagement authToken={token} />
        </WorkOsWidgets>
      </Box>
    </Flex>
  );
}

export function UserProfileWidget({ token }: { token: string }) {
  return (
    <WorkOsWidgets>
      <UserProfile authToken={token} />
    </WorkOsWidgets>
  );
}

export function UserSecurityWidget({ token }: { token: string }) {
  return (
    <WorkOsWidgets>
      <UserSecurity authToken={token} />
    </WorkOsWidgets>
  );
}

export function UserSessionsWidget({
  sessionId,
  token,
}: {
  sessionId: string;
  token: string;
}) {
  return (
    <WorkOsWidgets>
      <UserSessions authToken={token} currentSessionId={sessionId} />
    </WorkOsWidgets>
  );
}

export function OrganizationSwitcherWidget({
  authToken,
}: {
  authToken: string;
}) {
  return <OrganizationSwitcherClient authToken={authToken} />;
}

export function ApiKeysWidget({ token }: { token: string }) {
  return (
    <WorkOsWidgets>
      <ApiKeys authToken={token} />
    </WorkOsWidgets>
  );
}
