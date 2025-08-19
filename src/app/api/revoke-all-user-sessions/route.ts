import { NextRequest, NextResponse } from "next/server";
import { withAuth, signOut } from "@workos-inc/authkit-nextjs";
import { workos } from "../../workos";

export async function DELETE(request: NextRequest) {
  try {
    const { role, organizationId, user, sessionId } = await withAuth({
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

    // Check if the current user is trying to revoke their own sessions
    const isCurrentUser = userId === user.id;

    // First get all sessions for the user
    const userSessions = await workos.userManagement.listSessions(userId);
    
    // Revoke each session
    const revokePromises = userSessions.data.map(session =>
      workos.userManagement.revokeSession({ sessionId: session.id })
    );

    await Promise.all(revokePromises);

    // If the current user revoked their own sessions, sign them out using WorkOS SDK
    if (isCurrentUser) {
      await signOut();
      return NextResponse.json({
        success: true,
        message: `Successfully revoked ${userSessions.data.length} session(s)`,
        revokedCount: userSessions.data.length,
        shouldLogout: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully revoked ${userSessions.data.length} session(s)`,
      revokedCount: userSessions.data.length,
      shouldLogout: false,
    });
  } catch (error) {
    console.error("Error revoking all user sessions:", error);
    return NextResponse.json(
      { error: "Failed to revoke all user sessions" },
      { status: 500 }
    );
  }
}