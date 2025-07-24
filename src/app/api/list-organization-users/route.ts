import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "../../workos";

export async function GET() {
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

    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId,
    });

    // Fetch full user details for each membership
    const usersWithDetails = await Promise.all(
      memberships.data.map(async (membership) => {
        try {
          const userDetails = await workos.userManagement.getUser(membership.userId);
          return {
            ...membership,
            user: {
              id: userDetails.id,
              email: userDetails.email,
              firstName: userDetails.firstName,
              lastName: userDetails.lastName,
            }
          };
        } catch (error) {
          console.error(`Failed to fetch details for user ${membership.userId}:`, error);
          // Return membership with minimal user info if getUser fails
          return {
            ...membership,
            user: {
              id: membership.userId,
              email: membership.userId, // fallback
              firstName: null,
              lastName: null,
            }
          };
        }
      })
    );

    return NextResponse.json({
      users: usersWithDetails,
      metadata: {
        listMetadata: memberships.listMetadata,
      },
    });
  } catch (error) {
    console.error("Error fetching organization users:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization users" },
      { status: 500 }
    );
  }
}