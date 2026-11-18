import "server-only";
import { cookies } from "next/headers";

export type Lang = "no" | "en";
export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "en" ? "en" : "no";
}

export const dict = {
  no: {
    navBig: "Prosjekter", navSmall: "Småprosjekter", navAbout: "Om meg",
    eyebrow: "// utvikler · sideprosjekter og eksperimenter",
    heroA: "Hei, jeg er Marius. Jeg bygger nettsider og apper -", heroB: "også på fritiden", heroC: ".",
    heroSub: "Her samler jeg sideprosjektene mine - fra større apper jeg har brukt måneder på, til små verktøy og eksperimenter laget på en kveld.",
    ctaProjects: "Se prosjektene", ctaAbout: "Litt om meg", cv: "Last ned CV",
    nowLabel: "Akkurat nå bygger jeg", nowCta: "Følg med", nowBadge: "Under arbeid",
    bigTitle: "Store prosjekter", bigIntro: "Prosjektene jeg har brukt mest tid på, og lært mest av.",
    smallTitle: "Småprosjekter", smallIntro: "Kveldsprosjekter, eksperimenter og små verktøy. Skuffen med leker.",
    screenshot: "Skjermbilde", why: "Hvorfor:", learned: "Lærte:", demo: "Se prosjektet", readMore: "Les mer",
    aboutTitle: "Om meg", toolsTitle: "Verktøy jeg liker", contactTitle: "Ta kontakt", email: "Send e-post",
    footer: "Laget av Marius · 2026", toTop: "Til toppen ↑",
    // project page
    back: "Alle prosjekter", eyebrowBig: "Stort prosjekt", eyebrowSmall: "Lite prosjekt", live: "Se prosjektet",
    metaRole: "Rolle", metaYear: "År", metaStatus: "Status", metaType: "Type",
    statusLive: "Live", statusInProgress: "Pågår", typeBig: "Stort prosjekt", typeSmall: "Lite prosjekt",
    aboutProject: "Om prosjektet", gallery: "Bilder", techTitle: "Teknologivalg",
    techIntro: "Teknologiene prosjektet er bygget med, og hvorfor akkurat de ble valgt.",
    learnTitle: "Utfordringer og lærdom", nextLabel: "Neste prosjekt",
    langLabel: "Språk / Language", mainMenu: "Hovedmeny",
  },
  en: {
    navBig: "Projects", navSmall: "Small projects", navAbout: "About",
    eyebrow: "// developer · side projects and experiments",
    heroA: "Hi, I’m Marius. I build websites and apps -", heroB: "in my spare time too", heroC: ".",
    heroSub: "This is where I collect my side projects - from bigger apps I’ve spent months on, to small tools and experiments built in an evening.",
    ctaProjects: "See the projects", ctaAbout: "About me", cv: "Download CV",
    nowLabel: "Currently building", nowCta: "Follow along", nowBadge: "In progress",
    bigTitle: "Big projects", bigIntro: "The projects I’ve spent the most time on, and learned the most from.",
    smallTitle: "Small projects", smallIntro: "Evening hacks, experiments and tiny tools. The toy drawer.",
    screenshot: "Screenshot", why: "Why:", learned: "Learned:", demo: "View live site", readMore: "Read more",
    aboutTitle: "About me", toolsTitle: "Tools I enjoy", contactTitle: "Get in touch", email: "Send an email",
    footer: "Made by Marius · 2026", toTop: "Back to top ↑",
    back: "All projects", eyebrowBig: "Big project", eyebrowSmall: "Small project", live: "View live site",
    metaRole: "Role", metaYear: "Year", metaStatus: "Status", metaType: "Type",
    statusLive: "Live", statusInProgress: "In progress", typeBig: "Big project", typeSmall: "Small project",
    aboutProject: "About the project", gallery: "Images", techTitle: "Tech choices",
    techIntro: "The technologies the project is built with, and why they were chosen.",
    learnTitle: "Challenges and lessons", nextLabel: "Next project",
    langLabel: "Språk / Language", mainMenu: "Main menu",
  },
} as const;

export type Dict = { [K in keyof (typeof dict)["no"]]: string };

/** Pick the requested language, falling back to Norwegian when the English text is empty. */
export function pick<T extends string | null | undefined>(lang: Lang, no: T, en: T): string {
  if (lang === "en" && en && en.trim()) return en;
  return no ?? "";
}
