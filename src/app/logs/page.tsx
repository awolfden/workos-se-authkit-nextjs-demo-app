import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { CodeIcon, TokensIcon } from "@radix-ui/react-icons";
import { workos } from "../workos";
import { auth, calendar } from "@googleapis/calendar";
import { Octokit } from "@octokit/rest";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role, organizationId, user, sessionId, accessToken } = await withAuth(
    {
      ensureSignedIn: true,
    }
  );

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  // Decode access token if available
  let decodedToken: any = null;
  if (accessToken) {
    try {
      decodedToken = jwtDecode(accessToken);
    } catch (error) {
      console.error("Failed to decode access token:", error);
    }
  }

  // Prepare WorkOS response data
  const workosResponse = {
    user,
    organizationId,
    role,
    sessionId,
    accessToken: accessToken || null,
  };

  // Tabs limited to logs context
  const validTabs = [
    "workos-response",
    "decoded-token",
    "github-data-integration",
    "google-calendar-integration",
  ] as const;

  const resolvedSearchParams = await searchParams;
  const tabParam =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const activeTab =
    tabParam && validTabs.includes(tabParam as (typeof validTabs)[number])
      ? tabParam
      : "workos-response";

  // If viewing GitHub tab, fetch user via WorkOS Pipes + Octokit
  let githubUser: any = null;
  let githubError: string | null = null;
  if (activeTab === "github-data-integration") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "github",
        userId: user.id,
        organizationId,
      });

      if (!tokenResp.active) {
        githubError =
          "GitHub token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        if (
          Array.isArray(pipesToken.missingScopes) &&
          pipesToken.missingScopes.includes("user")
        ) {
          githubError =
            'Missing required "user" scope. Ask the user to re-authorize with the correct permissions.';
        } else {
          const octokit = new Octokit({
            auth: pipesToken.accessToken,
          });
          const { data } = await octokit.rest.users.getAuthenticated();
          githubUser = data;
        }
      }
    } catch (err) {
      try {
        githubError = `Failed to fetch GitHub user: ${JSON.stringify(err)}`;
      } catch {
        githubError = `Failed to fetch GitHub user: ${String(err)}`;
      }
    }
  }

  // If viewing Google Calendar tab, fetch access token via WorkOS Pipes
  let googleCalendarToken: string | null = null;
  let googleCalendarData: any = null;
  let googleCalendarError: string | null = null;
  if (activeTab === "google-calendar-integration") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "google-calendar",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        googleCalendarError =
          "Google Calendar token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        googleCalendarToken = tokenResp.accessToken.accessToken;
        const requiredScope =
          "https://www.googleapis.com/auth/calendar.readonly";
        if (
          Array.isArray(tokenResp.accessToken.missingScopes) &&
          tokenResp.accessToken.missingScopes.includes(requiredScope)
        ) {
          googleCalendarError = `Missing required "${requiredScope}" scope. Ask the user to re-authorize with the correct permissions.`;
        } else {
          const oauth2Client = new auth.OAuth2();
          oauth2Client.setCredentials({ access_token: googleCalendarToken });
          const cal = calendar({ version: "v3", auth: oauth2Client });
          const { data } = await cal.calendarList.list();
          googleCalendarData = data;
        }
      }
    } catch (err) {
      try {
        googleCalendarError = `Failed to fetch Google Calendar token: ${JSON.stringify(
          err
        )}`;
      } catch {
        googleCalendarError = `Failed to fetch Google Calendar token: ${String(
          err
        )}`;
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
            Logs
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
                <Link href="/logs?tab=workos-response" passHref legacyBehavior>
                  <TabLink active={activeTab === "workos-response"}>
                    <CodeIcon />
                    <Text>WorkOS Response</Text>
                  </TabLink>
                </Link>
                <Link href="/logs?tab=decoded-token" passHref legacyBehavior>
                  <TabLink active={activeTab === "decoded-token"}>
                    <TokensIcon />
                    <Text>Decoded Access Token</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/logs?tab=github-data-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "github-data-integration"}>
                    <CodeIcon />
                    <Text>Github Data Integration</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/logs?tab=google-calendar-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "google-calendar-integration"}>
                    <CodeIcon />
                    <Text>Google Calendar Integration</Text>
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
                {activeTab === "workos-response" && (
                  <ContentSection title="WorkOS Response">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Raw authentication data returned from WorkOS after
                        successful authentication.
                      </Text>
                      <div
                        style={{
                          backgroundColor: "var(--gray-2)",
                          padding: "16px",
                          borderRadius: "var(--radius-3)",
                          border: "1px solid var(--gray-5)",
                          overflow: "auto",
                          fontSize: "12px",
                          lineHeight: "1.4",
                          maxHeight: "400px",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                          whiteSpace: "pre",
                        }}
                      >
                        <JsonPretty data={workosResponse} />
                      </div>
                    </Flex>
                  </ContentSection>
                )}

                {activeTab === "decoded-token" && (
                  <ContentSection title="Decoded Access Token">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        JWT access token decoded to show claims and user
                        information.
                      </Text>
                      {decodedToken ? (
                        <div
                          style={{
                            backgroundColor: "var(--gray-2)",
                            padding: "16px",
                            borderRadius: "var(--radius-3)",
                            border: "1px solid var(--gray-5)",
                            overflow: "auto",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            maxHeight: "400px",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            whiteSpace: "pre",
                          }}
                        >
                          <JsonPretty data={decodedToken} />
                        </div>
                      ) : (
                        <Text size="3" color="orange">
                          No access token available or failed to decode.
                        </Text>
                      )}
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "github-data-integration" && (
                  <ContentSection title="Github Data Integration">
                    <Flex direction="column" gap="3">
                      {!githubUser && !githubError && (
                        <Text size="3" color="gray">
                          Loading GitHub user…
                        </Text>
                      )}
                      {githubError && (
                        <Text size="3" color="orange">
                          {githubError}
                        </Text>
                      )}
                      {githubUser && (
                        <div
                          style={{
                            backgroundColor: "var(--gray-2)",
                            padding: "16px",
                            borderRadius: "var(--radius-3)",
                            border: "1px solid var(--gray-5)",
                            overflow: "auto",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            maxHeight: "400px",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            whiteSpace: "pre",
                          }}
                        >
                          <JsonPretty data={githubUser} />
                        </div>
                      )}
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "google-calendar-integration" && (
                  <ContentSection title="Google Calendar Integration">
                    <Flex direction="column" gap="3">
                      {googleCalendarError && (
                        <Text size="3" color="orange">
                          {googleCalendarError}
                        </Text>
                      )}
                      {!googleCalendarError && googleCalendarData && (
                        <div
                          style={{
                            backgroundColor: "var(--gray-2)",
                            padding: "16px",
                            borderRadius: "var(--radius-3)",
                            border: "1px solid var(--gray-5)",
                            overflow: "auto",
                            fontSize: "12px",
                            lineHeight: "1.4",
                            maxHeight: "400px",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            whiteSpace: "pre",
                          }}
                        >
                          <JsonPretty data={googleCalendarData} />
                        </div>
                      )}
                      {!googleCalendarError && !googleCalendarData && (
                        <Text size="3" color="gray">
                          No calendar data available.
                        </Text>
                      )}
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
            Logs
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

function JsonPretty({ data }: { data: unknown }) {
  const renderValue = (
    value: unknown,
    path: string,
    indent: number
  ): React.ReactNode[] => {
    const pad = "  ".repeat(indent);
    const nextPad = "  ".repeat(indent + 1);

    if (value === null) {
      return [
        <span key={`null-${path}`} style={{ color: "var(--gray-11)" }}>
          null
        </span>,
      ];
    }

    const type = typeof value;
    if (type === "string") {
      return [
        <span key={`str-${path}`} style={{ color: "var(--green-11)" }}>
          "{value as string}"
        </span>,
      ];
    }
    if (type === "number") {
      return [
        <span key={`num-${path}`} style={{ color: "var(--purple-11)" }}>
          {String(value)}
        </span>,
      ];
    }
    if (type === "boolean") {
      return [
        <span key={`bool-${path}`} style={{ color: "var(--orange-11)" }}>
          {String(value)}
        </span>,
      ];
    }

    if (Array.isArray(value)) {
      const elements: React.ReactNode[] = [];
      elements.push(<span key={`open-a-${path}`}>[</span>, "\n");
      value.forEach((item, idx) => {
        elements.push(nextPad);
        elements.push(...renderValue(item, `${path}[${idx}]`, indent + 1));
        if (idx < value.length - 1) {
          elements.push(",");
        }
        elements.push("\n");
      });
      elements.push(pad, <span key={`close-a-${path}`}>]</span>);
      return elements;
    }

    if (type === "object") {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);
      const elements: React.ReactNode[] = [];
      elements.push(<span key={`open-o-${path}`}>{"{"}</span>, "\n");
      entries.forEach(([k, v], idx) => {
        const childPath = path ? `${path}.${k}` : k;
        elements.push(nextPad);
        elements.push(
          <span key={`key-${childPath}`} style={{ color: "var(--blue-11)" }}>
            "{k}"
          </span>
        );
        elements.push(": ");
        elements.push(...renderValue(v, childPath, indent + 1));
        if (idx < entries.length - 1) {
          elements.push(",");
        }
        elements.push("\n");
      });
      elements.push(pad, <span key={`close-o-${path}`}>{"}"}</span>);
      return elements;
    }

    // Fallback
    return [<span key={`fallback-${path}`}>{String(value)}</span>];
  };

  return <>{renderValue(data, "root", 0)}</>;
}
