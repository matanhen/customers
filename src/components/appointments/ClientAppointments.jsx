import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, MapPin, Video, 
  CheckCircle, XCircle, AlertCircle, User
} from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ClientAppointments({ user, isAdvisor = false }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [advisorId, setAdvisorId] = useState(null);
  const queryClient = useQueryClient();

  // Get client's advisor
  useEffect(() => {
    if (!isAdvisor && user) {
      getClientAdvisor();
    }
  }, [user, isAdvisor]);

  const getClientAdvisor = async () => {
    const assignments = await base44.entities.ClientAdvisorAssignment.filter({ 
      client_id: user.id 
    });
    if (assignments.length > 0) {
      setAdvisorId(assignments[0].advisor_id);
    }
  };

  const targetAdvisorId = isAdvisor ? user.id : advisorId;

  // Get available slots
  const { data: availableSlots = [] } = useQuery({
    queryKey: ['availableSlots', targetAdvisorId],
    queryFn: async () => {
      const slots = await base44.entities.AvailabilitySlot.filter({ 
        advisor_id: targetAdvisorId,
        is_booked: false 
      });
      const today = new Date().toISOString().split('T')[0];
      return slots.filter(s => s.date >= today).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
    },
    enabled: !!targetAdvisorId,
  });

  // Get appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', user.id],
    queryFn: async () => {
      if (isAdvisor) {
        return await base44.entities.Appointment.filter({ advisor_id: user.id });
      } else {
        return await base44.entities.Appointment.filter({ client_id: user.id });
      }
    },
    enabled: !!user,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (slot) => {
      // Create appointment
      const appointment = await base44.entities.Appointment.create({
        client_id: user.id,
        client_name: user.full_name || user.email,
        advisor_id: slot.advisor_id,
        advisor_name: 'יועץ',
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        location_type: slot.location_type,
        status: 'scheduled',
        availability_slot_id: slot.id
      });

      // Mark slot as booked
      await base44.entities.AvailabilitySlot.update(slot.id, { is_booked: true });

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowBookDialog(false);
      setSelectedSlot(null);
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointment) => {
      const appointmentDate = parseISO(`${appointment.date}T${appointment.start_time}`);
      const hoursUntil = differenceInHours(appointmentDate, new Date());

      if (hoursUntil < 24) {
        // Mark as completed (counts as attended)
        await base44.entities.Appointment.update(appointment.id, { status: 'completed' });
      } else {
        // Cancel and free the slot
        await base44.entities.Appointment.update(appointment.id, { status: 'cancelled' });
        if (appointment.availability_slot_id) {
          await base44.entities.AvailabilitySlot.update(appointment.availability_slot_id, { 
            is_booked: false 
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availableSlots'] });
    },
  });

  const groupSlotsByDate = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  };

  const groupedSlots = groupSlotsByDate(availableSlots);

  const scheduledAppointments = appointments.filter(a => a.status === 'scheduled');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const canCancel = (appointment) => {
    const appointmentDate = parseISO(`${appointment.date}T${appointment.start_time}`);
    const hoursUntil = differenceInHours(appointmentDate, new Date());
    return hoursUntil >= 24;
  };

  return (
    <div className="space-y-6">
      {/* Alert for cancellation policy */}
      {!isAdvisor && scheduledAppointments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900">מדיניות ביטול פגישות</p>
              <p className="text-sm text-orange-700 mt-1">
                ניתן לבטל פגישה רק עד 24 שעות לפני מועדה. פגישה שתבוטל מתחת ל-24 שעות תיחשב כפגישה שהתקיימה.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Appointments */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            פגישות קרובות
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {scheduledAppointments.length === 0 ? (
            <p className="text-center text-slate-500 py-8">אין פגישות מתוכננות</p>
          ) : (
            <div className="space-y-4">
              {scheduledAppointments.map((appointment) => (
                <div key={appointment.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          מתוכננת
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {appointment.location_type === 'office' ? (
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
                      </div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {format(parseISO(appointment.date), 'EEEE, d בMMMM yyyy', { locale: he })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {appointment.start_time} - {appointment.end_time}
                        </div>
                        {isAdvisor && appointment.client_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold">{appointment.client_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isAdvisor && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (canCancel(appointment)) {
                            if (confirm('האם אתה בטוח שברצונך לבטל את הפגישה?')) {
                              cancelAppointmentMutation.mutate(appointment);
                            }
                          } else {
                            alert('לא ניתן לבטל פגישה פחות מ-24 שעות לפני. פגישה זו תיחשב כפגישה שהתקיימה.');
                          }
                        }}
                        className="text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <XCircle className="w-4 h-4 ml-1" />
                        ביטול
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Slots - Only for clients */}
      {!isAdvisor && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              זמנים פנויים לקביעת פגישה
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!advisorId ? (
              <p className="text-center text-slate-500 py-8">לא נמצא יועץ משויך</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-slate-500 py-8">אין זמנים פנויים כרגע</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSlots).map(([date, slots]) => (
                  <div key={date}>
                    <h3 className="font-semibold text-slate-800 mb-3">
                      {format(parseISO(date), 'EEEE, d בMMMM yyyy', { locale: he })}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setShowBookDialog(true);
                          }}
                          className="p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-[#105330] hover:bg-slate-50 transition-all text-right"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="font-semibold">{slot.start_time} - {slot.end_time}</span>
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
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past Appointments */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-200">
              <CheckCircle className="w-5 h-5 text-slate-600" />
            </div>
            היסטוריית פגישות
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {pastAppointments.length === 0 ? (
            <p className="text-center text-slate-500 py-8">אין פגישות קודמות</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge variant={appointment.status === 'completed' ? 'default' : 'outline'}>
                        {appointment.status === 'completed' ? 'התקיימה' : 'בוטלה'}
                      </Badge>
                      <span className="text-sm text-slate-700">
                        {format(parseISO(appointment.date), 'd בMMMM yyyy', { locale: he })}
                      </span>
                      <span className="text-sm text-slate-500">
                        {appointment.start_time}
                      </span>
                      {isAdvisor && appointment.client_name && (
                        <Badge variant="outline" className="gap-1">
                          <User className="w-3 h-3" />
                          {appointment.client_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        {appointment.location_type === 'office' ? (
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Appointment Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>אישור קביעת פגישה</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#105330]" />
                  <span className="font-semibold">
                    {format(parseISO(selectedSlot.date), 'EEEE, d בMMMM yyyy', { locale: he })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#105330]" />
                  <span>{selectedSlot.start_time} - {selectedSlot.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSlot.location_type === 'office' ? (
                    <>
                      <MapPin className="w-5 h-5 text-[#105330]" />
                      <span>פגישה במשרד</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 text-[#105330]" />
                      <span>פגישת זום</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-600">
                שים לב: ניתן לבטל פגישה עד 24 שעות לפני מועדה. ביטול מתחת ל-24 שעות יחשב כפגישה שהתקיימה.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={() => bookAppointmentMutation.mutate(selectedSlot)}
              disabled={bookAppointmentMutation.isPending}
              className="bg-[#105330] hover:bg-[#0d4027]"
            >
              {bookAppointmentMutation.isPending ? 'קובע...' : 'אשר קביעת פגישה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}