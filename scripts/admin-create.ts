/**
 * Create the admin user, or reset its password if the username already exists.
 *   local:   pnpm admin:create
 *   server:  docker compose exec portfolio node scripts/admin-create.js
 * Set ADMIN_USERNAME / ADMIN_PASSWORD to run non-interactively.
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Mute echo while the password is typed.
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    }
    process.stdout.write(question);
    rl.question("", (answer) => {
      if (hidden) process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const username = process.env.ADMIN_USERNAME ?? (await ask("Brukernavn: "));
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw new Error("Brukernavn må være 3-40 tegn (bokstaver, tall, . _ -)");

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask("Passord (minst 12 tegn): ", true);
    const again = await ask("Gjenta passord: ", true);
    if (password !== again) throw new Error("Passordene er ikke like");
  }
  if (password.length < 12) throw new Error("Passordet må være minst 12 tegn");

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.adminUser.findUnique({ where: { username } });
  if (existing) {
    await db.adminUser.update({ where: { id: existing.id }, data: { passwordHash } });
    await db.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Passordet for «${username}» er oppdatert, og alle innlogginger er avsluttet.`);
  } else {
    await db.adminUser.create({ data: { username, passwordHash } });
    console.log(`Admin-bruker «${username}» er opprettet.`);
  }
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
