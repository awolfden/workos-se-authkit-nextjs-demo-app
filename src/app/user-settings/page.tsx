import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import { workos } from "../workos";
import {
  UserProfileWidget,
  UserSecurityWidget,
  UserSessionsWidget,
  UserTable,
} from "../components/Widgets";
import {
  PersonIcon,
  LockClosedIcon,
  Link1Icon,
  CheckCircledIcon,
  GearIcon,
  GlobeIcon,
} from "@radix-ui/react-icons";
import Permissions from "../components/Permissions";
import { EnterpriseIntegrations } from "../components/EnterpriseIntegrations";
import Link from "next/link";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role, organizationId, user, sessionId } = await withAuth({
    ensureSignedIn: true,
  });

  console.log("[DEBUG] User Settings Page:", {
    userId: user.id,
    organizationId,
    role,
    sessionId,
  });

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  const authToken = await workos.widgets.getToken({
    userId: user.id,
    organizationId,
  });

  // Get the active tab from search params
  const validTabs = [
    "profile",
    "security",
    "sessions",
    "permissions",
    "team-management",
    "enterprise-integrations",
  ] as const;

  // Await searchParams before accessing its properties
  const resolvedSearchParams = await searchParams;

  // Get the tab parameter and ensure it's a string
  const tabParam =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const activeTab =
    tabParam && validTabs.includes(tabParam as (typeof validTabs)[number])
      ? tabParam
      : "profile";

  return (
    <>
      {role === "admin" ? (
        <Flex
          direction="column"
          width="900px"
          style={{
            height: "calc(100vh - 400px)",
            minHeight: "500px",
            position: "relative",
          }}
        >
          <Heading size="5" mb="4">
            Settings
          </Heading>

          <Flex
            style={{
              position: "absolute",
              top: "60px",
              left: 0,
              right: 0,
              bottom: 0,
              border: "1px solid var(--gray-5)",
              borderRadius: "var(--radius-3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "row",
            }}
          >
            <Tabs.Root
              defaultValue={activeTab}
              orientation="vertical"
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
              }}
            >
              <Tabs.List
                style={{
                  width: "240px",
                  flexDirection: "column",
                  height: "100%",
                  padding: "0",
                  borderRight: "1px solid var(--gray-5)",
                  backgroundColor: "var(--gray-2)",
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Link href="/user-settings?tab=profile" passHref legacyBehavior>
                  <TabLink active={activeTab === "profile"}>
                    <PersonIcon />
                    <Text>Profile</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=security"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "security"}>
                    <LockClosedIcon />
                    <Text>Security</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=sessions"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "sessions"}>
                    <GlobeIcon />
                    <Text>Sessions</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=permissions"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "permissions"}>
                    <CheckCircledIcon />
                    <Text>Permissions</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=team-management"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "team-management"}>
                    <GearIcon />
                    <Text>Team Management</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=enterprise-integrations"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "enterprise-integrations"}>
                    <Link1Icon />
                    <Text>Enterprise Integrations</Text>
                  </TabLink>
                </Link>
              </Tabs.List>

              <Flex
                direction="column"
                style={{
                  width: "calc(100% - 240px)",
                  padding: "20px",
                  backgroundColor: "white",
                  height: "100%",
                  overflow: "auto",
                }}
              >
                {activeTab === "profile" && (
                  <ContentSection title="Profile Information">
                    <UserProfileWidget token={authToken} />
                  </ContentSection>
                )}

                {activeTab === "security" && (
                  <ContentSection title="Security Settings">
                    <UserSecurityWidget token={authToken} />
                  </ContentSection>
                )}

                {activeTab === "sessions" && (
                  <ContentSection title="Active Sessions">
                    <UserSessionsWidget
                      token={authToken}
                      sessionId={sessionId}
                    />
                  </ContentSection>
                )}

                {activeTab === "permissions" && (
                  <ContentSection title="Role & Permissions">
                    <Permissions role={role} />
                  </ContentSection>
                )}

                {activeTab === "team-management" && (
                  <ContentSection title="Team Management">
                    <UserTable token={authToken} />
                  </ContentSection>
                )}

                {activeTab === "enterprise-integrations" && (
                  <ContentSection title="Enterprise Integrations">
                    <EnterpriseIntegrations organizationId={organizationId} />
                  </ContentSection>
                )}
              </Flex>
            </Tabs.Root>
          </Flex>
        </Flex>
      ) : (
        <Flex direction="column" gap="2" mb="4">
          <Heading size="8" align="center">
            User Settings
          </Heading>
          <Text size="5" align="left" color="gray">
            {role !== "admin"
              ? "Only Admin users can access this page."
              : "Organization ID is required for this page."}
          </Text>
        </Flex>
      )}
    </>
  );
}

// Helper components
function TabLink({
  active,
  children,
  ...props
}: {
  active: boolean;
  children: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <a
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 16px",
        borderRadius: "0",
        borderBottom: "1px solid var(--gray-4)",
        width: "100%",
        backgroundColor: active ? "var(--accent-3)" : "transparent",
        color: active ? "var(--accent-11)" : "inherit",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      <Flex gap="2" align="center">
        {children}
      </Flex>
    </a>
  );
}

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="4">
      <Text size="5" weight="bold">
        {title}
      </Text>
      {children}
    </Flex>
  );
}
