"use client";

import { Card, Heading, Text, Spinner } from "@radix-ui/themes";
import React from "react";

type PortalIntent = "sso" | "dsync" | "audit_logs";

interface PortalButtonProps {
  organizationId: string;
  intent: PortalIntent;
}

export async function checkSSOStatus(organizationId: string) {
  try {
    const response = await fetch(
      `/api/admin/list-connections?organizationId=${organizationId}`
    );
    const data = await response.json();
    return data.ssoEnabled;
  } catch (error) {
    console.error("Error listing connections:", error);
    return false;
  }
}

export async function checkDSyncStatus(organizationId: string) {
  try {
    const response = await fetch(
      `/api/admin/list-directories?organizationId=${organizationId}`
    );
    const data = await response.json();
    console.log("directory data:", data.directories);
    return data.dsyncEnabled;
  } catch (error) {
    console.error("Error listing connections:", error);
    return false;
  }
}

export default function PortalButton({
  organizationId,
  intent,
}: PortalButtonProps) {
  const [isSSOEnabled, setIsSSOEnabled] = React.useState(false);
  const [isDSyncEnabled, setIsDSyncEnabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStatuses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [ssoStatus, dsyncStatus] = await Promise.all([
        checkSSOStatus(organizationId),
        checkDSyncStatus(organizationId),
      ]);
      setIsSSOEnabled(ssoStatus);
      setIsDSyncEnabled(dsyncStatus);
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  React.useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handlePortalClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization: organizationId,
          intent,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error generating portal link:", error);
    }
  };

  // Dynamically set the heading and text based on intent
  const getContent = () => {
    switch (intent) {
      case "sso":
        return {
          heading: isSSOEnabled ? "Manage SSO" : "Configure SSO",
          text: isSSOEnabled
            ? "Update your SSO settings"
            : "Set up Single Sign-On",
        };
      case "dsync":
        return {
          heading: isDSyncEnabled ? "Manage SCIM" : "Configure SCIM",
          text: isDSyncEnabled ? "Update your SCIM settings" : "Set up SCIM",
        };
      case "audit_logs":
        return {
          heading: "View Audit Logs",
          text: "Manage your Audit Logs configuration",
        };
    }
  };

  const content = getContent();

  return (
    <Card size="2" asChild variant="classic">
      <a
        onClick={handlePortalClick}
        style={{ cursor: "pointer" }}
        role="button"
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <Spinner size="2" />
          </div>
        ) : (
          <>
            <Heading size="4" mb="1">
              {content.heading}
            </Heading>
            <Text color="gray">{content.text}</Text>
          </>
        )}
      </a>
    </Card>
  );
}
