import { cn } from "../../utils/cn";
import { getInitials, hashString } from "../../utils/helpers";

const SIZES = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-xl",
};

// Kept in the brand family and dark enough for white initials.
const GRADIENTS = [
  "from-[#3f68f5] to-[#7c4df0]",
  "from-[#7c4df0] to-[#c04bd8]",
  "from-[#0e7fd9] to-[#2e5be8]",
  "from-[#0f9d8a] to-[#2563eb]",
  "from-[#d9476b] to-[#8e44e0]",
  "from-[#c2570c] to-[#d63c6b]",
];

export default function Avatar({ name, src, size = "md", className }) {
  const gradient = GRADIENTS[hashString(name) % GRADIENTS.length];

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white",
        gradient,
        SIZES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
