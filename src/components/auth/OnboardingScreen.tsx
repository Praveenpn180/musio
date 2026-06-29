import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/library-store";
import { Button } from "@/components/ui/button";
import { Check, Globe, Loader2, Music, Shuffle } from "lucide-react";
import { toast } from "sonner";

interface LanguageItem {
  id: string;
  name: string;
  nativeName?: string;
}

const GLOBAL_LANGUAGES: LanguageItem[] = [
  { id: "english", name: "English" },
  { id: "spanish", name: "Spanish", nativeName: "Español" },
  { id: "korean", name: "K-Pop / Korean", nativeName: "한국어" },
  { id: "japanese", name: "J-Pop / Japanese", nativeName: "日本語" },
  { id: "french", name: "French", nativeName: "Français" },
];

const INDIAN_LANGUAGES: LanguageItem[] = [
  { id: "hindi", name: "Hindi", nativeName: "हिन्दी" },
  { id: "tamil", name: "Tamil", nativeName: "தமிழ்" },
  { id: "telugu", name: "Telugu", nativeName: "తెలుగు" },
  { id: "punjabi", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { id: "malayalam", name: "Malayalam", nativeName: "മലയാളം" },
  { id: "kannada", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { id: "bengali", name: "Bengali", nativeName: "বাংলা" },
];

export function OnboardingScreen() {
  const { updatePreferredLanguages } = useLibrary();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isIndianRegion, setIsIndianRegion] = useState(false);

  // Auto-detect location & pre-select defaults
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = navigator.language || "";
      const isIndian =
        tz.includes("Kolkata") ||
        tz.includes("Calcutta") ||
        locale.toLowerCase().includes("in");

      setIsIndianRegion(isIndian);

      if (isIndian) {
        setSelected(["hindi", "english"]);
      } else {
        setSelected(["english"]);
      }
    } catch {
      setSelected(["english"]);
    }
  }, []);

  const toggleLanguage = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one language to continue.");
      return;
    }
    setSaving(true);
    try {
      await updatePreferredLanguages(selected);
      toast.success("Preferences saved successfully!");
    } catch {
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Group languages for ordering
  const categories = isIndianRegion
    ? [
        { title: "Indian Regional", items: INDIAN_LANGUAGES, icon: <Music className="h-4 w-4" /> },
        { title: "Global Hits", items: GLOBAL_LANGUAGES, icon: <Globe className="h-4 w-4" /> },
      ]
    : [
        { title: "Global Hits", items: GLOBAL_LANGUAGES, icon: <Globe className="h-4 w-4" /> },
        { title: "Indian Regional", items: INDIAN_LANGUAGES, icon: <Music className="h-4 w-4" /> },
      ];

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#070708] px-4 py-8 overflow-y-auto select-none no-scrollbar">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-brand/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand/10 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
          Customize Your Sound
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
          We detected your location and sorted these languages to personalize your autoplay recommendations. Choose one or more.
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-[32px] border border-border bg-card/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {cat.icon}
                {cat.title}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cat.items.map((lang) => {
                  const isSelected = selected.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      onClick={() => toggleLanguage(lang.id)}
                      className={`group relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                        isSelected
                          ? "border-brand/40 bg-brand/5 shadow-[0_0_20px_rgba(209,250,229,0.05)]"
                          : "border-border/60 bg-card/20 hover:border-border hover:bg-card/40"
                      }`}
                    >
                      <div className="flex w-full justify-between items-start">
                        <span
                          className={`text-sm font-semibold transition-colors duration-300 ${
                            isSelected ? "text-brand" : "text-foreground"
                          }`}
                        >
                          {lang.name}
                        </span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                            isSelected
                              ? "border-brand bg-brand text-primary-foreground scale-100"
                              : "border-muted-foreground/30 scale-90 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>
                      {lang.nativeName && (
                        <span className="mt-2 text-[10px] text-muted-foreground font-medium">
                          {lang.nativeName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-between pt-6 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shuffle className="h-3.5 w-3.5 text-brand" />
            Autoplay logic tunes recommendations to your selection.
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="w-full sm:w-auto h-11 px-8 rounded-full bg-brand text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] transition-all hover:bg-brand/90 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
