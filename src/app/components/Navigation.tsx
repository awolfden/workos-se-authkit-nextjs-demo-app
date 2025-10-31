// Navigation is now a sync component; data is passed from layout
import { Button, Flex, Box } from "@radix-ui/themes";
import NextLink from "next/link";
import { OrganizationSwitcherWidget } from "./Widgets";
import { SignInButton } from "./SignInButton";

export function Navigation({
  user,
  organizationId,
  authToken,
  authorizationUrl,
}: {
  user: { id: string; email: string } | null;
  organizationId?: string;
  authToken?: string;
  authorizationUrl: string;
}) {
  const PROSPECT_LOGO = process.env.PROSPECT_LOGO;

  return (
    <Flex align="center" justify="between" style={{ width: "100%" }}>
      <Flex gap="4" align="center">
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
        {user && organizationId && authToken && (
          <>
            <Button asChild variant="soft">
              <NextLink href="/user-settings">Settings</NextLink>
            </Button>
            <Flex align="center">
              <OrganizationSwitcherWidget authToken={authToken} />
            </Flex>
          </>
        )}
      </Flex>
      {user ? (
        <SignInButton isSignedIn={true} authorizationUrl={authorizationUrl} />
      ) : (
        <SignInButton isSignedIn={false} authorizationUrl={authorizationUrl} />
      )}
    </Flex>
  );
}
