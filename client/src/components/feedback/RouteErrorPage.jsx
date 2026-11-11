import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Link, useRouteError } from "react-router-dom";

export default function RouteErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error("Aevora route error:", error);
  return <main role="alert" className="grid min-h-dvh place-items-center bg-canvas px-5 text-ink">
    <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 text-center shadow-sm">
      <AlertTriangle className="mx-auto size-10 text-brand-ink" aria-hidden="true"/>
      <h1 className="mt-4 text-xl font-bold">This page couldn’t load</h1>
      <p className="mt-2 text-sm leading-6 text-ink-soft">Something unexpected happened. Your account and messages are safe. You can retry or return home.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={()=>window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand"><RotateCcw size={16}/> Retry</button><Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold"><ArrowLeft size={16}/> Home</Link></div>
    </section>
  </main>;
}
