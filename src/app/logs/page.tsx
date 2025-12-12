import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Flex, Tabs } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../styles/tabs.css";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import { CodeIcon, TokensIcon } from "@radix-ui/react-icons";
import { workos } from "../workos";

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
  const validTabs = ["workos-response", "decoded-token"] as const;

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
  // Pipes integrations moved to /integrations

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
                {/* Integrations moved to /integrations */}
              </Tabs.List>

              <Flex
                direction="column"
                style={{
                  width: "calc(100% - 240px)",
                  padding: "20px",
                  backgroundColor: "white",
                  height: "100%",
                  overflow: "auto",
                  overscrollBehavior: "contain",
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
                {/* Integrations moved to /integrations */}
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
