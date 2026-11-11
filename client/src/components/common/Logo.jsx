import { Link } from "react-router-dom";

import logoMark from "../../assets/brand/logo-mark.webp";
import wordmark from "../../assets/brand/wordmark.png";
import { ROUTES } from "../../app/config/routes";
import { cn } from "../../utils/cn";

// mark is 387×305, wordmark is 720×95 (see src/assets/brand)
const MARK_RATIO = 387 / 305;
const WORDMARK_RATIO = 720 / 95;

const SIZES = {
  sm: { mark: 28, word: 12 },
  md: { mark: 36, word: 14 },
  lg: { mark: 56, word: 20 },
  xl: { mark: 72, word: 26 },
};

/**
 * The Aevora logo: gradient mark + wordmark.
 * The wordmark is a mask filled with the current text colour, so it turns
 * dark on light backgrounds and light on dark ones with no second asset.
 */
export default function Logo({
  size = "md",
  showWordmark = true,
  wordmarkClassName,
  to = ROUTES.home,
  className,
}) {
  const { mark, word } = SIZES[size];

  const content = (
    <>
      <img
        src={logoMark}
        alt={showWordmark ? "" : "Aevora"}
        width={Math.round(mark * MARK_RATIO)}
        height={mark}
        draggable="false"
        className="shrink-0"
      />

      {showWordmark && (
        <span
          role="img"
          aria-label="Aevora"
          className={cn("block bg-current", wordmarkClassName)}
          style={{
            height: word,
            width: Math.round(word * WORDMARK_RATIO),
            WebkitMaskImage: `url(${wordmark})`,
            maskImage: `url(${wordmark})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        />
      )}
    </>
  );

  const classes = cn("inline-flex items-center gap-3", className);

  if (!to) return <span className={classes}>{content}</span>;

  return (
    <Link to={to} aria-label="Aevora home" className={cn(classes, "rounded-lg")}>
      {content}
    </Link>
  );
}
