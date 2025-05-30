"use client";

import { usePathname } from "next/navigation";
import {
  UsersManagement,
  UserProfile,
  UserSecurity,
  UserSessions,
  OrganizationSwitcher,
  WorkOsWidgets,
} from "@workos-inc/widgets";
import { switchToOrganizationAction } from "../server-functions/switch-to-organization";
import { CreateOrganization } from "./CreateOrganization";
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
