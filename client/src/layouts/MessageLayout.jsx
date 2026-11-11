import { Outlet } from "react-router-dom";
import { useRealtime } from "../features/social/hooks/useRealtime";
import CommunicationHeader from "./CommunicationHeader";

/** Dedicated messaging shell: no main-feed columns or duplicate Home controls. */
export default function MessageLayout() {
  useRealtime();
  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-canvas text-ink">
      <a href="#messages-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3">Skip to messages</a>
      <CommunicationHeader title="Messages" />
      <main id="messages-main" className="mx-auto flex w-full max-w-[1600px] min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0 sm:p-3 lg:p-5">
        <Outlet />
      </main>
    </div>
  );
}
