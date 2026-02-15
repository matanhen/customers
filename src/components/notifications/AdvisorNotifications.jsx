import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, UserX, Calendar, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdvisorNotifications({ advisorId, clients = [] }) {
  const queryClient = useQueryClient();

  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications', advisorId],
    queryFn: async () => {
      try {
        return await base44.entities.Notification.filter({ advisor_id: advisorId, is_dismissed: false });
      } catch (error) {
        console.error('Error loading notifications:', error);
        return [];
      }
    },
    enabled: !!advisorId,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Deduplicate notifications - keep only one per client+type combination
  const notificationMap = new Map();
  allNotifications.forEach(notif => {
    const key = `${notif.client_id}-${notif.type}`;
    if (!notificationMap.has(key)) {
      notificationMap.set(key, notif);
    }
  });
  const notifications = Array.from(notificationMap.values());

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['allMonthlyPlans'],
    queryFn: async () => {
      try {
        return await base44.entities.MonthlyPlan.list();
      } catch (error) {
        console.error('Error loading monthly plans:', error);
        return [];
      }
    },
    enabled: !!advisorId && clients.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForNotifications'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error loading users for notifications:', error);
        return [];
      }
    },
    enabled: !!advisorId && clients.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', advisorId] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_dismissed: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', advisorId] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', advisorId] }),
  });

  // Check for alerts
  useEffect(() => {
    if (!advisorId || clients.length === 0 || allUsers.length === 0 || monthlyPlans.length === 0) return;

    const checkAlerts = async () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const today = new Date();
        const dayOfMonth = today.getDate();

        // Track which notifications we need to create (deduplicated)
        const notificationsToCreate = [];

        for (const client of clients) {
          // Check for inactive users (no login for 30 days)
          const clientUser = allUsers.find(u => u.id === client.id);
          if (clientUser) {
            const lastLogin = clientUser.updated_date ? new Date(clientUser.updated_date) : new Date(clientUser.created_date);
            const daysSinceLogin = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

            if (daysSinceLogin > 30) {
              const existingNotif = allNotifications.find(
                n => n.client_id === client.id && n.type === 'inactive_user' && !n.is_dismissed
              );
              const alreadyQueued = notificationsToCreate.find(
                n => n.client_id === client.id && n.type === 'inactive_user'
              );
              if (!existingNotif && !alreadyQueued) {
                notificationsToCreate.push({
                  advisor_id: advisorId,
                  client_id: client.id,
                  client_name: client.full_name || client.email,
                  type: 'inactive_user',
                  message: `${client.full_name || client.email} לא התחבר למערכת כבר ${daysSinceLogin} ימים`,
                });
              }
            }
          }

          // Check for missing monthly plan (after 15th of month)
          if (dayOfMonth >= 15) {
            const hasCurrentPlan = monthlyPlans.some(
              p => p.user_id === client.id && p.month === currentMonth
            );
            if (!hasCurrentPlan) {
              const existingNotif = allNotifications.find(
                n => n.client_id === client.id && n.type === 'missing_monthly_plan' && !n.is_dismissed
              );
              const alreadyQueued = notificationsToCreate.find(
                n => n.client_id === client.id && n.type === 'missing_monthly_plan'
              );
              if (!existingNotif && !alreadyQueued) {
                notificationsToCreate.push({
                  advisor_id: advisorId,
                  client_id: client.id,
                  client_name: client.full_name || client.email,
                  type: 'missing_monthly_plan',
                  message: `${client.full_name || client.email} טרם הגדיר תכנון חודשי לחודש הנוכחי`,
                });
              }
            }
          }
        }

        // Create notifications sequentially to avoid race conditions
        for (const notif of notificationsToCreate) {
          createNotificationMutation.mutate(notif);
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    };

    checkAlerts();
  }, [advisorId, clients.length, allUsers.length, monthlyPlans.length]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'inactive_user': return <UserX className="w-5 h-5 text-orange-500" />;
      case 'missing_monthly_plan': return <Calendar className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-[#105330]" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'inactive_user': return 'משתמש לא פעיל';
      case 'missing_monthly_plan': return 'חסר תכנון חודשי';
      default: return 'התראה';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50 overflow-hidden mb-6">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <span>התראות</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount} חדשות</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-xl border transition-all ${
              notif.is_read 
                ? 'bg-white/50 border-slate-200' 
                : 'bg-white border-orange-200 shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {getIcon(notif.type)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(notif.type)}
                    </Badge>
                    {!notif.is_read && (
                      <Badge className="bg-orange-500 text-white text-xs">חדש</Badge>
                    )}
                  </div>
                  <p className="text-slate-700 font-medium">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notif.created_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="text-[#105330] hover:bg-[#105330]/10"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissMutation.mutate(notif.id)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}