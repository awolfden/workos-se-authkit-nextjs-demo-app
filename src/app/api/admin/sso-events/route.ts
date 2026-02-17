import { NextResponse } from "next/server";
import { WorkOS } from "@workos-inc/node";

if (!process.env.WORKOS_API_KEY || !process.env.WORKOS_CLIENT_ID) {
  throw new Error("Missing required environment variables");
}

const workos = new WorkOS(process.env.WORKOS_API_KEY, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

/**
 * SSO/connection events consumed via the WorkOS Events API.
 * Uses cursor-based pagination: pass `after` to fetch the next page.
 */
const SSO_EVENT_TYPES = [
  "connection.activated",
  "connection.deactivated",
  "connection.deleted",
  "authentication.sso_succeeded",
  "authentication.sso_failed",
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const after = searchParams.get("after") ?? undefined;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      100
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing organizationId" },
        { status: 400 }
      );
    }

    const rangeEnd = new Date();
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 7);

    const listOptions: Parameters<typeof workos.events.listEvents>[0] = {
      events: [...SSO_EVENT_TYPES],
      organizationId,
      limit,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    };
    if (after) listOptions.after = after;

    const { data: events, listMetadata } =
      await workos.events.listEvents(listOptions);

    return NextResponse.json({
      events,
      listMetadata: listMetadata ?? null,
    });
  } catch (error) {
    console.error("SSO events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SSO events" },
      { status: 500 }
    );
  }
}
