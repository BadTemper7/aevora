import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Copy,
  Link2,
  ListChecks,
  MessagesSquare,
  Pin,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import {
  communityCreate,
  communityRead,
  communityPatch,
  communityDelete,
  communityPut,
  communityError,
} from "../api/communityApi";
import {
  field,
  smallButton,
  ErrorNotice,
  Loading,
} from "../../social/components/SocialUI";
import ChannelChat from "./ChannelChat";

const card = "rounded-2xl border border-line bg-surface/70 p-4";

function PanelHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Icon size={19} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function ForumPanel({ channel, permissions }) {
  const [active, setActive] = useState(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [tags, setTags] = useState(""),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ["community", "threads", channel.id],
    queryFn: () => communityRead(`/channels/${channel.id}/threads`),
  });
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await communityCreate(`/channels/${channel.id}/threads`, {
        title,
        body,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8),
      });
      setCreating(false);
      setTitle("");
      setBody("");
      cache.invalidateQueries({
        queryKey: ["community", "threads", channel.id],
      });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const close = async (t) => {
    try {
      await communityCreate(`/channels/${channel.id}/threads/${t.id}/close`, {
        closed: !t.closedAt,
      });
      cache.invalidateQueries({
        queryKey: ["community", "threads", channel.id],
      });
    } catch (err) {
      setError(communityError(err));
    }
  };
  if (active)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3">
          <button className={smallButton} onClick={() => setActive(null)}>
            ← All discussions
          </button>
          <p className="min-w-0 truncate text-sm font-bold">{active.title}</p>
          {permissions.includes("manage_messages") && (
            <button className={smallButton} onClick={() => close(active)}>
              {active.closedAt ? "Reopen" : "Close"}
            </button>
          )}
        </div>
        <div className="custom-scrollbar max-h-32 overflow-y-auto border-b border-line bg-raised/40 p-4">
          <p className="text-sm text-ink-soft">{active.body}</p>
        </div>
        <ChannelChat
          channel={channel}
          permissions={
            active.closedAt
              ? permissions.filter((p) => p !== "send_messages")
              : permissions
          }
          threadId={active.id}
        />
      </div>
    );
  return (
    <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <PanelHeader
        icon={MessagesSquare}
        title={`${channel.name} · Forum`}
        subtitle="Organized discussions and topic threads"
      >
        {permissions.includes("create_threads") && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-on-brand shadow-md"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus size={15} />
            New topic
          </button>
        )}
      </PanelHeader>
      {error && <ErrorNotice error={error} />}
      {creating && (
        <form onSubmit={create} className={`space-y-2 ${card}`}>
          <input
            required
            className={field}
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Topic title"
          />
          <textarea
            required
            className={field}
            maxLength={5000}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Discussion text"
          />
          <input
            className={field}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, separated by commas"
          />
          <button type="submit" disabled={busy} className={smallButton}>
            {busy ? "Creating..." : "Post discussion"}
          </button>
        </form>
      )}
      <div className="space-y-2">
        {q.isLoading ? (
          <Loading label="Loading forum topics..." />
        ) : q.data?.length ? (
          q.data.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className={`block w-full text-left transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg ${card}`}
            >
              <p className="flex items-center gap-2 text-sm font-bold">
                {t.pinnedAt && <Pin size={13} className="text-brand-ink" />}
                {t.title}
                {t.closedAt && (
                  <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                    Closed
                  </span>
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                {t.body}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
                {new Date(t.createdAt).toLocaleString()}
                {(t.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-ink"
                  >
                    {tag}
                  </span>
                ))}
              </p>
            </button>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            No topics yet. Create the first discussion.
          </p>
        )}
      </div>
    </div>
  );
}

export function PollPanel({ channel, permissions, onClose }) {
  const cache = useQueryClient(),
    [creating, setCreating] = useState(false),
    [question, setQuestion] = useState(""),
    [options, setOptions] = useState(["", ""]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["community", "polls", channel.id],
    queryFn: () => communityRead(`/channels/${channel.id}/polls`),
  });
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await communityCreate(`/channels/${channel.id}/polls`, {
        question,
        options: options.filter(Boolean),
      });
      cache.invalidateQueries({ queryKey: ["community", "polls", channel.id] });
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const vote = async (pollId, optionId) => {
    setBusy(true);
    setError("");
    try {
      await communityPut(`/channels/${channel.id}/polls/${pollId}/vote`, {
        optionId,
      });
      cache.invalidateQueries({ queryKey: ["community", "polls", channel.id] });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <ListChecks size={16} className="text-brand-ink" />
          Channel polls
        </p>
        <div className="flex items-center gap-1.5">
          {permissions.includes("send_messages") && (
            <button
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-brand"
              onClick={() => setCreating((v) => !v)}
            >
              <Plus size={13} />
              Create poll
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="Close polls"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-raised hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {error && <ErrorNotice error={error} />}
      {creating && (
        <form onSubmit={create} className="space-y-2">
          <input
            className={field}
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
          />
          {options.map((v, i) => (
            <input
              key={i}
              required
              className={field}
              maxLength={120}
              value={v}
              onChange={(e) =>
                setOptions((o) =>
                  o.map((x, n) => (i === n ? e.target.value : x)),
                )
              }
              placeholder={`Answer ${i + 1}`}
            />
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className={smallButton}
              disabled={options.length >= 10}
              onClick={() => setOptions((o) => [...o, ""])}
            >
              Add answer
            </button>
            <button
              className={smallButton}
              type="submit"
              disabled={busy || options.filter(Boolean).length < 2}
            >
              Post poll
            </button>
          </div>
        </form>
      )}
      {q.isLoading ? (
        <p className="text-xs text-ink-soft">Loading polls...</p>
      ) : q.data?.length ? (
        q.data.map((p) => {
          const total = p.options.reduce((sum, o) => sum + (o.votes || 0), 0);
          return (
            <div key={p.id} className="rounded-2xl border border-line p-3">
              <p className="mb-2 text-sm font-bold">{p.question}</p>
              <div className="space-y-1.5">
                {p.options.map((o) => {
                  const pct = total
                    ? Math.round(((o.votes || 0) / total) * 100)
                    : 0;
                  const mine = p.myVote === o.id;
                  return (
                    <button
                      key={o.id}
                      disabled={busy}
                      onClick={() => vote(p.id, o.id)}
                      className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-3 py-2 text-xs transition-colors ${mine ? "border-brand" : "border-line hover:bg-raised"}`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 bg-brand/15 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative font-semibold">
                        {o.text}
                        {mine ? " ✓" : ""}
                      </span>
                      <span className="relative text-ink-soft">
                        {pct}% · {o.votes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <p className="py-4 text-center text-xs text-ink-soft">
          No polls in this channel yet.
        </p>
      )}
    </section>
  );
}

export function EventsPanel({ community, permissions }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [form, setForm] = useState({
      title: "",
      description: "",
      startsAt: "",
      endsAt: "",
      channelId: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["community", "events", community.id],
    queryFn: () => communityRead(`/communities/${community.id}/events`),
  });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await communityCreate(`/communities/${community.id}/events`, {
        title: form.title,
        description: form.description,
        startsAt: new Date(form.startsAt).toISOString(),
        ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
        channelId: form.channelId || null,
      });
      cache.invalidateQueries({
        queryKey: ["community", "events", community.id],
      });
      setOpen(false);
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const rsvp = async (event, response) => {
    setBusy(true);
    setError("");
    try {
      await communityPut(
        `/communities/${community.id}/events/${event.id}/rsvp`,
        { response },
      );
      cache.invalidateQueries({
        queryKey: ["community", "events", community.id],
      });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (event) => {
    if (!window.confirm("Cancel this event?")) return;
    try {
      await communityPatch(`/communities/${community.id}/events/${event.id}`, {
        cancelled: true,
      });
      cache.invalidateQueries({
        queryKey: ["community", "events", community.id],
      });
    } catch (err) {
      setError(communityError(err));
    }
  };
  return (
    <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
      <PanelHeader
        icon={CalendarDays}
        title="Community events"
        subtitle="Upcoming gatherings in your time zone"
      >
        {permissions.includes("manage_events") && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-on-brand shadow-md"
            onClick={() => setOpen((v) => !v)}
          >
            <Plus size={15} />
            Schedule
          </button>
        )}
      </PanelHeader>
      {error && <ErrorNotice error={error} />}
      {open && (
        <form onSubmit={submit} className={`space-y-2 ${card}`}>
          <input
            required
            className={field}
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className={field}
            rows={2}
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-semibold">
              Starts
              <input
                type="datetime-local"
                required
                className={field}
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-semibold">
              Ends (optional)
              <input
                type="datetime-local"
                className={field}
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Channel
            <select
              className={field}
              value={form.channelId}
              onChange={(e) =>
                setForm((f) => ({ ...f, channelId: e.target.value }))
              }
            >
              <option value="">No channel assigned</option>
              {community.channels?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className={smallButton}>
            Create event
          </button>
        </form>
      )}
      {q.isLoading ? (
        <Loading label="Loading events" />
      ) : q.data?.items?.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {q.data.items.map((e) => {
            const start = new Date(e.startsAt);
            return (
              <article key={e.id} className={`flex gap-4 ${card}`}>
                <div className="grid size-14 shrink-0 place-items-center self-start rounded-2xl bg-brand-soft text-brand-ink">
                  <div className="text-center leading-none">
                    <p className="text-[10px] font-bold uppercase">
                      {start.toLocaleString([], { month: "short" })}
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold">
                      {start.getDate()}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-bold">
                    {e.title}
                    {e.cancelledAt && (
                      <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        Cancelled
                      </span>
                    )}
                  </h3>
                  {e.description && (
                    <p className="text-sm text-ink-soft">{e.description}</p>
                  )}
                  <p className="text-xs text-ink-soft">
                    {start.toLocaleString()}
                    {e.endsAt
                      ? ` to ${new Date(e.endsAt).toLocaleString()}`
                      : ""}
                  </p>
                  {!e.cancelledAt && (
                    <div className="flex flex-wrap gap-1.5">
                      {["going", "interested", "none"].map((v) => (
                        <button
                          key={v}
                          disabled={busy}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${e.myRsvp === v ? "border-brand bg-brand-soft text-brand-ink" : "border-line hover:bg-raised"}`}
                          onClick={() => rsvp(e, v)}
                        >
                          {v === "none"
                            ? "Not attending"
                            : v === "going"
                              ? "Going"
                              : "Interested"}
                        </button>
                      ))}
                      {permissions.includes("manage_events") && (
                        <button
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
                          onClick={() => cancel(e)}
                        >
                          Cancel event
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-soft">
          No upcoming events.
        </p>
      )}
    </div>
  );
}

export function InvitesPanel({ community, permissions }) {
  const cache = useQueryClient();
  const [username, setUsername] = useState(""),
    [expiresHours, setExpiresHours] = useState(168),
    [maxUses, setMaxUses] = useState(0),
    [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const invites = useQuery({
    queryKey: ["community", "invitations", community.id],
    queryFn: () => communityRead(`/communities/${community.id}/invitations`),
    enabled: permissions.includes("manage_invitations"),
  });
  const pending = useQuery({
    queryKey: ["community", "pending", community.id],
    queryFn: () =>
      communityRead(`/communities/${community.id}/members/pending`),
    enabled: permissions.includes("manage_invitations"),
  });
  const create = async (direct = false) => {
    setBusy(true);
    setError("");
    try {
      const r = await communityCreate(
        `/communities/${community.id}/invitations`,
        {
          ...(direct ? { username } : {}),
          expiresHours,
          maxUses: direct ? 1 : maxUses,
        },
      );
      setLink(r.link ? `${window.location.origin}${r.link}` : "");
      setUsername("");
      cache.invalidateQueries({
        queryKey: ["community", "invitations", community.id],
      });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  const respond = async (userId, approve) => {
    setBusy(true);
    try {
      await communityCreate(
        `/communities/${community.id}/members/${userId}/approve`,
        { approve },
      );
      cache.invalidateQueries({
        queryKey: ["community", "pending", community.id],
      });
      cache.invalidateQueries({
        queryKey: ["community", "detail", community.id],
      });
    } catch (err) {
      setError(communityError(err));
    } finally {
      setBusy(false);
    }
  };
  if (!permissions.includes("create_invitations"))
    return (
      <p className="p-6 text-sm text-ink-soft">
        Invitations are restricted to moderators.
      </p>
    );
  return (
    <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
      <PanelHeader
        icon={UserPlus}
        title="Community invitations"
        subtitle="Bring people in by username or with a shareable link"
      />
      {error && <ErrorNotice error={error} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`space-y-3 ${card}`}>
          <h3 className="flex items-center gap-2 font-bold">
            <UserPlus size={16} className="text-brand-ink" />
            Invite a user
          </h3>
          <input
            className={field}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Unique username"
            aria-label="Invite by username"
          />
          <button
            className={smallButton}
            disabled={busy || username.trim().length < 3}
            onClick={() => create(true)}
          >
            Send invitation
          </button>
        </div>
        <div className={`space-y-3 ${card}`}>
          <h3 className="flex items-center gap-2 font-bold">
            <Link2 size={16} className="text-brand-ink" />
            Shareable invite link
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs">
              Expiry (hours)
              <input
                type="number"
                min="1"
                max="720"
                value={expiresHours}
                onChange={(e) => setExpiresHours(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="block text-xs">
              Max uses (0 = unlimited)
              <input
                type="number"
                min="0"
                max="10000"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className={field}
              />
            </label>
          </div>
          <button
            className={smallButton}
            disabled={busy}
            onClick={() => create(false)}
          >
            Create invite link
          </button>
          {link && (
            <div className="flex gap-1">
              <input value={link} readOnly className={field} />
              <button
                title="Copy invite"
                onClick={() => navigator.clipboard?.writeText(link)}
                className={smallButton}
              >
                <Copy size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
      {permissions.includes("manage_invitations") && (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-extrabold">
              Pending join requests ({pending.data?.length || 0})
            </h3>
            {pending.data?.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-2xl border border-line bg-surface/70 p-3 text-sm"
              >
                <span className="font-semibold">
                  @{p.user?.username || p.userId}
                </span>
                <span className="flex gap-2">
                  <button
                    className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-brand"
                    onClick={() => respond(p.userId, true)}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-bold hover:bg-raised"
                    onClick={() => respond(p.userId, false)}
                  >
                    Decline
                  </button>
                </span>
              </div>
            ))}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-extrabold">Active invitation links</h3>
            {invites.data?.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface/70 p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {i.invitedId
                      ? `Private invite to ${i.invitedId}`
                      : "Shareable link"}
                  </span>
                  <span className="text-xs text-ink-soft">
                    Used {i.uses}
                    {i.maxUses ? `/${i.maxUses}` : ""} · Expires{" "}
                    {i.expiresAt
                      ? new Date(i.expiresAt).toLocaleDateString()
                      : "Never"}
                  </span>
                </span>
                <button
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                  onClick={async () => {
                    try {
                      await communityDelete(
                        `/communities/${community.id}/invitations/${i.id}`,
                      );
                      cache.invalidateQueries({
                        queryKey: ["community", "invitations", community.id],
                      });
                    } catch (e) {
                      setError(communityError(e));
                    }
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
