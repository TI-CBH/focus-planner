import { useState } from "react";
import pb from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, Target } from "lucide-react";

interface AuthPageProps {
  onAuth: () => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await pb.collection("users").authWithPassword(email, password);
      } else {
        await pb.collection("users").create({
          email,
          password,
          passwordConfirm,
        });
        await pb.collection("users").authWithPassword(email, password);
      }
      onAuth();
    } catch (err: any) {
      const msg = err?.response?.data?.email?.message || err?.response?.message || err?.message || "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Focus</h1>
          <p className="text-muted-foreground text-sm">Your personal planner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div data-testid="text-error" className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              data-testid="input-email"
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                data-testid="input-password"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
                placeholder="Password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">Confirm Password</label>
              <input
                data-testid="input-password-confirm"
                id="passwordConfirm"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Confirm password"
                minLength={8}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="button-submit-auth"
            className={cn(
              "w-full py-2.5 rounded-lg font-medium text-sm transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-primary hover:underline font-medium"
            data-testid="button-toggle-auth-mode"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
