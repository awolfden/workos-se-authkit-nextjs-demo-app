import { NextResponse } from "next/server";
import { switchToOrganizationAction } from "../../server-functions/switch-to-organization";

export async function POST(req: Request) {
  try {
    const { organizationId, pathname } = await req.json();

    await switchToOrganizationAction({
      organizationId,
      pathname,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error switching organization:", error);
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 }
    );
  }
}
