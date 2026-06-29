import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LibraryProvider, useLibrary } from "@/lib/library-store";
import { PlayerProvider } from "@/lib/player";
import { BottomNav } from "@/components/layout/BottomNav";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { NowPlayingSheet } from "@/components/player/NowPlayingSheet";
import { LockScreen } from "@/components/player/LockScreen";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { OnboardingScreen } from "@/components/auth/OnboardingScreen";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useLibrary();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#070708] text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const preferredLangs = user.user_metadata?.preferred_languages;
  if (!preferredLangs || !Array.isArray(preferredLangs) || preferredLangs.length === 0) {
    return <OnboardingScreen />;
  }

  return <>{children}</>;
}

function AppLayout() {
  return (
    <LibraryProvider>
      <AuthGuard>
        <PlayerProvider>
          <div className="min-h-screen">
            <Outlet />
          </div>
          <MiniPlayer />
          <BottomNav />
          <NowPlayingSheet />
          <LockScreen />
        </PlayerProvider>
      </AuthGuard>
    </LibraryProvider>
  );
}