import { withAuth } from "@workos-inc/authkit-nextjs";
import { Button, Flex, Box, Text } from "@radix-ui/themes";
import NextLink from "next/link";
import { OrganizationSwitcherWidget } from "./Widgets";
import { workos } from "../workos";

export async function Navigation() {
  const { organizationId, user } = await withAuth({});

  if (!organizationId) {
    return;
  }

  const PROSPECT_LOGO = process.env.PROSPECT_LOGO;

  const widgetScopes: string[] = [
    "widgets:users-table:manage",
    "widgets:sso:manage",
    "widgets:api-keys:manage",
    "widgets:domain-verification:manage",
  ];

  const authToken = await (workos.widgets as any).getToken({
    userId: user.id,
    organizationId,
    scopes: widgetScopes,
  });

  return (
    <Flex gap="4">
      <Box mr="2" style={{ fontSize: "24px" }}>
        <img
          src={PROSPECT_LOGO}
          alt=""
          style={{ height: "30px", width: "30px" }}
        />
      </Box>
      <Button asChild variant="soft">
        <NextLink href="/">Home</NextLink>
      </Button>
      {user && (
        <>
          <Button asChild variant="soft">
            <NextLink href="/integrations">Integrations</NextLink>
          </Button>
          <Button asChild variant="soft">
            <NextLink href="/user-settings">Settings</NextLink>
          </Button>
          <Button asChild variant="soft">
            <NextLink href="/logs">Logs</NextLink>
          </Button>
          <OrganizationSwitcherWidget authToken={authToken} />
        </>
      )}
    </Flex>
  );
}
