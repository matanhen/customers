import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, Shield, Briefcase, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Client distribution across advisors — built from the live assignments, so it
// always matches the real data (including clients assigned to an admin).
export default function AdvisorBreakdown({ groups = [], totalClients = 0, isLoading = false, onSelectClient }) {
  const [openKey, setOpenKey] = useState(null);
  const max = Math.max(1, ...groups.map(g => g.clients.length));

  return (
    <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-xl bg-indigo-100">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          פילוח לקוחות לפי יועץ
          <span className="text-sm font-normal text-slate-500">({totalClients} לקוחות)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {isLoading && <p className="text-slate-400 text-sm p-4">טוען נתונים...</p>}
        {!isLoading && groups.length === 0 && (
          <p className="text-slate-400 text-sm p-4">אין לקוחות משויכים עדיין</p>
        )}
        {groups.map((group) => {
          const isOpen = openKey === group.key;
          const isUnassigned = group.key === 'unassigned';
          const Icon = isUnassigned ? UserX : group.user_type === 'admin' ? Shield : Briefcase;
          return (
            <div key={group.key} className="rounded-xl border border-slate-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : group.key)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-right"
              >
                <div className={`p-2 rounded-lg ${isUnassigned ? 'bg-slate-100 text-slate-500' : group.user_type === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">{group.name}</span>
                    {group.user_type === 'admin' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-medium">מנהל מערכת</span>
                    )}
                    {group.email && <span className="text-xs text-slate-400 truncate">{group.email}</span>}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isUnassigned ? 'bg-slate-300' : group.user_type === 'admin' ? 'bg-purple-400' : 'bg-blue-400'}`}
                      style={{ width: `${(group.clients.length / max) * 100}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg ${isUnassigned ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
                  {group.clients.length}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {isOpen && (
                <div className="bg-slate-50/60 px-3 pb-3 pt-1 flex flex-wrap gap-1.5">
                  {group.clients.length === 0 && <span className="text-xs text-slate-400">אין לקוחות</span>}
                  {group.clients.map(client => (
                    <button
                      key={client.id || client.email}
                      type="button"
                      onClick={() => onSelectClient?.(client)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                    >
                      {client.custom_name || client.full_name || client.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}