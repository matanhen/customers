import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Pencil, Trash2, MapPin, Video, Phone, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MeetingForm from '@/components/meetings/MeetingForm';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

export default function Meetings() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [tab, setTab] = useState('upcoming');
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

  const now = new Date();
  const sortedMeetings = [...meetings].sort((a, b) => {
    const da = new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00'));
    const db = new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00'));
    return tab === 'upcoming' ? da - db : db - da;
  });

  const upcoming = sortedMeetings.filter(m => {
    const dt = new Date(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
    return dt >= now && m.status === 'scheduled';
  });
  const past = sortedMeetings.filter(m => {
    const dt = new Date(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
    return dt < now || m.status !== 'scheduled';
  }).sort((a, b) => {
    const da = new Date(a.meeting_date + 'T' + (a.meeting_time || '00:00'));
    const db = new Date(b.meeting_date + 'T' + (b.meeting_time || '00:00'));
    return db - da;
  });

  const display = tab === 'upcoming' ? upcoming : past;

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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
            tab === 'upcoming'
              ? 'bg-[#105330] text-white shadow-lg'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          פגישות עתידיות ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-4 py-2 rounded-xl font-medium transition-all text-sm ${
            tab === 'past'
              ? 'bg-[#105330] text-white shadow-lg'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          פגישות עבר ({past.length})
        </button>
      </div>

      {/* Meeting List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : display.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">אין {tab === 'upcoming' ? 'פגישות עתידיות' : 'פגישות עבר'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {display.map((m) => {
            const meetingDate = parseISO(m.meeting_date + 'T' + (m.meeting_time || '00:00'));
            return (
              <Card key={m.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                          {m.client_name || 'לקוח לא מזוהה'}
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

                      {isAdmin && m.advisor_name && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <User className="w-4 h-4" />
                          יועץ: {m.advisor_name}
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