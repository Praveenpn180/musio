import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { toast } from "sonner";

interface AuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthSheet({ open, onOpenChange }: AuthSheetProps) {
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
        toast.success("Successfully signed in!");
        onOpenChange(false);
        resetForm();
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
        
        // If email confirmation is required, inform user, else they are logged in
        if (data.session) {
          toast.success("Successfully registered and signed in!");
        } else {
          toast.success("Registration successful! Please check your email for confirmation.");
        }
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[32px] border-t border-border bg-card/95 px-6 pb-8 pt-6 backdrop-blur-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl font-bold tracking-tight">Cloud Backup</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Sign in to sync your favorites, playlists, and library across all devices.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "login" | "signup")}
          className="mt-6 w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/50 p-1">
            <TabsTrigger value="login" className="rounded-full py-2 text-xs font-semibold data-[state=active]:bg-card">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full py-2 text-xs font-semibold data-[state=active]:bg-card">
              Create Account
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-full border border-border bg-card/30 px-4 text-sm outline-none transition-colors focus:border-brand/40"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11 w-full rounded-full border border-border bg-card/30 px-4 text-sm outline-none transition-colors focus:border-brand/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pass" className="text-xs font-medium text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11 w-full rounded-full border border-border bg-card/30 px-4 text-sm outline-none transition-colors focus:border-brand/40"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-full bg-brand text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--color-brand-glow)] transition-all hover:bg-brand/90 active:scale-[0.98]"
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
          </form>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
