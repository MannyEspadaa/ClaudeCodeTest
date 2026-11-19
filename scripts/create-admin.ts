// Usage:
//   npm run admin:create -- --email you@school.edu                       (promote an existing account)
//   npm run admin:create -- --email you@school.edu --name "Full Name" --username you
//                                                     (create; password read from ADMIN_PASSWORD or prompted)
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { bootstrapAdmin } from "@/server/services/admin-bootstrap";

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" }, username: { type: "string" } },
  });
  if (!values.email) throw new Error("--email is required");

  const exists = await db.user.findUnique({ where: { email: values.email.trim().toLowerCase() } });
  let password: string | undefined;
  if (!exists) {
    if (!values.name || !values.username) throw new Error("--name and --username are required to create a new admin");
    password = process.env.ADMIN_PASSWORD;
    if (!password) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      password = await rl.question("Password (min 10 chars): ");
      rl.close();
    }
  }

  const result = await bootstrapAdmin({ email: values.email, fullName: values.name, username: values.username, password });
  console.log(result.created ? `Created admin account ${values.email}` : `Promoted ${values.email} to admin`);
}

main()
  .catch((err) => {
    if (err instanceof ServiceError) {
      console.error(err.message, err.fieldErrors);
    } else {
      console.error(err instanceof Error ? err.message : err);
    }
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
