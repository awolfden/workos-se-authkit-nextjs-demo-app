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

  const authToken = await workos.widgets.getToken({
    userId: user.id,
    organizationId,
  });

  return (
    <Flex gap="4">
      <Box mr="2" style={{ fontSize: "24px" }}>
        <img
          src="https://media.licdn.com/dms/image/v2/C4D0BAQEeZoyawvJXEw/company-logo_200_200/company-logo_200_200/0/1631309504023?e=1755734400&v=beta&t=ori2duZVXg6XkhaTc5x-rnCEH9U9hJfmA9RdglVJvRU"
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
            <NextLink href="/user-settings">Settings</NextLink>
          </Button>

          <OrganizationSwitcherWidget authToken={authToken} />
        </>
      )}
    </Flex>
  );
}
