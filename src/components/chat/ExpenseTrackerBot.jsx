import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Send, Copy, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'expense_tracker';

export default function ExpenseTrackerBot({ userId }) {
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const scrollRef = useRef(null);

  // WhatsApp connect link is synchronous
  useEffect(() => {
    try {
      const url = base44.agents.getWhatsAppConnectURL(AGENT_NAME);
      if (url) setWhatsappUrl(url);
    } catch (e) { /* agent may not be published yet */ }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleCopy = async () => {
    if (!whatsappUrl) return;
    try {
      await navigator.clipboard.writeText(whatsappUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const openChat = useCallback(async () => {
    if (conversation) { setChatOpen(true); return; }
    try {
      const conv = await base44.agents.createConversation({ agent_name: AGENT_NAME });
      setConversation(conv);
      setMessages(conv.messages ?? []);
      setChatOpen(true);
    } catch (e) {
      setMessages([{ role: 'assistant', content: 'לא הצלחתי לפתוח שיחה כרגע. נסה שוב מאוחר יותר.' }]);
      setChatOpen(true);
    }
  }, [conversation]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !conversation) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
      // Refresh conversation to get the assistant reply
      const updated = await base44.agents.getConversation(conversation.id);
      setMessages(updated.messages ?? []);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'אירעה שגיאה. נסה שוב.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-emerald-300 bg-emerald-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-emerald-700 text-sm md:text-base">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            בוט תיעוד הוצאות בוואצאפ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            שלח הוצאות ישירות בוואצאפ והן יתעדכנו אוטומטית במעקב החודשי-שבועי שלך.
            שתף את הקישור עם הלקוח כדי שיתחבר לבוט.
          </p>
          {whatsappUrl ? (
            <div className="flex items-center gap-2">
              <Input value={whatsappUrl} readOnly className="text-xs bg-white" dir="ltr" />
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">קישור הוואצאפ יופיע לאחר הפעלת הבוט בדשבורד.</p>
          )}
          <Button onClick={openChat} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Sparkles className="w-4 h-4 ml-2" />
            נסה את הבוט כאן
          </Button>
        </CardContent>
      </Card>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <MessageCircle className="w-5 h-5" />
              בוט תיעוד הוצאות
            </DialogTitle>
          </DialogHeader>
          <div ref={scrollRef} className="h-80 overflow-y-auto space-y-3 p-1">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center pt-8">טוען שיחה...</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-end">
                <div className="bg-slate-100 rounded-2xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="לדוגמה: קפה 18"
              disabled={sending}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}