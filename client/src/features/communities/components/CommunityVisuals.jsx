import { communityFile } from "../api/communityApi";

// Static class strings so Tailwind can see them.
const tints = [
  "from-indigo-500/40 via-violet-500/20 to-transparent",
  "from-sky-500/40 via-cyan-500/20 to-transparent",
  "from-emerald-500/35 via-teal-500/20 to-transparent",
  "from-rose-500/35 via-orange-500/20 to-transparent",
  "from-fuchsia-500/35 via-purple-500/20 to-transparent",
  "from-amber-500/35 via-yellow-500/15 to-transparent",
];

export function bannerTint(name = "") {
  let hash = 0;
  for (const char of String(name))
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tints[hash % tints.length];
}

export function CommunityAvatar({
  community,
  size = "size-12",
  text = "text-lg",
  rounded = "rounded-2xl",
  className = "",
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden bg-brand-soft font-extrabold text-brand-ink ${size} ${text} ${rounded} ${className}`}
    >
      {community.iconId ? (
        <img
          src={communityFile(community.iconId, true)}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        (community.name?.[0] || "?").toUpperCase()
      )}
    </div>
  );
}

export function Banner({ community, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${bannerTint(community.name)} ${className}`}
    >
      {community.bannerId && (
        <img
          src={communityFile(community.bannerId)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      )}
    </div>
  );
}
