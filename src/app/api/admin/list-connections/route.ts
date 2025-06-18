import { NextResponse } from "next/server";
import { WorkOS } from "@workos-inc/node";

if (!process.env.WORKOS_API_KEY || !process.env.WORKOS_CLIENT_ID) {
  throw new Error("Missing required environment variables");
}

const workos = new WorkOS(process.env.WORKOS_API_KEY, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organizationId" },
        { status: 400 }
      );
    }

    const { data } = await workos.sso.listConnections({
      organizationId,
    });

    console.log("[DEBUG] WorkOS sso.listConnections response:", {
      organizationId,
      connectionsCount: data.length,
      connections: data,
    });

    // Check if there's at least one connection with state "active"
    const activeConnections = data.filter(
      (connection) => connection.state === "active"
    );
    const hasActiveConnection = activeConnections.length > 0;

    console.log("[DEBUG] Connection status check:", {
      totalConnections: data.length,
      activeConnections: activeConnections.length,
      hasActiveConnection: hasActiveConnection,
    });

    if (hasActiveConnection) {
      return NextResponse.json({
        ssoEnabled: true,
        connections: data,
        count: data.length,
        activeCount: activeConnections.length,
      });
    }

    return NextResponse.json({
      ssoEnabled: false,
      connections: data,
      count: data.length,
      activeCount: 0,
    });
  } catch (error) {
    console.error("Portal generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate portal link" },
      { status: 500 }
    );
  }
}
