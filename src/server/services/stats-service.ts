// FREQ30 (enter team data), FREQ43 (calculated stats), FREQ46 (players view), FREQ61 (definitions).
// Only INPUT values are stored; DERIVED values are always computed on read, so formula edits apply everywhere.
import type { StatDefinition, StatLevel } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { authorize } from "@/server/authz/context";
import { can, type AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError, type FieldErrors } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { localDateTime } from "@/server/validation/datetime";
import { evaluate, FormulaError, formulaVariables } from "@/lib/formula";
import { requireGame } from "./game-service";
import { teamWith } from "./team-data-common";
import { teamResource } from "./team-service";

type Values = Record<string, number>;
const MAX_ABS = 1_000_000;

// ─────────── Definitions (Admin) ───────────

export async function listDefinitions(gameId: string) {
  return db.statDefinition.findMany({ where: { gameId }, orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
}

const defSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{0,29}$/, "Use lowercase letters, numbers and underscores, starting with a letter."),
  label: z.string().trim().min(1, "Label is required.").max(40, "Label must be at most 40 characters."),
  level: z.enum(["PLAYER", "TEAM"]),
  kind: z.enum(["INPUT", "DERIVED"]),
  formula: z.string().trim().max(200).optional().transform((v) => v || null),
  precision: z.coerce.number().int().min(0, "0–3").max(3, "0–3").default(0),
});

async function validateFormula(gameId: string, level: StatLevel, formula: string | null, selfKey: string): Promise<FieldErrors | null> {
  if (!formula) return { formula: ["Derived stats need a formula."] };
  let vars: string[];
  try {
    vars = formulaVariables(formula);
  } catch (e) {
    return { formula: [e instanceof FormulaError ? e.message : "Invalid formula."] };
  }
  const inputs = new Set(
    (await db.statDefinition.findMany({ where: { gameId, level, kind: "INPUT" }, select: { key: true } })).map((d) => d.key),
  );
  const unknown = vars.filter((v) => v !== "games" && (!inputs.has(v) || v === selfKey));
  if (unknown.length) return { formula: [`Unknown ${level.toLowerCase()} input stat(s): ${unknown.join(", ")}.`] };
  return null;
}

export async function createDefinition(actor: AuthzContext, gameId: string, input: unknown) {
  authorize(actor, "games.manage", { type: "global" });
  await requireGame(gameId);
  const data = parseOrThrow(defSchema, input);
  if (data.key === "games") throw new ServiceError("VALIDATION", "“games” is reserved.", { key: ["“games” is reserved (it means the number of matches)."] });
  if (data.kind === "DERIVED") {
    const errors = await validateFormula(gameId, data.level, data.formula, data.key);
    if (errors) throw new ServiceError("VALIDATION", "Please fix the formula.", errors);
  } else data.formula = null;
  const sortOrder = await db.statDefinition.count({ where: { gameId } });
  try {
    return await db.statDefinition.create({ data: { ...data, gameId, sortOrder } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ServiceError("VALIDATION", "That key is already used.", { key: ["That key is already used for this game."] });
    }
    throw err;
  }
}

const defUpdateSchema = z.object({
  label: defSchema.shape.label,
  formula: defSchema.shape.formula,
  precision: defSchema.shape.precision,
});

export async function updateDefinition(actor: AuthzContext, id: string, input: unknown) {
  authorize(actor, "games.manage", { type: "global" });
  const def = await db.statDefinition.findUnique({ where: { id } });
  if (!def) throw new NotFoundError("Stat not found.");
  const data = parseOrThrow(defUpdateSchema, input);
  if (def.kind === "DERIVED") {
    const errors = await validateFormula(def.gameId, def.level, data.formula, def.key);
    if (errors) throw new ServiceError("VALIDATION", "Please fix the formula.", errors);
  }
  return db.statDefinition.update({ where: { id }, data: { label: data.label, precision: data.precision, formula: def.kind === "DERIVED" ? data.formula : null } });
}

export async function deleteDefinition(actor: AuthzContext, id: string) {
  authorize(actor, "games.manage", { type: "global" });
  const def = await db.statDefinition.findUnique({ where: { id } });
  if (!def) throw new NotFoundError("Stat not found.");
  if (def.kind === "INPUT") {
    const dependents = (await db.statDefinition.findMany({ where: { gameId: def.gameId, level: def.level, kind: "DERIVED" } })).filter((d) =>
      d.formula ? formulaVariables(d.formula).includes(def.key) : false,
    );
    if (dependents.length) {
      throw new ServiceError("IN_USE", `Used by ${dependents.map((d) => d.label).join(", ")}. Delete or change those first.`);
    }
  }
  await db.statDefinition.delete({ where: { id } });
}

/** One-click starter set; skips keys that already exist. */
export const TEMPLATE: { key: string; label: string; level: StatLevel; kind: "INPUT" | "DERIVED"; formula?: string; precision?: number }[] = [
  { key: "kills", label: "Kills", level: "PLAYER", kind: "INPUT" },
  { key: "deaths", label: "Deaths", level: "PLAYER", kind: "INPUT" },
  { key: "assists", label: "Assists", level: "PLAYER", kind: "INPUT" },
  { key: "kda", label: "KDA", level: "PLAYER", kind: "DERIVED", formula: "(kills + assists) / deaths", precision: 2 },
  { key: "won", label: "Won (1/0)", level: "TEAM", kind: "INPUT" },
  { key: "score_for", label: "Score for", level: "TEAM", kind: "INPUT" },
  { key: "score_against", label: "Score against", level: "TEAM", kind: "INPUT" },
  { key: "win_rate", label: "Win rate %", level: "TEAM", kind: "DERIVED", formula: "100 * won / games", precision: 0 },
  { key: "diff", label: "Score diff", level: "TEAM", kind: "DERIVED", formula: "score_for - score_against" },
];

export async function addTemplate(actor: AuthzContext, gameId: string) {
  authorize(actor, "games.manage", { type: "global" });
  await requireGame(gameId);
  const existing = new Set((await listDefinitions(gameId)).map((d) => d.key));
  let order = existing.size;
  const rows = TEMPLATE.filter((t) => !existing.has(t.key)).map((t) => ({
    gameId,
    key: t.key,
    label: t.label,
    level: t.level,
    kind: t.kind,
    formula: t.formula ?? null,
    precision: t.precision ?? 0,
    sortOrder: order++,
  }));
  await db.statDefinition.createMany({ data: rows });
  return rows.length;
}

// ─────────── Computation ───────────

/** `games` is a built-in variable: number of sheets/lines aggregated (1 for a single sheet). */
export function computeRow(defs: StatDefinition[], level: StatLevel, inputs: Values, games = 1): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const vars = { ...inputs, games };
  for (const d of defs.filter((x) => x.level === level)) {
    out[d.key] = d.kind === "INPUT" ? (inputs[d.key] ?? null) : d.formula ? evaluate(d.formula, vars) : null;
  }
  return out;
}

function asValues(json: Prisma.JsonValue): Values {
  const out: Values = {};
  if (json && typeof json === "object" && !Array.isArray(json)) {
    for (const [k, v] of Object.entries(json)) if (typeof v === "number") out[k] = v;
  }
  return out;
}

function sumRows(rows: Values[]): Values {
  const out: Values = {};
  for (const r of rows) for (const [k, v] of Object.entries(r)) out[k] = (out[k] ?? 0) + v;
  return out;
}

// ─────────── Sheets (Game Manager) ───────────

const sheetMeta = z.object({
  title: z.string().trim().min(1, "Title is required.").max(100, "Title must be at most 100 characters."),
  playedAt: localDateTime("Date played"),
  scheduleEntryId: z.string().trim().optional().transform((v) => v || null),
});

export type SheetInput = {
  title: string;
  playedAt: string | Date;
  scheduleEntryId?: string;
  team: Record<string, string | number>;
  players: Record<string, Record<string, string | number>>;
};

function parseNumbers(defs: StatDefinition[], raw: Record<string, string | number> | undefined, prefix: string, errors: FieldErrors): Values {
  const out: Values = {};
  for (const d of defs) {
    const v = raw?.[d.key];
    if (v === undefined || v === "") continue;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || Math.abs(n) > MAX_ABS) errors[`${prefix}.${d.key}`] = ["Enter a number."];
    else out[d.key] = n;
  }
  return out;
}

async function prepareSheet(actor: AuthzContext, teamId: string, input: SheetInput, existingPlayerIds: string[] = []) {
  const team = await teamWith(actor, teamId, "teamData.manage");
  const meta = parseOrThrow(sheetMeta, input);
  if (meta.scheduleEntryId) {
    const entry = await db.scheduleEntry.findUnique({ where: { id: meta.scheduleEntryId } });
    if (!entry || entry.teamId !== teamId) throw new ServiceError("VALIDATION", "Choose one of this team's matches.", { scheduleEntryId: ["Choose one of this team's matches."] });
  }
  const defs = (await listDefinitions(team.gameId)).filter((d) => d.kind === "INPUT");
  if (defs.length === 0) throw new ServiceError("NO_STATS", "An Admin needs to set up stats for this game first.");
  const errors: FieldErrors = {};
  const teamValues = parseNumbers(defs.filter((d) => d.level === "TEAM"), input.team, "team", errors);

  const roster = new Set([...(await db.teamMembership.findMany({ where: { teamId }, select: { userId: true } })).map((m) => m.userId), ...existingPlayerIds]);
  const lines: { userId: string; values: Values }[] = [];
  for (const [userId, raw] of Object.entries(input.players ?? {})) {
    if (!roster.has(userId)) throw new ServiceError("VALIDATION", "Stats can only be entered for this team's players.");
    const values = parseNumbers(defs.filter((d) => d.level === "PLAYER"), raw, `p.${userId}`, errors);
    if (Object.keys(values).length) lines.push({ userId, values });
  }
  if (Object.keys(errors).length) throw new ServiceError("VALIDATION", "Some values aren't numbers.", errors);
  if (!Object.keys(teamValues).length && !lines.length) throw new ServiceError("EMPTY", "Enter at least one value.");
  return { meta, teamValues, lines };
}

export async function createSheet(actor: AuthzContext, teamId: string, input: SheetInput) {
  const { meta, teamValues, lines } = await prepareSheet(actor, teamId, input);
  return db.statSheet.create({
    data: { ...meta, teamId, teamValues, enteredById: actor.userId, lines: { create: lines } },
  });
}

export async function updateSheet(actor: AuthzContext, sheetId: string, input: SheetInput) {
  const sheet = await db.statSheet.findUnique({ where: { id: sheetId }, include: { lines: { select: { userId: true } } } });
  if (!sheet) throw new NotFoundError("Stat sheet not found.");
  const { meta, teamValues, lines } = await prepareSheet(actor, sheet.teamId, input, sheet.lines.map((l) => l.userId));
  await db.$transaction([
    db.playerStatLine.deleteMany({ where: { sheetId } }),
    db.statSheet.update({ where: { id: sheetId }, data: { ...meta, teamValues, lines: { create: lines } } }),
  ]);
}

export async function deleteSheet(actor: AuthzContext, sheetId: string) {
  const sheet = await db.statSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) throw new NotFoundError("Stat sheet not found.");
  await teamWith(actor, sheet.teamId, "teamData.manage");
  await db.$transaction([
    db.comment.deleteMany({ where: { targetType: "STAT_SHEET", targetId: sheetId } }),
    db.statSheet.delete({ where: { id: sheetId } }),
  ]);
}

export async function getSheet(actor: AuthzContext, sheetId: string) {
  const sheet = await db.statSheet.findUnique({
    where: { id: sheetId },
    include: { lines: { include: { user: { select: { id: true, username: true } } } }, enteredBy: { select: { username: true } } },
  });
  if (!sheet) throw new NotFoundError("Stat sheet not found.");
  const team = await teamWith(actor, sheet.teamId, "teamData.view");
  const defs = await listDefinitions(team.gameId);
  return {
    team,
    sheet,
    defs,
    canManage: can(actor, "teamData.manage", teamResource(team)),
    teamRow: computeRow(defs, "TEAM", asValues(sheet.teamValues)),
    playerRows: sheet.lines
      .map((l) => ({ user: l.user, inputs: asValues(l.values), row: computeRow(defs, "PLAYER", asValues(l.values)) }))
      .sort((a, b) => a.user.username.localeCompare(b.user.username)),
  };
}

/** FREQ46: season summary — totals and per-game averages of inputs; derived stats over totals. */
export async function getTeamStats(actor: AuthzContext, teamId: string) {
  const team = await teamWith(actor, teamId, "teamData.view");
  const [defs, sheets] = await Promise.all([
    listDefinitions(team.gameId),
    db.statSheet.findMany({
      where: { teamId },
      orderBy: { playedAt: "desc" },
      include: { lines: { include: { user: { select: { id: true, username: true } } } } },
    }),
  ]);

  const teamInputs = sheets.map((s) => asValues(s.teamValues)).filter((v) => Object.keys(v).length);
  const teamTotals = sumRows(teamInputs);

  const byPlayer = new Map<string, { user: { id: string; username: string }; rows: Values[] }>();
  for (const s of sheets) {
    for (const l of s.lines) {
      const e = byPlayer.get(l.userId) ?? { user: l.user, rows: [] };
      e.rows.push(asValues(l.values));
      byPlayer.set(l.userId, e);
    }
  }
  const players = [...byPlayer.values()]
    .map((p) => {
      const totals = sumRows(p.rows);
      const games = p.rows.length;
      return {
        user: p.user,
        games,
        totals: computeRow(defs, "PLAYER", totals, games),
        averages: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / games])),
      };
    })
    .sort((a, b) => a.user.username.localeCompare(b.user.username));

  return {
    team,
    defs,
    canManage: can(actor, "teamData.manage", teamResource(team)),
    sheets: sheets.map((s) => ({ id: s.id, title: s.title, playedAt: s.playedAt, teamRow: computeRow(defs, "TEAM", asValues(s.teamValues)) })),
    teamSummary: {
      games: teamInputs.length,
      totals: computeRow(defs, "TEAM", teamTotals, teamInputs.length),
      // Derived stats over per-match averages (games = 1), e.g. average score diff.
      averages: computeRow(
        defs,
        "TEAM",
        Object.fromEntries(Object.entries(teamTotals).map(([k, v]) => [k, v / Math.max(1, teamInputs.length)])),
        1,
      ),
    },
    players,
  };
}

/** Data for the entry/edit form. */
export async function getSheetForm(actor: AuthzContext, teamId: string, sheetId?: string) {
  const team = await teamWith(actor, teamId, "teamData.manage");
  const defs = (await listDefinitions(team.gameId)).filter((d) => d.kind === "INPUT");
  const sheet = sheetId
    ? await db.statSheet.findUnique({ where: { id: sheetId }, include: { lines: true } })
    : null;
  if (sheetId && (!sheet || sheet.teamId !== teamId)) throw new NotFoundError("Stat sheet not found.");
  const rosterIds = (await db.teamMembership.findMany({ where: { teamId }, select: { userId: true } })).map((m) => m.userId);
  const playerIds = [...new Set([...rosterIds, ...(sheet?.lines.map((l) => l.userId) ?? [])])];
  const players = await db.user.findMany({ where: { id: { in: playerIds } }, select: { id: true, username: true }, orderBy: { username: "asc" } });
  return {
    team,
    defs,
    players,
    sheet: sheet && {
      id: sheet.id,
      title: sheet.title,
      playedAt: sheet.playedAt,
      scheduleEntryId: sheet.scheduleEntryId,
      teamValues: asValues(sheet.teamValues),
      lines: Object.fromEntries(sheet.lines.map((l) => [l.userId, asValues(l.values)])),
    },
  };
}
