import { Button, Flex } from "@radix-ui/themes";

export function SignInButton({
  large,
  isSignedIn,
  authorizationUrl,
}: {
  large?: boolean;
  isSignedIn: boolean;
  authorizationUrl: string;
}) {
  if (isSignedIn) {
    return (
      <Flex gap="3">
        <form method="POST" action="/api/sign-out">
          <Button type="submit" size={large ? "3" : "2"}>
            Sign Out
          </Button>
        </form>
      </Flex>
    );
  }

  return (
    <Button asChild size={large ? "3" : "2"}>
      <a href={authorizationUrl}>Sign In {large && "with AuthKit"}</a>
    </Button>
  );
}
