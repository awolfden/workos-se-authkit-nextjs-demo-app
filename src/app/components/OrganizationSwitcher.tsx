"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrganizationSwitcher, WorkOsWidgets } from "@workos-inc/widgets";
import { CreateOrganization } from "./CreateOrganization";
import { Flex, Spinner } from "@radix-ui/themes";
import { switchOrganization } from "../actions/switch-organization";

// Helper function to get the API hostname for client-side widgets
// Strips any protocol prefix to ensure it's just the hostname
// Note: Only NEXT_PUBLIC_* env vars are available in client-side code
function getApiHostname(): string | undefined {
  const hostname = process.env.NEXT_PUBLIC_WORKOS_API_HOSTNAME;
  if (!hostname) return undefined;
  // Strip any existing protocol (https:// or http://) and trim
  return hostname.replace(/^https?:\/\//, "").trim() || undefined;
}

const apiHostname = getApiHostname();

export default function OrganizationSwitcherClient({
  authToken,
}: {
  authToken: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Create a loading overlay component
  const LoadingOverlay = () => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        transition: "opacity 0.3s ease",
      }}
    >
      <Flex direction="column" align="center" gap="2">
        <Spinner size="2" />
        <div>Switching organization...</div>
      </Flex>
    </div>
  );

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <WorkOsWidgets
        apiHostname={apiHostname}
        theme={{
          appearance: "light",
          radius: "medium",
          fontFamily: "Arial",
          panelBackground: "translucent",
        }}
      >
        <OrganizationSwitcher
          authToken={authToken}
          switchToOrganization={async ({ organizationId }) => {
            try {
              setIsLoading(true);
              // Get the current tab from search params
              const tab = searchParams.get("tab");
              // Construct the full pathname with the tab parameter
              const fullPathname = tab ? `${pathname}?tab=${tab}` : pathname;
              await switchOrganization({
                organizationId,
                pathname: fullPathname,
              });
            } catch (error) {
              console.error("Error switching organization:", error);
              setIsLoading(false);
            }
          }}
        >
          <CreateOrganization />
        </OrganizationSwitcher>
      </WorkOsWidgets>
    </>
  );
}
