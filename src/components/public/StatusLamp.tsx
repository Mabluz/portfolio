import type { Progress } from "@/lib/i18n";

const LAMP: Record<Progress, string> = { LIVE: "lamp-live", IN_PROGRESS: "lamp-wip", ABANDONED: "lamp-giveup", DISCONTINUED: "lamp-closed" };

/** Status light from the design: green = live, yellow = in progress, red = gave up, black = shut down. */
export function StatusLamp({ progress }: { progress: Progress }) {
  return <span aria-hidden="true" className={`lamp ${LAMP[progress]}`} />;
}

/** The lamp with its label in a small pill, used on the project rows and cards on the front page. */
export function StatusPill({ progress, label }: { progress: Progress; label: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-[rgba(43,42,36,0.18)] bg-[rgba(255,253,247,0.7)] py-1 pr-2.5 pl-2 font-mono text-xs font-medium text-ink">
      <StatusLamp progress={progress} />
      {label}
    </span>
  );
}
