import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, LoaderCircle, Settings2, X } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import { read, create, update, errorText } from '../api/socialApi';
import { notificationDestination, relativeNotificationTime, uniqueNotifications } from './notificationHelpers';

const bellClass = 'relative grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-raised hover:text-ink';
const toggles = [
  ['social', 'Followers and subscriptions'],
  ['content', 'Posts, videos and reactions'],
  ['mentions', 'Mentions'],
  ['announcements', 'Community announcements'],
];

function applyRead(data, id = null) {
  if (!data?.pages) return data;
  return { ...data, pages: data.pages.map(page => ({ ...page, items: (page.items || []).map(n =>
    (!id || String(n._id) === String(id)) ? { ...n, readAt: n.readAt || new Date().toISOString() } : n) })) };
}

/** Reusable on the existing Topbar and dedicated Messenger header. */
export default function NotificationBell() {
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const loadMarkerRef = useRef(null);
  const popupId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');

  const summary = useQuery({ queryKey: ['notifications', 'summary'],
    queryFn: () => read('/notifications/unread-count'), staleTime: 20_000 });
  const unread = summary.data?.unread || 0;
  const list = useInfiniteQuery({ queryKey: ['notifications', 'feed'],
    enabled: open,
    queryFn: ({ pageParam }) => read('/notifications', { limit: 20, ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: last => last?.nextCursor || undefined,
    staleTime: 30_000,
  });
  const items = useMemo(() => uniqueNotifications(list.data?.pages), [list.data]);
  const preferences = useQuery({ queryKey: ['notificationPrefs'], enabled: open && preferencesOpen,
    queryFn: () => read('/notification-preferences') });

  useEffect(() => { setOpen(false); setPreferencesOpen(false); }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (!open) cache.setQueryData(['notifications', 'feed'], old => old?.pages?.length > 1
      ? { ...old, pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old);
  }, [open, cache]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const keydown = event => { if (event.key === 'Escape') { setOpen(false); setPreferencesOpen(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keydown); };
  }, [open]);
  // Root is the popover's own scroller, not the viewport. Prevent extra
  // requests while a page is in flight and stop when the cursor is exhausted.
  useEffect(() => {
    if (!open || preferencesOpen || !list.hasNextPage || list.isFetchingNextPage || list.isFetchNextPageError || !loadMarkerRef.current || !scrollRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !list.isFetchingNextPage && !list.isFetchNextPageError && list.hasNextPage) void list.fetchNextPage();
    }, { root: scrollRef.current, rootMargin: '140px 0px', threshold: 0 });
    observer.observe(loadMarkerRef.current);
    return () => observer.disconnect();
  }, [open, preferencesOpen, list.hasNextPage, list.isFetchingNextPage, list.isFetchNextPageError, list.fetchNextPage, items.length]);

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['notifications', 'summary'] });
    void cache.invalidateQueries({ queryKey: ['notifications', 'feed'] });
  };
  const run = async (id, operation) => {
    if (working) return false;
    setWorking(id); setError('');
    try {
      await operation();
      cache.setQueryData(['notifications', 'feed'], old => applyRead(old, id === 'all' ? null : id));
      cache.setQueryData(['notifications', 'summary'], old => ({ ...old, unread: id === 'all' ? 0 : Math.max(0, (old?.unread || 0) - 1) }));
      refresh();
      return true;
    } catch (cause) { setError(errorText(cause)); return false; }
    finally { setWorking(null); }
  };
  const onItemClick = async item => {
    if (!item.readAt) {
      const ok = await run(String(item._id), () => update(`/notifications/${item._id}/read`));
      if (!ok) return;
    }
    setOpen(false);
    navigate(notificationDestination(item));
  };
  const togglePref = async category => {
    if (working) return;
    const old = preferences.data?.enabledCategories || [];
    const enabledCategories = old.includes(category) ? old.filter(v => v !== category) : [...old, category];
    setWorking('preferences'); setError('');
    try {
      await update('/notification-preferences', { enabledCategories });
      cache.setQueryData(['notificationPrefs'], v => ({ ...v, enabledCategories }));
      refresh();
    } catch (cause) { setError(errorText(cause)); }
    finally { setWorking(null); }
  };

  return <div className="relative shrink-0" ref={rootRef}>
    <button type="button" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-expanded={open} aria-controls={popupId} aria-haspopup="dialog"
      className={bellClass} onClick={() => { setError(''); setOpen(value => !value); }}>
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-brand">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section id={popupId} role="dialog" aria-label="Notifications" aria-modal="false"
      className="fixed inset-x-3 top-[4.5rem] z-[70] flex max-h-[min(75dvh,35rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px] sm:max-w-[calc(100vw-2rem)]">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="min-w-0"><h2 className="text-base font-extrabold">Notifications</h2><p className="text-xs text-ink-soft">{unread ? `${unread} unread` : 'All caught up'}</p></div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Notification preferences" title="Preferences" aria-pressed={preferencesOpen}
            onClick={() => setPreferencesOpen(p => !p)} className="rounded-lg p-2 text-ink-soft hover:bg-raised"><Settings2 size={17}/></button>
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-soft hover:bg-raised"><X size={17}/></button>
        </div>
      </div>
      {!!error && <div role="alert" className="border-b border-line bg-danger/10 px-4 py-2 text-xs text-danger">{error}</div>}
      {preferencesOpen ? <div className="custom-scrollbar min-h-0 overflow-y-auto px-4 py-4">
        <h3 className="mb-2 text-sm font-bold">Optional notifications</h3>
        <p className="mb-3 text-xs leading-5 text-ink-soft">Friend requests, community invitations, security and moderation alerts stay enabled. Ordinary chat messages never appear here.</p>
        {preferences.isPending ? <div className="flex items-center gap-2 text-xs text-ink-soft"><LoaderCircle size={15} className="animate-spin"/> Loading preferences...</div>
          : preferences.isError ? <button type="button" onClick={() => preferences.refetch()} className="text-sm font-semibold text-brand-ink">Retry preferences</button>
          : toggles.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-3 border-b border-line py-3 text-sm">
            <span>{label}</span><input type="checkbox" className="accent-brand" disabled={Boolean(working)} checked={(preferences.data?.enabledCategories || []).includes(key)} onChange={() => togglePref(key)}/>
          </label>)}
      </div> : <>
        {unread > 0 && <div className="flex shrink-0 justify-end border-b border-line px-4 py-2">
          <button type="button" disabled={Boolean(working)} onClick={() => run('all', () => create('/notifications/read-all'))}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-ink hover:bg-raised disabled:opacity-50"><CheckCheck size={15}/> Mark all as read</button>
        </div>}
        <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
          {list.isPending ? <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-3"><div className="size-10 shrink-0 animate-pulse rounded-full bg-raised"/><div className="flex-1 space-y-2"><div className="h-3 w-4/5 animate-pulse rounded bg-raised"/><div className="h-3 w-2/5 animate-pulse rounded bg-raised"/></div></div>)}</div>
            : list.isError && !items.length ? <div className="p-6 text-center"><p className="text-sm text-danger">{errorText(list.error)}</p><button type="button" className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand" onClick={() => list.refetch()}>Retry</button></div>
            : !items.length ? <div className="px-5 py-12 text-center"><Bell size={28} className="mx-auto mb-3 text-ink-faint"/><p className="text-sm font-semibold">No notifications yet</p><p className="mt-1 text-xs text-ink-soft">Friend requests, invitations and important account alerts will appear here.</p></div>
            : items.map(item => <div key={item._id} className={`group relative flex gap-3 border-b border-line px-4 py-3 transition-colors hover:bg-raised/70 ${!item.readAt ? 'bg-brand-soft/30' : ''}`}>
              <div className="mt-0.5 shrink-0"><Avatar size="sm" name={item.actor?.name || item.title || 'AEVORA'} src={item.actor?.image || undefined}/></div>
              <button type="button" onClick={() => onItemClick(item)} className="min-w-0 flex-1 text-left" aria-label={item.title}>
                <span className="block break-words text-sm font-semibold leading-5">{item.title}</span>
                {item.detail && <span className="mt-1 block break-words text-xs text-ink-soft">{item.detail}</span>}
                <span className="mt-1 block text-xs text-ink-faint">{relativeNotificationTime(item.lastEventAt || item.createdAt)}</span>
              </button>
              {!item.readAt && <button type="button" disabled={Boolean(working)} aria-label="Mark notification as read" title="Mark as read" className="self-start rounded-lg p-1.5 text-brand-ink hover:bg-surface disabled:opacity-50" onClick={() => run(String(item._id), () => update(`/notifications/${item._id}/read`))}><Check size={16}/></button>}
              {!item.readAt && <span aria-hidden="true" className="absolute right-2 bottom-3 size-2 rounded-full bg-brand"/>}
            </div>)}
          {!list.isFetchNextPageError && list.hasNextPage && <div ref={loadMarkerRef} className="flex min-h-10 items-center justify-center p-3">
            {list.isFetchingNextPage ? <span className="inline-flex items-center gap-2 text-xs text-ink-soft"><LoaderCircle size={15} className="animate-spin"/> Loading older...</span> : <button type="button" onClick={() => list.fetchNextPage()} className="text-xs font-medium text-brand-ink">Load older</button>}
          </div>}
          {list.isFetchNextPageError && <div className="p-3 text-center text-xs text-danger">Could not load older notifications. <button className="font-bold underline" type="button" onClick={() => list.fetchNextPage()}>Retry</button></div>}
        </div>
      </>}
    </section>}
  </div>;
}
