import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const techs = [
  { name: "React", abbr: "Re", roleNo: "Frontend", roleEn: "Frontend" },
  { name: "TypeScript", abbr: "TS", roleNo: "Språk", roleEn: "Language" },
  { name: "Next.js", abbr: "Nx", roleNo: "Rammeverk", roleEn: "Framework" },
  { name: "PostgreSQL", abbr: "Pg", roleNo: "Database", roleEn: "Database" },
  { name: ".NET", abbr: ".N", roleNo: "Backend", roleEn: "Backend" },
];

async function main() {
  // Placeholder content is only seeded into an empty database.
  if ((await db.project.count()) > 0) {
    console.log("Projects already exist, skipping seed.");
    return;
  }

  for (const t of techs) await db.tech.upsert({ where: { name: t.name }, update: {}, create: t });
  const tech = Object.fromEntries((await db.tech.findMany()).map((t) => [t.name, t.id]));

  const make = async (n: number, type: "BIG" | "SMALL", order: number) => {
    const label = type === "BIG" ? `Prosjekt ${n}` : `Småprosjekt ${n}`;
    const labelEn = type === "BIG" ? `Project ${n}` : `Small project ${n}`;
    return db.project.create({
      data: {
        slug: type === "BIG" ? `prosjekt-${n}` : `smaprosjekt-${n}`,
        type,
        status: "PUBLISHED",
        progress: "LIVE",
        year: "2026",
        sortOrder: order,
        liveUrl: type === "BIG" ? "https://example.com" : null,
        githubUrl: type === "BIG" && n === 1 ? "https://github.com" : null,
        translations: {
          create: [
            {
              locale: "no", title: `[${label}]`, tagline: "[Kort beskrivelse: hva prosjektet er og hva det gjør]",
              description: "[Bakgrunnen: hvorfor du laget det, hvilket problem det løser, eller hva du ville utforske]",
              why: "[Hvorfor du laget det]", learned: "[Hva du lærte]", role: "[Alt selv]",
            },
            {
              locale: "en", title: `[${labelEn}]`, tagline: "[Short description: what the project is and what it does]",
              description: "[Background: why you built it, what problem it solves, or what you wanted to explore]",
              why: "[Why you built it]", learned: "[What you learned]", role: "[Solo]",
            },
          ],
        },
        techs: {
          create: [
            { techId: tech["React"], sortOrder: 0, whyNo: "[Hvorfor denne teknologien ble valgt]", whyEn: "[Why this technology was chosen]" },
            { techId: tech["TypeScript"], sortOrder: 1, whyNo: "[Hvorfor denne teknologien ble valgt]", whyEn: "[Why this technology was chosen]" },
          ],
        },
        lessons:
          type === "BIG"
            ? {
                create: [1, 2, 3].map((i) => ({
                  sortOrder: i, headNo: "[Utfordring eller lærdom]", bodyNo: "[Hva som var vanskelig, og hva du lærte av det]",
                  headEn: "[Challenge or lesson]", bodyEn: "[What was hard, and what you learned from it]",
                })),
              }
            : undefined,
      },
    });
  };

  const big = [await make(1, "BIG", 0), await make(2, "BIG", 1)];
  for (let n = 1; n <= 6; n++) await make(n, "SMALL", 10 + n);

  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      currentProjectId: big[0].id,
      nowTextNo: "[Én linje om hva du bygger nå]",
      nowTextEn: "[One line about what you are building now]",
      aboutLeadNo: "Utvikler på dagtid, hobbyprogrammerer på kveldstid.",
      aboutLeadEn: "Developer by day, hobby programmer by night.",
      aboutBodyNo: "[Et par avsnitt om deg: hva du jobber med, hva som driver deg, og hva du liker å bygge på fritiden]",
      aboutBodyEn: "[A couple of paragraphs about you: what you work on, what drives you, and what you like to build in your spare time]",
      email: "",
      githubUrl: "",
      linkedinUrl: "",
      tools: ["React", "TypeScript", ".NET", "PostgreSQL"],
    },
  });
  console.log("Seeded placeholder projects.");
}

main().finally(() => db.$disconnect());
