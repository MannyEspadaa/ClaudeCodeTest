// NFREQ1 load test: N concurrent virtual users (default 200) browsing signed-in pages.
// Usage (against a running production build and a NON-production database):
//   dotenv -e .env.e2e -o -- tsx scripts/load-test.ts --url http://localhost:3100 --users 200 --seconds 60
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3100" },
    users: { type: "string", default: "200" },
    seconds: { type: "string", default: "60" },
    think: { type: "string", default: "1000" },
  },
});
const BASE = values.url!;
const USERS = Number(values.users);
const SECONDS = Number(values.seconds);
const THINK_MS = Number(values.think);

if (!process.env.DATABASE_URL || /prod/i.test(process.env.DATABASE_URL)) throw new Error("Refusing to seed a production database.");
const db = new PrismaClient();

async function seed() {
  const run = randomBytes(3).toString("hex");
  const game = await db.game.create({ data: { name: `Load ${run}`, slug: `load-${run}` } });
  const teams = await Promise.all(
    Array.from({ length: 10 }, (_, i) => db.team.create({ data: { gameId: game.id, name: `Load team ${i}`, status: "ACTIVE" } })),
  );
  for (let d = 0; d < 30; d++) {
    const t = teams[d % teams.length];
    const start = new Date(Date.now() + d * 86_400_000);
    await db.scheduleEntry.create({
      data: { gameId: game.id, teamId: t.id, type: d % 3 ? "PRACTICE" : "MATCH", title: "", visibility: d % 3 ? "TEAM" : "PUBLIC", startsAt: start, endsAt: new Date(start.getTime() + 7_200_000) },
    });
  }
  const users = [];
  for (let i = 0; i < USERS; i++) {
    const username = `load_${run}_${i}`;
    const user = await db.user.create({
      data: { email: `${username}@example.edu`, fullName: `Load User${i}`, username, usernameKey: username, passwordHash: "!", emailVerifiedAt: new Date() },
    });
    const team = teams[i % teams.length];
    await db.communityMembership.create({ data: { userId: user.id, gameId: game.id } });
    await db.teamMembership.create({ data: { teamId: team.id, userId: user.id } });
    const token = randomBytes(32).toString("base64url");
    await db.session.create({ data: { id: createHash("sha256").update(token).digest("hex"), userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    users.push({ token, teamId: team.id });
  }
  return { game, users };
}

type Sample = { path: string; ms: number; ok: boolean };

async function main() {
  console.log(`Seeding ${USERS} users…`);
  const { game, users } = await seed();
  const paths = (teamId: string) => ["/dashboard", "/calendar", "/games", `/games/${game.slug}`, `/teams/${teamId}`, `/teams/${teamId}/schedule`, "/"];
  const samples: Sample[] = [];
  const deadline = Date.now() + SECONDS * 1000;
  console.log(`Running ${USERS} concurrent users for ${SECONDS}s against ${BASE} (think time ~${THINK_MS}ms)…`);

  await Promise.all(
    users.map(async (u, i) => {
      await new Promise((r) => setTimeout(r, (i * 997) % THINK_MS)); // stagger starts
      const list = paths(u.teamId);
      while (Date.now() < deadline) {
        const path = list[Math.floor(Math.random() * list.length)];
        const anonymous = path === "/";
        const t0 = performance.now();
        let ok = false;
        try {
          const res = await fetch(BASE + path, { headers: anonymous ? {} : { cookie: `session=${u.token}` }, redirect: "manual" });
          await res.arrayBuffer();
          ok = res.status === 200;
        } catch {
          ok = false;
        }
        samples.push({ path, ms: performance.now() - t0, ok });
        await new Promise((r) => setTimeout(r, THINK_MS * (0.5 + Math.random())));
      }
    }),
  );

  const pct = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];
  const all = samples.map((s) => s.ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => !s.ok).length;
  console.log(`\nRequests: ${samples.length} (${(samples.length / SECONDS).toFixed(1)}/s), errors: ${errors} (${((100 * errors) / samples.length).toFixed(2)}%)`);
  console.log(`Latency ms  p50 ${pct(all, 50).toFixed(0)}  p95 ${pct(all, 95).toFixed(0)}  p99 ${pct(all, 99).toFixed(0)}  max ${all.at(-1)!.toFixed(0)}`);
  const byPath = new Map<string, number[]>();
  for (const s of samples) byPath.set(s.path.replace(/c[a-z0-9]{24}/, ":id").replace(/load-[0-9a-f]+/, ":game"), [...(byPath.get(s.path.replace(/c[a-z0-9]{24}/, ":id").replace(/load-[0-9a-f]+/, ":game")) ?? []), s.ms]);
  for (const [p, ms] of byPath) {
    ms.sort((a, b) => a - b);
    console.log(`  ${p.padEnd(28)} n=${String(ms.length).padStart(5)}  p50 ${pct(ms, 50).toFixed(0).padStart(5)}  p95 ${pct(ms, 95).toFixed(0).padStart(5)}`);
  }
  await db.$disconnect();
  process.exitCode = errors / samples.length > 0.01 || pct(all, 95) > 2000 ? 1 : 0;
  console.log(process.exitCode ? "\nFAIL: >1% errors or p95 > 2s" : "\nPASS: <1% errors and p95 ≤ 2s");
}

main();
