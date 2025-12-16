import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import Link from "next/link";
import { workos } from "../workos";
import { Octokit } from "@octokit/rest";
import { auth, calendar } from "@googleapis/calendar";
import { GoogleAgenda } from "../components/GoogleAgenda";
import {
  GitHubLogoIcon,
  CalendarIcon,
  RowsIcon,
  FileTextIcon,
  RocketIcon,
  ChatBubbleIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from "@radix-ui/react-icons";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role, organizationId, user, sessionId } = await withAuth({
    ensureSignedIn: true,
  });

  if (!organizationId) {
    return <p>User does not belong to an organization</p>;
  }

  const validTabs = [
    "github-data-integration",
    "google-calendar-integration",
    "linear",
    "notion",
    "salesforce",
    "slack",
    "gmail",
    "gitlab",
    "sentry",
  ] as const;

  const resolvedSearchParams = await searchParams;
  const tabParam =
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const activeTab =
    tabParam && validTabs.includes(tabParam as (typeof validTabs)[number])
      ? tabParam
      : "github-data-integration";

  // GitHub integration
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
          const octokit = new Octokit({ auth: pipesToken.accessToken });
          const { data: authedUser } =
            await octokit.rest.users.getAuthenticated();
          const username = authedUser.login;
          const { data: publicOrgs } = await octokit.rest.orgs.listForUser({
            username,
            per_page: 100,
          });
          const { data: repos } =
            await octokit.rest.repos.listForAuthenticatedUser({
              visibility: "public",
              per_page: 100,
            });
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

  // Sentry integration
  let sentryData: any = null;
  let sentryError: string | null = null;
  if (activeTab === "sentry") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "sentry",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        sentryError =
          "Sentry token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        const sentryToken = pipesToken.accessToken;
        
        // Fetch Sentry organizations
        const orgsResponse = await fetch("https://sentry.io/api/0/organizations/", {
          headers: {
            Authorization: `Bearer ${sentryToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!orgsResponse.ok) {
          sentryError = `Failed to fetch Sentry organizations: ${orgsResponse.statusText}`;
        } else {
          const orgs = await orgsResponse.json();
          
          if (orgs.length === 0) {
            sentryError = "No Sentry organizations found.";
          } else {
            // Use the first organization (or you could let user select)
            const orgSlug = orgs[0].slug;
            
            // Fetch projects for this organization
            const projectsResponse = await fetch(
              `https://sentry.io/api/0/organizations/${orgSlug}/projects/`,
              {
                headers: {
                  Authorization: `Bearer ${sentryToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!projectsResponse.ok) {
              sentryError = `Failed to fetch Sentry projects: ${projectsResponse.statusText}`;
            } else {
              const projects = await projectsResponse.json();
              console.log(projects);
              
              // Fetch issues for each project
              const projectsWithIssues = await Promise.all(
                projects.slice(0, 10).map(async (project: any) => {
                  try {
                    const issuesResponse: Response = await fetch(
                      `https://sentry.io/api/0/projects/${orgSlug}/${project.slug}/issues/`,
                      {
                        headers: {
                          Authorization: `Bearer ${sentryToken}`,
                          "Content-Type": "application/json",
                        },
                      }
                    );

                    console.log(issuesResponse);
                    
                    if (!issuesResponse.ok) {
                      return {
                        ...project,
                        issues: [],
                        issueCount: 0,
                      };
                    }
                    
                    const issues = await issuesResponse.json();

                    console.log(issues);
                    
                    return {
                      ...project,
                      issues: Array.isArray(issues) ? issues.slice(0, 10) : [], // Limit to 10 most recent issues for display
                      issueCount: Array.isArray(issues) ? issues.length : 0,
                    };
                  } catch {
                    return {
                      ...project,
                      issues: [],
                      issueCount: 0,
                    };
                  }
                })
              );

              sentryData = {
                organization: orgs[0],
                projects: projectsWithIssues,
                totalProjects: projects.length,
              };
            }
          }
        }
      }
    } catch (err) {
      try {
        sentryError = `Failed to fetch Sentry data: ${JSON.stringify(err)}`;
      } catch {
        sentryError = `Failed to fetch Sentry data: ${String(err)}`;
      }
    }
  }

  // Google Calendar integration
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
        const requiredScope =
          "https://www.googleapis.com/auth/calendar.readonly";
        if (
          Array.isArray(tokenResp.accessToken.missingScopes) &&
          tokenResp.accessToken.missingScopes.includes(requiredScope)
        ) {
          googleCalendarError = `Missing required "${requiredScope}" scope. Ask the user to re-authorize with the correct permissions.`;
        } else {
          const oauth2Client = new auth.OAuth2();
          oauth2Client.setCredentials({
            access_token: tokenResp.accessToken.accessToken,
          });
          const cal = calendar({ version: "v3", auth: oauth2Client });
          // All calendars with pagination
          const calendars: any[] = [];
          let pageToken: string | undefined = undefined;
          do {
            const { data }: { data: any } = await cal.calendarList.list({
              maxResults: 250,
              pageToken,
            } as any);
            calendars.push(...(data.items || []));
            pageToken = (data.nextPageToken as string | undefined) || undefined;
          } while (pageToken);
          const selectedCalendars = calendars.filter(
            (c) => c.accessRole && c.accessRole !== "freeBusyReader"
          );
          // Time window: next 7 days
          const now = new Date();
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          const timeMin = start.toISOString();
          const timeMax = end.toISOString();
          // Events
          const eventsPerCal = await Promise.all(
            selectedCalendars.map(async (c: any) => {
              try {
                const { data: evData } = await cal.events.list({
                  calendarId: c.id,
                  timeMin,
                  timeMax,
                  singleEvents: true,
                  orderBy: "startTime",
                  maxResults: 100,
                });
                return { calendar: c, events: evData.items || [] };
              } catch {
                return { calendar: c, events: [] as any[] };
              }
            })
          );
          const combinedEvents = eventsPerCal
            .flatMap(({ calendar, events }) =>
              events.map((ev: any) => ({
                ...ev,
                _calendarId: calendar.id,
                _calendarSummary: calendar.summary,
                _calendarBg: calendar.backgroundColor || "var(--accent-9)",
                _calendarFg: calendar.foregroundColor || "white",
              }))
            )
            .sort((a: any, b: any) => {
              const aStart = a.start?.dateTime || a.start?.date || "";
              const bStart = b.start?.dateTime || b.start?.date || "";
              return aStart.localeCompare(bStart);
            });
          const formatDateKey = (dStr: string) => {
            const d = new Date(dStr);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };
          const eventsByDay: Record<string, any[]> = {};
          for (const ev of combinedEvents) {
            const startStr = ev.start?.dateTime || ev.start?.date;
            if (!startStr) continue;
            const key = formatDateKey(startStr);
            if (!eventsByDay[key]) eventsByDay[key] = [];
            eventsByDay[key].push(ev);
          }
          googleCalendarData = {
            calendars: selectedCalendars,
            eventsByDay,
            timeMin,
            timeMax,
          };
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

  // Slack integration
  let slackData: any = null;
  let slackError: string | null = null;
  if (activeTab === "slack") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "slack",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        slackError =
          "Slack token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const pipesToken = tokenResp.accessToken;
        const slackToken = pipesToken.accessToken;
        
        // Fetch team info and users using Slack Web API
        try {
          // Get team info
          const teamInfoResponse = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${slackToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!teamInfoResponse.ok) {
            slackError = `Failed to fetch Slack team info: ${teamInfoResponse.statusText}`;
          } else {
            const teamInfo = await teamInfoResponse.json();
            
            if (!teamInfo.ok) {
              slackError = `Slack API error: ${teamInfo.error || "Unknown error"}`;
            } else {
              // Fetch users list
              const usersResponse = await fetch("https://slack.com/api/users.list", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${slackToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (!usersResponse.ok) {
                slackError = `Failed to fetch Slack users: ${usersResponse.statusText}`;
              } else {
                const usersData = await usersResponse.json();
                
                if (!usersData.ok) {
                  slackError = `Slack API error: ${usersData.error || "Unknown error"}`;
                } else {
                  // Filter out deleted and bot users, get active members
                  const activeUsers = (usersData.members || []).filter(
                    (user: any) => !user.deleted && !user.is_bot && !user.is_restricted
                  );
                  
                  slackData = {
                    team: {
                      id: teamInfo.team_id,
                      name: teamInfo.team,
                      url: teamInfo.url,
                    },
                    user: {
                      id: teamInfo.user_id,
                      name: teamInfo.user,
                    },
                    users: activeUsers,
                    totalUsers: activeUsers.length,
                  };
                }
              }
            }
          }
        } catch (apiErr) {
          try {
            slackError = `Failed to fetch Slack data: ${JSON.stringify(apiErr)}`;
          } catch {
            slackError = `Failed to fetch Slack data: ${String(apiErr)}`;
          }
        }
      }
    } catch (err) {
      try {
        slackError = `Failed to fetch Slack token: ${JSON.stringify(err)}`;
      } catch {
        slackError = `Failed to fetch Slack token: ${String(err)}`;
      }
    }
  }

  // GitLab integration (raw JSON demo)
  let gitlabData: any = null;
  let gitlabError: string | null = null;
  if (activeTab === "gitlab") {
    try {
      const tokenResp = await workos.pipes.getAccessToken({
        provider: "gitlab",
        userId: user.id,
        organizationId,
      });
      if (!tokenResp.active) {
        gitlabError =
          "GitLab token not available. User may need to connect or re-authorize." +
          (tokenResp.error ? ` Details: ${tokenResp.error}` : "");
      } else {
        const accessToken = tokenResp.accessToken.accessToken;
        // Fetch current user
        const userRes = await fetch("https://gitlab.com/api/v4/user", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (!userRes.ok) {
          gitlabError = `GitLab API error: ${userRes.status} ${userRes.statusText}`;
        } else {
          const userJson = await userRes.json();

          // Fetch projects the user is a member of (light list)
          const projectsRes = await fetch(
            "https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=20&order_by=last_activity_at&sort=desc",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              cache: "no-store",
            }
          );
          if (!projectsRes.ok) {
            gitlabError = `Failed to fetch GitLab projects: ${projectsRes.status} ${projectsRes.statusText}`;
          } else {
            const projects = await projectsRes.json();

            // For each project, fetch environments and last deployment
            const projectDetails = await Promise.all(
              (projects || []).map(async (p: any) => {
                try {
                  const envRes = await fetch(
                    `https://gitlab.com/api/v4/projects/${encodeURIComponent(
                      p.id
                    )}/environments?per_page=20`,
                    {
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                      },
                      cache: "no-store",
                    }
                  );
                  const envs = envRes.ok ? await envRes.json() : [];

                  const envsWithLastDeployment = await Promise.all(
                    (envs || []).map(async (env: any) => {
                      try {
                        const depRes = await fetch(
                          `https://gitlab.com/api/v4/projects/${encodeURIComponent(
                            p.id
                          )}/deployments?environment=${encodeURIComponent(
                            env.name
                          )}&per_page=1&order_by=updated_at&sort=desc`,
                          {
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            cache: "no-store",
                          }
                        );
                        const deps = depRes.ok ? await depRes.json() : [];
                        const last = Array.isArray(deps) ? deps[0] : undefined;
                        return {
                          id: env.id,
                          name: env.name,
                          state: env.state,
                          lastDeployment: last
                            ? {
                                id: last.id,
                                status: last.status,
                                created_at: last.created_at,
                                updated_at: last.updated_at,
                                ref: last.ref,
                                sha: last.sha,
                                user: last.user,
                              }
                            : null,
                        };
                      } catch {
                        return {
                          id: env.id,
                          name: env.name,
                          state: env.state,
                          lastDeployment: null,
                        };
                      }
                    })
                  );

                  return {
                    id: p.id,
                    name: p.name_with_namespace || p.name,
                    web_url: p.web_url,
                    default_branch: p.default_branch,
                    environments: envsWithLastDeployment,
                  };
                } catch {
                  return {
                    id: p.id,
                    name: p.name_with_namespace || p.name,
                    web_url: p.web_url,
                    default_branch: p.default_branch,
                    environments: [],
                  };
                }
              })
            );

            gitlabData = {
              user: userJson,
              projects: projectDetails,
            };
          }
        }
      }
    } catch (err) {
      try {
        gitlabError = `Failed to fetch GitLab data: ${JSON.stringify(err)}`;
      } catch {
        gitlabError = `Failed to fetch GitLab data: ${String(err)}`;
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
            Integrations
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
                <Link
                  href="/integrations?tab=github-data-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "github-data-integration"}>
                    <GitHubLogoIcon />
                    <Text>Github Data Integration</Text>
                  </TabLink>
                </Link>
                <Link
                  href="/integrations?tab=google-calendar-integration"
                  passHref
                  legacyBehavior
                >
                  <TabLink active={activeTab === "google-calendar-integration"}>
                    <CalendarIcon />
                    <Text>Google Calendar Integration</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=linear" passHref legacyBehavior>
                  <TabLink active={activeTab === "linear"}>
                    <RowsIcon />
                    <Text>Linear</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=notion" passHref legacyBehavior>
                  <TabLink active={activeTab === "notion"}>
                    <FileTextIcon />
                    <Text>Notion</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=salesforce" passHref legacyBehavior>
                  <TabLink active={activeTab === "salesforce"}>
                    <RocketIcon />
                    <Text>Salesforce</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=slack" passHref legacyBehavior>
                  <TabLink active={activeTab === "slack"}>
                    <ChatBubbleIcon />
                    <Text>Slack</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=gmail" passHref legacyBehavior>
                  <TabLink active={activeTab === "gmail"}>
                    <EnvelopeClosedIcon />
                    <Text>Gmail</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=sentry" passHref legacyBehavior>
                  <TabLink active={activeTab === "sentry"}>
                    <ExclamationTriangleIcon />
                    <Text>Sentry</Text>
                  </TabLink>
                </Link>
                <Link href="/integrations?tab=gitlab" passHref legacyBehavior>
                  <TabLink active={activeTab === "gitlab"}>
                    <CubeIcon />
                    <Text>GitLab</Text>
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
                      {githubUser && <GithubProfileCard githubUser={githubUser} />}
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
                      {!googleCalendarError && !googleCalendarData && (
                        <Text size="3" color="gray">
                          No calendar data available.
                        </Text>
                      )}
                      {!googleCalendarError && googleCalendarData && (
                        <GoogleAgenda
                          calendars={googleCalendarData.calendars}
                          eventsByDay={googleCalendarData.eventsByDay}
                        />
                      )}
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "linear" && (
                  <ContentSection title="Linear">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Placeholder. Linear integration coming soon.
                      </Text>
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "notion" && (
                  <ContentSection title="Notion">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Placeholder. Notion integration coming soon.
                      </Text>
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "salesforce" && (
                  <ContentSection title="Salesforce">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Placeholder. Salesforce integration coming soon.
                      </Text>
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "slack" && (
                  <ContentSection title="Slack">
                    <Flex direction="column" gap="3">
                      {!slackData && !slackError && (
                        <Text size="3" color="gray">
                          Loading Slack data…
                        </Text>
                      )}
                      {slackError && (
                        <Text size="3" color="orange">
                          {slackError}
                        </Text>
                      )}
                      {slackData && <SlackDataCard slackData={slackData} />}
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "gmail" && (
                  <ContentSection title="Gmail">
                    <Flex direction="column" gap="3">
                      <Text size="3" color="gray">
                        Placeholder. Gmail integration coming soon.
                      </Text>
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "sentry" && (
                  <ContentSection title="Sentry">
                    <Flex direction="column" gap="3">
                      {!sentryData && !sentryError && (
                        <Text size="3" color="gray">
                          Loading Sentry data…
                        </Text>
                      )}
                      {sentryError && (
                        <Text size="3" color="orange">
                          {sentryError}
                        </Text>
                      )}
                      {sentryData && <SentryDataCard sentryData={sentryData} />}
                    </Flex>
                  </ContentSection>
                )}
                {activeTab === "gitlab" && (
                  <ContentSection title="GitLab">
                    <Flex direction="column" gap="3">
                      {!gitlabData && !gitlabError && (
                        <Text size="3" color="gray">Loading GitLab data…</Text>
                      )}
                      {gitlabError && (
                        <Text size="3" color="orange">{gitlabError}</Text>
                      )}
                      {gitlabData && (
                        <Flex direction="column" gap="4">
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
                              <div
                                style={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: "50%",
                                  backgroundColor: "var(--gray-3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid var(--gray-6)",
                                  boxShadow:
                                    "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
                                }}
                              >
                                <CubeIcon width={30} height={30} />
                              </div>
                              <Flex direction="column">
                                <Text size="5" weight="bold">
                                  {gitlabData.user.name || gitlabData.user.username}
                                </Text>
                                <Text size="3" color="gray">
                                  @{gitlabData.user.username}
                                </Text>
                              </Flex>
                            </Flex>
                          </div>

                          {/* Projects & Environments */}
                          {Array.isArray(gitlabData.projects) &&
                            gitlabData.projects.length > 0 ? (
                            <Flex direction="column" gap="3">
                              <Text size="4" weight="bold">Projects & Environments</Text>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fill, minmax(320px, 1fr))",
                                  gap: 12,
                                }}
                              >
                                {gitlabData.projects.map((proj: any) => (
                                  <div
                                    key={proj.id}
                                    style={{
                                      border: "1px solid var(--gray-5)",
                                      borderRadius: "var(--radius-3)",
                                      padding: 16,
                                      backgroundColor: "white",
                                      boxShadow:
                                        "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                                    }}
                                  >
                                    <Flex direction="column" gap="2">
                                      <a
                                        href={proj.web_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ textDecoration: "none" }}
                                      >
                                        <Text size="3" weight="bold">
                                          {proj.name}
                                        </Text>
                                      </a>
                                      {proj.default_branch && (
                                        <Text size="2" color="gray">
                                          Default branch: {proj.default_branch}
                                        </Text>
                                      )}
                                      <Text size="2" color="gray">
                                        Environments:
                                      </Text>
                                      {Array.isArray(proj.environments) &&
                                      proj.environments.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                          {proj.environments.map((env: any) => {
                                            const last = env.lastDeployment;
                                            return (
                                              <div
                                                key={env.id}
                                                style={{
                                                  padding: 8,
                                                  borderRadius: "var(--radius-2)",
                                                  backgroundColor: "var(--gray-2)",
                                                  border: "1px solid var(--gray-4)",
                                                }}
                                              >
                                                <Flex direction="column" gap="1">
                                                  <Flex align="center" justify="between">
                                                    <Text size="2" weight="medium">
                                                      {env.name}
                                                    </Text>
                                                    <span
                                                      style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "999px",
                                                        backgroundColor: "var(--gray-3)",
                                                        border: "1px solid var(--gray-5)",
                                                        fontSize: 11,
                                                        color: "var(--gray-11)",
                                                      }}
                                                    >
                                                      {env.state}
                                                    </span>
                                                  </Flex>
                                                  {last ? (
                                                    <>
                                                      <Text size="1" color="gray">
                                                        Last deployment: {last.status || "unknown"} • {last.ref || ""} •{" "}
                                                        {last.sha ? last.sha.substring(0, 8) : ""}
                                                      </Text>
                                                      {last.updated_at && (
                                                        <Text size="1" color="gray">
                                                          Updated: {new Date(last.updated_at).toLocaleString()}
                                                        </Text>
                                                      )}
                                                    </>
                                                  ) : (
                                                    <Text size="1" color="gray">
                                                      No deployments found.
                                                    </Text>
                                                  )}
                                                </Flex>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <Text size="2" color="gray">
                                          No environments detected. Create a pipeline with an environment to populate this view.
                                        </Text>
                                      )}
                                    </Flex>
                                  </div>
                                ))}
                              </div>
                            </Flex>
                          ) : (
                            <Text size="3" color="gray">
                              No projects found or accessible. Ensure the token has access to at least one project.
                            </Text>
                          )}
                        </Flex>
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
            Integrations
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

function GithubProfileCard({ githubUser }: { githubUser: any }) {
  // Accent-based palette function copied from Logs page
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

  return (
    <Flex direction="column" gap="4">
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
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
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
              backgroundColor: "white",
            }}
          />
          <Flex direction="column">
            <Text size="5" weight="bold">
              {githubUser.user.name || githubUser.user.login}
            </Text>
            <Text size="3" color="gray">@{githubUser.user.login}</Text>
          </Flex>
        </Flex>
      </div>

      {githubUser.languageCounts &&
        Object.keys(githubUser.languageCounts).length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">Language Breakdown (public repos)</Text>
            {(() => {
              const entries = Object.entries(
                githubUser.languageCounts as Record<string, number>
              ) as [string, number][];
              const sorted = [...entries].sort((a, b) => b[1] - a[1]);
              const total = sorted.reduce((sum, [, c]) => sum + c, 0) || 1;
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
                      const pct = Math.max(0.5, (count / total) * 100);
                      const color = getLangColor(lang);
                      return (
                        <div
                          key={lang}
                          title={`${lang}: ${Math.round((count / total) * 100)}%`}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                            height: "100%",
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </Flex>
        )}

      {Array.isArray(githubUser.publicOrgs) &&
        githubUser.publicOrgs.length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="3" weight="bold">Public Organizations</Text>
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

      {Array.isArray(githubUser.topRepos) && githubUser.topRepos.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="3" weight="bold">Top Public Repos</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {githubUser.topRepos.map((r: any) => {
              const langColor = r.language ? getLangColor(r.language) : "var(--gray-8)";
              return (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid var(--gray-5)",
                    borderRadius: "var(--radius-3)",
                    padding: 12,
                    backgroundColor: "white",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Text size="3" weight="bold">{r.full_name}</Text>
                  </a>
                  {r.description && (
                    <Text size="2" color="gray" style={{ marginTop: 4, display: "block" }}>
                      {r.description}
                    </Text>
                  )}
                  <Flex gap="3" align="center" style={{ marginTop: 8 }}>
                    {r.language && (
                      <Flex align="center" gap="1">
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: langColor,
                            border: "1px solid var(--gray-6)",
                          }}
                        />
                        <Text size="2" color="gray">{r.language}</Text>
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
  );
}

function SentryDataCard({ sentryData }: { sentryData: any }) {
  const getSeverityColor = (level: string): string => {
    switch (level?.toLowerCase()) {
      case "fatal":
      case "error":
        return "var(--red-9)";
      case "warning":
        return "var(--orange-9)";
      case "info":
        return "var(--blue-9)";
      case "debug":
        return "var(--gray-9)";
      default:
        return "var(--gray-8)";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Flex direction="column" gap="4">
      {/* Organization Info */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
        }}
      >
        <Flex gap="3" align="center">
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              backgroundColor: "var(--red-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--gray-6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <ExclamationTriangleIcon width={30} height={30} color="white" />
          </div>
          <Flex direction="column">
            <Text size="5" weight="bold">
              {sentryData.organization.name}
            </Text>
            <Text size="3" color="gray">
              {sentryData.totalProjects} project{sentryData.totalProjects !== 1 ? "s" : ""}
            </Text>
          </Flex>
        </Flex>
      </div>

      {/* Projects and Issues */}
      {sentryData.projects && sentryData.projects.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Projects & Issues</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 12,
            }}
          >
            {sentryData.projects.map((project: any) => (
              <div
                key={project.id}
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  padding: 16,
                  backgroundColor: "white",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <Flex direction="column" gap="2">
                  <Flex align="center" justify="between">
                    <Text size="3" weight="bold">
                      {project.name}
                    </Text>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor:
                          project.issueCount > 0
                            ? "var(--red-3)"
                            : "var(--green-3)",
                        border: "1px solid var(--gray-5)",
                        fontSize: 12,
                        color:
                          project.issueCount > 0
                            ? "var(--red-11)"
                            : "var(--green-11)",
                        fontWeight: 600,
                      }}
                    >
                      {project.issueCount} issue{project.issueCount !== 1 ? "s" : ""}
                    </span>
                  </Flex>
                  {project.slug && (
                    <Text size="2" color="gray">
                      {project.slug}
                    </Text>
                  )}
                  {project.platform && (
                    <Flex align="center" gap="1">
                      <Text size="2" color="gray">Platform:</Text>
                      <Text size="2" weight="medium">{project.platform}</Text>
                    </Flex>
                  )}
                </Flex>

                {/* Recent Issues */}
                {project.issues && project.issues.length > 0 && (
                  <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
                    <Text size="2" weight="bold" color="gray">
                      Recent Issues
                    </Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {project.issues.slice(0, 5).map((issue: any) => (
                        <div
                          key={issue.id}
                          style={{
                            padding: 8,
                            borderRadius: "var(--radius-2)",
                            backgroundColor: "var(--gray-2)",
                            border: "1px solid var(--gray-4)",
                          }}
                        >
                          <Flex direction="column" gap="1">
                            <Flex align="center" justify="between">
                              <Text size="2" weight="medium" style={{ flex: 1 }}>
                                {issue.title || issue.culprit || "Untitled Issue"}
                              </Text>
                              {issue.level && (
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: getSeverityColor(issue.level),
                                    border: "1px solid var(--gray-6)",
                                  }}
                                  title={issue.level}
                                />
                              )}
                            </Flex>
                            {issue.lastSeen && (
                              <Text size="1" color="gray">
                                Last seen: {formatDate(issue.lastSeen)}
                              </Text>
                            )}
                            {issue.count && (
                              <Text size="1" color="gray">
                                {issue.count} occurrence{issue.count !== 1 ? "s" : ""}
                              </Text>
                            )}
                          </Flex>
                        </div>
                      ))}
                    </div>
                  </Flex>
                )}
              </div>
            ))}
          </div>
        </Flex>
      )}

      {(!sentryData.projects || sentryData.projects.length === 0) && (
        <Text size="3" color="gray">
          No projects found in this Sentry organization.
        </Text>
      )}
    </Flex>
  );
}

function SlackDataCard({ slackData }: { slackData: any }) {
  return (
    <Flex direction="column" gap="4">
      {/* Team Info */}
      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-3)",
          border: "1px solid var(--gray-5)",
          background: "linear-gradient(135deg, var(--accent-3), white)",
        }}
      >
        <Flex gap="3" align="center">
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "var(--radius-3)",
              backgroundColor: "var(--purple-9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--gray-6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <ChatBubbleIcon width={30} height={30} color="white" />
          </div>
          <Flex direction="column">
            <Text size="5" weight="bold">
              {slackData.team.name}
            </Text>
            <Text size="3" color="gray">
              {slackData.totalUsers} member{slackData.totalUsers !== 1 ? "s" : ""}
            </Text>
            {slackData.team.url && (
              <a
                href={slackData.team.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: "var(--accent-11)",
                  textDecoration: "none",
                  marginTop: 4,
                }}
              >
                Open in Slack →
              </a>
            )}
          </Flex>
        </Flex>
      </div>

      {/* Users List */}
      {slackData.users && slackData.users.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Team Members</Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {slackData.users.map((member: any) => (
              <div
                key={member.id}
                style={{
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-3)",
                  padding: 12,
                  backgroundColor: "white",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <Flex gap="3" align="center">
                  {member.profile?.image_72 ? (
                    <img
                      src={member.profile.image_72}
                      alt={member.real_name || member.name}
                      width={48}
                      height={48}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: "1px solid var(--gray-5)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "var(--gray-4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--gray-5)",
                      }}
                    >
                      <Text size="3" weight="bold" color="gray">
                        {(member.real_name || member.name || "?")[0].toUpperCase()}
                      </Text>
                    </div>
                  )}
                  <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text size="3" weight="medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.real_name || member.name || "Unknown"}
                    </Text>
                    {member.profile?.display_name && member.profile.display_name !== member.real_name && (
                      <Text size="2" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{member.profile.display_name}
                      </Text>
                    )}
                    {member.profile?.title && (
                      <Text size="1" color="gray" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.profile.title}
                      </Text>
                    )}
                    {member.is_admin && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 6px",
                          borderRadius: "999px",
                          backgroundColor: "var(--purple-3)",
                          color: "var(--purple-11)",
                          fontSize: 10,
                          fontWeight: 600,
                          width: "fit-content",
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </Flex>
                </Flex>
              </div>
            ))}
          </div>
        </Flex>
      )}

      {(!slackData.users || slackData.users.length === 0) && (
        <Text size="3" color="gray">
          No team members found.
        </Text>
      )}
    </Flex>
  );
}


