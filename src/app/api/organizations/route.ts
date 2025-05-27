import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "../../workos";

export async function POST(req: Request) {
  try {
    const { user } = await withAuth({
      ensureSignedIn: true,
    });

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Create the organization in WorkOS
    const organization = await workos.organizations.createOrganization({
      name,
      domains: [], // Optional: Add domains if needed
    });

    // Add the current user to the organization
    await workos.userManagement.createOrganizationMembership({
      organizationId: organization.id,
      userId: user.id,
      roleSlug: "admin", // Make the creator an admin
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
