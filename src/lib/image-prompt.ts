/**
 * Prompt for an image-generating AI that makes images of a project for the portfolio: first a
 * designed cover image that presents the project, then screenshots. Written in English, since
 * image models follow English best. The sizes match how the site shows images: the first image
 * sits in a 16:10 laptop frame and on the cards, the gallery uses 21:9, 16:10 and 4:3.
 */

type Text = { title: string; tagline: string; description: string };

export type ImagePromptInput = {
  type: "BIG" | "SMALL";
  progress: "LIVE" | "IN_PROGRESS" | "ABANDONED" | "DISCONTINUED";
  no: Text;
  en: Text;
  techs: string[];
  liveUrl?: string;
};

const pickText = (en: string, no: string) => (en.trim() ? en.trim() : no.trim());

const STATUS = {
  LIVE: "live and in use",
  IN_PROGRESS: "in progress",
  ABANDONED: "abandoned (I gave up on it)",
  DISCONTINUED: "shut down",
} as const;

export function buildImagePrompt(p: ImagePromptInput): string {
  const title = pickText(p.en.title, p.no.title) || "(untitled project)";
  const tagline = pickText(p.en.tagline, p.no.tagline);
  const description = pickText(p.en.description, p.no.description);
  const big = p.type === "BIG";
  const count = big ? 5 : 3;

  const about = [
    `Project: ${title}`,
    tagline && `In one sentence: ${tagline}`,
    description && `Description:\n${description}`,
    p.techs.length > 0 && `Built with: ${p.techs.join(", ")}`,
    `Status: ${STATUS[p.progress]}`,
    p.liveUrl && `Live site (for reference): ${p.liveUrl}`,
  ].filter(Boolean).join("\n\n");

  const progressLine = p.progress === "IN_PROGRESS"
    ? "\n  - Optionally a slim progress indicator (e.g. a row of segments with \"4 of 12\") if the project has natural steps, like modules or milestones."
    : "";

  const cover = `1. Cover image, 16:10 (2400 x 1500 px). Not a screenshot, but a designed key visual that presents the project at a glance, like the hero of a landing page. This is the most important image; it's shown first on the project page and on the front page cards.
  - Background: dark, near-black navy/charcoal with a very subtle grid and a soft, low-contrast color glow in one or two corners.
  - Left half, left-aligned with generous margins: a small pill-shaped label with a colored dot and a short phrase about what kind of project it is; the project name very large and bold in a clean sans-serif, with one key word in a soft multi-color gradient; a short subtitle under it; then 2-3 lines of muted description text.${progressLine}
  - Below that, the main technologies as small rounded chips in a monospace font (${p.techs.length > 0 ? p.techs.slice(0, 7).join(", ") : "the project's tech stack"}).
  - Right half: 2-3 floating, slightly tilted or overlapping elements that show what the app actually does, made concrete with realistic example data. For example the real-world input (a document, a photo, a file, a form), the result the app produces (a clean dark UI card with labeled fields and values), and a small card with an action or question a user would ask. Use soft shadows and a subtle highlight or scan line to suggest something happening.
  - Polished, modern and calm, with plenty of empty space. All text sharp and correctly spelled.`;

  const shots = big
    ? `2. Main screenshot, 16:10 (2400 x 1500 px): the most important screen of the app, the one that best shows what it does.
3. Wide screenshot, 21:9 (2400 x 1030 px): an overview screen or a dashboard-like view with more content.
4. Detail, 16:10 (2400 x 1500 px): a second key screen or feature.
5. Detail, 4:3 (2000 x 1500 px): a close-up of one interesting part of the interface, e.g. a form, a card or a chart.`
    : `2. Main screenshot, 16:10 (2400 x 1500 px): the main screen of the tool, showing what it does.
3. Detail, 4:3 (2000 x 1500 px): a close-up of the most interesting part of the interface.`;

  return `Create ${count} images for my developer portfolio for the project described below: one designed cover image, then screenshots that look like the real app. The project's text is partly in Norwegian; any visible text in the images should use the same language as the project's own title.

${about}

Images:
${cover}
${shots}

Requirements:
- No laptop, phone, browser frame, hands, desk or perspective of a device; the portfolio adds its own laptop frame around the first image.
- Screenshots (image 2 and on) are flat and straight-on, showing only the app's screen.
- Look like a real, working product: realistic, plausible content and data, crisp readable text, consistent colors and typography across all images, as if from the same app.
- Show only what fits the description; don't invent unrelated features.
- No watermarks, logos of real companies, lorem ipsum or placeholder boxes.
- Keep important content away from the edges; the first image may be cropped slightly at the bottom.
- Deliver each image as PNG or JPG in the given size (max 2400 px wide).`;
}
