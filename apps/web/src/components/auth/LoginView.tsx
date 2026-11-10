import * as React from 'react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { DEMO_PASSWORD } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { User, Lock, ArrowRight } from 'lucide-react';

export interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { login } = usePracticeStore();
  const [email, setEmail] = React.useState('erik@fdoncall.co.za');
  const [password, setPassword] = React.useState(DEMO_PASSWORD);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error || 'Invalid credentials');
      } else {
        onLoginSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#c4161c] text-white font-mono font-bold text-lg shadow-md mb-1">
            FD
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-serif italic">
            FD on Call
          </h1>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="erik@fdoncall.co.za"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c4161c] hover:bg-[#a51217] text-white font-medium text-xs h-9 shadow-xs cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </form>

        {/* Demo Credentials Box */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-mono font-semibold text-[11px] text-foreground">
            <span>Demo Credentials</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            <div>Password: <code className="text-primary font-bold">{DEMO_PASSWORD}</code></div>
          </div>
          <div className="pt-1 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleFillDemo('erik@fdoncall.co.za')}
              className="px-2 py-1 rounded bg-background hover:bg-muted border border-border text-[11px] font-mono transition-colors text-foreground cursor-pointer"
            >
              Fill Erik (Partner)
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('wouter@fdoncall.co.za')}
              className="px-2 py-1 rounded bg-background hover:bg-muted border border-border text-[11px] font-mono transition-colors text-foreground cursor-pointer"
            >
              Fill Wouter (Partner)
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('andre@fdoncall.co.za')}
              className="px-2 py-1 rounded bg-background hover:bg-muted border border-border text-[11px] font-mono transition-colors text-foreground cursor-pointer"
            >
              Fill André (Staff)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
