import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "../../workos";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await withAuth({
      ensureSignedIn: true,
    });

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const sessions = await workos.userManagement.listSessions(
      user.id,
    );

    return NextResponse.json({
      sessions: sessions.data,
      metadata: {
        listMetadata: sessions.listMetadata,
      },
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}