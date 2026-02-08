import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Search, Eye, 
  Mail, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import AdvisorNotifications from '../components/notifications/AdvisorNotifications';

export default function AdvisorDashboard() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['advisorAssignments', user?.id, isAdmin],
    queryFn: async () => {
      const allAssignments = await base44.entities.ClientAdvisorAssignment.list();
      if (isAdmin) {
        return allAssignments; // Admin sees all assignments
      }
      return allAssignments.filter(a => a.advisor_id === user?.id);
    },
    enabled: !!user?.id && (isAdvisor || isAdmin),
    refetchInterval: 3000,
    staleTime: 0,
  });

  // Get all users to match with assignments
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsersForAdvisor'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.id,
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Get allowed users that haven't logged in yet
  const { data: allowedUsers = [], isLoading: loadingAllowed } = useQuery({
    queryKey: ['allowedUsersForAdvisor'],
    queryFn: () => base44.entities.AllowedUser.list(),
    enabled: !!user?.id,
  });

  const isLoading = loadingAssignments || loadingUsers || loadingAllowed;

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

  const handleViewClient = (client) => {
    sessionStorage.setItem('viewingClient', JSON.stringify(client));
    window.location.href = createPageUrl('Home');
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
              <p className="text-4xl font-bold text-slate-800">{clients.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="text-center py-12 text-slate-500">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              טוען...
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
      <AdvisorNotifications advisorId={user?.id} clients={clients} />
    </div>
  );
}