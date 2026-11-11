import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  Crown,
  Hash,
  Headphones,
  ListChecks,
  LoaderCircle,
  Megaphone,
  Menu,
  MessageCircleReply,
  MessagesSquare,
  Plus,
  Radio,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { subscribeSocialSocket } from "../../../services/socket/socketClient";
import {
  communityRead,
  communityCreate,
  communityError,
} from "../api/communityApi";
import { useVoiceSession } from "../hooks/useVoiceSession";
import {
  ErrorNotice,
  field,
  smallButton,
} from "../../social/components/SocialUI";
import { useAuth } from "../../auth/hooks/useAuth";
import ChannelChat, { headerButton } from "../components/ChannelChat";
import {
  ForumPanel,
  PollPanel,
  EventsPanel,
  InvitesPanel,
} from "../components/CommunityPanels";
import CommunitySettingsPanel from "../components/CommunitySettingsPanel";
import { Banner, CommunityAvatar } from "../components/CommunityVisuals";

const icons = {
  text: Hash,
  announcement: Megaphone,
  voice: Headphones,
  video: Video,
  forum: MessageCircleReply,
  stage: Radio,
};
const tabs = [
  ["channel", "Spaces", MessagesSquare],
  ["events", "Events", CalendarDays],
  ["invites", "Invites", UserPlus],
  ["settings", "Settings", Settings],
];
const roleOrder = ["owner", "admin", "moderator", "member", "guest"];
const roleLabel = {
  owner: "Owner",
  admin: "Admins",
  moderator: "Moderators",
  member: "Members",
  guest: "Guests",
};
const surface = "rounded-3xl border border-line bg-surface/70";

function VoicePeople({ channelId }) {
  const q = useQuery({
    queryKey: ["community", "participants", channelId],
    queryFn: () => communityRead(`/channels/${channelId}/voice/participants`),
    refetchInterval: 15000,
    staleTime: 6000,
  });
  if (!q.data?.items?.length) return null;
  return (
    <div
      className="ml-10 mt-0.5 space-y-0.5 pb-1"
      aria-label="Voice participants"
    >
      {q.data.items.map((p) => (
        <div
          key={p.userId}
          className="flex items-center gap-2 truncate text-xs text-ink-soft"
        >
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-success" />
          {p.name}
        </div>
      ))}
    </div>
  );
}

function ChannelButton({
  channel,
  selected,
  onNavigate,
  onJoin,
  joining,
  unread,
}) {
  const Icon = icons[channel.type] || Hash;
  const voice = ["voice", "video", "stage"].includes(channel.type);
  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-2xl transition-colors ${selected ? "bg-brand-soft text-brand-ink ring-1 ring-brand/20" : "text-ink-soft hover:bg-raised hover:text-ink"}`}
      >
        <button
          type="button"
          onClick={() => onNavigate(channel)}
          className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2 text-left text-sm font-semibold"
          aria-current={selected ? "page" : undefined}
        >
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${selected ? "bg-brand text-on-brand" : "bg-raised text-ink-soft group-hover:text-ink"}`}
          >
            <Icon size={15} />
          </span>
          <span className="truncate">{channel.name}</span>
          {unread?.count > 0 && (
            <span
              aria-label={`${unread.count} unread messages`}
              className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-on-brand"
            >
              {unread.count}
              {unread.mentions > 0 ? ` · @${unread.mentions}` : ""}
            </span>
          )}
        </button>
        {voice && (
          <button
            type="button"
            title={`Join ${channel.name} live`}
            aria-label={`Join voice channel ${channel.name}`}
            onClick={() => onJoin(channel)}
            disabled={joining}
            className="mr-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success transition-colors hover:bg-success/25 disabled:opacity-60"
          >
            {joining ? (
              <LoaderCircle size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Join
          </button>
        )}
      </div>
      {voice && <VoicePeople channelId={channel.id} />}
    </div>
  );
}

function SpacesCard({
  community,
  selected,
  onNavigate,
  onJoin,
  joining,
  className = "",
}) {
  const unread = useQuery({
    queryKey: ["community", "unread", community.id],
    queryFn: () => communityRead(`/communities/${community.id}/unread`),
    staleTime: 10000,
  });
  const [filter, setFilter] = useState(""),
    [collapsed, setCollapsed] = useState([]);
  const term = filter.trim().toLowerCase();
  const categories = community.categories || [];
  const all = community.channels || [];
  const groups = [
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: all.filter((ch) => String(ch.categoryId) === String(c.id)),
    })),
    {
      id: "none",
      name: "Other spaces",
      items: all.filter((ch) => !ch.categoryId),
    },
  ]
    .map((g) => ({
      ...g,
      items: term
        ? g.items.filter((ch) => ch.name.toLowerCase().includes(term))
        : g.items,
    }))
    .filter((g) => g.items.length > 0);
  return (
    <nav
      aria-label="Community spaces"
      className={`min-h-0 flex-col ${surface} ${className}`}
    >
      <div className="p-3 pb-2">
        <label className="relative block">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter spaces"
            placeholder="Jump to a space"
            className={`${field} !rounded-full !py-2 !pl-9 text-sm`}
          />
        </label>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-3">
        {groups.map((g) => {
          const open = Boolean(term) || !collapsed.includes(g.id);
          return (
            <section key={g.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setCollapsed((v) =>
                    v.includes(g.id)
                      ? v.filter((x) => x !== g.id)
                      : [...v, g.id],
                  )
                }
                className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint transition-colors hover:text-ink-soft"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform ${open ? "" : "-rotate-90"}`}
                />
                {g.name}
              </button>
              {open && (
                <div className="mt-1 space-y-0.5">
                  {g.items.map((ch) => (
                    <ChannelButton
                      key={ch.id}
                      channel={ch}
                      selected={selected?.id === ch.id}
                      onNavigate={onNavigate}
                      onJoin={onJoin}
                      joining={joining}
                      unread={unread.data?.[ch.id]}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {!groups.length && (
          <p className="p-4 text-center text-xs text-ink-soft">
            No spaces match "{filter}".
          </p>
        )}
      </div>
    </nav>
  );
}

function StageControls({ channel, community, joined, voice }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canModerate = community.permissions?.includes("mute_members");
  const canManage = community.permissions?.includes("manage_events");
  const query = useQuery({
    queryKey: ["community", "stage", channel.id],
    queryFn: () => communityRead(`/channels/${channel.id}/stage`),
    refetchInterval: 12000,
  });
  const stage = query.data;
  useEffect(() => {
    if (stage?.topic) setTopic(stage.topic);
  }, [stage?.topic]);
  const apply = async (path, data) => {
    setError("");
    setBusy(true);
    try {
      await communityCreate(path, data);
      await cache.invalidateQueries({
        queryKey: ["community", "stage", channel.id],
      });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const refresh = () => {
    if (joined) voice.join(channel.id);
  };
  const myHand = stage?.raisedHands?.includes(user?.id);
  const mySpeaker = stage?.speakers?.includes(user?.id);
  const memberName = (id) =>
    community.members?.find((m) => m.userId === id)?.user?.username || id;
  return (
    <section className={`w-full max-w-xl space-y-3 p-5 text-left ${surface}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Stage controls</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stage?.active ? "bg-success/15 text-success" : "bg-raised text-ink-soft"}`}
        >
          {stage?.active ? "Live stage" : "Stage not started"}
        </span>
      </div>
      {query.isError && <ErrorNotice error={query.error} />}
      {stage?.topic && <p className="text-sm">{stage.topic}</p>}
      <p className="text-xs text-ink-soft">
        Audience members can listen. Only approved speakers can turn on their
        microphones.
      </p>
      {!canModerate && (
        <button
          className={smallButton}
          disabled={busy}
          onClick={() =>
            apply(`/channels/${channel.id}/stage/hand`, { raised: !myHand })
          }
        >
          {myHand ? "Lower hand" : "Raise hand to speak"}
        </button>
      )}
      {mySpeaker && joined && (
        <button className={smallButton} disabled={voice.busy} onClick={refresh}>
          Reconnect to enable speaking
        </button>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <input
            className={`${field} min-w-0 flex-1`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={140}
            placeholder="Stage topic"
          />
          <button
            className={smallButton}
            disabled={busy}
            onClick={() =>
              apply(`/channels/${channel.id}/stage`, {
                topic,
                active: !stage?.active,
              })
            }
          >
            {stage?.active ? "End stage" : "Start stage"}
          </button>
          <button
            className={smallButton}
            disabled={busy}
            onClick={() => apply(`/channels/${channel.id}/stage`, { topic })}
          >
            Save topic
          </button>
        </div>
      )}
      {canModerate && (
        <>
          <p className="text-xs font-bold">Raised hands</p>
          {stage?.raisedHands?.length ? (
            stage.raisedHands.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span>@{memberName(id)}</span>
                <button
                  className={smallButton}
                  disabled={busy}
                  onClick={() =>
                    apply(`/channels/${channel.id}/stage/speaker`, {
                      userId: id,
                      allowed: true,
                    })
                  }
                >
                  Approve speaker
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-ink-soft">No hands raised.</p>
          )}
          <p className="text-xs font-bold">Approved speakers</p>
          {stage?.speakers?.map((id) => (
            <div
              key={id}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span>@{memberName(id)}</span>
              <button
                className={smallButton}
                disabled={busy}
                onClick={() =>
                  apply(`/channels/${channel.id}/stage/speaker`, {
                    userId: id,
                    allowed: false,
                  })
                }
              >
                Move to audience
              </button>
            </div>
          ))}
        </>
      )}
      {error && <ErrorNotice error={error} />}
    </section>
  );
}

function VoiceChannel({ channel, voice, community }) {
  const joined = voice.session?.channelId === channel.id;
  const people = useQuery({
    queryKey: ["community", "participants", channel.id],
    queryFn: () => communityRead(`/channels/${channel.id}/voice/participants`),
    refetchInterval: 8000,
    staleTime: 4000,
  });
  const [moderationError, setModerationError] = useState("");
  const canMute = community.permissions?.includes("mute_members");
  const mute = async (userId) => {
    setModerationError("");
    try {
      await communityCreate(`/channels/${channel.id}/voice/mute/${userId}`, {
        minutes: 10,
      });
      await people.refetch();
    } catch (e) {
      setModerationError(communityError(e));
    }
  };
  const count = people.data?.items?.length || 0;
  const Icon =
    channel.type === "video"
      ? Video
      : channel.type === "stage"
        ? Radio
        : Headphones;
  return (
    <div className="custom-scrollbar flex flex-1 flex-col items-center gap-5 overflow-y-auto p-6 text-center sm:p-10">
      <div className="relative mt-2">
        <div className="absolute inset-0 rounded-full bg-brand/40 blur-2xl" />
        <div className="relative grid size-24 place-items-center rounded-[2rem] bg-gradient-to-br from-brand to-brand/60 text-on-brand shadow-2xl">
          <Icon size={40} />
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">
          {channel.name}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
          {channel.topic ||
            "Join a live conversation, turn on your camera, or share your screen with permission."}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${count ? "bg-success/15 text-success" : "bg-raised text-ink-soft"}`}
      >
        <span
          className={`size-1.5 rounded-full ${count ? "animate-pulse bg-success" : "bg-ink-faint"}`}
        />
        {count} connected
      </span>
      {count > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {people.data.items.map((p) => (
            <span
              className="flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1.5 pl-1.5 pr-3 text-sm"
              key={p.userId}
            >
              <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-ink">
                {(p.name || "?").slice(0, 1).toUpperCase()}
              </span>
              {p.name}
              {canMute && p.userId !== community.ownerId && (
                <button
                  className="text-xs text-danger"
                  onClick={() => mute(p.userId)}
                  title="Mute participant for 10 minutes"
                >
                  Mute
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {joined ? (
        <button
          className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-on-brand shadow-lg transition hover:brightness-110"
          onClick={() => voice.setExpanded(true)}
        >
          Open voice session
        </button>
      ) : (
        <button
          className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-on-brand shadow-lg transition hover:brightness-110 disabled:opacity-50"
          disabled={voice.busy}
          onClick={() => voice.join(channel.id)}
        >
          {voice.busy ? "Connecting..." : "Join channel"}
        </button>
      )}
      {channel.type === "stage" && (
        <StageControls
          channel={channel}
          community={community}
          joined={joined}
          voice={voice}
        />
      )}
      {voice.error && <ErrorNotice error={voice.error} />}
      {moderationError && <ErrorNotice error={moderationError} />}
      <p className="max-w-md text-xs text-ink-faint">
        Voice requires a configured LiveKit server and browser microphone
        permission. Screen sharing always opens the browser's selection prompt.
      </p>
    </div>
  );
}

function MemberList({ community, onClose }) {
  const ids = (community.members || [])
    .map((m) => m.userId)
    .slice(0, 100)
    .join(",");
  const presence = useQuery({
    queryKey: ["community", "presence", community.id, ids],
    queryFn: () =>
      communityRead(`/communities/${community.id}/presence`, { ids }),
    enabled: Boolean(ids),
    staleTime: 10000,
  });
  const [search, setSearch] = useState(""),
    [reporting, setReporting] = useState(null),
    [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [feedback, setFeedback] = useState("");
  const people = (community.members || []).filter((m) =>
    (m.user?.username || m.user?.name || "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const grouped = roleOrder
    .map((r) => ({
      r,
      items: people.filter(
        (m) => (roleOrder.includes(m.role) ? m.role : "member") === r,
      ),
    }))
    .filter((g) => g.items.length);
  const report = async () => {
    try {
      await communityCreate(`/communities/${community.id}/reports`, {
        targetType: "member",
        targetId: reporting.userId,
        reason,
        details,
      });
      setFeedback("Report submitted to community moderators.");
      setReporting(null);
      setReason("");
      setDetails("");
    } catch (e) {
      setFeedback(communityError(e));
    }
  };
  return (
    <aside
      className={`flex h-full w-72 shrink-0 flex-col overflow-hidden ${surface}`}
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-extrabold">
          Members{" "}
          <span className="ml-1 rounded-full bg-raised px-2 py-0.5 text-xs font-semibold text-ink-soft">
            {community.memberCount}
          </span>
        </h3>
        <button
          onClick={onClose}
          aria-label="Close member list"
          className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-raised hover:text-ink"
        >
          <X size={17} />
        </button>
      </div>
      <div className="px-3 pb-2">
        <input
          className={`${field} !rounded-full !py-2`}
          placeholder="Find a member"
          aria-label="Search members"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-2 pb-4">
        {grouped.map((g) => (
          <section key={g.r}>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              {roleLabel[g.r]} · {g.items.length}
            </p>
            {g.items.map((m) => {
              const online =
                presence.data?.[m.userId]?.visible &&
                presence.data[m.userId].online;
              return (
                <div
                  key={m.userId}
                  className="group flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-colors hover:bg-raised"
                >
                  <Link
                    to={m.user?.username ? `/u/${m.user.username}` : "#"}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                  >
                    <div className="relative shrink-0">
                      <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                        {m.user?.image ? (
                          <img
                            className="size-full object-cover"
                            src={m.user.image}
                            alt=""
                          />
                        ) : (
                          (m.nickname || m.user?.name || "?").slice(0, 1)
                        )}
                      </div>
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success" />
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold">
                      {m.nickname ||
                        m.user?.name ||
                        m.user?.username ||
                        "Member"}
                    </p>
                  </Link>
                  {m.role === "owner" && (
                    <Crown size={15} className="text-brand-ink" />
                  )}
                  <button
                    type="button"
                    title="Report member"
                    aria-label="Report member"
                    onClick={() => setReporting(m)}
                    className="text-ink-faint transition-opacity hover:text-danger focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Shield size={14} />
                  </button>
                </div>
              );
            })}
          </section>
        ))}
        {!grouped.length && (
          <p className="p-4 text-center text-xs text-ink-soft">
            No members found.
          </p>
        )}
      </div>
      {feedback && (
        <p className="px-4 py-2 text-xs text-ink-soft">{feedback}</p>
      )}
      {reporting && (
        <div className="border-t border-line p-3">
          <p className="mb-2 text-xs font-bold">
            Report @{reporting.user?.username}
          </p>
          <select
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Select reason</option>
            {["Harassment", "Spam", "Scam", "Hate or abuse", "Other"].map(
              (r) => (
                <option key={r}>{r}</option>
              ),
            )}
          </select>
          <textarea
            className={`mt-2 ${field}`}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details"
          />
          <div className="mt-2 flex gap-2">
            <button className={smallButton} disabled={!reason} onClick={report}>
              Submit
            </button>
            <button className={smallButton} onClick={() => setReporting(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default function CommunityPage() {
  const { id, channelId } = useParams(),
    navigate = useNavigate(),
    cache = useQueryClient(),
    voice = useVoiceSession();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "channel";
  const [sidebar, setSidebar] = useState(false),
    [membersOpen, setMembersOpen] = useState(false),
    [mobileMembersOpen, setMobileMembersOpen] = useState(false),
    [switcher, setSwitcher] = useState(false),
    [pollsOpen, setPollsOpen] = useState(false),
    [joinRules, setJoinRules] = useState(false),
    [error, setError] = useState(""),
    [joinBusy, setJoinBusy] = useState(false);
  const myCommunities = useQuery({
    queryKey: ["communities", "mine"],
    queryFn: () => communityRead("/communities"),
  });
  const q = useQuery({
    queryKey: ["community", "detail", id],
    queryFn: () => communityRead(`/communities/${id}`),
    retry: false,
  });
  const community = q.data;
  const selected =
    (community?.channels || []).find((c) => c.id === channelId) ||
    (community?.channels || []).find((c) => c.type === "text");
  const setView = (next) => {
    setParams(next === "channel" ? {} : { view: next });
    setSidebar(false);
  };
  const select = (channel) => {
    setSidebar(false);
    navigate(`/communities/${id}/${channel.id}`);
  };
  const join = async () => {
    setJoinBusy(true);
    setError("");
    try {
      const r = await communityCreate(`/communities/${id}/join`, {
        rulesAccepted: joinRules,
      });
      cache.invalidateQueries({ queryKey: ["community", "detail", id] });
      cache.invalidateQueries({ queryKey: ["communities", "mine"] });
      if (r.status === "pending")
        setError("Your membership request is waiting for approval.");
    } catch (err) {
      setError(communityError(err));
    } finally {
      setJoinBusy(false);
    }
  };
  useEffect(() => {
    if (
      community?.isMember &&
      (!channelId || !community.channels?.some((c) => c.id === channelId)) &&
      community.channels?.length
    )
      navigate(`/communities/${id}/${community.channels[0].id}`, {
        replace: true,
      });
  }, [community?.isMember, community?.channels, channelId, id, navigate]);
  useEffect(() => {
    setPollsOpen(false);
  }, [selected?.id, view]);
  useEffect(
    () =>
      subscribeSocialSocket((socket) => {
        if (!socket) return;
        const joinRoom = () =>
          socket.emit("community:join", { communityId: id });
        socket.on("connect", joinRoom);
        if (socket.connected) joinRoom();
        const onChange = (payload) => {
          if (payload?.communityId === id) {
            cache.invalidateQueries({ queryKey: ["community", "detail", id] });
            cache.invalidateQueries({ queryKey: ["communities", "mine"] });
          }
        };
        const onVoice = (payload) => {
          if (payload?.channelId)
            cache.invalidateQueries({
              queryKey: ["community", "participants", payload.channelId],
            });
        };
        const onRemove = (payload) => {
          if (payload?.communityId === id) {
            voice.leave();
            navigate("/communities");
          }
        };
        socket.on("community:channels", onChange);
        socket.on("community:updated", onChange);
        socket.on("community:member", onChange);
        socket.on("community:event", onChange);
        socket.on("community:voice:presence", onVoice);
        socket.on("community:removed", onRemove);
        return () => {
          socket.off("connect", joinRoom);
          socket.off("community:channels", onChange);
          socket.off("community:updated", onChange);
          socket.off("community:member", onChange);
          socket.off("community:event", onChange);
          socket.off("community:voice:presence", onVoice);
          socket.off("community:removed", onRemove);
          socket.emit("community:leave", { communityId: id });
        };
      }),
    [id, cache, navigate, voice.leave],
  );

  if (q.isLoading)
    return (
      <div className="w-full space-y-3 p-3">
        <div className="h-20 animate-pulse rounded-3xl border border-line bg-raised/50" />
        <div className="flex gap-3">
          <div className="hidden h-[60vh] w-72 animate-pulse rounded-3xl border border-line bg-raised/50 md:block" />
          <div className="h-[60vh] flex-1 animate-pulse rounded-3xl border border-line bg-raised/50" />
        </div>
      </div>
    );
  if (q.isError)
    return (
      <div className="w-full p-6">
        <ErrorNotice error={q.error} />
        <Link
          to="/communities"
          className="mt-3 inline-block text-sm text-brand-ink"
        >
          ← Back to communities
        </Link>
      </div>
    );
  if (!community?.isMember)
    return (
      <div className="custom-scrollbar mx-auto w-full max-w-3xl overflow-y-auto p-4 sm:p-8">
        <Link
          to="/communities"
          className="text-sm font-semibold text-brand-ink"
        >
          ← Discover communities
        </Link>
        <div className="mt-4 overflow-hidden rounded-[2rem] border border-line bg-surface/70 shadow-xl">
          <Banner community={community} className="h-40" />
          <div className="space-y-5 p-6 sm:p-8">
            <CommunityAvatar
              community={community}
              size="size-20"
              text="text-3xl"
              className="-mt-16 shadow-xl ring-4 ring-surface"
            />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {community.name}
              </h1>
              <p className="mt-1 text-xs capitalize text-ink-soft">
                {community.category} · {community.memberCount} members ·{" "}
                {community.visibility}
              </p>
            </div>
            <p className="text-sm text-ink-soft">{community.description}</p>
            {community.rules && (
              <div className="rounded-2xl bg-raised/70 p-4">
                <h2 className="mb-2 font-bold">Community rules</h2>
                <p className="whitespace-pre-wrap text-sm">{community.rules}</p>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={joinRules}
                    onChange={(e) => setJoinRules(e.target.checked)}
                  />
                  I agree to the community rules
                </label>
              </div>
            )}
            {error && <ErrorNotice error={error} />}
            <button
              disabled={
                joinBusy ||
                community.visibility === "invite" ||
                Boolean(community.rules && !joinRules)
              }
              onClick={join}
              className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-on-brand shadow-lg transition hover:brightness-110 disabled:opacity-40"
            >
              {community.visibility === "invite"
                ? "Invitation required"
                : joinBusy
                  ? "Sending..."
                  : community.visibility === "private" ||
                      community.requireApproval
                    ? "Request to join"
                    : "Join community"}
            </button>
          </div>
        </div>
      </div>
    );

  const hydrated = { ...community, currentUserId: user?.id };
  const heroMembers = (community.members || []).slice(0, 3);
  const extraMembers = Math.max(
    (community.memberCount || 0) - heroMembers.length,
    0,
  );
  const toggleMembers = () =>
    window.matchMedia("(min-width: 1024px)").matches
      ? setMembersOpen((v) => !v)
      : setMobileMembersOpen(true);
  const SelectedIcon = icons[selected?.type] || Hash;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-20 mx-3 mt-3 shrink-0 rounded-3xl border border-line bg-surface/70">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <Banner
            community={community}
            className="absolute inset-0 opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-surface/40" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={switcher}
              onClick={() => setSwitcher((v) => !v)}
              className="flex items-center gap-3 rounded-2xl p-1.5 pr-3 text-left transition-colors hover:bg-raised/70"
            >
              <CommunityAvatar
                community={community}
                size="size-11"
                text="text-base"
                className="shadow-lg"
              />
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold leading-tight">
                  {community.name}
                </span>
                <span className="block text-xs text-ink-soft">
                  {community.category} · {community.memberCount} members
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`text-ink-faint transition-transform ${switcher ? "rotate-180" : ""}`}
              />
            </button>
            {switcher && (
              <>
                <button
                  type="button"
                  aria-label="Close community switcher"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setSwitcher(false)}
                />
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-2xl"
                >
                  <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    Your communities
                  </p>
                  <div className="custom-scrollbar max-h-64 overflow-y-auto">
                    {myCommunities.data?.map((c) => (
                      <Link
                        key={c.id}
                        to={`/communities/${c.id}`}
                        role="menuitem"
                        onClick={() => setSwitcher(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-raised ${c.id === id ? "bg-brand-soft text-brand-ink" : ""}`}
                      >
                        <CommunityAvatar
                          community={c}
                          size="size-8"
                          text="text-xs"
                          rounded="rounded-lg"
                        />
                        <span className="truncate">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="my-1.5 h-px bg-line" />
                  <Link
                    to="/communities"
                    role="menuitem"
                    onClick={() => setSwitcher(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-raised hover:text-ink"
                  >
                    <Compass size={16} />
                    Discover or create a community
                  </Link>
                </div>
              </>
            )}
          </div>

          <nav
            aria-label="Community sections"
            className="order-last flex w-full gap-1 rounded-full border border-line bg-raised/70 p-1 sm:order-none sm:w-auto"
          >
            {tabs.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-current={view === value ? "page" : undefined}
                onClick={() => setView(value)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all sm:flex-none ${view === value ? "bg-surface text-ink shadow-md" : "text-ink-soft hover:text-ink"}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleMembers}
            title="Show or hide members"
            aria-label="Show or hide members"
            aria-pressed={membersOpen}
            className={`flex items-center gap-2 rounded-full border bg-surface/70 p-1 pr-3 transition-colors hover:bg-raised ${membersOpen ? "border-brand/50" : "border-line"}`}
          >
            <span className="flex -space-x-2">
              {heroMembers.map((m) => (
                <span
                  key={m.userId}
                  className="grid size-7 place-items-center overflow-hidden rounded-full bg-brand-soft text-[11px] font-bold text-brand-ink ring-2 ring-surface"
                >
                  {m.user?.image ? (
                    <img
                      src={m.user.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    (m.nickname || m.user?.name || "?")
                      .slice(0, 1)
                      .toUpperCase()
                  )}
                </span>
              ))}
              {extraMembers > 0 && (
                <span className="grid size-7 place-items-center rounded-full bg-raised text-[10px] font-bold text-ink-soft ring-2 ring-surface">
                  +{extraMembers}
                </span>
              )}
            </span>
            <Users size={15} className="text-ink-soft" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {view === "channel" && (
          <>
            {sidebar && (
              <button
                aria-label="Close spaces"
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                onClick={() => setSidebar(false)}
              />
            )}
            <SpacesCard
              community={community}
              selected={selected}
              onNavigate={select}
              onJoin={(ch) => voice.join(ch.id)}
              joining={voice.busy}
              className={
                sidebar
                  ? "fixed inset-y-3 left-3 z-40 flex w-[min(20rem,calc(100vw-1.5rem))] !bg-surface shadow-2xl"
                  : "hidden w-72 shrink-0 md:flex"
              }
            />
          </>
        )}
        <section
          className={`relative flex min-w-0 flex-1 flex-col overflow-hidden ${surface} bg-surface/50`}
        >
          {view === "channel" && (
            <button
              type="button"
              onClick={() => setSidebar(true)}
              className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-left text-sm font-bold md:hidden"
            >
              <Menu size={16} />
              <SelectedIcon size={15} className="text-ink-soft" />
              <span className="truncate">{selected?.name || "Spaces"}</span>
              <ChevronDown size={15} className="ml-auto text-ink-faint" />
            </button>
          )}
          {view === "events" ? (
            <EventsPanel
              community={community}
              permissions={community.permissions}
            />
          ) : view === "invites" ? (
            <InvitesPanel
              community={community}
              permissions={community.permissions}
            />
          ) : view === "settings" ? (
            <CommunitySettingsPanel
              key={community.id}
              community={hydrated}
              permissions={community.permissions}
            />
          ) : !selected ? (
            <div className="p-6 text-sm text-ink-soft">
              No accessible channels. Ask a moderator to create one.
            </div>
          ) : selected.type === "forum" ? (
            <ForumPanel
              key={selected.id}
              channel={selected}
              permissions={community.permissions}
            />
          ) : ["voice", "video", "stage"].includes(selected.type) ? (
            <VoiceChannel
              key={selected.id}
              channel={selected}
              community={community}
              voice={voice}
            />
          ) : (
            <>
              <ChannelChat
                key={selected.id}
                channel={selected}
                permissions={community.permissions}
                actions={
                  <button
                    type="button"
                    title="Channel polls"
                    aria-label="Channel polls"
                    aria-pressed={pollsOpen}
                    onClick={() => setPollsOpen((v) => !v)}
                    className={`${headerButton} ${pollsOpen ? "!border-brand/40 !text-brand-ink" : ""}`}
                  >
                    <ListChecks size={16} />
                    <span className="hidden sm:inline">Polls</span>
                  </button>
                }
              />
              {pollsOpen && (
                <div className="custom-scrollbar absolute right-3 top-16 z-20 max-h-[70%] w-[min(380px,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl">
                  <PollPanel
                    channel={selected}
                    permissions={community.permissions}
                    onClose={() => setPollsOpen(false)}
                  />
                </div>
              )}
            </>
          )}
        </section>
        {membersOpen && (
          <div className="hidden lg:flex">
            <MemberList
              community={community}
              onClose={() => setMembersOpen(false)}
            />
          </div>
        )}
      </div>
      {mobileMembersOpen && (
        <>
          <button
            aria-label="Close member list"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMembersOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex h-dvh max-w-[88vw] p-2 lg:hidden">
            <MemberList
              community={community}
              onClose={() => setMobileMembersOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
