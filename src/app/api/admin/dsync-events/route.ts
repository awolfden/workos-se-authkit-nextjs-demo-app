import { NextResponse } from "next/server";
import { WorkOS } from "@workos-inc/node";

if (!process.env.WORKOS_API_KEY || !process.env.WORKOS_CLIENT_ID) {
  throw new Error("Missing required environment variables");
}

const workos = new WorkOS(process.env.WORKOS_API_KEY, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

/**
 * Directory Sync events are consumed via the WorkOS Events API (not webhooks).
 * See: https://workos.com/docs/events/data-syncing/events-api
 * Uses cursor-based pagination: pass `after` to fetch the next page.
 */
const DSYNC_EVENT_TYPES = [
  "dsync.activated",
  "dsync.deactivated",
  "dsync.deleted",
  "dsync.group.created",
  "dsync.group.deleted",
  "dsync.group.updated",
  "dsync.group.user_added",
  "dsync.group.user_removed",
  "dsync.user.created",
  "dsync.user.deleted",
  "dsync.user.updated",
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
      events: [...DSYNC_EVENT_TYPES],
      organizationId,
      limit,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    };
    if (after) listOptions.after = after;

    const { data: events, listMetadata } = await workos.events.listEvents(listOptions);

    return NextResponse.json({
      events,
      listMetadata: listMetadata ?? null,
    });
  } catch (error) {
    console.error("DSync events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch directory sync events" },
      { status: 500 }
    );
  }
}
