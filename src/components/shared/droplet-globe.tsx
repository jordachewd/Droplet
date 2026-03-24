import type { CSSProperties } from "react";

interface DropletGlobeProps {
  size?: number;
  className?: string;
}

export default function DropletGlobe({
  size = 36,
  className,
}: DropletGlobeProps) {
  const normalizedSize = Math.max(32, size);
  const shadowScale = normalizedSize / 900;
  const innerSize = Math.round(normalizedSize * 0.625);
  const iconSize = Math.max(10, Math.round(normalizedSize * 0.425));

  const scalePx = (value: number): string => {
    const px = Number((value * shadowScale).toFixed(2));
    return `${px}px`;
  };

  const outerGlowLight = `0 0 ${scalePx(20)} ${scalePx(20)} var(--color-nightIndigo-600)`;
  const outerGlowDark = `0 0 ${scalePx(20)} ${scalePx(20)} var(--color-nightIndigo-800)`;

  const innerGlowLight = `0 0 ${scalePx(20)} ${scalePx(20)} var(--color-nightIndigo-600)`;
  const innerGlowDark = `0 0 ${scalePx(20)} ${scalePx(20)} var(--color-nightIndigo-700)`;

  const shadowLight = [
    `${scalePx(10)} ${scalePx(-55)} ${scalePx(30)} ${scalePx(15)} var(--color-twilightPurple-400)`,
    `${scalePx(24)} ${scalePx(-10)} ${scalePx(47)} ${scalePx(10)} var(--color-midnightBlue-300)`,
    `${scalePx(-21)} ${scalePx(-25)} ${scalePx(97)} ${scalePx(10)} var(--color-dustyBlue-500)`,
    `${scalePx(51)} ${scalePx(5)} ${scalePx(17)} ${scalePx(10)} var(--color-dustyBlue-500)`,
    `${scalePx(3)} ${scalePx(2)} ${scalePx(77)} ${scalePx(10)} var(--color-twilightPurple-600)`,
  ].join(",");

  const shadowDark = [
    `${scalePx(10)} ${scalePx(-55)} ${scalePx(30)} ${scalePx(15)} var(--color-twilightPurple-500)`,
    `${scalePx(24)} ${scalePx(-10)} ${scalePx(47)} ${scalePx(10)} var(--color-midnightBlue-500)`,
    `${scalePx(-21)} ${scalePx(-25)} ${scalePx(97)} ${scalePx(10)} var(--color-dustyBlue-500)`,
    `${scalePx(51)} ${scalePx(5)} ${scalePx(17)} ${scalePx(10)} var(--color-dustyBlue-500)`,
    `${scalePx(3)} ${scalePx(2)} ${scalePx(77)} ${scalePx(10)} var(--color-twilightPurple-500)`,
  ].join(",");

  const shadowStyle = {
    "--droplet-globe-size": `${normalizedSize}px`,
    "--droplet-globe-inner-size": `${innerSize}px`,
    "--droplet-globe-icon-size": `${iconSize}px`,
    "--droplet-globe-outer-glow-light": outerGlowLight,
    "--droplet-globe-outer-glow-dark": outerGlowDark,
    "--droplet-globe-inner-glow-light": innerGlowLight,
    "--droplet-globe-inner-glow-dark": innerGlowDark,
    "--droplet-globe-shadow-light": shadowLight,
    "--droplet-globe-shadow-dark": shadowDark,
  } as CSSProperties;

  return (
    <div
      className={`DropletGlobe relative inline-flex h-(--droplet-globe-size) w-(--droplet-globe-size) items-center justify-center ${className ?? ""}`}
      style={shadowStyle}
      aria-hidden="true"
    >
      <div className="DropletGlobeOuter absolute inset-0 rounded-full bg-nightIndigo-500 shadow-(--droplet-globe-outer-glow-light) dark:bg-nightIndigo-600 dark:shadow-(--droplet-globe-outer-glow-dark)" />

      <div className="DropletGlobeInner absolute left-1/2 top-1/2 h-(--droplet-globe-inner-size) w-(--droplet-globe-inner-size) -translate-x-1/2 -translate-y-1/2 rounded-full bg-twilightPurple-800 shadow-(--droplet-globe-inner-glow-light) animate-ping animate-duration-[1.6s] animate-ease-linear dark:bg-twilightPurple-600 dark:shadow-(--droplet-globe-inner-glow-dark)" />

      <i
        className="DropletGlobeLogo bi bi-droplet relative z-30 block text-lavenderHaze-100 dark:text-lavenderHaze-200"
        style={{ fontSize: "var(--droplet-globe-icon-size)" }}
        aria-hidden="true"
      />

      <div className="DropletGlobeShadow absolute inset-0 z-10 rounded-full animate-spin animate-duration-[1.6s] animate-ease-linear shadow-(--droplet-globe-shadow-light) dark:shadow-(--droplet-globe-shadow-dark)" />
    </div>
  );
}
