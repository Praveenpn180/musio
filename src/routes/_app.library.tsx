import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";
import { Play, Shuffle, Cloud, CloudOff } from "lucide-react";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/library")({
  head: () => ({
    meta: [
      { title: "Library — Musio" },
      { name: "description", content: "Every track you've saved." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { state, user } = useLibrary();
  const { playTrack } = usePlayer();
  const [q, setQ] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  const tracks = useMemo(() => {
    const list = Object.values(state.saved).sort((a, b) => a.title.localeCompare(b.title));
    if (!q) return list;
    const t = q.toLowerCase();
    return list.filter(
      (x) => x.title.toLowerCase().includes(t) || x.channel.toLowerCase().includes(t),
    );
  }, [state.saved, q]);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Your collection"
        title="Library"
        subtitle={`${Object.keys(state.saved).length} saved tracks`}
      />

      {user ? (
        <div className="mx-5 mb-4 flex items-center justify-between rounded-2xl border border-border bg-card/30 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/40 shadow-inner">
              <AvatarImage 
                src={user.user_metadata?.avatar_url || ""} 
                alt={user.user_metadata?.full_name || "User Profile"} 
              />
              <AvatarFallback className="bg-brand/10 text-brand text-xs font-semibold">
                {(user.user_metadata?.full_name || user.email || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {user.user_metadata?.full_name || "Musio Listener"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                {user.email}
              </span>
              <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded bg-brand/10 px-1 py-0.5 text-[8px] font-medium text-brand">
                <span className="h-1 w-1 rounded-full bg-brand animate-pulse" /> Cloud Backup Active
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) toast.error(error.message);
              else toast.success("Signed out successfully!");
            }}
            className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[10px] font-semibold hover:bg-card active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="mx-5 mb-4 flex items-center justify-between rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
              <CloudOff className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Cloud Backup Disabled</span>
              <span className="text-[10px] text-muted-foreground">Sign in to save playlists & tracks</span>
            </div>
          </div>
          <button
            onClick={() => setAuthOpen(true)}
            className="rounded-full bg-brand px-4 py-1.5 text-[10px] font-semibold text-primary-foreground shadow-[0_4px_12px_var(--color-brand-glow)] hover:bg-brand/90 active:scale-95 transition-all cursor-pointer"
          >
            Connect
          </button>
        </div>
      )}

      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />

      {tracks.length > 0 && (
        <div className="flex items-center gap-2 px-5">
          <button
            onClick={() => playTrack(tracks[0], { queue: tracks })}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" /> Play all
          </button>
          <button
            onClick={() => {
              const shuffled = [...tracks].sort(() => Math.random() - 0.5);
              playTrack(shuffled[0], { queue: shuffled });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold active:scale-95"
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
        </div>
      )}

      <div className="mt-4 px-5">
        {Object.keys(state.saved).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            Your library is empty. Save tracks from search using the menu.
          </p>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter library"
              className="mb-3 h-10 w-full rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-brand/50"
            />
            <div className="space-y-1">
              {tracks.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  onPlay={() => playTrack(t, { queue: tracks })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
