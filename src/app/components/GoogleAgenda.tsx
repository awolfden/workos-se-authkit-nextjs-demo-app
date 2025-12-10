"use client";
import React from "react";
import { Flex, Text } from "@radix-ui/themes";

type CalendarItem = {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
};

type CalendarEvent = {
  id?: string;
  summary?: string;
  location?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  _calendarId: string;
  _calendarSummary: string;
  _calendarBg?: string;
};

export function GoogleAgenda({
  calendars,
  eventsByDay,
}: {
  calendars: CalendarItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventsByDay: Record<string, CalendarEvent[]>;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(calendars.map((c) => c.id))
  );

  const calendarsRef = React.useRef<HTMLDivElement | null>(null);
  const agendaRef = React.useRef<HTMLDivElement | null>(null);

  // No manual wheel handling; rely on CSS overscroll-behavior: none to prevent scroll chaining

  const toggleCalendar = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredEventsByDay = React.useMemo(() => {
    const result: Record<string, CalendarEvent[]> = {};
    Object.keys(eventsByDay).forEach((day) => {
      const filtered = (eventsByDay[day] || []).filter((ev) =>
        selected.has(ev._calendarId)
      );
      if (filtered.length > 0) {
        result[day] = filtered;
      }
    });
    return result;
  }, [eventsByDay, selected]);

  const dayKeys = React.useMemo(
    () => Object.keys(filteredEventsByDay).sort(),
    [filteredEventsByDay]
  );

  return (
    <Flex
      direction="row"
      gap="4"
      style={{ width: "100%", height: "70vh", overflow: "hidden" }}
    >
      {/* Left column: Calendars (vertical) */}
      <Flex
        direction="column"
        gap="2"
        style={{
          width: "260px",
          flexShrink: 0,
          maxHeight: "70vh",
          overflow: "auto",
          overscrollBehavior: "none",
        }}
        ref={calendarsRef}
      >
        <Text size="3" weight="bold">
          Calendars
        </Text>
        <Flex direction="column" gap="2">
          {calendars.map((c) => {
            const active = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCalendar(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid var(--gray-5)",
                  borderRadius: "var(--radius-2)",
                  padding: "6px 8px",
                  backgroundColor: active ? "var(--accent-3)" : "var(--gray-2)",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "1px",
                    backgroundColor: c.backgroundColor || "var(--accent-9)",
                    border: "1px solid var(--gray-6)",
                  }}
                />
                <Text size="1" style={{ flex: 1 }}>
                  {c.summary}
                </Text>
              </button>
            );
          })}
        </Flex>
      </Flex>

      {/* Right column: Agenda */}
      <Flex
        direction="column"
        gap="3"
        style={{
          flex: 1,
          minWidth: 0,
          maxHeight: "70vh",
          overflow: "auto",
          overscrollBehavior: "none",
        }}
        ref={agendaRef}
      >
        <Text size="3" weight="bold">
          Agenda (Next 7 Days)
        </Text>
        <Flex direction="column" gap="3" style={{ backgroundColor: "white" }}>
          {dayKeys.length === 0 && (
            <Text size="2" color="gray">
              No events for the selected calendars.
            </Text>
          )}
          {dayKeys.map((dateKey) => {
            const day = new Date(dateKey + "T00:00:00");
            const dayLabel = day.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
            const events = filteredEventsByDay[dateKey] || [];
            return (
              <Flex key={dateKey} direction="column" gap="2">
                <Text size="3" weight="bold" color="gray">
                  {dayLabel}
                </Text>
                <Flex direction="column" gap="2">
                  {events.map((ev, idx) => {
                    const startStr = ev.start?.dateTime || ev.start?.date;
                    const endStr = ev.end?.dateTime || ev.end?.date;
                    const allDay = !!ev.start?.date && !ev.start?.dateTime;
                    const start = startStr ? new Date(startStr) : null;
                    const end = endStr ? new Date(endStr) : null;
                    const timeLabel = allDay
                      ? "All day"
                      : `${start?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} - ${end?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`;
                    return (
                      <Flex
                        key={`${ev.id || "ev"}-${idx}`}
                        align="start"
                        gap="3"
                        style={{
                          border: "1px solid var(--gray-5)",
                          borderRadius: "var(--radius-3)",
                          padding: 12,
                          backgroundColor: "white",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "10px",
                            height: "10px",
                            marginTop: 4,
                            borderRadius: "2px",
                            backgroundColor: ev._calendarBg || "var(--accent-9)",
                            border: "1px solid var(--gray-6)",
                          }}
                        />
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Text size="3" weight="bold">
                            <span
                              style={{
                                display: "inline-block",
                                filter: "blur(4px)",
                                userSelect: "none",
                              }}
                            >
                              {ev.summary || "(No title)"}
                            </span>
                          </Text>
                          <Text size="2" color="gray">
                            {timeLabel} • {ev._calendarSummary}
                          </Text>
                          {ev.location && (
                            <Text size="2" color="gray">
                              {ev.location}
                            </Text>
                          )}
                          {ev.hangoutLink && (
                            <a
                              href={ev.hangoutLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 12 }}
                            >
                              Join video call
                            </a>
                          )}
                        </Flex>
                      </Flex>
                    );
                  })}
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Flex>
  );
}


