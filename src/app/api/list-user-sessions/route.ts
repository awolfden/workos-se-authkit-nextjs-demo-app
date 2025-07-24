import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "../../workos";

export async function GET(request: NextRequest) {
  try {
    const { role, organizationId } = await withAuth({
      ensureSignedIn: true,
    });

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sessions = await workos.userManagement.listSessions(userId);
    
    // Get user details to include name information
    const user = await workos.userManagement.getUser(userId);
    
    // Enhance sessions with user information
    const sessionsWithUser = sessions.data.map(session => ({
      ...session,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    }));

    return NextResponse.json({
      sessions: sessionsWithUser,
      metadata: {
        listMetadata: sessions.listMetadata,
      },
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user sessions" },
      { status: 500 }
    );
  }
}