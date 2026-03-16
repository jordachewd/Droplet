import classNames from "classnames";
import Link from "next/link";

type LogoProps = {
  size?: number;
  color?: string;
  href?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function Logo({
  size = 20,
  href = "/",
  className = "",
  color = "currentColor",
  iconOnly = false,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={classNames("Logo flex gap-2 items-center", className)}
      aria-label={iconOnly ? "Droplet home" : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <g transform="translate(2 2)" fill={color}>
          <path d="M 7.21,0.8 C 7.69,0.295 8,0 8,0 q 0.164,0.544 0.371,1.038 c 0.812,1.946 2.073,3.35 3.197,4.6 C 12.878,7.096 14,8.345 14,10 A 6,6 0 0 1 2,10 C 2,6.668 5.58,2.517 7.21,0.8 M 7.623,1.821 A 31,31 0 0 0 5.794,3.99 C 5.068,4.94 4.358,5.998 3.834,7.06 3.304,8.133 3,9.138 3,10 a 5,5 0 0 0 10,0 C 13,8.799 12.204,7.843 10.819,6.3 L 10.789,6.268 C 9.75,5.11 8.5,3.72 7.623,1.82 Z" />
          <path d="M 4.553,7.776 C 5.373,6.135 6.27,5.023 6.646,4.646 l 0.708,0.708 c -0.29,0.29 -1.128,1.311 -1.907,2.87 z" />
        </g>
      </svg>

      {!iconOnly && <span className="relative text-lg">droplet</span>}
    </Link>
  );
}
