import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon, ListMusic, Heart, Clock, Play } from "lucide-react";
import { Screen, ScreenHeader } from "@/components/layout/Screen";
import { TrackRow } from "@/components/player/TrackRow";
import { useLibrary } from "@/lib/library-store";
import { usePlayer } from "@/lib/player";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Musio — Home" },
      { name: "description", content: "Your personal music dashboard." },
    ],
  }),
  component: Home,
});

function Home() {
  const { state } = useLibrary();
  const { playTrack } = usePlayer();

  const recentTracks = state.recent.map((id) => state.saved[id]).filter(Boolean);
  const savedTracks = Object.values(state.saved).slice(0, 8);
  const favCount = state.favorites.length;
  const playlistCount = state.playlists.length;

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Screen>
      <ScreenHeader eyebrow="Musio" title={greeting} subtitle="Your personal soundtrack." />

      {/* Quick tiles */}
      <section className="px-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <QuickTile to="/search" icon={<SearchIcon className="h-4 w-4" />} label="Search" />
          <QuickTile
            to="/favorites"
            icon={<Heart className="h-4 w-4" />}
            label="Favorites"
            count={favCount}
          />
          <QuickTile
            to="/playlists"
            icon={<ListMusic className="h-4 w-4" />}
            label="Playlists"
            count={playlistCount}
          />
          <QuickTile
            to="/library"
            icon={<Clock className="h-4 w-4" />}
            label="Library"
            count={Object.keys(state.saved).length}
          />
        </div>
      </section>

      {/* Recently played */}
      <section className="mt-8">
        <SectionTitle title="Recently played" />
        {recentTracks.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body="Search for a song and hit play — it'll show up here."
            cta={{ to: "/search", label: "Start searching" }}
          />
        ) : (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
            {recentTracks.slice(0, 12).map((t) => (
              <button
                key={t.id}
                onClick={() => playTrack(t)}
                className="group w-36 shrink-0 text-left"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface">
                  <img
                    src={t.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 right-2 grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-brand text-primary-foreground opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{t.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{t.channel}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Saved tracks */}
      <section className="mt-8 px-5">
        <SectionTitle title="From your library" link={{ to: "/library", label: "View all" }} inline />
        {savedTracks.length === 0 ? (
          <EmptyState
            title="Library is empty"
            body="Save tracks from search to build your collection."
          />
        ) : (
          <div className="mt-2 space-y-1">
            {savedTracks.map((t) => (
              <TrackRow key={t.id} track={t} />
            ))}
          </div>
        )}
      </section>
    </Screen>
  );
}

function QuickTile({
  to,
  icon,
  label,
  count,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-2xl border border-border bg-card/60 px-3 py-3 backdrop-blur-md transition-colors hover:border-brand/40 hover:bg-card"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        {typeof count === "number" && (
          <span className="block text-[11px] text-muted-foreground">{count}</span>
        )}
      </span>
    </Link>
  );
}

function SectionTitle({
  title,
  link,
  inline,
}: {
  title: string;
  link?: { to: string; label: string };
  inline?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between ${inline ? "" : "px-5"} mb-3`}>
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      {link && (
        <Link to={link.to} className="text-xs font-semibold text-brand">
          {link.label}
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="mx-5 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
