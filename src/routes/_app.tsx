import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LibraryProvider } from "@/lib/library-store";
import { PlayerProvider } from "@/lib/player";
import { BottomNav } from "@/components/layout/BottomNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { NowPlayingSheet } from "@/components/player/NowPlayingSheet";
import { LockScreen } from "@/components/player/LockScreen";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <div className="min-h-screen">
          <Outlet />
        </div>
        <MiniPlayer />
        <BottomNav />
        <NowPlayingSheet />
        <LockScreen />
      </PlayerProvider>
    </LibraryProvider>
  );
}