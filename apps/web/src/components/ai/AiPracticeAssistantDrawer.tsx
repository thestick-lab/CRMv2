import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Bot,
  User,
  Send,
  Sparkles,
  X,
  Trash2,
  Key,
} from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { answerPracticeAssistantQuery } from './assistant-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AiPracticeAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
}

export function AiPracticeAssistantDrawer({
  open,
  onOpenChange,
  onOpenSettings,
}: AiPracticeAssistantDrawerProps) {
  const practiceState = usePracticeStore();
  const { aiKeys } = practiceState;

  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      content: `Hello ${practiceState.currentUser.name}. I am your **FD on Call Practice Copilot**. Ask me anything regarding South African statutory deadlines, 12-month retainer calculations, or practice clients.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const activeProvider = React.useMemo(() => {
    if (aiKeys.anthropic?.trim()) return { name: 'Anthropic Claude 3.5', active: true };
    if (aiKeys.openai?.trim()) return { name: 'OpenAI GPT-4o', active: true };
    if (aiKeys.gemini?.trim()) return { name: 'Google Gemini 1.5 Pro', active: true };
    return { name: 'Local Practice Copilot', active: false };
  }, [aiKeys]);

  React.useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setInput('');

    const response = answerPracticeAssistantQuery(query, practiceState);
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      sender: 'assistant',
      content: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        content: `Conversation reset. Ready for your practice queries.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in-0" />
        <DialogPrimitive.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md border-l border-border bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                  AI Practice Copilot
                </DialogPrimitive.Title>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono px-1 py-0 h-4',
                      activeProvider.active
                        ? 'border-[#c4161c]/30 bg-[#c4161c]/5 text-[#c4161c] dark:text-[#f87171]'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {activeProvider.name}
                  </Badge>
                  {!activeProvider.active && (
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        onOpenSettings?.();
                      }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Key className="h-2.5 w-2.5" />
                      Add Key
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <DialogPrimitive.Close asChild>
                <button className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-muted/30 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
            <button
              onClick={() => handleQuickPrompt('How many clients do we have?')}
              className="px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
            >
              Clients Breakdown
            </button>
            <button
              onClick={() => handleQuickPrompt('What is our standard hourly rate?')}
              className="px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
            >
              Practice Rates
            </button>
            <button
              onClick={() => handleQuickPrompt('Who are the engagement partners?')}
              className="px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
            >
              Partners
            </button>
            <button
              onClick={() => handleQuickPrompt('What is our onboarding pipeline value?')}
              className="px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors whitespace-nowrap shrink-0"
            >
              Pipeline Value
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2.5 max-w-[90%]',
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono',
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground border border-border'
                  )}
                >
                  {msg.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={cn(
                    'p-3 rounded-xl text-xs space-y-1 leading-relaxed',
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-muted/50 border border-border text-foreground'
                  )}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  <div
                    className={cn(
                      'text-[9px] font-mono text-right',
                      msg.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    )}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask practice copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim()}
                className="bg-[#c4161c] hover:bg-[#a51217] text-white shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
