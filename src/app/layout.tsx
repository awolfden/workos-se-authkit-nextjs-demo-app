// Import the base CSS styles for the radix-ui components.
import "@radix-ui/themes/styles.css";

import type { Metadata } from "next";
import { Theme, Card, Container, Flex, Box } from "@radix-ui/themes";
import { Footer } from "./components/Footer";
import {
  AuthKitProvider,
  Impersonation,
} from "@workos-inc/authkit-nextjs/components";
import { Navigation } from "./components/Navigation";
import { workos } from "./workos";
import { getSignInUrl, withAuth } from "@workos-inc/authkit-nextjs";
import GlobalLoading from "./components/global-loading";
import Script from "next/script";

const ACCENT_COLOR = process.env.ACCENT_COLOR;

export const metadata: Metadata = {
  title: "Example AuthKit Authenticated App",
  description: "Example Next.js application demonstrating how to use AuthKit.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organizationId } = await withAuth({});
  const authToken = organizationId
    ? await workos.widgets.getToken({
        userId: user?.id as string,
        organizationId,
      })
    : undefined;
  const authorizationUrl = await getSignInUrl();
  return (
    <html lang="en">
      <head>
        <Script id="prevent-fouc" strategy="beforeInteractive">
          {`
            (function() {
              // Create and add a style element to hide the body initially
              var style = document.createElement('style');
              style.id = 'fouc-prevention';
              style.innerHTML = 'body { visibility: hidden; }';
              document.head.appendChild(style);
              
              // Remove the style when the page is fully loaded
              window.addEventListener('load', function() {
                setTimeout(function() {
                  var style = document.getElementById('fouc-prevention');
                  if (style) {
                    style.remove();
                  }
                }, 300);
              });
            })();
          `}
        </Script>
      </head>
      <body style={{ padding: 0, margin: 0 }}>
        <GlobalLoading />
        <Theme
          accentColor={ACCENT_COLOR as any}
          panelBackground="solid"
          style={{ backgroundColor: "var(--gray-1)" }}
        >
          <AuthKitProvider>
            <Impersonation />
            <Container
              size={{ initial: "4", md: "4" }}
              px={{ initial: "4", sm: "6" }}
              style={{ maxWidth: "100%" }}
            >
              <Flex direction="column" gap="5" p="5" height="100vh">
                <Box asChild flexGrow="1">
                  <Card style={{ width: "100%", maxWidth: "100%" }}>
                    <Flex direction="column" height="100%">
                      <Flex asChild justify="between">
                        <header>
                          <Navigation
                            user={user ?? null}
                            organizationId={organizationId}
                            authToken={authToken}
                            authorizationUrl={authorizationUrl}
                          />
                        </header>
                      </Flex>
                      <Flex flexGrow="1" align="center" justify="center">
                        <main>{children}</main>
                      </Flex>
                    </Flex>
                  </Card>
                </Box>
                <Footer />
              </Flex>
            </Container>
          </AuthKitProvider>
        </Theme>
      </body>
    </html>
  );
}
