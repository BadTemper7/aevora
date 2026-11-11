import { memo, useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { getGiphyByIds } from "./giphyClient";

/** Render saved GIPHY IDs without storing or proxying GIPHY media URLs. */
function GiphyMessage({ id }) {
  const [state, setState] = useState({ loading: true, item: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, item: null, error: "" });
    getGiphyByIds([id], controller.signal)
      .then((items) => setState({ loading: false, item: items[0] || null, error: items.length ? "" : "GIF is no longer available." }))
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, item: null, error: error.message }); });
    return () => controller.abort();
  }, [id, retry]);
  if (state.loading) return <div role="status" className="mt-1 flex h-24 w-40 items-center justify-center gap-2 rounded-lg bg-black/10 text-xs"><LoaderCircle size={16} className="animate-spin"/> Loading GIF</div>;
  if (state.error) return <div className="mt-1 flex gap-2 text-xs"><span>{state.error}</span><button type="button" onClick={() => setRetry((v) => v + 1)} className="underline" aria-label="Retry GIF"><RefreshCcw size={15}/></button></div>;
  return <img src={state.item.url} alt={state.item.description || "GIF"} loading="lazy" decoding="async" className="mt-1 max-h-72 w-auto max-w-full rounded-lg object-contain"/>;
}
export default memo(GiphyMessage);
