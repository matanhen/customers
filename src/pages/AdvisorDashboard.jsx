import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Search, Eye, 
  Mail, AlertCircle, UserPlus, MessageCircle, Loader2
} from 'lucide-react';
import ExpenseCoach from '../components/advisor/ExpenseCoach';
import CopyPersonalLinkButton from '../components/admin/CopyPersonalLinkButton';
import { buildAdvisorGroups } from '@/lib/advisorGrouping';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';


export default function AdvisorDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | advisor group key
  const [searchAll, setSearchAll] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [addError, setAddError] = useState('');
  const [generatingLinkFor, setGeneratingLinkFor] = useState(null);
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

  // Share the client sign-in flow, never an activation code tied to the advisor.
  const handleOpenWhatsappLink = async (clientRow) => {
    if (!clientRow.id && !clientRow.email) return;
    setGeneratingLinkFor(clientRow.id || clientRow.email);
    try {
      const res = await base44.functions.invoke('getUserWhatsappLink', {
        user_id: clientRow.id || '',
        email: clientRow.email || '',
      });
      if (res?.data?.link) {
        window.open(res.data.link, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('Failed to generate WhatsApp link', e);
    }
    setGeneratingLinkFor(null);
  };

  const isAdvisor = user?.user_type === 'advisor';
  const isAdmin = user?.user_type === 'admin';

  // Get assignments - admin gets all, advisor gets only their assignments
  const { data: assignments = [], isLoading: loadingAssignments, error: assignmentsError } = useQuery({
    queryKey: ['advisorAssignments', user?.id, isAdmin],
    queryFn: async () => {
      try {
        const allAssignments = await base44.entities.ClientAdvisorAssignment.list('-created_date', 1000);
        if (isAdmin) {
          return allAssignments;
        }
        const myEmail = (user?.email || '').toLowerCase().trim();
        return allAssignments.filter(a =>
          a.advisor_id === user?.id || (a.advisor_email || '').toLowerCase().trim() === myEmail
        );
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
        return await base44.entities.User.list('-created_date', 1000);
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
        return await base44.entities.AllowedUser.list('-created_date', 1000);
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

  // Get client details (personal_code, phone) via backend function.
  // Advisors can't read User entities directly (RLS blocks User.list).
  const { data: advisorClientDetails = [] } = useQuery({
    queryKey: ['advisorClientDetails', user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAdvisorClients', {});
      return res?.data?.clients || [];
    },
    enabled: !!user?.id && (isAdvisor || isAdmin),
    staleTime: 3 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isLoading = loadingAssignments || loadingUsers || loadingAllowed;
  const hasError = assignmentsError || usersError || allowedError;

  // Build email -> assignment map for login dates (source of truth for all admins)
  const assignmentByEmail = {};
  for (const a of assignments) {
    if (a.client_email) assignmentByEmail[a.client_email.toLowerCase()] = a;
  }

  // Merge Users and AllowedUsers - create combined list
  const emailKey = (value) => (value || '').toLowerCase().trim();
  const userEmails = new Set(allUsers.map(u => emailKey(u.email)));
  const allowedUsersNotInSystem = allowedUsers
    .filter(au => !userEmails.has(emailKey(au.email)))
    .map(au => ({
      id: au.id,
      email: au.email,
      full_name: au.full_name,
      user_type: au.user_type,
      phone: au.phone || '',
      personal_code: au.personal_code || '',
      created_date: au.created_date
    }));

  // Enrich all users with login dates from assignments (shared across all advisors/admins)
  const enrichWithLoginDates = (user) => {
    const a = assignmentByEmail[user.email?.toLowerCase()];
    return {
      ...user,
      first_login_date: a?.first_login_date || null,
      last_login_date: a?.last_login_date || user.last_login_date || null,
    };
  };

  // For advisors: allUsers is empty (RLS), so merge registered clients from
  // the backend function — these have personal_code and phone.
  const advisorDetailUsers = isAdvisor
    ? advisorClientDetails
        .filter(c => c.id)
        .map(c => enrichWithLoginDates({
          id: c.id,
          email: c.email,
          full_name: c.full_name,
          custom_name: c.custom_name,
          phone: c.phone,
          personal_code: (c.personal_code || '').toUpperCase(),
          user_type: 'client',
        }))
    : [];

  const combinedUsers = [...allUsers.map(enrichWithLoginDates), ...advisorDetailUsers, ...allowedUsersNotInSystem];

  // Helper: dedupe by email
  const dedupeByEmail = (arr) => {
    const seen = new Set();
    return arr.filter(c => {
      const key = emailKey(c.email);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // All clients (deduped)
  const allClients = dedupeByEmail(combinedUsers.filter(u => u.user_type === 'client'));

  // Map an assignment to its client row — registered client, client that has not
  // logged in yet, or the assignment itself. Email matching ignores letter case.
  const clientForAssignment = (a) => {
    const key = emailKey(a.client_email);
    return (
      (a.client_id ? combinedUsers.find(u => u.id === a.client_id) : null) ||
      combinedUsers.find(u => emailKey(u.email) === key) ||
      (a.client_email
        ? { id: '', email: a.client_email, full_name: a.client_name || '', custom_name: '', phone: '', personal_code: '', user_type: 'client' }
        : null)
    );
  };

  // For non-admin advisors: show only their assigned clients in 'all'
  const clients = isAdmin
    ? allClients
    : dedupeByEmail(assignments.map(clientForAssignment).filter(Boolean));

  // Advisors/admins come from the live data — every assignee that actually has
  // clients appears, including clients assigned to a system admin.
  const advisorRecords = dedupeByEmail([
    ...combinedUsers.filter(u => u.user_type === 'advisor' || u.user_type === 'admin'),
    // The signed-in advisor always knows their own name (User list is RLS-blocked for advisors)
    ...(user ? [user] : []),
  ]);
  const advisorGroups = buildAdvisorGroups({ clients, assignments, advisors: advisorRecords });
  const activeGroup = advisorGroups.find(g => g.key === activeTab) || null;

  const filterList = (list, query) =>
    list.filter(c =>
      (c.custom_name || c.full_name)?.toLowerCase().includes(query.toLowerCase()) ||
      c.email?.toLowerCase().includes(query.toLowerCase())
    );

  const filteredAll = filterList(clients, searchAll);
  const filteredGroup = activeGroup ? filterList(activeGroup.clients, searchGroup) : [];

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
      full_name: client.custom_name || client.full_name || client.email,
      email: clientEmail,
    }));
    window.location.href = createPageUrl('Home');
  };

  const handleAddClient = async () => {
    if (!newClientEmail.trim()) return;
    setAddingClient(true);
    setAddError('');
    try {
      // Idempotent add: never duplicates an email, never overwrites existing data,
      // and assigns the new client to this advisor automatically.
      const res = await base44.functions.invoke('addClient', {
        email: newClientEmail.trim(),
        full_name: newClientName.trim(),
        user_type: 'client',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['allowedUsersForAdvisor'] });
      queryClient.invalidateQueries({ queryKey: ['advisorClientDetails'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
      setShowAddClient(false);
      setNewClientEmail('');
      setNewClientName('');
    } catch (e) {
      setAddError(e?.message || 'שגיאה בהוספת הלקוח.');
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
                {(client.custom_name || client.full_name)?.[0] || client.email?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg lg:text-xl truncate">{client.custom_name || client.full_name || 'ללא שם'}</h3>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-5 text-xs lg:text-sm text-slate-500 mt-1 lg:mt-2">
                  <span className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" /><span className="truncate">{client.email}</span></span>
                  {(client.personal_code || client.email) && (
                    <span className="flex items-center gap-1.5">
                      {client.personal_code ? (
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-bold text-xs">קוד: {client.personal_code}</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold text-xs">אין קוד</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsappLink(client)}
                        disabled={generatingLinkFor === (client.id || client.email)}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
                      >
                        {generatingLinkFor === (client.id || client.email) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <MessageCircle className="w-3 h-3" />
                        )}
                        קישור אישי
                      </button>
                      <CopyPersonalLinkButton client={client} />
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    {client.first_login_date ? `כניסה ראשונה: ${format(new Date(client.first_login_date), 'dd/MM/yyyy HH:mm')}` : 'לא נכנס עדיין'}
                  </span>
                  {client.last_login_date && client.first_login_date && client.last_login_date !== client.first_login_date && (
                    <span className="flex items-center gap-1.5">
                      {`כניסה אחרונה: ${format(new Date(client.last_login_date), 'dd/MM/yyyy HH:mm')}`}
                    </span>
                  )}
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

      {/* Expense Coach */}
      <ExpenseCoach />

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

      {/* Stats Cards — built from the live advisor groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
        {advisorGroups.map(group => (
          <Card key={group.key} className="border-0 shadow-xl shadow-slate-200/50 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
            <div className={`h-1.5 ${group.key === 'unassigned' ? 'bg-slate-300' : group.user_type === 'admin' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${group.key === 'unassigned' ? 'bg-slate-400' : group.user_type === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'} shadow-lg`}>
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-600 font-medium truncate" title={group.name}>
                    {group.user_type === 'admin' ? `מנהל - ${group.name}` : group.name}
                  </p>
                  {isLoading ? <Skeleton className="h-9 w-16 mt-1" /> : <p className="text-3xl font-bold text-slate-800">{group.clients.length}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
          ...advisorGroups.map(group => ({
            key: group.key,
            label: `${group.name} (${group.clients.length})`,
          })),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchGroup(''); }}
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
      {activeTab !== 'all' && activeGroup && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="relative mb-5">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input placeholder="חיפוש לפי שם או אימייל..." value={searchGroup} onChange={e => setSearchGroup(e.target.value)} className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl" />
            </div>
            {renderClientList(filteredGroup, `אין לקוחות משויכים ל${activeGroup.name}`)}
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