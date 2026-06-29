import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Music, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function AuthScreen() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (activeTab === "signup" && password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          toast.success("Successfully registered and signed in!");
        } else {
          toast.success("Registration successful! Please check your email for confirmation.");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/library",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#070708] px-4 overflow-hidden select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-25%] left-[-15%] h-[600px] w-[600px] rounded-full bg-brand/5 blur-[150px] pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 border border-brand/20 shadow-[0_0_30px_rgba(209,250,229,0.1)] text-brand mb-4">
          <Music className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
          Welcome to Musio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
          Sign in to access your personal library, playlists, and seamless cloud sync.
        </p>
      </div>

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md rounded-[32px] border border-border bg-card/40 p-6 backdrop-blur-xl shadow-2xl">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "login" | "signup")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/30 p-1">
            <TabsTrigger
              value="login"
              className="rounded-full py-2.5 text-xs font-semibold data-[state=active]:bg-card/80 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="rounded-full py-2.5 text-xs font-semibold data-[state=active]:bg-card/80 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              Create Account
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            {activeTab === "signup" && (
              <div className="space-y-1.5 animate-slide-down">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="h-11 w-full rounded-full border border-border bg-card/20 px-4 text-sm outline-none transition-all focus:border-brand/40 focus:bg-card/40 focus:ring-1 focus:ring-brand/20"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="h-11 w-full rounded-full border border-border bg-card/20 px-4 text-sm outline-none transition-all focus:border-brand/40 focus:bg-card/40 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pass" className="text-xs font-medium text-muted-foreground">
                Password
              </Label>
              <Input
                id="pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="h-11 w-full rounded-full border border-border bg-card/20 px-4 text-sm outline-none transition-all focus:border-brand/40 focus:bg-card/40 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] transition-all hover:bg-brand/90 active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : activeTab === "login" ? (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" /> Sign Up
                </span>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2.5 py-0.5 rounded-full border border-border text-[9px] text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="h-11 w-full rounded-full border border-border bg-card/20 text-sm font-semibold hover:bg-card/40 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </form>
        </Tabs>
      </div>
    </div>
  );
}
