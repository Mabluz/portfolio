/**
 * Prompt for an image-generating AI that makes screenshots of a project for the portfolio.
 * Written in English, since image models follow English best. The sizes match how the site
 * shows images: the first image sits in a 16:10 laptop frame, the gallery uses 21:9, 16:10 and 4:3.
 */

type Text = { title: string; tagline: string; description: string };

export type ImagePromptInput = {
  type: "BIG" | "SMALL";
  no: Text;
  en: Text;
  techs: string[];
  liveUrl?: string;
};

const pickText = (en: string, no: string) => (en.trim() ? en.trim() : no.trim());

export function buildImagePrompt(p: ImagePromptInput): string {
  const title = pickText(p.en.title, p.no.title) || "(untitled project)";
  const tagline = pickText(p.en.tagline, p.no.tagline);
  const description = pickText(p.en.description, p.no.description);
  const count = p.type === "BIG" ? 4 : 2;

  const about = [
    `Project: ${title}`,
    tagline && `In one sentence: ${tagline}`,
    description && `Description:\n${description}`,
    p.techs.length > 0 && `Built with: ${p.techs.join(", ")}`,
    p.liveUrl && `Live site (for reference): ${p.liveUrl}`,
  ].filter(Boolean).join("\n\n");

  const shots = p.type === "BIG"
    ? `1. Main screenshot, 16:10 (2400 x 1500 px): the most important screen of the app, the one that best shows what it does.
2. Wide screenshot, 21:9 (2400 x 1030 px): an overview screen or a dashboard-like view with more content.
3. Detail, 16:10 (2400 x 1500 px): a second key screen or feature.
4. Detail, 4:3 (2000 x 1500 px): a close-up of one interesting part of the interface, e.g. a form, a card or a chart.`
    : `1. Main screenshot, 16:10 (2400 x 1500 px): the main screen of the tool, showing what it does.
2. Detail, 4:3 (2000 x 1500 px): a close-up of the most interesting part of the interface.`;

  return `Create ${count} images for my developer portfolio that look like real screenshots of the project described below. The project's text is partly in Norwegian; any visible UI text should use the same language as the project's own title.

${about}

Images:
${shots}

Requirements:
- Flat, straight-on screenshots of the app's screen only. No laptop, phone, browser frame, hands, desk or perspective; the portfolio adds its own laptop frame around the main image.
- Look like a real, working product: realistic, plausible content and data, crisp readable text, consistent layout, colors and typography across all images, as if from the same app.
- Show only what fits the description; don't invent unrelated features.
- No watermarks, logos of real companies, lorem ipsum or placeholder boxes.
- Keep important content away from the edges; the main image may be cropped slightly at the bottom.
- Deliver each image as PNG or JPG in the given size (max 2400 px wide).`;
}
