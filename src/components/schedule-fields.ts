// Field definitions shared by create and edit forms (plain data, safe to pass to client components).
import { toLocalInput, zoneLabel } from "@/lib/time";

type Event = { name: string; description: string | null; location: string | null; startsAt: Date; endsAt: Date; visibility: string };
type Entry = {
  type: string;
  title: string;
  teamId: string | null;
  opponent: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  visibility: string;
  result: string | null;
};

const tz = () => `Times are ${zoneLabel()}.`;

export function eventFields(e?: Event) {
  return [
    { label: "Event name", name: "name", defaultValue: e?.name },
    { label: "Location", name: "location", required: false, defaultValue: e?.location ?? "", hint: "Room, address or “Online”" },
    { label: "Starts", name: "startsAt", type: "datetime-local", defaultValue: e && toLocalInput(e.startsAt), hint: tz() },
    { label: "Ends", name: "endsAt", type: "datetime-local", defaultValue: e && toLocalInput(e.endsAt) },
    {
      label: "Who can see it",
      name: "visibility",
      defaultValue: e?.visibility ?? "PUBLIC",
      options: [
        { value: "PUBLIC", label: "Everyone, including visitors" },
        { value: "MEMBERS", label: "Logged-in members" },
      ],
    },
    { label: "Description", name: "description", required: false, rows: 3, defaultValue: e?.description ?? "" },
  ];
}

export function entryFields(teams: { id: string; name: string }[], e?: Entry) {
  return [
    {
      label: "Type",
      name: "type",
      defaultValue: e?.type ?? "MATCH",
      options: [
        { value: "MATCH", label: "Match" },
        { value: "SCRIM", label: "Scrim" },
        { value: "PRACTICE", label: "Practice" },
        { value: "OTHER", label: "Other" },
      ],
    },
    {
      label: "Team",
      name: "teamId",
      defaultValue: e?.teamId ?? "",
      options: [{ value: "", label: "Whole game (no team)" }, ...teams.map((t) => ({ value: t.id, label: t.name }))],
    },
    { label: "Opponent", name: "opponent", required: false, defaultValue: e?.opponent ?? "" },
    { label: "Title", name: "title", required: false, defaultValue: e?.title ?? "", hint: "Optional; generated from team, type and opponent" },
    { label: "Starts", name: "startsAt", type: "datetime-local", defaultValue: e && toLocalInput(e.startsAt), hint: tz() },
    { label: "Ends", name: "endsAt", type: "datetime-local", defaultValue: e && toLocalInput(e.endsAt) },
    { label: "Location", name: "location", required: false, defaultValue: e?.location ?? "" },
    {
      label: "Who can see it",
      name: "visibility",
      defaultValue: e?.visibility ?? "DEFAULT",
      options: [
        { value: "DEFAULT", label: "Default (matches public, practices & scrims team-only)" },
        { value: "PUBLIC", label: "Everyone, including visitors" },
        { value: "MEMBERS", label: "Logged-in members" },
        { value: "TEAM", label: "Team only" },
      ],
    },
    ...(e ? [{ label: "Result", name: "result", required: false, defaultValue: e.result ?? "", hint: "e.g. W 2–1" }] : []),
    { label: "Save even if it overlaps another entry for this team", name: "allowConflict", type: "checkbox" },
  ];
}
