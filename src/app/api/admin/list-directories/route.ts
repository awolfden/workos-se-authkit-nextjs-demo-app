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

    const { data } = await workos.directorySync.listDirectories({
      organizationId,
    });

    console.log("[DEBUG] WorkOS directorySync.listDirectories response:", {
      organizationId,
      directoriesCount: data.length,
      directories: data,
    });

    // Check if there's at least one directory with state "active"
    const activeDirectories = data.filter(
      (directory) => directory.state === "active"
    );
    const hasActiveDirectory = activeDirectories.length > 0;

    console.log("[DEBUG] Directory status check:", {
      totalDirectories: data.length,
      activeDirectories: activeDirectories.length,
      hasActiveDirectory: hasActiveDirectory,
    });

    if (hasActiveDirectory) {
      return NextResponse.json({
        dsyncEnabled: true,
        directories: data,
        count: data.length,
        activeCount: activeDirectories.length,
      });
    }

    return NextResponse.json({
      dsyncEnabled: false,
      directories: data,
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
