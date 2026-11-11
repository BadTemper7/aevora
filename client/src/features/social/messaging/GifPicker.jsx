import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Heart, Search, X } from "lucide-react";
import { useDebounce } from "../../../hooks/useDebounce";
import { create, errorText, mediaFile, read, remove } from "../api/socialApi";
import MediaPicker from "../components/MediaPicker";
import { field } from "../components/SocialUI";
import { browseGiphy, getGiphyByIds, isGiphyConfigured } from "./giphyClient";

const categories = [
  ["trending", "Trending"],
  ["reactions", "Reactions"],
  ["funny", "Funny"],
  ["favorites", "Favorites"],
  ["mine", "My GIFs"],
];
/** Remote content is requested directly from GIPHY on every browse/search; no GIPHY API response caching. */
export default function GifPicker({ onSelect, onClose, anchorRef, busy = false }) {
  const client = useQueryClient();
  const container = useRef(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999, width: 320, height: 300 });
  const [category, setCategory] = useState("trending");
  const [term, setTerm] = useState("");
  const [notice, setNotice] = useState("");
  const [remote, setRemote] = useState({
    items: [],
    loading: false,
    error: "",
    nextOffset: null,
  });
  const [favoriteResolved, setFavoriteResolved] = useState({
    items: [],
    loading: false,
    error: "",
  });
  const debounced = useDebounce(term, 300);
  const favorites = useQuery({
    queryKey: ["gifs", "favorites"],
    queryFn: () => read("/gifs/favorites"),
    enabled: category === "favorites",
  });
  const mine = useQuery({
    queryKey: ["gifs", "mine"],
    queryFn: () => read("/gifs/mine"),
    enabled: category === "mine",
  });
  const online = !["favorites", "mine"].includes(category);

  useEffect(() => {
    if (!online) return undefined;
    const controller = new AbortController();
    setRemote({ items: [], loading: true, error: "", nextOffset: null });
    browseGiphy({ category, term: debounced, signal: controller.signal })
      .then(({ items, nextOffset }) =>
        setRemote({ items, nextOffset, loading: false, error: "" }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setRemote({
            items: [],
            nextOffset: null,
            loading: false,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [category, debounced, online]);

  useEffect(() => {
    if (category !== "favorites" || !Array.isArray(favorites.data))
      return undefined;
    const controller = new AbortController();
    const ids = favorites.data
      .filter((g) => g.source === "giphy")
      .map((g) => g.id);
    if (!ids.length) {
      setFavoriteResolved({ items: [], loading: false, error: "" });
      return undefined;
    }
    setFavoriteResolved({ items: [], loading: true, error: "" });
    getGiphyByIds(ids, controller.signal)
      .then((items) =>
        setFavoriteResolved({ items, loading: false, error: "" }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setFavoriteResolved({
            items: [],
            loading: false,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [category, favorites.data]);

  useEffect(() => {
    const escape = (event) => {
      if (event.key === "Escape") onClose();
    };
    const outside = (event) => {
      if (
        !container.current?.contains(event.target) &&
        !event.target.closest('[aria-label="Open GIF picker"]')
      )
        onClose();
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [onClose]);
  useLayoutEffect(() => {
    const updatePosition = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      const visual = window.visualViewport;
      const leftEdge = visual?.offsetLeft || 0;
      const topEdge = visual?.offsetTop || 0;
      const width = visual?.width || window.innerWidth;
      const height = visual?.height || window.innerHeight;
      const margin = 8;
      const panelWidth = Math.max(180, Math.min(400, width - 2 * margin));
      const above = rect.top - topEdge;
      const below = topEdge + height - rect.bottom;
      const aboveAnchor = above >= below || above >= 390;
      const space = aboveAnchor ? above : below;
      const panelHeight = Math.max(140, Math.min(420, space - margin * 2, height - margin * 2));
      let top = aboveAnchor ? rect.top - panelHeight - margin : rect.bottom + margin;
      top = Math.max(topEdge + margin, Math.min(top, topEdge + height - panelHeight - margin));
      const left = Math.max(leftEdge + margin, Math.min(rect.left, leftEdge + width - panelWidth - margin));
      const next = { top: Math.round(top), left: Math.round(left), width: Math.round(panelWidth), height: Math.round(panelHeight) };
      setPosition((current) => Object.keys(next).every((key) => current[key] === next[key]) ? current : next);
    };
    updatePosition();
    const visual = window.visualViewport;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    visual?.addEventListener("resize", updatePosition);
    visual?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      visual?.removeEventListener("resize", updatePosition);
      visual?.removeEventListener("scroll", updatePosition);
    };
  }, [anchorRef]);
  const rawFavorites = Array.isArray(favorites.data) ? favorites.data : [];
  const favoritesById = new Map(
    favoriteResolved.items.map((gif) => [gif.id, gif]),
  );
  const availableFavorites = rawFavorites.flatMap((row) =>
    row.source === "upload"
      ? [row]
      : favoritesById.has(row.id)
        ? [{ ...favoritesById.get(row.id), favoriteId: row.favoriteId }]
        : [],
  );
  const items =
    category === "favorites"
      ? availableFavorites
      : category === "mine"
        ? mine.data || []
        : remote.items;
  const isLoading =
    category === "favorites"
      ? favorites.isLoading || favoriteResolved.loading
      : category === "mine"
        ? mine.isLoading
        : remote.loading;
  const currentError =
    category === "favorites"
      ? favorites.error
        ? errorText(favorites.error)
        : favoriteResolved.error
      : category === "mine"
        ? mine.error
          ? errorText(mine.error)
          : ""
        : remote.error;
  const select = (gif) => {
    if (busy) return;
    // The sender's optimistic bubble appears immediately; a server failure is
    // handled by that bubble's Retry action rather than keeping this panel open.
    try {
      void Promise.resolve(onSelect(gif)).catch((error) =>
        console.warn("GIF message send failed", error),
      );
      onClose();
    } catch (error) {
      setNotice(errorText(error));
    }
  };
  const save = async (gif) => {
    try {
      setNotice("");
      await create("/gifs/favorites", {
        source: gif.source,
        sourceId: String(gif.id),
        ...(gif.source === "upload" ? { mediaId: gif.mediaId } : {}),
      });
      client.invalidateQueries({ queryKey: ["gifs", "favorites"] });
    } catch (error) {
      setNotice(errorText(error));
    }
  };
  const unfavorite = async (gif) => {
    try {
      await remove(`/gifs/favorites/${gif.favoriteId}`);
      client.invalidateQueries({ queryKey: ["gifs", "favorites"] });
    } catch (error) {
      setNotice(errorText(error));
    }
  };
  return createPortal(
    <div
      ref={container}
      role="dialog"
      aria-label="Choose a GIF"
      style={{ top: position.top, left: position.left, width: position.width, height: position.height, opacity: position.top === -9999 ? 0 : 1 }}
      className="fixed z-[210] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-2xl ring-1 ring-black/5 sm:rounded-3xl sm:p-4"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-base font-bold tracking-tight text-ink">
          Send a GIF
        </h3>
        <button
          type="button"
          title="Close GIF picker"
          aria-label="Close GIF picker"
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <nav
        aria-label="GIF categories"
        className="custom-scrollbar mb-3 flex shrink-0 gap-1.5 overflow-x-auto overflow-y-hidden pb-1"
      >
        {categories.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-current={value === category ? "true" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${value === category ? "bg-brand text-on-brand shadow-md" : "bg-raised text-ink-soft hover:text-ink"}`}
            onClick={() => {
              setCategory(value);
              setTerm("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {online && (
        <label className="relative mb-3 shrink-0">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            size={16}
          />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Search GIFs"
            className={`${field} !rounded-full !pl-10 transition-shadow focus:shadow-md`}
            placeholder="Search GIFs..."
          />
        </label>
      )}
      {category === "mine" && (
        <MediaPicker
          purpose="message"
          accept="image/gif"
          label="Upload your own animated GIF"
          onReady={(media) => {
            if (media?.kind === "gif")
              client.invalidateQueries({ queryKey: ["gifs", "mine"] });
          }}
        />
      )}
      {notice && (
        <p role="alert" className="mb-2 shrink-0 text-xs text-danger">
          {notice}
        </p>
      )}
      <div
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {isLoading ? (
          <div
            role="status"
            aria-label="Loading GIFs"
            className="grid grid-cols-2 gap-2.5"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-xl bg-raised"
              />
            ))}
          </div>
        ) : currentError ? (
          <div role="alert" className="py-6 text-center text-sm text-danger">
            {currentError}
            <button
              type="button"
              className="mt-3 block w-full text-ink-soft underline hover:text-ink"
              onClick={() => {
                setCategory((prev) =>
                  prev === "trending" ? "reactions" : "trending",
                );
              }}
            >
              Try another category
            </button>
          </div>
        ) : !items.length ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            {category === "favorites"
              ? "No saved GIFs yet."
              : category === "mine"
                ? "Upload a GIF to see it here."
                : "No GIFs found. Try another search."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((gif) => (
              <div
                key={`${gif.source}:${gif.id}`}
                className="group relative overflow-hidden rounded-xl bg-raised shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <button
                  type="button"
                  disabled={busy}
                  title={`Send ${gif.description || "GIF"}`}
                  onClick={() => select(gif)}
                  className="block aspect-[4/3] w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
                >
                  <img
                    src={
                      gif.previewUrl ||
                      (gif.mediaId ? mediaFile(gif.mediaId) : gif.url)
                    }
                    alt={gif.description || "GIF"}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {category === "favorites" ? (
                  <button
                    type="button"
                    title="Remove favorite"
                    aria-label="Remove GIF favorite"
                    className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/40 text-rose-400 backdrop-blur-md transition-transform hover:scale-110"
                    onClick={() => unfavorite(gif)}
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Save GIF"
                    aria-label="Save GIF to favorites"
                    className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/40 text-white opacity-100 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/60 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => save(gif)}
                  >
                    <BookmarkPlus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {online && (
        <p className="shrink-0 pt-3 text-right text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          Powered by{" "}
          <a
            href="https://giphy.com/"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            GIPHY
          </a>
        </p>
      )}
    </div>,
    document.body,
  );
}
