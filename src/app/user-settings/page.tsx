import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import { workos } from "../workos";
import {
  UserProfileWidget,
  UserSecurityWidget,
  UserSessionsWidget,
  TeamManagementWidget,
  ApiKeysWidget,
  PipesWidget,
} from "../components/Widgets";
import "@workos-inc/widgets/styles.css";
import { UserSessionsList } from "../components/UserSessionsList";
import { TeamUserSessions } from "../components/TeamUserSessions";
import {
  PersonIcon,
  LockClosedIcon,
  Link1Icon,
  GearIcon,
  GlobeIcon,
  TokensIcon,
  ActivityLogIcon,
} from "@radix-ui/react-icons";

import { EnterpriseIntegrations } from "../components/EnterpriseIntegrations";
import Link from "next/link";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role, organizationId, user, sessionId, accessToken } = await withAuth(
    {
      ensureSignedIn: true,
    }
  );

  console.log("[DEBUG] User Settings Page:", {
    userId: user.id,
    organizationId,
    role,
    sessionId,
  });

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  // Get the active tab from search params
  const validTabs = [
    "profile",
    "security",
    "sessions",
    "user-sessions",
    "team-management",
    "enterprise-integrations",
    "pipes",
    "api-keys",
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

  // Build scopes for widgets token used by most tabs (exclude Pipes to isolate issues)
  const widgetScopes: string[] = [
    "widgets:users-table:manage",
    "widgets:sso:manage",
    "widgets:api-keys:manage",
    "widgets:domain-verification:manage",
  ];

  // Generate a widget token for non-Pipes tabs; keep errors visible except on the Pipes tab
  let authToken: string | null = null;
  try {
    authToken = await (workos.widgets as any).getToken({
      userId: user.id,
      organizationId,
      scopes: widgetScopes,
    });
  } catch (err) {
    try {
      console.error(
        "[DEBUG] getToken error (base widgets token):",
        JSON.stringify(err, null, 2)
      );
    } catch {
      console.error("[DEBUG] getToken error (base widgets token):", err);
    }
    if (activeTab !== "pipes") {
      throw err;
    }
  }

  let pipesAuthToken: string | null = null;
  if (activeTab === "pipes") {
    try {
      pipesAuthToken = await (workos.widgets as any).getToken({
        userId: user.id,
        organizationId,
      });
    } catch (err) {
      try {
        console.error(
          "[DEBUG] getToken error (pipes widgets token):",
          JSON.stringify(err, null, 2)
        );
      } catch {
        console.error("[DEBUG] getToken error (pipes widgets token):", err);
      }
    }
  }

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
                    <Text>Sessions Widget</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=user-sessions"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "user-sessions"}>
                    <ActivityLogIcon />
                    <Text>Sessions API</Text>
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
                <Link href="/user-settings?tab=pipes" passHref legacyBehavior>
                  <TabLink active={activeTab === "pipes"}>
                    <Link1Icon />
                    <Text>Pipes</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/user-settings?tab=api-keys"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "api-keys"}>
                    <TokensIcon />
                    <Text>Create API Key</Text>
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
                    <UserProfileWidget token={authToken as string} />
                  </ContentSection>
                )}

                {activeTab === "security" && (
                  <ContentSection title="Security Settings">
                    <UserSecurityWidget token={authToken as string} />
                  </ContentSection>
                )}

                {activeTab === "sessions" && (
                  <ContentSection title="Active Sessions">
                    <UserSessionsWidget
                      token={authToken as string}
                      sessionId={sessionId}
                    />
                  </ContentSection>
                )}

                {activeTab === "user-sessions" && (
                  <ContentSection title="User Sessions (via listSessions API)">
                    <UserSessionsList />
                  </ContentSection>
                )}

                {activeTab === "team-management" && (
                  <ContentSection title="Team Management">
                    <Tabs.Root
                      defaultValue="management"
                      orientation="horizontal"
                    >
                      <Tabs.List style={{ marginBottom: 12 }}>
                        <Tabs.Trigger value="management">
                          Team Management
                        </Tabs.Trigger>
                        <Tabs.Trigger value="member-sessions">
                          Team Member Sessions
                        </Tabs.Trigger>
                      </Tabs.List>
                      <Tabs.Content value="management">
                        <TeamManagementWidget
                          token={authToken as string}
                          organizationId={organizationId}
                        />
                      </Tabs.Content>
                      <Tabs.Content value="member-sessions">
                        <TeamUserSessions
                          currentUserId={user.id}
                          currentSessionId={sessionId}
                        />
                      </Tabs.Content>
                    </Tabs.Root>
                  </ContentSection>
                )}

                {activeTab === "enterprise-integrations" && (
                  <ContentSection title="Enterprise Integrations">
                    <EnterpriseIntegrations organizationId={organizationId} />
                  </ContentSection>
                )}

                {activeTab === "pipes" && (
                  <ContentSection title="Pipes">
                    {pipesAuthToken ? (
                      <PipesWidget token={pipesAuthToken as string} />
                    ) : (
                      <Text size="3" color="orange">
                        Unable to obtain token for Pipes. If you want to use a
                        widgets token, set USE_WIDGETS_TOKEN_FOR_PIPES=true and
                        ensure "widgets:pipes:manage" is granted.
                      </Text>
                    )}
                  </ContentSection>
                )}

                {activeTab === "api-keys" && (
                  <ContentSection title="Create API Key">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Manage organization API keys. Requires role permission:
                        widgets:api-keys:manage.
                      </Text>
                      <ApiKeysWidget token={authToken as string} />
                    </Flex>
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
