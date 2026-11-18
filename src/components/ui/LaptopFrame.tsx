import Image from "next/image";

type Props = { src?: string | null; width?: number; height?: number; alt?: string; placeholder: string; widthClass?: string };

/** Laptop mockup from the design: dark bezel, 16:10 screen, base with notch. */
export function LaptopFrame({ src, width = 1600, height = 1000, alt = "", placeholder, widthClass = "w-[88%]" }: Props) {
  return (
    <div className={`relative ${widthClass}`}>
      <div className="rounded-t-[14px] bg-ink p-[11px] pb-3.5 shadow-[0_26px_50px_rgba(31,77,58,0.26)]">
        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[3px] bg-paper">
          {src ? (
            <Image src={src} alt={alt} width={width} height={height} unoptimized className="h-full w-full object-cover object-top" />
          ) : (
            <span className="rounded-full bg-sand px-3 py-1.5 font-mono text-[13px] text-muted">[{placeholder}]</span>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="relative -mx-[8%] h-[15px] rounded-b-xl border-t-2 border-[#8a8370] bg-line shadow-[0_14px_24px_rgba(31,77,58,0.2)]">
        <span className="absolute top-0 left-[43%] h-[5px] w-[14%] rounded-b-md bg-[#b5ac96]" />
      </div>
    </div>
  );
}
