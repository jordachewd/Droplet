import type { CSSProperties } from "react";

interface DropletGlobeProps {
  icon?: string;
  size?: number;
  className?: string;
  ariaHidden?: boolean;
}

export default function DropletGlobe({
  icon = "bi-droplet",
  size = 36,
  className,
  ariaHidden = true,
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
      className={`DropletGlobe globe ${className ?? ""}`}
      style={shadowStyle}
      aria-hidden="true"
    >
      <div className="DropletGlobeOuter globe-outer" />
      <div className="DropletGlobeInner globe-inner" />

      <i
        className={`DropletGlobeLogo ${icon} globe-icon`}
        style={{ fontSize: "var(--droplet-globe-icon-size)" }}
        aria-hidden={ariaHidden}
      />

      <div className="DropletGlobeShadow globe-shadow" />
    </div>
  );
}
