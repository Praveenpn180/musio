import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";
import { useSelection } from "@/lib/selection-context";
import { Check, Loader2, Play, Shuffle, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ALL_LANGUAGES = [
  { id: "english", name: "English" },
  { id: "hindi", name: "Hindi" },
  { id: "tamil", name: "Tamil" },
  { id: "telugu", name: "Telugu" },
  { id: "punjabi", name: "Punjabi" },
  { id: "malayalam", name: "Malayalam" },
  { id: "kannada", name: "Kannada" },
  { id: "bengali", name: "Bengali" },
  { id: "spanish", name: "Spanish" },
  { id: "korean", name: "K-Pop" },
  { id: "japanese", name: "J-Pop" },
  { id: "french", name: "French" },
];

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
  const { state, user, updatePreferredLanguages } = useLibrary();
  const { playTrack } = usePlayer();
  const { selectionMode, toggleSelectionMode, selectAllTracks } = useSelection();
  const [q, setQ] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [editSelected, setEditSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleLang = (id: string) => {
    setEditSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveLanguages = async () => {
    try {
      setSaving(true);
      await updatePreferredLanguages(editSelected);
      toast.success("Preferences updated!");
      setPrefsOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  // Sync selected languages when opening the modal
  useEffect(() => {
    if (prefsOpen && user) {
      setEditSelected(user.user_metadata?.preferred_languages || []);
    }
  }, [prefsOpen, user]);

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

      {user && (
        <div className="mx-5 mb-4 flex flex-col rounded-2xl border border-border bg-card/30 p-4 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
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
                  <span className="h-1 w-1 rounded-full bg-brand animate-pulse" /> Cloud Sync Active
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

          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Music Languages
              </span>
              <button
                onClick={() => setPrefsOpen(true)}
                className="text-[10px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Edit Preferences
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(user.user_metadata?.preferred_languages || []).length > 0 ? (
                (user.user_metadata?.preferred_languages as string[]).map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center rounded-full bg-brand/5 border border-brand/20 px-2.5 py-0.5 text-[10px] font-medium text-brand capitalize"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No preference selected</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Languages Preference Modal */}
      <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[32px] border-t border-border bg-card/95 px-6 pb-8 pt-6 backdrop-blur-xl">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl font-bold tracking-tight">Music Preferences</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Select languages to customize your autoplay recommendations.
            </SheetDescription>
          </SheetHeader>
          <div className="my-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {ALL_LANGUAGES.map((lang) => {
              const selected = editSelected.includes(lang.id);
              return (
                <button
                  key={lang.id}
                  onClick={() => toggleLang(lang.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    selected
                      ? "border-brand bg-brand/10 text-brand shadow-sm"
                      : "border-border/60 bg-surface/50 text-muted-foreground hover:bg-surface"
                  }`}
                >
                  <span>{lang.name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-brand" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <Button
              disabled={saving}
              onClick={handleSaveLanguages}
              className="w-full rounded-xl bg-brand text-brand-foreground font-semibold py-5 hover:bg-brand/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {tracks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-5">
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
          <button
            onClick={() => {
              if (!selectionMode) {
                selectAllTracks(tracks);
              } else {
                toggleSelectionMode();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover active:scale-95"
          >
            <CheckSquare className="h-3.5 w-3.5 text-brand" />
            <span>{selectionMode ? "Cancel Select" : "Select Songs"}</span>
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
