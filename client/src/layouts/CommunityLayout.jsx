import { Outlet } from "react-router-dom";
import VoiceDock from "../features/communities/components/VoiceDock";
import { VoiceProvider } from "../features/communities/hooks/useVoiceSession";
import { useRealtime } from "../features/social/hooks/useRealtime";
import CommunicationHeader from "./CommunicationHeader";

/** Community shell matches Messages; logo is the Home action, theme toggle is the only header utility. */
export default function CommunityLayout() {
  useRealtime();
  return (
    <VoiceProvider>
      <div className="relative isolate flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-canvas text-ink">
        <div aria-hidden="true" className="pointer-events-none absolute -top-44 left-1/2 -z-10 h-80 w-[900px] max-w-full -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
        <CommunicationHeader title="Communities" />
        <main className="mx-auto flex min-h-0 min-w-0 w-full max-w-[1800px] flex-1 overflow-hidden">
          <Outlet />
        </main>
        <VoiceDock />
      </div>
    </VoiceProvider>
  );
}
