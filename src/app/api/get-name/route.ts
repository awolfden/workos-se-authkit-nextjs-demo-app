import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const { user } = await withAuth();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ name: user.firstName });
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
};
