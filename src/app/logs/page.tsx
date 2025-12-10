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

  // Accent-aware palette derived from env
  const supportedHues = [
    "blue",
    "indigo",
    "violet",
    "purple",
    "plum",
    "pink",
    "crimson",
    "tomato",
    "orange",
    "amber",
    "yellow",
    "grass",
    "green",
    "teal",
    "cyan",
    "sky",
    "mint",
    "bronze",
    "gold",
    "brown",
    "gray",
  ];
  const envAccent = (process.env.ACCENT_COLOR || "").toLowerCase();
  const accentHue = supportedHues.includes(envAccent) ? envAccent : "indigo";
  const getAccentPalette = (hue: string): string[] => {
    switch (hue) {
      case "blue":
        return [
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--sky-9)",
          "var(--cyan-9)",
          "var(--violet-9)",
          "var(--teal-9)",
          "var(--grass-9)",
          "var(--amber-9)",
        ];
      case "teal":
        return [
          "var(--teal-9)",
          "var(--cyan-9)",
          "var(--mint-9)",
          "var(--grass-9)",
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--violet-9)",
          "var(--amber-9)",
        ];
      case "purple":
      case "plum":
      case "violet":
        return [
          "var(--violet-9)",
          "var(--purple-9)",
          "var(--plum-9)",
          "var(--indigo-9)",
          "var(--pink-9)",
          "var(--crimson-9)",
          "var(--blue-9)",
          "var(--teal-9)",
        ];
      case "crimson":
      case "tomato":
      case "pink":
        return [
          "var(--crimson-9)",
          "var(--tomato-9)",
          "var(--pink-9)",
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--plum-9)",
          "var(--violet-9)",
        ];
      case "orange":
      case "amber":
      case "yellow":
        return [
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--tomato-9)",
          "var(--crimson-9)",
          "var(--grass-9)",
          "var(--teal-9)",
          "var(--indigo-9)",
        ];
      case "grass":
      case "green":
        return [
          "var(--grass-9)",
          "var(--green-9)",
          "var(--teal-9)",
          "var(--mint-9)",
          "var(--cyan-9)",
          "var(--blue-9)",
          "var(--indigo-9)",
          "var(--amber-9)",
        ];
      case "bronze":
      case "gold":
      case "brown":
        return [
          "var(--bronze-9)",
          "var(--gold-9)",
          "var(--brown-9)",
          "var(--orange-9)",
          "var(--amber-9)",
          "var(--yellow-9)",
          "var(--plum-9)",
          "var(--violet-9)",
        ];
      case "gray":
        return [
          "var(--gray-9)",
          "var(--slate-9)",
          "var(--sage-9)",
          "var(--olive-9)",
          "var(--sand-9)",
          "var(--blue-9)",
          "var(--violet-9)",
          "var(--teal-9)",
        ];
      default:
        return [
          "var(--indigo-9)",
          "var(--violet-9)",
          "var(--purple-9)",
          "var(--plum-9)",
          "var(--pink-9)",
          "var(--blue-9)",
          "var(--teal-9)",
          "var(--amber-9)",
        ];
    }
  };
  const accentPalette = getAccentPalette(accentHue);
  const getLangColor = (lang: string): string => {
    if (!lang) return "var(--gray-8)";
    let hash = 0;
    for (let i = 0; i < lang.length; i++) {
      hash = (hash + lang.charCodeAt(i)) % 997;
    }
    return accentPalette[hash % accentPalette.length];
  };
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
          // Base user
          const { data: authedUser } =
            await octokit.rest.users.getAuthenticated();

          // Public orgs (no read:org required)
          const username = authedUser.login;
          const { data: publicOrgs } = await octokit.rest.orgs.listForUser({
            username,
            per_page: 100,
          });

          // Public repos (no repo scope required)
          const { data: repos } =
            await octokit.rest.repos.listForAuthenticatedUser({
              visibility: "public",
              per_page: 100,
            });

          // Top repos by stars (top 5)
          const topRepos = [...repos]
            .sort(
              (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)
            )
            .slice(0, 5)
            .map((r) => ({
              id: r.id,
              name: r.name,
              full_name: r.full_name,
              html_url: r.html_url,
              description: r.description,
              stargazers_count: r.stargazers_count,
              language: r.language,
            }));

          // Language breakdown by primary language across public repos
          const languageCounts: Record<string, number> = {};
          for (const r of repos) {
            if (r.language) {
              languageCounts[r.language] =
                (languageCounts[r.language] || 0) + 1;
            }
          }

          githubUser = {
            user: authedUser,
            publicOrgs,
            topRepos,
            languageCounts,
          };
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
                          Loading GitHub profile…
                        </Text>
                      )}
                      {githubError && (
                        <Text size="3" color="orange">
                          {githubError}
                        </Text>
                      )}
                      {githubUser && (
                        <Flex direction="column" gap="4">
                          {/* Header */}
                          <div
                            style={{
                              padding: 16,
                              borderRadius: "var(--radius-3)",
                              border: "1px solid var(--gray-5)",
                              background:
                                "linear-gradient(135deg, var(--accent-3), white)",
                            }}
                          >
                            <Flex gap="3" align="center">
                              <img
                                src={githubUser.user.avatar_url}
                                alt={githubUser.user.login}
                                width={80}
                                height={80}
                                style={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: "50%",
                                  border: "1px solid var(--gray-6)",
                                  boxShadow:
                                    "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
                                  backgroundColor: "white",
                                }}
                              />
                              <Flex direction="column">
                                <Text size="5" weight="bold">
                                  {githubUser.user.name ||
                                    githubUser.user.login}
                                </Text>
                                <Text size="3" color="gray">
                                  @{githubUser.user.login}
                                </Text>
                                <Flex gap="2" wrap="wrap">
                                  {githubUser.user.company && (
                                    <Text size="2" color="gray">
                                      {githubUser.user.company}
                                    </Text>
                                  )}
                                  {githubUser.user.location && (
                                    <Text size="2" color="gray">
                                      • {githubUser.user.location}
                                    </Text>
                                  )}
                                </Flex>
                              </Flex>
                            </Flex>
                          </div>
                          {githubUser.languageCounts &&
                            Object.keys(githubUser.languageCounts).length >
                              0 && (
                              <Flex direction="column" gap="2">
                                <Text size="3" weight="bold">
                                  Language Breakdown (public repos)
                                </Text>
                                {(() => {
                                  const langCounts =
                                    githubUser.languageCounts as Record<
                                      string,
                                      number
                                    >;
                                  const entries = Object.entries(
                                    langCounts
                                  ) as [string, number][];
                                  const sorted = [...entries].sort(
                                    (a, b) => b[1] - a[1]
                                  );
                                  const total =
                                    sorted.reduce((sum, [, c]) => sum + c, 0) ||
                                    1;
                                  // Use global accent-aware palette and mapper
                                  return (
                                    <>
                                      <div
                                        style={{
                                          width: "100%",
                                          height: "14px",
                                          borderRadius: "999px",
                                          overflow: "hidden",
                                          border: "1px solid var(--gray-5)",
                                          backgroundColor: "var(--gray-3)",
                                          display: "flex",
                                        }}
                                      >
                                        {sorted.map(([lang, count]) => {
                                          const pct = Math.max(
                                            0.5,
                                            (count / total) * 100
                                          ); // minimum sliver
                                          const color = getLangColor(lang);
                                          return (
                                            <div
                                              key={lang}
                                              title={`${lang}: ${Math.round(
                                                (count / total) * 100
                                              )}%`}
                                              style={{
                                                width: `${pct}%`,
                                                backgroundColor: color,
                                                height: "100%",
                                              }}
                                            />
                                          );
                                        })}
                                      </div>
                                      <Flex
                                        gap="2"
                                        wrap="wrap"
                                        style={{ marginTop: 6 }}
                                      >
                                        {sorted.map(([lang, count]) => {
                                          const color = getLangColor(lang);
                                          const pct = Math.round(
                                            (count / total) * 100
                                          );
                                          return (
                                            <Flex
                                              key={lang}
                                              align="center"
                                              gap="1"
                                              style={{ marginRight: 6 }}
                                            >
                                              <span
                                                style={{
                                                  display: "inline-block",
                                                  width: "10px",
                                                  height: "10px",
                                                  borderRadius: "2px",
                                                  backgroundColor: color,
                                                  border:
                                                    "1px solid var(--gray-6)",
                                                }}
                                              />
                                              <Text size="2">
                                                {lang} ({pct}%)
                                              </Text>
                                            </Flex>
                                          );
                                        })}
                                      </Flex>
                                    </>
                                  );
                                })()}
                              </Flex>
                            )}
                          {Array.isArray(githubUser.publicOrgs) &&
                            githubUser.publicOrgs.length > 0 && (
                              <Flex direction="column" gap="2">
                                <Text size="3" weight="bold">
                                  Public Organizations
                                </Text>
                                <Flex gap="2" style={{ flexWrap: "wrap" }}>
                                  {githubUser.publicOrgs.map((org: any) => (
                                    <Flex
                                      key={org.id}
                                      align="center"
                                      gap="2"
                                      style={{
                                        border: "1px solid var(--gray-5)",
                                        borderRadius: "999px",
                                        padding: "4px 8px",
                                        backgroundColor: "var(--gray-2)",
                                      }}
                                    >
                                      {org.avatar_url && (
                                        <img
                                          src={org.avatar_url}
                                          alt={org.login}
                                          width={16}
                                          height={16}
                                          style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            border: "1px solid var(--gray-5)",
                                          }}
                                        />
                                      )}
                                      <Text size="2">{org.login}</Text>
                                    </Flex>
                                  ))}
                                </Flex>
                              </Flex>
                            )}
                          {/* Top repos */}
                          {Array.isArray(githubUser.topRepos) &&
                            githubUser.topRepos.length > 0 && (
                              <Flex direction="column" gap="2">
                                <Text size="3" weight="bold">
                                  Top Public Repos
                                </Text>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(260px, 1fr))",
                                    gap: 12,
                                  }}
                                >
                                  {githubUser.topRepos.map((r: any) => {
                                    const themedPalette = [
                                      "var(--blue-9)",
                                      "var(--indigo-9)",
                                      "var(--violet-9)",
                                      "var(--purple-9)",
                                      "var(--plum-9)",
                                      "var(--pink-9)",
                                      "var(--crimson-9)",
                                      "var(--tomato-9)",
                                      "var(--orange-9)",
                                      "var(--amber-9)",
                                      "var(--yellow-9)",
                                      "var(--grass-9)",
                                      "var(--teal-9)",
                                    ];
                                    const themedMap: Record<string, string> = {
                                      TypeScript: "var(--indigo-9)",
                                      JavaScript: "var(--amber-9)",
                                      Python: "var(--blue-9)",
                                      Java: "var(--orange-9)",
                                      Go: "var(--teal-9)",
                                      Ruby: "var(--crimson-9)",
                                      PHP: "var(--purple-9)",
                                      C: "var(--gray-9)",
                                      "C++": "var(--violet-9)",
                                      "C#": "var(--grass-9)",
                                      Shell: "var(--teal-9)",
                                      Swift: "var(--tomato-9)",
                                      Kotlin: "var(--plum-9)",
                                      Rust: "var(--bronze-9)",
                                      Dart: "var(--blue-9)",
                                      HTML: "var(--tomato-9)",
                                      CSS: "var(--violet-9)",
                                    };
                                    const getLangColor = (lang: string) => {
                                      if (themedMap[lang])
                                        return themedMap[lang];
                                      let hash = 0;
                                      for (let i = 0; i < lang.length; i++) {
                                        hash =
                                          (hash + lang.charCodeAt(i)) % 997;
                                      }
                                      return themedPalette[
                                        hash % themedPalette.length
                                      ];
                                    };
                                    const langColor =
                                      (r.language &&
                                        getLangColor(r.language)) ||
                                      "var(--gray-8)";
                                    return (
                                      <div
                                        key={r.id}
                                        style={{
                                          border: "1px solid var(--gray-5)",
                                          borderRadius: "var(--radius-3)",
                                          padding: 12,
                                          backgroundColor: "white",
                                          boxShadow:
                                            "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                                        }}
                                      >
                                        <a
                                          href={r.html_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ textDecoration: "none" }}
                                        >
                                          <Text size="3" weight="bold">
                                            {r.full_name}
                                          </Text>
                                        </a>
                                        {r.description && (
                                          <Text
                                            size="2"
                                            color="gray"
                                            style={{
                                              marginTop: 4,
                                              display: "block",
                                            }}
                                          >
                                            {r.description}
                                          </Text>
                                        )}
                                        <Flex
                                          gap="3"
                                          align="center"
                                          style={{ marginTop: 8 }}
                                        >
                                          {r.language && (
                                            <Flex align="center" gap="1">
                                              <span
                                                style={{
                                                  display: "inline-block",
                                                  width: "10px",
                                                  height: "10px",
                                                  borderRadius: "50%",
                                                  backgroundColor: langColor,
                                                  border:
                                                    "1px solid var(--gray-6)",
                                                }}
                                              />
                                              <Text size="2" color="gray">
                                                {r.language}
                                              </Text>
                                            </Flex>
                                          )}
                                          <span
                                            style={{
                                              padding: "2px 8px",
                                              borderRadius: "999px",
                                              backgroundColor: "var(--gray-3)",
                                              border: "1px solid var(--gray-5)",
                                              fontSize: 12,
                                              color: "var(--gray-11)",
                                            }}
                                          >
                                            ★ {r.stargazers_count}
                                          </span>
                                        </Flex>
                                      </div>
                                    );
                                  })}
                                </div>
                              </Flex>
                            )}
                        </Flex>
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
