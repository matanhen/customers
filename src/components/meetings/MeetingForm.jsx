import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Video } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/components/ui/searchable-select';

const OFFICE_ADDRESS = 'יגאל אלון 94, מגדל אלון 2, קומה 31, תל אביב';

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'נקבעה' },
  { value: 'completed', label: 'התקיימה' },
  { value: 'no_show', label: 'הבריז/ה מפגישה' },
  { value: 'cancelled_client', label: 'נדחתה לבקשת הלקוח' },
  { value: 'cancelled_us', label: 'נדחתה לבקשתינו' },
];

export default function MeetingForm({
  open, onClose, onSaved, editingMeeting, clients, advisors, currentUser, isAdmin,
}) {
  const [advisorId, setAdvisorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [meetingType, setMeetingType] = useState('meeting');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [locationType, setLocationType] = useState('office');
  const [status, setStatus] = useState('scheduled');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingMeeting) {
      setAdvisorId(editingMeeting.advisor_id || '');
      setClientId(editingMeeting.client_id || '');
      setMeetingType(editingMeeting.meeting_type || 'meeting');
      setMeetingDate(editingMeeting.meeting_date || '');
      setMeetingTime(editingMeeting.meeting_time || '');
      setLocationType(editingMeeting.location_type === 'none' ? 'office' : (editingMeeting.location_type || 'office'));
      setStatus(editingMeeting.status || 'scheduled');
      setNotes(editingMeeting.notes || '');
    } else {
      setAdvisorId(isAdmin ? '' : (currentUser?.id || ''));
      setClientId('');
      setMeetingType('meeting');
      setMeetingDate('');
      setMeetingTime('');
      setLocationType('office');
      setStatus('scheduled');
      setNotes('');
    }
    setError('');
  }, [editingMeeting, open, isAdmin, currentUser]);

  const selectedClient = clients.find(c => c.id === clientId);
  const selectedAdvisor = advisors.find(a => a.id === advisorId);

  const handleSave = async () => {
    setError('');

    if (!clientId) { setError('נא לבחור לקוח'); return; }
    if (!meetingDate) { setError('נא לבחור תאריך'); return; }
    if (!meetingTime) { setError('נא לבחור שעה'); return; }

    const finalAdvisorId = isAdmin ? advisorId : (currentUser?.id || '');
    if (!finalAdvisorId) { setError('נא לבחור יועץ'); return; }

    const finalAdvisor = advisors.find(a => a.id === finalAdvisorId);
    const finalLocationType = meetingType === 'intro_call' ? 'none' : locationType;
    const address = finalLocationType === 'office' ? OFFICE_ADDRESS : finalLocationType === 'zoom' ? 'זום' : '';

    const data = {
      advisor_id: finalAdvisorId,
      advisor_name: finalAdvisor?.full_name || finalAdvisor?.email || currentUser?.full_name || '',
      client_id: clientId,
      client_name: selectedClient?.full_name || '',
      client_phone: selectedClient?.phone || '',
      meeting_type: meetingType,
      meeting_date: meetingDate,
      meeting_time: meetingTime,
      location_type: finalLocationType,
      address,
      status,
      notes,
      created_by_id: currentUser?.id || '',
      created_by_type: isAdmin ? 'admin' : 'advisor',
    };

    setSaving(true);
    try {
      if (editingMeeting) {
        await base44.entities.Meeting.update(editingMeeting.id, data);
      } else {
        await base44.entities.Meeting.create(data);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'שגיאה בשמירה');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-800">
            {editingMeeting ? 'עריכת פגישה' : 'פגישה חדשה'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">יועץ</Label>
              <SearchableSelect
                value={advisorId}
                onValueChange={setAdvisorId}
                placeholder="חפש ובחר יועץ..."
                items={advisors.map(a => ({
                  value: a.id,
                  label: a.full_name || a.email,
                  searchText: a.email,
                }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">לקוח</Label>
            <SearchableSelect
              value={clientId}
              onValueChange={setClientId}
              placeholder="חפש לפי שם, אימייל או טלפון..."
              items={clients.map(c => ({
                value: c.id,
                label: `${c.full_name || c.email}${c.phone ? ` (${c.phone})` : ''}`,
                searchText: `${c.email} ${c.phone || ''}`,
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">סוג פגישה</Label>
            <Select value={meetingType} onValueChange={(v) => { setMeetingType(v); if (v === 'intro_call') setLocationType('none'); }}>
              <SelectTrigger className="border-[#105330]/30 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">פגישה</SelectItem>
                <SelectItem value="intro_call">שיחת היכרות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">תאריך</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="border-[#105330]/30 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">שעה</Label>
              <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="border-[#105330]/30 rounded-xl" />
            </div>
          </div>

          {meetingType === 'meeting' && (
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">מיקום</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="border-[#105330]/30 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> משרד</span>
                  </SelectItem>
                  <SelectItem value="zoom">
                    <span className="flex items-center gap-1"><Video className="w-4 h-4" /> זום</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {locationType === 'office' && (
                <p className="text-xs text-slate-500">{OFFICE_ADDRESS}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">סטטוס</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-[#105330]/30 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#105330] font-semibold">הערות</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות נוספות..." className="border-[#105330]/30 rounded-xl" rows={2} />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200">ביטול</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] rounded-xl shadow-lg">
            {saving ? 'שומר...' : (editingMeeting ? 'שמור שינויים' : 'קבע פגישה')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}