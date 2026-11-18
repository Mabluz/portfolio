type P = { size?: number; className?: string };
const s = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const ArrowUpRight = ({ size = 16, className }: P) => <svg {...s(size)} className={className}><path d="M7 17L17 7M8 7h9v9" /></svg>;
export const ArrowRight = ({ size = 16, className }: P) => <svg {...s(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const ArrowLeft = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>;
export const ArrowDown = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M12 5v14M5 12l7 7 7-7" /></svg>;
export const Download = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
export const Mail = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
export const Github = ({ size = 16, className }: P) => <svg {...s(size)} className={className}><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></svg>;
export const Plus = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>;
export const X = ({ size = 14, className }: P) => <svg {...s(size)} strokeWidth={2.4} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Eye = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
export const Pencil = ({ size = 18, className }: P) => <svg {...s(size)} className={className}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
export const Search = ({ size = 16, className }: P) => <svg {...s(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
