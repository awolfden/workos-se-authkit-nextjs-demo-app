import NextLink from "next/link";
import { withAuth, getSignInUrl } from "@workos-inc/authkit-nextjs";
import { Button, Flex, Heading, Text, Box } from "@radix-ui/themes";
import { SignInButton } from "./components/SignInButton";
import { jwtDecode } from "jwt-decode";

export default async function HomePage() {
  const { user, accessToken } = await withAuth();
  const authorizationUrl = await getSignInUrl();

  // Decode and log the token if it exists
  if (accessToken) {
    try {
      const decodedToken = jwtDecode(accessToken);
      console.log("Decoded token:", decodedToken);
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }

  return (
    <Box
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: "var(--radius-3)",
      }}
    >
      {/* Content with semi-transparent overlay */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="6"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "3rem",
          backgroundColor: "rgba(255, 255, 255, 0.85)", // Semi-transparent white
          borderRadius: "var(--radius-4)",
          margin: "2rem",
          boxShadow: "var(--shadow-4)",
        }}
      >
        <Heading size="7" align="center">
          WorkOS Example App
        </Heading>

        <Text size="4" align="center" style={{ maxWidth: "600px" }}>
          This example demonstrates how to use WorkOS AuthKit to add
          authentication to your Next.js application.
        </Text>

        {user ? (
          <Flex direction="column" align="center" gap="4">
            <Text size="3">You are signed in as {user.email}</Text>
            <Button asChild size="3">
              <NextLink href="/user-settings">Go to Settings</NextLink>
            </Button>
          </Flex>
        ) : (
          <Flex direction="column" align="center" gap="4">
            <SignInButton
              large
              isSignedIn={false}
              authorizationUrl={authorizationUrl}
            />
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
