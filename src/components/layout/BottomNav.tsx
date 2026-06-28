import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Library, ListMusic, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { to: "/library", label: "Library", icon: Library, match: (p: string) => p === "/library" },
  { to: "/playlists", label: "Playlists", icon: ListMusic, match: (p: string) => p.startsWith("/playlists") },
  { to: "/favorites", label: "Favorites", icon: Heart, match: (p: string) => p === "/favorites" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="glass fixed bottom-0 inset-x-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors",
                  active ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_var(--color-brand-glow)]")} strokeWidth={active ? 2.4 : 1.8} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
