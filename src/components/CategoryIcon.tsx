import type { CategoryIconName } from "@/lib/categories";

/**
 * Small white glyphs for the category tiles. Minimal geometric SVGs —
 * stroke style for tools/objects, filled for organic shapes (paw, tooth).
 * Rendered in currentColor; tiles set color: #fff.
 */
export default function CategoryIcon({ name }: { name: CategoryIconName }) {
  const strokeProps = {
    viewBox: "0 0 24 24",
    width: 30,
    height: 30,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const fillProps = {
    viewBox: "0 0 24 24",
    width: 30,
    height: 30,
    fill: "currentColor",
    "aria-hidden": true,
  };

  switch (name) {
    case "scissors":
      return (
        <svg {...strokeProps}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M8.1 7.9 20 19" />
          <path d="M8.1 16.1 20 5" />
        </svg>
      );
    case "comb":
      return (
        <svg {...strokeProps}>
          <path d="M5 3v18" />
          <path d="M5 5.5h13M5 9.5h13M5 13.5h13M5 17.5h9" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...fillProps}>
          <path d="M12 3l1.8 5.7 5.7 1.8-5.7 1.8L12 18l-1.8-5.7L4.5 10.5 10.2 8.7 12 3z" />
          <path d="M18.6 15.4l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8.8-2.3z" />
        </svg>
      );
    case "scale":
      return (
        <svg {...strokeProps}>
          <path d="M12 3v18" />
          <path d="M8.5 21h7" />
          <path d="M12 5.5H5.5M12 5.5h6.5" />
          <path d="M5.5 5.5 3 11a3.2 3.2 0 0 0 5 0L5.5 5.5z" />
          <path d="M18.5 5.5 16 11a3.2 3.2 0 0 0 5 0l-2.5-5.5z" />
        </svg>
      );
    case "tooth":
      return (
        <svg {...fillProps}>
          <path d="M12 4c-1.6 0-2 .8-4.2.8C5.6 4.8 4 6.6 4 9.2c0 3.4 1.7 4.6 2.2 7.4.3 1.7.9 4 2.3 4 1.2 0 1-2.4 3.5-2.4s2.3 2.4 3.5 2.4c1.4 0 2-2.3 2.3-4 .5-2.8 2.2-4 2.2-7.4 0-2.6-1.6-4.4-3.8-4.4C14 4.8 13.6 4 12 4z" />
        </svg>
      );
    case "stethoscope":
      return (
        <svg {...strokeProps}>
          <path d="M4.5 3.5v5a5.5 5.5 0 0 0 11 0v-5" />
          <circle cx="4.5" cy="3" r="1.1" />
          <circle cx="15.5" cy="3" r="1.1" />
          <path d="M10 14v1a6 6 0 0 0 6 6h.8" />
          <circle cx="19" cy="18.5" r="2.2" />
        </svg>
      );
    case "paw":
      return (
        <svg {...fillProps}>
          <ellipse cx="12" cy="15.5" rx="4.4" ry="3.4" />
          <circle cx="5.2" cy="10.5" r="1.7" />
          <circle cx="8.6" cy="7.2" r="1.8" />
          <circle cx="15.4" cy="7.2" r="1.8" />
          <circle cx="18.8" cy="10.5" r="1.7" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...fillProps}>
          <path d="M15.4 5.6a4.5 4.5 0 0 1 6-4.1L18.6 4.3l.8 2.5 2.5.8 2.8-2.8a4.5 4.5 0 0 1-5.9 5.4L7.6 19.4a1.95 1.95 0 0 1-2.8-2.8l7.4-7.4a4.5 4.5 0 0 1 3.2-3.6z" transform="scale(0.92) translate(1 1)" />
        </svg>
      );
    case "star":
      return (
        <svg {...fillProps}>
          <path d="M12 3.6l2.5 5.2 5.7.7-4.2 4 1.1 5.6L12 16.4l-5.1 2.7L8 13.5l-4.2-4 5.7-.7L12 3.6z" />
        </svg>
      );
  }
}
