import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Pencil, Trash2, MapPin, Video, Phone, Clock, User, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import MeetingForm from '@/components/meetings/MeetingForm';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

const TIME_FILTERS = [
  { key: 'upcoming', label: 'פגישות עתידיות' },
  { key: 'today', label: 'פגישות היום' },
  { key: 'week', label: 'פגישות השבוע' },
  { key: 'month', label: 'פגישות החודש' },
  { key: 'last_month', label: 'פגישות חודש שעבר' },
];

export default function Meetings() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-meeting_date'),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersMeetings'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const isAdmin = user?.role === 'admin' || user?.user_type === 'admin';
  const isAdvisor = user?.user_type === 'advisor';
  const canEdit = isAdmin || isAdvisor;

  const clients = allUsers.filter(u => u.user_type === 'client');
  const advisors = allUsers.filter(u => u.user_type === 'advisor' || u.user_type === 'admin');

  // Look up current user name by ID (prefers custom_name set by admin)
  const getUserName = (id, fallback) => {
    const u = allUsers.find(x => x.id === id);
    return (u && (u.custom_name || u.full_name)) || fallback || '';
  };

  const now = new Date();

  // Filter by time
  const filteredByTime = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    return meetings.filter(m => {
      const dt = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
      switch (timeFilter) {
        case 'upcoming':
          return dt >= now && m.status === 'scheduled';
        case 'today':
          return dt >= todayStart && dt <= todayEnd;
        case 'week':
          return dt >= weekStart && dt <= weekEnd;
        case 'month':
          return dt >= monthStart && dt <= monthEnd;
        case 'last_month':
          return dt >= lastMonthStart && dt <= lastMonthEnd;
        default:
          return true;
      }
    });
  }, [meetings, timeFilter]);

  // Filter by search (advisors/admins only)
  const display = useMemo(() => {
    if (!canEdit || !searchQuery.trim()) return filteredByTime;
    const q = searchQuery.toLowerCase().trim();
    return filteredByTime.filter(m =>
      (m.client_name || '').toLowerCase().includes(q) ||
      (m.client_phone || '').toLowerCase().includes(q) ||
      (m.advisor_name || '').toLowerCase().includes(q)
    );
  }, [filteredByTime, searchQuery, canEdit]);

  // Sort: upcoming ascending, others descending
  const sortedDisplay = useMemo(() => {
    const sorted = [...display].sort((a, b) => {
      const da = parseISO(a.meeting_date + 'T' + (a.meeting_time || '00:00'));
      const db = parseISO(b.meeting_date + 'T' + (b.meeting_time || '00:00'));
      return timeFilter === 'upcoming' ? da - db : db - da;
    });
    return sorted;
  }, [display, timeFilter]);

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הפגישה?')) return;
    await base44.entities.Meeting.delete(id);
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMeeting(null);
  };

  const handleFormSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    handleFormClose();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#105330] to-[#0d4027]">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#c8a863] rounded-xl">
              <CalendarClock className="w-6 h-6 text-[#105330]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ניהול פגישות</h1>
              <p className="text-white/70 text-sm">
                {canEdit ? 'קביעה וניהול פגישות עם לקוחות' : 'הפגישות שלך'}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={() => { setEditingMeeting(null); setShowForm(true); }}
              className="bg-[#c8a863] hover:bg-[#d4b87a] text-[#105330] font-bold"
            >
              <Plus className="w-4 h-4 ml-1" />
              פגישה חדשה
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Search bar (advisors/admins only) */}
      {canEdit && (
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="חיפוש לפי שם לקוח, טלפון או יועץ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 py-3 text-base border-slate-200 focus:border-[#105330] rounded-xl"
          />
        </div>
      )}

      {/* Time Filters */}
      <div className="flex gap-2 flex-wrap">
        {TIME_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTimeFilter(tf.key)}
            className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
              timeFilter === tf.key
                ? 'bg-[#105330] text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {tf.label} ({tf.key === 'upcoming'
              ? meetings.filter(m => parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00')) >= now && m.status === 'scheduled').length
              : tf.key === 'today'
              ? meetings.filter(m => { const dt = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00')); return dt >= startOfDay(now) && dt <= endOfDay(now); }).length
              : tf.key === 'week'
              ? meetings.filter(m => { const dt = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00')); return dt >= startOfWeek(now, { weekStartsOn: 0 }) && dt <= endOfWeek(now, { weekStartsOn: 0 }); }).length
              : tf.key === 'month'
              ? meetings.filter(m => { const dt = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00')); return dt >= startOfMonth(now) && dt <= endOfMonth(now); }).length
              : meetings.filter(m => { const dt = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00')); return dt >= startOfMonth(subMonths(now, 1)) && dt <= endOfMonth(subMonths(now, 1)); }).length
            })
          </button>
        ))}
      </div>

      {/* Meeting List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDisplay.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">אין פגישות בתקופה הנבחרת</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedDisplay.map((m) => {
            const meetingDate = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
            return (
              <Card key={m.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                          {getUserName(m.client_id, m.client_name) || 'לקוח לא מזוהה'}
                        </h3>
                        <Badge className={
                          m.meeting_type === 'intro_call'
                            ? 'bg-blue-100 text-blue-700 border-0'
                            : 'bg-[#c8a863]/20 text-[#8a6f30] border-0'
                        }>
                          {m.meeting_type === 'intro_call' ? 'שיחת היכרות' : 'פגישה'}
                        </Badge>
                        <Badge className={
                          m.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700 border-0'
                          : m.status === 'completed' ? 'bg-blue-100 text-blue-700 border-0'
                          : m.status === 'no_show' ? 'bg-orange-100 text-orange-700 border-0'
                          : m.status === 'cancelled_client' ? 'bg-amber-100 text-amber-700 border-0'
                          : 'bg-red-100 text-red-700 border-0'
                        }>
                          {m.status === 'scheduled' ? 'נקבעה'
                          : m.status === 'completed' ? 'התקיימה'
                          : m.status === 'no_show' ? 'הבריז/ה'
                          : m.status === 'cancelled_client' ? 'נדחתה - לקוח'
                          : 'נדחתה - יוזמה'}
                        </Badge>
                        {m.status === 'scheduled' && (
                          <Badge className={
                            m.attendance_confirmed
                              ? 'bg-emerald-100 text-emerald-700 border-0'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }>
                            {m.attendance_confirmed ? 'קיים אישור הגעה ✅' : 'עדיין ללא אישור הגעה ❌'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-4 h-4 text-[#105330]" />
                          {format(meetingDate, 'dd/MM/yyyy', { locale: he })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-[#105330]" />
                          {m.meeting_time}
                        </span>
                        {m.client_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-[#105330]" />
                            {m.client_phone}
                          </span>
                        )}
                      </div>

                      {m.location_type === 'office' && (
                        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-[#105330]" />
                          {OFFICE_ADDRESS}
                        </div>
                      )}
                      {m.location_type === 'zoom' && (
                        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                          <Video className="w-4 h-4 text-[#105330]" />
                          זום
                        </div>
                      )}

                      {isAdmin && (getUserName(m.advisor_id, m.advisor_name) || m.advisor_name) && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <User className="w-4 h-4" />
                          יועץ: {getUserName(m.advisor_id, m.advisor_name) || m.advisor_name}
                        </div>
                      )}

                      {m.notes && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">{m.notes}</p>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingMeeting(m); setShowForm(true); }}
                          className="border-[#105330]/30 text-[#105330] hover:bg-[#105330]/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <MeetingForm
          open={showForm}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
          editingMeeting={editingMeeting}
          clients={clients}
          advisors={advisors}
          currentUser={user}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}