import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Trash2, MapPin, Video, 
  Calendar, Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

// Generate start time slots in 5-minute intervals (8:00 - 23:55)
const generateStartTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

// Generate end time slots in 5-minute intervals (8:00 - 23:55, then 00:00 - 01:00)
const generateEndTimeSlots = () => {
  const slots = [];
  // 8:00 - 23:55
  for (let hour = 8; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  // 00:00 - 00:55
  for (let minute = 0; minute < 60; minute += 5) {
    const timeString = `00:${String(minute).padStart(2, '0')}`;
    slots.push(timeString);
  }
  // 01:00
  slots.push('01:00');
  return slots;
};

export default function AdvisorAvailability({ user }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [slotMode, setSlotMode] = useState('single'); // 'single' | 'multiple'
  const [newSlot, setNewSlot] = useState({
    date: '',
    start_time: '',
    end_time: '',
    location_type: 'office'
  });
  const [multiSlot, setMultiSlot] = useState({
    date: '',
    start_time: '',
    range_end_time: '',
    break_minutes: '30',
    location_type: 'office'
  });
  const [conflictError, setConflictError] = useState('');
  const queryClient = useQueryClient();
  const startTimeSlots = generateStartTimeSlots();
  const endTimeSlots = generateEndTimeSlots();

  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ['advisorSlots', user.id],
    queryFn: async () => {
      const slots = await base44.entities.AvailabilitySlot.filter({ 
        advisor_id: user.id 
      });
      const today = new Date().toISOString().split('T')[0];
      return slots.filter(s => s.date >= today).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!user,
  });

  // Get all appointments for conflict checking and showing client names
  const { data: allAppointments = [] } = useQuery({
    queryKey: ['allAppointments', user.id],
    queryFn: () => base44.entities.Appointment.filter({ advisor_id: user.id }),
    enabled: !!user,
  });

  // Find client name for a booked slot
  const getClientNameForSlot = (slot) => {
    if (!slot.is_booked) return null;
    const appointment = allAppointments.find(
      apt => apt.availability_slot_id === slot.id && apt.status === 'scheduled'
    );
    return appointment?.client_name || 'לקוח';
  };

  const createSlotMutation = useMutation({
    mutationFn: (data) => base44.entities.AvailabilitySlot.create({
      ...data,
      advisor_id: user.id,
      is_booked: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisorSlots'] });
      queryClient.invalidateQueries({ queryKey: ['allAppointments'] });
      setShowAddDialog(false);
      setConflictError('');
      setNewSlot({ date: '', start_time: '', end_time: '', location_type: 'office' });
      setMultiSlot({ date: '', start_time: '', range_end_time: '', break_minutes: '30', location_type: 'office' });
      setSlotMode('single');
    },
  });

  const createMultipleSlots = async () => {
    const { date, start_time, range_end_time, break_minutes, location_type } = multiSlot;
    const breakMins = parseInt(break_minutes) || 30;
    const meetingDuration = 60; // 1 hour per meeting
    const rangeEndMinutes = timeToMinutes(range_end_time);

    let currentStart = timeToMinutes(start_time);
    const slotsToCreate = [];

    while (currentStart + meetingDuration <= rangeEndMinutes) {
      const slotStart = minutesToTime(currentStart);
      const slotEnd = minutesToTime(currentStart + meetingDuration);
      const conflict = checkConflicts(date, slotStart, slotEnd);
      if (conflict) {
        setConflictError(conflict);
        return;
      }
      slotsToCreate.push({ date, start_time: slotStart, end_time: slotEnd, location_type });
      currentStart += meetingDuration + breakMins;
    }

    if (slotsToCreate.length === 0) {
      setConflictError('אין מספיק זמן ליצור פגישה אחת לפחות');
      return;
    }

    setConflictError('');
    for (const slot of slotsToCreate) {
      await base44.entities.AvailabilitySlot.create({ ...slot, advisor_id: user.id, is_booked: false });
    }
    queryClient.invalidateQueries({ queryKey: ['advisorSlots'] });
    queryClient.invalidateQueries({ queryKey: ['allAppointments'] });
    setShowAddDialog(false);
    setMultiSlot({ date: '', start_time: '', range_end_time: '', break_minutes: '30', location_type: 'office' });
    setSlotMode('single');
  };

  const deleteSlotMutation = useMutation({
    mutationFn: (id) => base44.entities.AvailabilitySlot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisorSlots'] });
    },
  });

  // Auto-calculate end time when start time changes (default 1 hour)
  const handleStartTimeChange = (startTime) => {
    setNewSlot({ ...newSlot, start_time: startTime });
    
    if (startTime && !newSlot.end_time) {
      // Calculate end time (1 hour later)
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHours = (hours + 1) % 24;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setNewSlot(prev => ({ ...prev, start_time: startTime, end_time: endTime }));
    }
  };

  // Check for time conflicts
  const checkConflicts = (newDate, newStart, newEnd) => {
    const newStartMinutes = timeToMinutes(newStart);
    const newEndMinutes = timeToMinutes(newEnd);

    // Check existing slots
    for (const slot of availabilitySlots) {
      if (slot.date === newDate) {
        const slotStartMinutes = timeToMinutes(slot.start_time);
        const slotEndMinutes = timeToMinutes(slot.end_time);
        
        // Check if times overlap
        if (
          (newStartMinutes >= slotStartMinutes && newStartMinutes < slotEndMinutes) ||
          (newEndMinutes > slotStartMinutes && newEndMinutes <= slotEndMinutes) ||
          (newStartMinutes <= slotStartMinutes && newEndMinutes >= slotEndMinutes)
        ) {
          return `כבר קיימת זמינות ב-${slot.start_time} - ${slot.end_time}`;
        }
      }
    }

    // Check scheduled appointments
    for (const appointment of allAppointments) {
      if (appointment.date === newDate && appointment.status === 'scheduled') {
        const apptStartMinutes = timeToMinutes(appointment.start_time);
        const apptEndMinutes = timeToMinutes(appointment.end_time);
        
        if (
          (newStartMinutes >= apptStartMinutes && newStartMinutes < apptEndMinutes) ||
          (newEndMinutes > apptStartMinutes && newEndMinutes <= apptEndMinutes) ||
          (newStartMinutes <= apptStartMinutes && newEndMinutes >= apptEndMinutes)
        ) {
          return `כבר קיימת פגישה מתוכננת ב-${appointment.start_time} - ${appointment.end_time}`;
        }
      }
    }

    return null;
  };

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const previewMultipleSlots = () => {
    if (!multiSlot.start_time || !multiSlot.range_end_time) return [];
    const breakMins = parseInt(multiSlot.break_minutes) || 30;
    const meetingDuration = 60;
    const rangeEndMinutes = timeToMinutes(multiSlot.range_end_time);
    let currentStart = timeToMinutes(multiSlot.start_time);
    const slots = [];
    while (currentStart + meetingDuration <= rangeEndMinutes) {
      slots.push({ start: minutesToTime(currentStart), end: minutesToTime(currentStart + meetingDuration) });
      currentStart += meetingDuration + breakMins;
    }
    return slots;
  };

  const handleAddSlot = () => {
    if (slotMode === 'multiple') {
      createMultipleSlots();
      return;
    }
    if (newSlot.date && newSlot.start_time && newSlot.end_time) {
      const conflict = checkConflicts(newSlot.date, newSlot.start_time, newSlot.end_time);
      if (conflict) {
        setConflictError(conflict);
        return;
      }
      setConflictError('');
      createSlotMutation.mutate(newSlot);
    }
  };

  const groupSlotsByDate = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  };

  const groupedSlots = groupSlotsByDate(availabilitySlots);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              הזמינויות שלי
            </CardTitle>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-[#105330] hover:bg-[#0d4027]"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף זמינות
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {availabilitySlots.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">טרם הגדרת זמינויות לפגישות</p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-[#105330]">
                הוסף זמינות ראשונה
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSlots).map(([date, slots]) => (
                <div key={date}>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(date), 'EEEE, d בMMMM yyyy', { locale: he })}
                  </h3>
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div 
                        key={slot.id}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                          slot.is_booked 
                            ? 'bg-slate-100 border-slate-300' 
                            : 'bg-white border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <Badge variant="outline" className="gap-1">
                            {slot.location_type === 'office' ? (
                              <>
                                <MapPin className="w-3 h-3" />
                                במשרד
                              </>
                            ) : (
                              <>
                                <Video className="w-3 h-3" />
                                זום
                              </>
                            )}
                          </Badge>
                          {slot.is_booked && (
                            <Badge className="bg-red-100 text-red-700 border-0">
                              תפוס - {getClientNameForSlot(slot)}
                            </Badge>
                          )}
                          {!slot.is_booked && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0">
                              פנוי
                            </Badge>
                          )}
                        </div>
                        {!slot.is_booked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('האם למחוק זמינות זו?')) {
                                deleteSlotMutation.mutate(slot.id);
                              }
                            }}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Slot Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) { setConflictError(''); setSlotMode('single'); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת זמינות חדשה</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">

            {/* Mode toggle */}
            <div className="space-y-2">
              <Label>סוג הוספה</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSlotMode('single'); setConflictError(''); }}
                  className={`py-2 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                    slotMode === 'single' ? 'bg-[#105330] text-white border-[#105330]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#105330]'
                  }`}
                >פגישה בודדת</button>
                <button
                  onClick={() => { setSlotMode('multiple'); setConflictError(''); }}
                  className={`py-2 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                    slotMode === 'multiple' ? 'bg-[#105330] text-white border-[#105330]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#105330]'
                  }`}
                >כמה פגישות</button>
              </div>
            </div>

            {/* Date (shared) */}
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input
                type="date"
                value={slotMode === 'single' ? newSlot.date : multiSlot.date}
                onChange={(e) => {
                  const val = e.target.value;
                  if (slotMode === 'single') setNewSlot({ ...newSlot, date: val });
                  else setMultiSlot({ ...multiSlot, date: val });
                  setConflictError('');
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {slotMode === 'single' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>שעת התחלה</Label>
                    <Select
                      value={newSlot.start_time}
                      onValueChange={(value) => { handleStartTimeChange(value); setConflictError(''); }}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר שעה" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {startTimeSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>שעת סיום</Label>
                    <Select
                      value={newSlot.end_time}
                      onValueChange={(value) => { setNewSlot({ ...newSlot, end_time: value }); setConflictError(''); }}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר שעה" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {endTimeSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>שעת התחלה (פגישה ראשונה)</Label>
                    <Select
                      value={multiSlot.start_time}
                      onValueChange={(value) => { setMultiSlot({ ...multiSlot, start_time: value }); setConflictError(''); }}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר שעה" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {startTimeSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>שעת סיום (פגישה אחרונה)</Label>
                    <Select
                      value={multiSlot.range_end_time}
                      onValueChange={(value) => { setMultiSlot({ ...multiSlot, range_end_time: value }); setConflictError(''); }}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר שעה" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {endTimeSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>הפסקה בין פגישות (דקות)</Label>
                  <Select
                    value={multiSlot.break_minutes}
                    onValueChange={(value) => setMultiSlot({ ...multiSlot, break_minutes: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">ללא הפסקה</SelectItem>
                      <SelectItem value="15">15 דקות</SelectItem>
                      <SelectItem value="30">30 דקות</SelectItem>
                      <SelectItem value="45">45 דקות</SelectItem>
                      <SelectItem value="60">שעה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Preview */}
                {multiSlot.start_time && multiSlot.range_end_time && (() => {
                  const preview = previewMultipleSlots();
                  return preview.length > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-emerald-700 mb-2">תצוגה מקדימה – {preview.length} פגישות:</p>
                      <div className="space-y-1">
                        {preview.map((s, i) => (
                          <div key={i} className="text-xs text-emerald-800 bg-white rounded-lg px-3 py-1.5 font-medium">
                            {i + 1}. {s.start} – {s.end}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                      אין מספיק זמן לפגישה אחת לפחות
                    </div>
                  );
                })()}
              </>
            )}

            {/* Location (shared) */}
            <div className="space-y-2">
              <Label>סוג פגישה</Label>
              <Select
                value={slotMode === 'single' ? newSlot.location_type : multiSlot.location_type}
                onValueChange={(value) => {
                  if (slotMode === 'single') setNewSlot({ ...newSlot, location_type: value });
                  else setMultiSlot({ ...multiSlot, location_type: value });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">במשרד</SelectItem>
                  <SelectItem value="zoom">זום</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {conflictError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {conflictError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAddSlot}
              disabled={
                slotMode === 'single'
                  ? (!newSlot.date || !newSlot.start_time || !newSlot.end_time || createSlotMutation.isPending)
                  : (!multiSlot.date || !multiSlot.start_time || !multiSlot.range_end_time || previewMultipleSlots().length === 0)
              }
              className="bg-[#105330] hover:bg-[#0d4027]"
            >
              {createSlotMutation.isPending ? 'מוסיף...' : slotMode === 'multiple' ? `הוסף ${previewMultipleSlots().length} פגישות` : 'הוסף זמינות'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}