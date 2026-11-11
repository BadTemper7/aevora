import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Clapperboard,
  Compass,
  Cpu,
  Gamepad2,
  Globe,
  GraduationCap,
  Headphones,
  LayoutGrid,
  Lock,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import {
  communityRead,
  communityCreate,
  communityError,
} from "../api/communityApi";
import { read } from "../../social/api/socialApi";
import MediaPicker from "../../social/components/MediaPicker";
import { useVoiceSession } from "../hooks/useVoiceSession";
import {
  field,
  smallButton,
  ErrorNotice,
} from "../../social/components/SocialUI";
import { Banner, CommunityAvatar } from "../components/CommunityVisuals";

const groups = [
  "All",
  "Gaming",
  "Technology",
  "Entertainment",
  "Education",
  "General",
];
const groupIcons = {
  All: LayoutGrid,
  Gaming: Gamepad2,
  Technology: Cpu,
  Entertainment: Clapperboard,
  Education: GraduationCap,
  General: Sparkles,
};
const visibilities = [
  ["public", "Public", "Anyone can find and join", Globe],
  ["private", "Private", "Members request approval", Lock],
  ["invite", "Invite only", "Only people you invite", Mail],
];
const visibilityIcon = { public: Globe, private: Lock, invite: Mail };
const initial = {
  name: "",
  slug: "",
  description: "",
  visibility: "public",
  category: "General",
  rules: "",
  requireApproval: false,
  iconId: "",
  bannerId: "",
};

function CommunityCard({ community, onJoin, pending, compact = false }) {
  const VisIcon = visibilityIcon[community.visibility] || Globe;
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface/70 transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-2xl ${compact ? "w-[17rem] shrink-0 snap-start" : ""}`}
    >
      <div className="relative">
        <Banner community={community} className={compact ? "h-20" : "h-28"} />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold capitalize text-white backdrop-blur-md">
          <VisIcon size={11} />
          {community.visibility}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <CommunityAvatar
          community={community}
          size="size-14"
          text="text-xl"
          className="-mt-7 shadow-lg ring-4 ring-surface"
        />
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold tracking-tight">
            {community.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <span>{community.category}</span>
            <span className="size-1 rounded-full bg-ink-faint" />
            <UsersRound size={12} />
            {community.memberCount || 0}
          </p>
        </div>
        {!compact && (
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-ink-soft">
            {community.description ||
              "A space to connect, collaborate, and share."}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link
            to={`/communities/${community.id}`}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-line py-2 text-xs font-bold transition-colors hover:bg-raised ${!onJoin ? "bg-brand-soft text-brand-ink hover:!bg-brand-soft" : ""}`}
          >
            {onJoin ? "View" : "Open"}
            <ArrowUpRight size={13} />
          </Link>
          {onJoin && (
            <button
              disabled={pending}
              onClick={() => onJoin(community)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-bold text-on-brand shadow-md transition hover:brightness-110 disabled:opacity-60"
            >
              {pending && <LoaderCircle size={13} className="animate-spin" />}
              {pending
                ? "Joining..."
                : community.requireApproval
                  ? "Request access"
                  : "Join"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Skeletons({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-3xl border border-line bg-raised/50"
        />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
        <Icon size={22} />
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">{children}</p>
      </div>
      {action}
    </div>
  );
}

export default function CommunityDiscoveryPage() {
  const client = useQueryClient(),
    navigate = useNavigate();
  const voice = useVoiceSession();
  const [q, setQ] = useState(""),
    [queryTerm, setQueryTerm] = useState(""),
    [category, setCategory] = useState("All");
  const [creating, setCreating] = useState(false),
    [form, setForm] = useState(initial),
    [selectedFriends, setSelectedFriends] = useState([]);
  const [acceptRules, setAcceptRules] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQueryTerm(q), 260);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!creating) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setCreating(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [creating]);
  const mine = useQuery({
    queryKey: ["communities", "mine"],
    queryFn: () => communityRead("/communities"),
  });
  const discover = useQuery({
    queryKey: ["communities", "discover", queryTerm, category],
    queryFn: () =>
      communityRead("/communities/discover", { q: queryTerm, category }),
  });
  const invites = useQuery({
    queryKey: ["communities", "invites"],
    queryFn: () => communityRead("/communities/invitations"),
  });
  const friends = useQuery({
    queryKey: ["friends", "communities"],
    queryFn: () => read("/friends", { tab: "friends" }),
    enabled: creating,
  });
  const quick = useQuery({
    queryKey: ["communities", "quick"],
    queryFn: () => communityRead("/voice/quick"),
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["communities"] });
  };
  const join = async (community) => {
    setBusy(`join-${community.id}`);
    setError("");
    setSuccess("");
    try {
      const r = await communityCreate(`/communities/${community.id}/join`, {
        rulesAccepted: acceptRules,
      });
      refresh();
      if (r.status === "active") navigate(`/communities/${community.id}`);
      else setSuccess("Your request to join is pending approval.");
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy("");
    }
  };
  const create = async (event) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    try {
      const payload = { ...form };
      if (!payload.slug) delete payload.slug;
      if (!payload.iconId) delete payload.iconId;
      if (!payload.bannerId) delete payload.bannerId;
      const c = await communityCreate("/communities", payload);
      for (const id of selectedFriends) {
        try {
          await communityCreate(`/communities/${c.id}/invitations`, {
            userId: id,
          });
        } catch (err) {
          console.warn("Friend invitation failed:", err.message);
        }
      }
      refresh();
      setCreating(false);
      navigate(`/communities/${c.id}`);
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy("");
    }
  };
  const respond = async (id, action, rules) => {
    setBusy(id);
    setError("");
    try {
      const r = await communityCreate(
        `/communities/invitations/${id}/respond`,
        { action, rulesAccepted: rules },
      );
      refresh();
      if (r.status === "active")
        setSuccess("Invitation accepted. Your community is in My Communities.");
      else if (r.status === "pending")
        setSuccess("Membership approval is pending.");
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy("");
    }
  };
  const createQuick = async (friendId) => {
    setBusy("quick");
    setError("");
    try {
      const r = await communityCreate("/voice/quick", {
        friendIds: [friendId],
      });
      await voice.join(r.roomId, { quick: true });
      refresh();
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy("");
    }
  };
  const openCreate = () => {
    setCreating(true);
    setError("");
  };
  const createButton = (
    <button
      type="button"
      onClick={openCreate}
      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-on-brand shadow-lg transition hover:brightness-110"
    >
      <Plus size={18} />
      Create community
    </button>
  );

  return (
    <div className="custom-scrollbar w-full overflow-y-auto px-3 pb-28 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-line bg-surface/60 p-6 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-brand/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-fuchsia-500/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-ink">
                Communities
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Find your people.
                <br />
                <span className="bg-gradient-to-r from-brand-ink to-fuchsia-400 bg-clip-text text-transparent">
                  Build your space.
                </span>
              </h1>
              <p className="mt-3 text-sm text-ink-soft sm:text-base">
                Find spaces to talk, share, play, and create together.
              </p>
            </div>
            {createButton}
          </div>
        </section>

        {error && <ErrorNotice error={error} />}
        {success && (
          <p
            role="status"
            className="rounded-2xl border border-success/30 bg-success/10 p-3 text-sm text-success"
          >
            {success}
          </p>
        )}

        {invites.data?.length > 0 && (
          <section id="invitations" className="scroll-mt-24 space-y-3 rounded-3xl border border-brand/25 bg-brand-soft/20 p-5">
            <h2 className="flex items-center gap-2 font-extrabold">
              <Mail size={17} />
              Community invitations
              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-on-brand">
                {invites.data.length}
              </span>
            </h2>
            {invites.data.map((i) => (
              <InvitationRow
                key={i.id}
                invitation={i}
                busy={busy === i.id}
                onRespond={respond}
              />
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-extrabold">Your communities</h2>
          {mine.isLoading ? (
            <Skeletons count={3} />
          ) : mine.isError ? (
            <ErrorNotice error={mine.error} />
          ) : mine.data?.length ? (
            <div className="custom-scrollbar flex snap-x gap-4 overflow-x-auto pb-3">
              {mine.data.map((c) => (
                <CommunityCard key={c.id} community={c} compact />
              ))}
              <button
                type="button"
                onClick={openCreate}
                className="grid w-40 shrink-0 snap-start place-items-center gap-2 rounded-3xl border border-dashed border-line-strong p-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-raised hover:text-ink"
              >
                <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand-ink">
                  <Plus size={18} />
                </span>
                New community
              </button>
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="You have not joined a community yet"
              action={createButton}
            >
              Explore public communities below or start your own.
            </EmptyState>
          )}
        </section>

        <section>
          <div className="sticky top-0 z-10 -mx-3 space-y-3 border-b border-line bg-canvas/80 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-extrabold">Discover communities</h2>
              <label className="relative min-w-0 sm:w-80">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  className={`${field} !rounded-full !pl-10`}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search communities"
                  aria-label="Search public communities"
                />
              </label>
            </div>
            <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
              {groups.map((g) => {
                const Icon = groupIcons[g];
                return (
                  <button
                    type="button"
                    key={g}
                    aria-pressed={category === g}
                    onClick={() => setCategory(g)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${category === g ? "bg-brand text-on-brand shadow-md" : "border border-line bg-surface/70 text-ink-soft hover:text-ink"}`}
                  >
                    <Icon size={13} />
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="mt-4 flex w-fit items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1.5 text-xs text-ink-soft">
            <ShieldCheck size={14} className="text-brand-ink" />
            <input
              type="checkbox"
              className="accent-brand"
              checked={acceptRules}
              onChange={(e) => setAcceptRules(e.target.checked)}
            />
            I agree to review and follow each community's rules when joining.
          </label>
          <div className="mt-5">
            {discover.isLoading ? (
              <Skeletons count={3} />
            ) : discover.isError ? (
              <ErrorNotice error={discover.error} />
            ) : discover.data?.items?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {discover.data.items.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    onJoin={
                      !mine.data?.some((m) => m.id === c.id) ? join : null
                    }
                    pending={busy === `join-${c.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Compass} title="No matching public communities">
                Try a different search or category, or create the first one.
              </EmptyState>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand/15 via-surface to-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-on-brand shadow-lg">
                <Headphones size={22} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  Quick voice rooms with friends
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Start a temporary voice session separate from permanent
                  communities.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quick.data?.map((r) => (
                <button
                  key={r.roomId}
                  className={smallButton}
                  onClick={() => voice.join(r.roomId, { quick: true })}
                >
                  Join room from {new Date(r.createdAt).toLocaleString()}
                </button>
              ))}
              <QuickFriendRoom onCreate={createQuick} busy={busy === "quick"} />
            </div>
          </div>
          {voice.error && (
            <div className="mt-3">
              <ErrorNotice error={voice.error} />
            </div>
          )}
        </section>
      </div>

      {creating && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false);
          }}
        >
          <form
            onSubmit={create}
            role="dialog"
            aria-modal="true"
            aria-label="Create community"
            className="custom-scrollbar max-h-[92dvh] w-full max-w-xl space-y-5 overflow-y-auto rounded-[2rem] border border-line bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  Create a community
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Give your space a name and a vibe. You can change everything
                  later.
                </p>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onClick={() => setCreating(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-raised hover:text-ink"
              >
                <X size={19} />
              </button>
            </div>
            <label className="block text-sm font-bold">
              Community name
              <input
                required
                autoFocus
                className={`mt-1.5 ${field}`}
                maxLength={80}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm font-bold">
              Description
              <textarea
                className={`mt-1.5 ${field}`}
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <div>
              <p className="mb-1.5 text-sm font-bold">Who can join?</p>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {visibilities.map(([value, label, hint, Icon]) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.visibility === value}
                    key={value}
                    onClick={() =>
                      setForm((f) => ({ ...f, visibility: value }))
                    }
                    className={`rounded-2xl border p-3 text-left transition-all ${form.visibility === value ? "border-brand bg-brand-soft ring-1 ring-brand/40" : "border-line hover:bg-raised"}`}
                  >
                    <Icon
                      size={17}
                      className={
                        form.visibility === value
                          ? "text-brand-ink"
                          : "text-ink-soft"
                      }
                    />
                    <p className="mt-2 text-sm font-bold">{label}</p>
                    <p className="text-[11px] leading-4 text-ink-soft">
                      {hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold">Category</p>
              <div className="flex flex-wrap gap-2">
                {groups
                  .filter((g) => g !== "All")
                  .map((g) => {
                    const Icon = groupIcons[g];
                    return (
                      <button
                        type="button"
                        key={g}
                        aria-pressed={form.category === g}
                        onClick={() => setForm((f) => ({ ...f, category: g }))}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${form.category === g ? "bg-brand text-on-brand" : "border border-line text-ink-soft hover:text-ink"}`}
                      >
                        <Icon size={13} />
                        {g}
                      </button>
                    );
                  })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-brand"
                checked={form.requireApproval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requireApproval: e.target.checked }))
                }
              />
              Require approval for new members
            </label>
            <label className="block text-sm font-bold">
              Community rules
              <textarea
                className={`mt-1.5 ${field}`}
                rows={3}
                maxLength={6000}
                placeholder="Community guidelines"
                value={form.rules}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rules: e.target.value }))
                }
              />
            </label>
            <details className="rounded-2xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-bold">
                Icon and banner
              </summary>
              <div className="mt-3 space-y-3">
                <MediaPicker
                  purpose="community" variant="icon"
                  accept="image/*"
                  label="Upload icon"
                  onReady={(m) =>
                    setForm((f) => ({ ...f, iconId: m?.id || "" }))
                  }
                />
                <MediaPicker
                  purpose="community" variant="banner"
                  accept="image/*"
                  label="Upload banner"
                  onReady={(m) =>
                    setForm((f) => ({ ...f, bannerId: m?.id || "" }))
                  }
                />
              </div>
            </details>
            <details className="rounded-2xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-bold">
                Invite friends during setup
              </summary>
              <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm">
                {friends.isLoading
                  ? "Loading friends..."
                  : (friends.data || []).length
                    ? friends.data.map((r) => (
                        <label
                          key={r.user?.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            className="accent-brand"
                            checked={selectedFriends.includes(r.user?.id)}
                            onChange={(e) =>
                              setSelectedFriends((v) =>
                                e.target.checked
                                  ? [...v, r.user.id]
                                  : v.filter((x) => x !== r.user.id),
                              )
                            }
                          />
                          @{r.user?.username}
                        </label>
                      ))
                    : "No friends to invite yet."}
              </div>
            </details>
            <details className="rounded-2xl border border-line p-3">
              <summary className="cursor-pointer text-sm font-bold">
                Advanced: custom identifier
              </summary>
              <label className="mt-3 block text-sm font-bold">
                Unique identifier
                <input
                  className={`mt-1.5 ${field}`}
                  pattern="[a-z0-9]([a-z0-9-]{1,46})[a-z0-9]"
                  placeholder="my-community"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase(),
                    }))
                  }
                />
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  Leave blank to generate from the name. Letters, numbers and
                  hyphens.
                </span>
              </label>
            </details>
            {error && <ErrorNotice error={error} />}
            <button
              disabled={busy === "create"}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-bold text-on-brand shadow-lg transition hover:brightness-110 disabled:opacity-60"
            >
              {busy === "create" ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Creating community...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Create community
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function InvitationRow({ invitation, busy, onRespond }) {
  const [rulesAccepted, setRulesAccepted] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/80 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <CommunityAvatar
          community={invitation.community}
          size="size-11"
          rounded="rounded-xl"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {invitation.community.name}
          </p>
          <p className="text-xs capitalize text-ink-soft">
            Invited to join · {invitation.community.visibility}
          </p>
          {invitation.community.rules && (
            <details className="mt-1 max-w-lg text-xs">
              <summary className="cursor-pointer text-brand-ink">
                Read community rules
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-ink-soft">
                {invitation.community.rules}
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                />
                I agree to the rules
              </label>
            </details>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-on-brand disabled:opacity-50"
          disabled={
            busy || Boolean(invitation.community.rules && !rulesAccepted)
          }
          onClick={() => onRespond(invitation.id, "accept", rulesAccepted)}
        >
          Accept
        </button>
        <button
          className="rounded-full border border-line px-4 py-2 text-xs font-bold hover:bg-raised disabled:opacity-50"
          disabled={busy}
          onClick={() => onRespond(invitation.id, "decline", false)}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function QuickFriendRoom({ onCreate, busy }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const friends = useQuery({
    queryKey: ["friends", "quickvoice"],
    queryFn: () => read("/friends", { tab: "friends" }),
    enabled: open,
  });
  const list = (friends.data || []).filter((r) =>
    r.user?.username?.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-on-brand shadow-md transition hover:brightness-110"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Headphones size={17} />
        Start with a friend
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-surface p-3 shadow-2xl">
          <input
            className={`${field} !rounded-full`}
            placeholder="Search your friends"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="custom-scrollbar mt-2 max-h-44 overflow-y-auto">
            {friends.isLoading && (
              <p className="p-3 text-xs text-ink-soft">Loading friends...</p>
            )}
            {!friends.isLoading && !list.length && (
              <p className="p-3 text-xs text-ink-soft">No friends found.</p>
            )}
            {list.map((r) => (
              <button
                key={r.user.id}
                disabled={busy}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-raised"
                onClick={() => {
                  onCreate(r.user.id);
                  setOpen(false);
                }}
              >
                Start with @{r.user.username}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
