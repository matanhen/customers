import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Search, Eye, 
  Mail, AlertCircle, UserPlus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';


const IDAN_EMAIL = 'idanhen012@gmail.com';
const NIV_EMAIL = 'nivdavid7@gmail.com';

export default function AdvisorDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'idan' | 'niv'
  const [searchAll, setSearchAll] = useState('');
  const [searchIdan, setSearchIdan] = useState('');
  const [searchNiv, setSearchNiv] = useState('');
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

  // Helper: dedupe by email
  const dedupeByEmail = (arr) => {
    const seen = new Set();
    return arr.filter(c => {
      if (seen.has(c.email)) return false;
      seen.add(c.email);
      return true;
    });
  };

  // All clients (deduped)
  const allClients = dedupeByEmail(combinedUsers.filter(u => u.user_type === 'client'));

  // Find advisor user objects by email
  const idanAdvisor = combinedUsers.find(u => u.email?.toLowerCase() === IDAN_EMAIL);
  const nivAdvisor = combinedUsers.find(u => u.email?.toLowerCase() === NIV_EMAIL);

  // Clients assigned to idan
  const idanAssignments = assignments.filter(a => a.advisor_id === idanAdvisor?.id || a.advisor_email?.toLowerCase() === IDAN_EMAIL);
  const idanClients = dedupeByEmail(idanAssignments.map(a => {
    let c = combinedUsers.find(u => u.id === a.client_id);
    if (!c) c = combinedUsers.find(u => u.email === a.client_email);
    return c;
  }).filter(Boolean));

  // Clients assigned to niv
  const nivAssignments = assignments.filter(a => a.advisor_id === nivAdvisor?.id || a.advisor_email?.toLowerCase() === NIV_EMAIL);
  const nivClients = dedupeByEmail(nivAssignments.map(a => {
    let c = combinedUsers.find(u => u.id === a.client_id);
    if (!c) c = combinedUsers.find(u => u.email === a.client_email);
    return c;
  }).filter(Boolean));

  // For non-admin advisors: show only their assigned clients in 'all'
  const clients = isAdmin
    ? allClients
    : dedupeByEmail(assignments.map(a => {
        let c = combinedUsers.find(u => u.id === a.client_id);
        if (!c) c = combinedUsers.find(u => u.email === a.client_email);
        return c;
      }).filter(Boolean));

  const filterList = (list, query) =>
    list.filter(c =>
      c.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      c.email?.toLowerCase().includes(query.toLowerCase())
    );

  const filteredAll = filterList(clients, searchAll);
  const filteredIdan = filterList(idanClients, searchIdan);
  const filteredNiv = filterList(nivClients, searchNiv);

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

  const renderClientList = (list, emptyMsg) => {
    if (isLoading) return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-5 p-6 bg-slate-50 rounded-2xl">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></div>
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
        ))}
      </div>
    );
    if (list.length === 0) return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">{emptyMsg}</h3>
      </div>
    );
    return (
      <div className="space-y-4">
        {list.map(client => (
          <div key={client.id} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:justify-between p-4 lg:p-6 bg-gradient-to-r from-slate-50 to-slate-100/30 rounded-2xl hover:from-slate-100 hover:to-slate-100 transition-all border border-slate-200/50 group">
            <div className="flex items-center gap-3 lg:gap-5 w-full lg:w-auto">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg lg:text-2xl shadow-xl shadow-indigo-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                {client.full_name?.[0] || client.email?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg lg:text-xl truncate">{client.full_name || 'ללא שם'}</h3>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-5 text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">
                  <span className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" /><span className="truncate">{client.email}</span></span>
                  <span className="flex items-center gap-1.5">{client.last_login_date ? format(new Date(client.last_login_date), 'dd/MM/yyyy HH:mm') : 'לא נכנס עדיין'}</span>
                </div>
              </div>
            </div>
            <Button onClick={() => handleViewClient(client)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 rounded-xl px-4 py-3 lg:px-6 lg:py-5 w-full lg:w-auto text-sm lg:text-base">
              <Eye className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />צפה ועריכה
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent">דשבורד יועץ</h1>
        <p className="text-slate-500 mt-2 text-lg">צפייה ועריכת נתוני לקוחות</p>
      </div>

      {hasError && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-6 h-6" />
              <div><p className="font-semibold">שגיאה בטעינת נתונים</p><p className="text-sm">אנא נסה לרענן את הדף</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-xl shadow-[#105330]/20 bg-gradient-to-br from-[#105330]/5 to-[#c8a863]/5 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#c8a863]" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">סה״כ לקוחות</p>
                {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : <p className="text-3xl font-bold text-slate-800">{allClients.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">לקוחות עידן חן</p>
                {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : <p className="text-3xl font-bold text-slate-800">{idanClients.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-purple-100/50 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">לקוחות ניב דוד</p>
                {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : <p className="text-3xl font-bold text-slate-800">{nivClients.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Client Button */}
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setShowAddClient(true); setAddError(''); }} className="bg-[#105330] hover:bg-[#0d4027] gap-2">
          <UserPlus className="w-4 h-4" />הוסף לקוח חדש
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: `כל הלקוחות (${allClients.length})` },
          { key: 'idan', label: `לקוחות - עידן חן (${idanClients.length})` },
          { key: 'niv', label: `לקוחות - ניב דוד (${nivClients.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${
              activeTab === tab.key
                ? 'bg-[#105330] text-white border-[#105330] shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#105330]/40 hover:text-[#105330]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + List */}
      {activeTab === 'all' && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="relative mb-5">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="חיפוש לפי שם או אימייל..." value={searchAll} onChange={e => setSearchAll(e.target.value)} className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl" />
            </div>
            {renderClientList(filteredAll, 'אין לקוחות במערכת')}
          </CardContent>
        </Card>
      )}
      {activeTab === 'idan' && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="relative mb-5">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="חיפוש לפי שם או אימייל..." value={searchIdan} onChange={e => setSearchIdan(e.target.value)} className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl" />
            </div>
            {renderClientList(filteredIdan, 'אין לקוחות משויכים לעידן חן')}
          </CardContent>
        </Card>
      )}
      {activeTab === 'niv' && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="relative mb-5">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="חיפוש לפי שם או אימייל..." value={searchNiv} onChange={e => setSearchNiv(e.target.value)} className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl" />
            </div>
            {renderClientList(filteredNiv, 'אין לקוחות משויכים לניב דוד')}
          </CardContent>
        </Card>
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