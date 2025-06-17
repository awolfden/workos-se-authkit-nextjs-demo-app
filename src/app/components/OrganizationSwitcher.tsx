"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OrganizationSwitcher, WorkOsWidgets } from "@workos-inc/widgets";
import { CreateOrganization } from "./CreateOrganization";
import { Flex, Spinner } from "@radix-ui/themes";
import { switchOrganization } from "../actions/switch-organization";

export default function OrganizationSwitcherClient({
  authToken,
}: {
  authToken: string;
}) {
  const pathname = usePathname();
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
              await switchOrganization({ organizationId, pathname });
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
