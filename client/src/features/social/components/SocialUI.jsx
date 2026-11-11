import { AlertCircle, LoaderCircle, Users } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/common/EmptyState";
import { create, errorText, mediaFile, remove } from "../api/socialApi";

export const panel = "rounded-2xl border border-line bg-surface p-5 shadow-sm";
export const field = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20";
export const smallButton = "rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-raised disabled:opacity-50";
export function Heading({ title, subtitle, action }) { return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-[24px] font-extrabold tracking-tight text-ink">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}</div>{action}</div>; }
export function ErrorNotice({ error }) { return error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">{typeof error === "string" ? error : errorText(error)}</p> : null; }
export function Loading({ label = "Loading..." }) { return <div role="status" className={`${panel} space-y-4 py-6`}><div className="flex items-center gap-2 text-sm text-ink-soft"><LoaderCircle size={19} className="animate-spin" />{label}</div><div aria-hidden="true" className="animate-pulse space-y-3"><div className="h-4 w-2/5 rounded-md bg-raised"/><div className="h-12 w-full rounded-xl bg-raised"/><div className="h-12 w-4/5 rounded-xl bg-raised"/><div className="h-12 w-full rounded-xl bg-raised"/></div></div>; }
export function Empty({ title, description }) { return <div className={panel}><EmptyState icon={Users} title={title} description={description} /></div>; }
export function Tabs({ tabs, value, onChange }) { return <div role="tablist" className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-raised/50 p-1">{tabs.map(([key,label]) => <button key={key} role="tab" aria-selected={key === value} onClick={()=>onChange(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${key === value ? "bg-surface text-brand-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>{label}</button>)}</div>; }
export function Person({ user, detail, actions }) {
  if (!user) return null;
  return <div className="flex items-center gap-3 rounded-xl px-1 py-3"><Link to={`/u/${encodeURIComponent(user.username)}`} className="shrink-0"><Avatar name={user.name} src={user.avatarId ? mediaFile(user.avatarId,true) : user.image} /></Link><div className="min-w-0 flex-1"><Link to={`/u/${encodeURIComponent(user.username)}`} className="block truncate text-sm font-bold text-ink hover:text-brand-ink">{user.name || user.username}</Link><p className="truncate text-xs text-ink-soft">@{user.username}{detail ? ` · ${detail}` : ""}</p></div><div className="flex shrink-0 flex-wrap gap-1">{actions}</div></div>;
}
export function Action({ onClick, children, secondary = false, disabled = false, loading = false }) { return <Button size="sm" variant={secondary ? "secondary" : "primary"} onClick={onClick} disabled={disabled} loading={loading}>{children}</Button>; }
export function useAction(onDone) {
  const query = useQueryClient();
  const [error,setError] = useState("");
  const mutation = useMutation({ mutationFn: async ({ method="post",url,body }) => method === "delete" ? remove(url) : create(url,body),
    onSuccess: (data) => { setError(""); query.invalidateQueries(); onDone?.(data); },
    onError: (cause) => setError(errorText(cause)),
  });
  return { run: (url, body, method) => mutation.mutateAsync({ url, body, method }).catch(() => {}), pending: mutation.isPending, error, setError };
}
