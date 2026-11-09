import * as React from 'react';
import { Bot, Eye, EyeOff, Check, Sparkles, Shield, Cpu } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AiIntegrationsPane() {
  const { aiKeys, setAiKeys } = usePracticeStore();

  const [anthropic, setAnthropic] = React.useState(aiKeys.anthropic || '');
  const [openai, setOpenai] = React.useState(aiKeys.openai || '');
  const [gemini, setGemini] = React.useState(aiKeys.gemini || '');

  const [showAnthropic, setShowAnthropic] = React.useState(false);
  const [showOpenai, setShowOpenai] = React.useState(false);
  const [showGemini, setShowGemini] = React.useState(false);

  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAiKeys({
      anthropic: anthropic.trim(),
      openai: openai.trim(),
      gemini: gemini.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          AI Subscriptions &amp; Model Providers
        </h2>
        <p className="text-muted-foreground mt-0.5">
          Connect your organization's API credentials to power the topbar AI Practice Assistant via Vercel AI SDK.
        </p>
      </div>

      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-start gap-3">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground leading-relaxed">
          Keys are stored locally in your browser session (`localStorage`). When no external provider key is configured, the assistant operates in zero-token local mode querying practice state directly.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Anthropic Claude */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-amber-500" />
              Anthropic Claude (Recommended)
            </label>
            <Badge
              variant="outline"
              className={
                anthropic
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground'
              }
            >
              {anthropic ? 'Configured' : 'Offline Fallback'}
            </Badge>
          </div>
          <div className="relative">
            <input
              type={showAnthropic ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              value={anthropic}
              onChange={(e) => setAnthropic(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(!showAnthropic)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showAnthropic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Powers Claude 3.5 Sonnet for South African tax ruling analysis and complex statutory queries.
          </p>
        </div>

        {/* OpenAI ChatGPT */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              OpenAI ChatGPT (GPT-4o)
            </label>
            <Badge
              variant="outline"
              className={
                openai
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground'
              }
            >
              {openai ? 'Configured' : 'Offline Fallback'}
            </Badge>
          </div>
          <div className="relative">
            <input
              type={showOpenai ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOpenai ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Google Gemini */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Google Gemini (Gemini 1.5 Pro)
            </label>
            <Badge
              variant="outline"
              className={
                gemini
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground'
              }
            >
              {gemini ? 'Configured' : 'Offline Fallback'}
            </Badge>
          </div>
          <div className="relative">
            <input
              type={showGemini ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={gemini}
              onChange={(e) => setGemini(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showGemini ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button
            type="submit"
            size="sm"
            className="bg-[#c4161c] hover:bg-[#a51217] text-white"
          >
            Save Provider Keys
          </Button>
          {saveSuccess && (
            <span className="text-primary font-mono text-[11px] flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Keys updated in browser storage!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
