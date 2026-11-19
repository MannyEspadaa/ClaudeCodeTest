// Demo data for local exploration: `npm run db:seed` (refuses to run if users already exist).
// All demo accounts use the password "esports-demo-1".
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { TEMPLATE } from "@/server/services/stats-service";

const PASSWORD = "esports-demo-1";
const DOMAIN = (process.env.ALLOWED_EMAIL_DOMAINS ?? "example.edu").split(",")[0].trim();
const day = 86_400_000;

async function main() {
  if ((await db.user.count()) > 0) {
    console.log("Database already has users; skipping seed.");
    return;
  }
  const passwordHash = await hashPassword(PASSWORD);
  const mk = (username: string, fullName: string, isAdmin = false) =>
    db.user.create({
      data: { email: `${username}@${DOMAIN}`, fullName, username, usernameKey: username.toLowerCase(), passwordHash, emailVerifiedAt: new Date(), isAdmin },
    });

  const admin = await mk("admin", "Avery Admin", true);
  const gm = await mk("coach_sam", "Sam Rivera");
  const players = await Promise.all(
    [
      ["nova", "Nova Chen"],
      ["blitz", "Jordan Blake"],
      ["echo", "Riley Park"],
      ["vortex", "Morgan Lee"],
      ["pixel", "Casey Kim"],
    ].map(([u, n]) => mk(u, n)),
  );
  const newcomer = await mk("rookie", "Taylor Quinn");

  const shooter = await db.game.create({ data: { name: "Tactical Shooter", slug: "tactical-shooter" } });
  const racing = await db.game.create({ data: { name: "Kart Racing", slug: "kart-racing" } });
  await db.gameManagerAssignment.create({ data: { userId: gm.id, gameId: shooter.id, assignedById: admin.id } });
  await db.communityMembership.createMany({
    data: [gm, ...players, newcomer].map((u) => ({ userId: u.id, gameId: shooter.id })).concat([{ userId: players[0].id, gameId: racing.id }]),
  });
  await db.statDefinition.createMany({
    data: TEMPLATE.map((t, i) => ({ gameId: shooter.id, key: t.key, label: t.label, level: t.level, kind: t.kind, formula: t.formula ?? null, precision: t.precision ?? 0, sortOrder: i })),
  });

  const varsity = await db.team.create({ data: { gameId: shooter.id, name: "Varsity", status: "ACTIVE", maxRosterSize: 5, season: "Fall 2026" } });
  const jv = await db.team.create({ data: { gameId: shooter.id, name: "Junior Varsity", status: "ACTIVE", season: "Fall 2026" } });
  await db.team.create({ data: { gameId: racing.id, name: "Racing A", status: "SHELL" } });
  await db.teamMembership.createMany({ data: players.slice(0, 4).map((p) => ({ teamId: varsity.id, userId: p.id })) });
  await db.teamMembership.create({ data: { teamId: jv.id, userId: players[4].id } });
  await db.rosterRequest.create({ data: { teamId: jv.id, userId: newcomer.id } });

  const at = (days: number, hour: number) => {
    const d = new Date(Date.now() + days * day);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const pastMatch = await db.scheduleEntry.create({
    data: { gameId: shooter.id, teamId: varsity.id, type: "MATCH", title: "", opponent: "State University", startsAt: at(-6, 23), endsAt: at(-5, 1), visibility: "PUBLIC", result: "W 13–9", location: "Online" },
  });
  await db.scheduleEntry.createMany({
    data: [
      { gameId: shooter.id, teamId: varsity.id, type: "MATCH", title: "", opponent: "Tech Institute", startsAt: at(3, 23), endsAt: at(4, 1), visibility: "PUBLIC", location: "Online" },
      { gameId: shooter.id, teamId: varsity.id, type: "PRACTICE", title: "", startsAt: at(1, 22), endsAt: at(2, 0), visibility: "TEAM", location: "Esports Arena" },
      { gameId: shooter.id, teamId: jv.id, type: "SCRIM", title: "", opponent: "City College JV", startsAt: at(2, 22), endsAt: at(3, 0), visibility: "TEAM" },
    ],
  });
  await db.event.createMany({
    data: [
      { name: "Fall tryouts", location: "Esports Arena", startsAt: at(5, 21), endsAt: at(5, 23), visibility: "PUBLIC", createdById: admin.id, description: "Open to all students. Bring your own peripherals." },
      { gameId: shooter.id, name: "Finals watch party", location: "Student Union 101", startsAt: at(9, 23), endsAt: at(10, 2), visibility: "MEMBERS", createdById: gm.id },
    ],
  });
  await db.announcement.createMany({
    data: [
      { title: "Welcome to the new hub", body: "Join your game's community to see teams and request a roster spot.", authorId: admin.id },
      { gameId: shooter.id, title: "Varsity roster set", body: "Congrats to everyone who made the team. Practice starts this week.", authorId: gm.id },
    ],
  });
  const vod = await db.vod.create({ data: { teamId: varsity.id, scheduleEntryId: pastMatch.id, title: "vs State — map 1", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", addedById: gm.id } });
  const note = await db.comment.create({ data: { teamId: varsity.id, targetType: "VOD", targetId: vod.id, authorId: gm.id, body: "Great retake at 14:20. Watch our spacing on B site." } });
  await db.comment.create({ data: { teamId: varsity.id, targetType: "VOD", targetId: vod.id, parentId: note.id, authorId: players[0].id, body: "Will review before practice." } });
  await db.statSheet.create({
    data: {
      teamId: varsity.id,
      scheduleEntryId: pastMatch.id,
      title: "vs State University",
      playedAt: pastMatch.startsAt,
      teamValues: { won: 1, score_for: 13, score_against: 9 },
      enteredById: gm.id,
      lines: {
        create: players.slice(0, 4).map((p, i) => ({ userId: p.id, values: { kills: 18 - i * 3, deaths: 10 + i, assists: 4 + i } })),
      },
    },
  });

  console.log(`Seeded demo data. Log in as admin@${DOMAIN}, coach_sam@${DOMAIN}, nova@${DOMAIN} or rookie@${DOMAIN} with password "${PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
