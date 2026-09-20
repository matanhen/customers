import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Sparkles, Search, ArrowRight, Phone, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ConversationHistory() {
  const [tab, setTab] = useState('whatsapp');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['conversationLogs', tab],
    queryFn: () => base44.entities.ConversationLog.filter({ channel: tab }, '-created_date', 1000),
  });

  // Group logs by user
  const users = useMemo(() => {
    const grouped = {};
    for (const log of logs) {
      const key = log.user_phone || log.user_email || log.user_id || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          key,
          name: log.user_name || 'לא ידוע',
          phone: log.user_phone || '',
          email: log.user_email || '',
          messages: [],
          lastMessage: null,
        };
      }
      grouped[key].messages.push(log);
      if (!grouped[key].lastMessage || new Date(log.created_date) > new Date(grouped[key].lastMessage.created_date)) {
        grouped[key].lastMessage = log;
      }
    }
    // Sort users by last message date (most recent first)
    return Object.values(grouped).sort((a, b) => {
      const da = a.lastMessage ? new Date(a.lastMessage.created_date) : 0;
      const db = b.lastMessage ? new Date(b.lastMessage.created_date) : 0;
      return db - da;
    });
  }, [logs]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  // If a user is selected, show their conversation
  if (selectedUser) {
    const sortedMessages = [...selectedUser.messages].sort((a, b) =>
      new Date(a.created_date) - new Date(b.created_date)
    );

    return (
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 rounded-xl bg-indigo-100">
                {tab === 'whatsapp' ? <MessageSquare className="w-5 h-5 text-indigo-600" /> : <Sparkles className="w-5 h-5 text-indigo-600" />}
              </div>
              <div>
                <p className="text-lg">{selectedUser.name}</p>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-normal">
                  {selectedUser.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedUser.phone}</span>}
                  {selectedUser.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedUser.email}</span>}
                </div>
              </div>
            </CardTitle>
            <Button variant="outline" onClick={() => setSelectedUser(null)} className="rounded-xl border-slate-200">
              <ArrowRight className="w-4 h-4 ml-1" />
              חזרה לרשימה
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {sortedMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    : 'bg-[#105330] text-white rounded-br-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-slate-400' : 'text-white/60'}`}>
                    {format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-xl bg-indigo-100">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
          </div>
          היסטוריית תיעודים
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setTab('whatsapp'); setSelectedUser(null); }}
            className={`px-4 py-2 rounded-xl font-medium transition-all text-sm flex items-center gap-2 ${
              tab === 'whatsapp'
                ? 'bg-[#105330] text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            סוכן ווצאפ ({users.length})
          </button>
          <button
            onClick={() => { setTab('ai_advisor'); setSelectedUser(null); }}
            className={`px-4 py-2 rounded-xl font-medium transition-all text-sm flex items-center gap-2 ${
              tab === 'ai_advisor'
                ? 'bg-[#105330] text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            יועץ AI ({users.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-12 py-3 text-base border-slate-200 focus:border-indigo-400 rounded-xl"
          />
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {tab === 'whatsapp' ? <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-200" /> : <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-200" />}
            <p>אין תיעודים {search ? 'התואמים לחיפוש' : 'עדיין'}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredUsers.map((u) => (
              <button
                key={u.key}
                onClick={() => setSelectedUser(u)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#105330]/30 hover:bg-[#105330]/5 transition-all text-right"
              >
                <div className="p-2 rounded-full bg-slate-100 shrink-0">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{u.name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {u.phone && <span>{u.phone}</span>}
                    {u.email && <span className="truncate">{u.email}</span>}
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-xs text-slate-400">{u.messages.length} הודעות</p>
                  {u.lastMessage && (
                    <p className="text-xs text-slate-400">{format(new Date(u.lastMessage.created_date), 'dd/MM HH:mm', { locale: he })}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}