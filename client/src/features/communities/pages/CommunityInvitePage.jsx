import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import {
  communityCreate,
  communityError,
  communityRead,
} from "../api/communityApi";
import { Banner, CommunityAvatar } from "../components/CommunityVisuals";
import { ErrorNotice, Loading } from "../../social/components/SocialUI";

export default function CommunityInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const invitation = useQuery({
    queryKey: ["community", "invite", token],
    queryFn: () => communityRead(`/communities/invite/${encodeURIComponent(token)}`),
    retry: false,
  });
  const community = invitation.data?.community;
  const alreadyMember = invitation.data?.isMember === true;

  // A valid invitation to a community you already belong to is a navigation
  // link, not another membership request. Replace to avoid Back-page loops.
  useEffect(() => {
    if (alreadyMember && community?.id) {
      navigate(`/communities/${community.id}`, { replace: true });
    }
  }, [alreadyMember, community?.id, navigate]);

  const join = async () => {
    if (!community?.id || busy || alreadyMember) return;
    setBusy(true);
    setError("");
    try {
      const result = await communityCreate(
        `/communities/invite/${encodeURIComponent(token)}/accept`,
        { rulesAccepted: accepted },
      );
      if (result.status === "active") {
        await client.invalidateQueries({ queryKey: ["communities", "mine"] });
        navigate(`/communities/${result.community.id}`, { replace: true });
      } else {
        navigate("/communities", { replace: true });
      }
    } catch (cause) {
      setError(communityError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="custom-scrollbar w-full min-h-0 overflow-y-auto px-3 py-5 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <Link
          to="/communities"
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-brand-ink hover:bg-raised"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Communities
        </Link>

        {invitation.isLoading || alreadyMember ? (
          <Loading label={alreadyMember ? "Opening your community..." : "Checking invitation..."} />
        ) : invitation.isError ? (
          <ErrorNotice error={invitation.error} />
        ) : community ? (
          <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
            {/* The banner is clipped, but the floating icon sits outside it. */}
            <div className="relative">
              <Banner
                community={community}
                inviteToken={token}
                className="h-36 w-full sm:h-48"
              />
              <div className="absolute -bottom-9 left-5 z-10 rounded-2xl bg-surface p-1 shadow-lg ring-1 ring-line sm:left-7">
                <CommunityAvatar
                  community={community}
                  inviteToken={token}
                  imageFit="contain"
                  size="size-16 sm:size-20"
                  text="text-2xl"
                  rounded="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-5 px-5 pb-6 pt-12 sm:px-7 sm:pb-8 sm:pt-14">
              <div className="space-y-2">
                <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Join {community.name}
                </h1>
                {community.description && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                    {community.description}
                  </p>
                )}
                <p className="flex items-center gap-2 text-xs font-medium capitalize text-ink-soft">
                  <UsersRound size={16} aria-hidden="true" />
                  {community.memberCount ?? 0} members · {community.visibility}
                </p>
              </div>

              {community.rules?.trim() && (
                <div className="space-y-3 rounded-2xl border border-line bg-raised p-4">
                  <p className="text-sm font-bold">Community rules</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                    {community.rules}
                  </p>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-brand"
                      checked={accepted}
                      onChange={(event) => setAccepted(event.target.checked)}
                    />
                    I agree to the community rules
                  </label>
                </div>
              )}

              {error && <ErrorNotice error={error} />}
              <button
                type="button"
                onClick={join}
                disabled={busy || Boolean(community.rules?.trim() && !accepted)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-on-brand transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {busy ? (
                  <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck size={18} aria-hidden="true" />
                )}
                {busy ? "Joining..." : "Accept invitation"}
              </button>
            </div>
          </section>
        ) : (
          <p className="text-sm text-ink-soft">This invitation is unavailable.</p>
        )}
      </div>
    </div>
  );
}
