import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Search, Eye, 
  Mail, Calendar, AlertCircle, UserPlus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import AdvisorNotifications from '../components/notifications/AdvisorNotifications';

export default function AdvisorDashboard() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [addError, setAddError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const isAdvisor = user?.user_type === 'advisor';
  const isAdmin = user?.user_type === 'admin';

  // Get assignments - admin gets all, advisor gets only their assignments
  const { data: assignments = [], isLoading: loadingAssignments, error: assignmentsError } = useQuery({
    queryKey: ['advisorAssignments', user?.id, isAdmin],
    queryFn: async () => {
      try {
        const allAssignments = await base44.entities.ClientAdvisorAssignment.list();
        if (isAdmin) {
          return allAssignments;
        }
        return allAssignments.filter(a => a.advisor_id === user?.id);
      } catch (error) {
        console.error('Error loading assignments:', error);
        return [];
      }
    },
    enabled: !!user?.id && (isAdvisor || isAdmin),
    staleTime: 3 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Get all users to match with assignments
  const { data: allUsers = [], isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ['allUsersForAdvisor'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error loading users:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Get allowed users that haven't logged in yet
  const { data: allowedUsers = [], isLoading: loadingAllowed, error: allowedError } = useQuery({
    queryKey: ['allowedUsersForAdvisor'],
    queryFn: async () => {
      try {
        return await base44.entities.AllowedUser.list();
      } catch (error) {
        console.error('Error loading allowed users:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isLoading = loadingAssignments || loadingUsers || loadingAllowed;
  const hasError = assignmentsError || usersError || allowedError;

  // Merge Users and AllowedUsers - create combined list
  const userEmails = new Set(allUsers.map(u => u.email));
  const allowedUsersNotInSystem = allowedUsers
    .filter(au => !userEmails.has(au.email))
    .map(au => ({
      id: au.id,
      email: au.email,
      full_name: au.full_name,
      user_type: au.user_type,
      created_date: au.created_date
    }));

  const combinedUsers = [...allUsers, ...allowedUsersNotInSystem];

  // Get clients - admin sees ALL clients, advisor sees only assigned
  let clientsWithDuplicates = [];
  if (isAdmin) {
    // Admin sees ALL users with user_type 'client'
    clientsWithDuplicates = combinedUsers.filter(u => u.user_type === 'client');
  } else {
    // Advisor sees only assigned clients
    clientsWithDuplicates = assignments
      .map(assignment => {
        // Try to find by client_id first, then by email
        let clientUser = combinedUsers.find(u => u.id === assignment.client_id);
        if (!clientUser) {
          clientUser = combinedUsers.find(u => u.email === assignment.client_email);
        }
        return clientUser;
      })
      .filter(Boolean); // Remove null/undefined entries
  }

  // Remove duplicates by email - keep only first occurrence
  const seenEmails = new Set();
  const clients = clientsWithDuplicates.filter(client => {
    if (seenEmails.has(client.email)) {
      return false;
    }
    seenEmails.add(client.email);
    return true;
  });

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewClient = async (client) => {
    // Try to get the real User ID via backend function (advisors can't filter User entity directly)
    let clientId = client.id;
    let clientEmail = client.email;
    try {
      const res = await base44.functions.invoke('getClientData', {
        clientUserId: client.id,
        clientEmail: client.email,
        entity: 'User'
      });
      const users = res?.data;
      if (Array.isArray(users) && users.length > 0) {
        // Pick the user with the most recent last_login_date
        const sorted = users.sort((a, b) => new Date(b.last_login_date || b.updated_date || 0) - new Date(a.last_login_date || a.updated_date || 0));
        clientId = sorted[0].id;
        clientEmail = sorted[0].email || client.email;
      }
    } catch (e) {
      console.log('Could not fetch user via backend, using existing id', e);
    }
    sessionStorage.setItem('viewingClient', JSON.stringify({
      id: clientId,
      full_name: client.full_name || client.email,
      email: clientEmail,
    }));
    window.location.href = createPageUrl('Home');
  };

  const handleAddClient = async () => {
    if (!newClientEmail.trim()) return;
    setAddingClient(true);
    setAddError('');
    try {
      // Create AllowedUser
      const allowedUser = await base44.entities.AllowedUser.create({
        email: newClientEmail.trim().toLowerCase(),
        full_name: newClientName.trim(),
        user_type: 'client'
      });
      // Create assignment
      await base44.entities.ClientAdvisorAssignment.create({
        client_id: '',
        client_email: newClientEmail.trim().toLowerCase(),
        client_name: newClientName.trim(),
        advisor_id: user.id,
        advisor_email: user.email
      });
      // Invite user
      await base44.users.inviteUser(newClientEmail.trim().toLowerCase(), 'user');
      queryClient.invalidateQueries({ queryKey: ['allowedUsersForAdvisor'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
      setShowAddClient(false);
      setNewClientEmail('');
      setNewClientName('');
    } catch (e) {
      setAddError('שגיאה בהוספת הלקוח. ייתכן שהאימייל כבר קיים במערכת.');
    }
    setAddingClient(false);
  };

  if (!user || (!isAdvisor && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין גישה</h2>
          <p className="text-slate-500">עמוד זה זמין ליועצים בלבד</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent">דשבורד יועץ</h1>
        <p className="text-slate-500 mt-2 text-lg">צפייה ועריכת נתוני לקוחות</p>
      </div>

      {/* Error State */}
      {hasError && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">שגיאה בטעינת נתונים</p>
                <p className="text-sm">אנא נסה לרענן את הדף</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Card */}
      <Card className="mb-6 border-0 shadow-xl shadow-[#105330]/20 bg-gradient-to-br from-[#105330]/5 to-[#c8a863]/5 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#c8a863]" />
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">{isAdmin ? 'סה״כ לקוחות במערכת' : 'לקוחות משויכים אליך'}</p>
              {isLoading ? (
                <Skeleton className="h-10 w-20 mt-1" />
              ) : (
                <p className="text-4xl font-bold text-slate-800">{clients.length}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Client Button - advisors and admins */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => { setShowAddClient(true); setAddError(''); }}
          className="bg-[#105330] hover:bg-[#0d4027] gap-2"
        >
          <UserPlus className="w-4 h-4" />
          הוסף לקוח חדש
        </Button>
      </div>

      <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש לקוח לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-indigo-100">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            רשימת לקוחות ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-5 p-6 bg-slate-50 rounded-2xl">
                  <Skeleton className="w-16 h-16 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-12 w-32 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">אין לקוחות משויכים אליך</h3>
              <p className="text-slate-500">המנהל ישייך אליך לקוחות בקרוב</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div 
                  key={client.id}
                  className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:justify-between p-4 lg:p-6 bg-gradient-to-r from-slate-50 to-slate-100/30 rounded-2xl hover:from-slate-100 hover:to-slate-100 transition-all border border-slate-200/50 group"
                >
                  <div className="flex items-center gap-3 lg:gap-5 w-full lg:w-auto">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg lg:text-2xl shadow-xl shadow-indigo-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                      {client.full_name?.[0] || client.email?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg lg:text-xl truncate">{client.full_name || 'ללא שם'}</h3>
                      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-5 text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                          {client.last_login_date ? format(new Date(client.last_login_date), 'dd/MM/yyyy HH:mm') : 'לא נכנס עדיין'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleViewClient(client)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 rounded-xl px-4 py-3 lg:px-6 lg:py-5 w-full lg:w-auto text-sm lg:text-base"
                  >
                    <Eye className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
                    צפה ועריכה
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      {!isLoading && !hasError && (
        <AdvisorNotifications advisorId={user?.id} clients={clients} />
      )}

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#105330]" />
              הוספת לקוח חדש
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="שם הלקוח"
              />
            </div>
            <div className="space-y-2">
              <Label>אימייל *</Label>
              <Input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            {addError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {addError}
              </div>
            )}
            <p className="text-sm text-slate-500">לאחר ההוספה, הלקוח יקבל הזמנה במייל להצטרף למערכת.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClient(false)}>ביטול</Button>
            <Button
              onClick={handleAddClient}
              disabled={!newClientEmail.trim() || addingClient}
              className="bg-[#105330] hover:bg-[#0d4027]"
            >
              {addingClient ? 'מוסיף...' : 'הוסף לקוח'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}