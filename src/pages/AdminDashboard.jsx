import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserCog, Link2, Search, Check, X, 
  Shield, User, Briefcase, Unlink, Pencil, Webhook, Copy
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userFilter, setUserFilter] = useState('all'); // all, clients, advisors, admins, unassigned
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

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // Get allowed users that haven't logged in yet
  const { data: allowedUsers = [], isLoading: loadingAllowed } = useQuery({
    queryKey: ['allowedUsers'],
    queryFn: () => base44.entities.AllowedUser.list(),
    enabled: !!user,
  });

  // Sync User entities with AllowedUsers and remove duplicates
  useEffect(() => {
    if (!user || loadingUsers || loadingAllowed) return;

    const syncUsers = async () => {
      // Remove duplicate users by email (keep the first one)
      const emailMap = new Map();
      const duplicates = [];
      
      for (const u of allUsers) {
        if (emailMap.has(u.email)) {
          duplicates.push(u.id);
        } else {
          emailMap.set(u.email, u);
        }
      }

      // Delete duplicates
      for (const dupId of duplicates) {
        try {
          await base44.entities.User.delete(dupId);
        } catch (e) {
          console.log('Failed to delete duplicate', e);
        }
      }

      if (duplicates.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        return;
      }

      // Create User entities for AllowedUsers that don't have one yet
      if (allowedUsers.length > 0) {
        const userEmails = new Set(allUsers.map(u => u.email));
        const missingUsers = allowedUsers.filter(au => !userEmails.has(au.email));

        for (const allowedUser of missingUsers) {
          try {
            await base44.entities.User.create({
              email: allowedUser.email,
              full_name: allowedUser.full_name,
              user_type: allowedUser.user_type,
              advisor_id: 0,
              phone: 0
            });
          } catch (e) {
            console.log('Failed to create user', e);
          }
        }

        if (missingUsers.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        }
      }
    };

    syncUsers();
  }, [user, allUsers, allowedUsers, loadingUsers, loadingAllowed]);

  const isLoading = loadingUsers || loadingAllowed;

  // Get all assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: () => base44.entities.ClientAdvisorAssignment.list(),
    enabled: !!user,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientAdvisorAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId) => base44.entities.ClientAdvisorAssignment.delete(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
    },
  });

  const handleDeleteUser = async (u) => {
    if (!confirm(`האם למחוק את ${u.full_name || u.email}?`)) return;

    try {
      // Delete assignments first
      const userAssignments = await base44.entities.ClientAdvisorAssignment.filter({ client_email: u.email });
      for (const assignment of userAssignments) {
        await base44.entities.ClientAdvisorAssignment.delete(assignment.id);
      }

      // Delete from User entity
      if (u.id && !u.allowedUserId) {
        await base44.entities.User.delete(u.id);
      }

      // Delete from AllowedUser
      if (u.allowedUserId) {
        await base44.entities.AllowedUser.delete(u.allowedUserId);
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
    } catch (e) {
      console.error('Error deleting user:', e);
      alert('שגיאה במחיקת המשתמש');
    }
  };

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      // Create AllowedUser
      const allowedUser = await base44.entities.AllowedUser.create({
        email: data.email,
        full_name: data.full_name,
        user_type: 'client',
        advisor_id: 0,
        phone: 0
      });

      // Create User entity immediately
      const newUser = await base44.entities.User.create({
        email: data.email,
        full_name: data.full_name,
        user_type: 'client',
        advisor_id: 0,
        phone: 0
      });

      // Create assignment with the actual user ID
      await base44.entities.ClientAdvisorAssignment.create({
        client_id: newUser.id,
        client_email: data.email,
        client_name: data.full_name,
        advisor_id: data.advisor_id || user.id,
        advisor_email: user.email
      });

      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['advisorAssignments'] });
      setShowAddClientDialog(false);
      setNewClientName('');
      setNewClientEmail('');
    },
  });

  // Merge Users and AllowedUsers - show all allowed users
  const userEmails = new Set(allUsers.map(u => u.email));
  const allowedUsersNotInSystem = allowedUsers
    .filter(au => !userEmails.has(au.email))
    .map(au => ({
      id: au.id,
      email: au.email,
      full_name: au.full_name,
      user_type: au.user_type,
      allowedUserId: au.id,
      created_date: au.created_date
    }));

  const combinedUsers = [...allUsers, ...allowedUsersNotInSystem];

  const clients = combinedUsers.filter(u => u.user_type === 'client');
  const advisors = combinedUsers.filter(u => u.user_type === 'advisor' || u.user_type === 'admin');
  const admins = combinedUsers.filter(u => u.user_type === 'admin');

  // Filter by user type first
  let displayedUsers = combinedUsers;
  if (userFilter === 'clients') {
    displayedUsers = clients;
  } else if (userFilter === 'advisors') {
    displayedUsers = combinedUsers.filter(u => u.user_type === 'advisor');
  } else if (userFilter === 'admins') {
    displayedUsers = admins;
  } else if (userFilter === 'unassigned') {
    displayedUsers = unassignedClients;
  }

  // Then apply search filter
  const filteredUsers = displayedUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get advisor for a client from assignments (by ID or email)
  const getClientAssignment = (client) => {
    return assignments.find(a => a.client_id === client.id || a.client_email === client.email);
  };

  const handleChangeUserType = async (userId, allowedUserId, newType) => {
    // Update User entity
    if (userId) {
      await base44.entities.User.update(userId, { user_type: newType });
    }
    // Update AllowedUser
    if (allowedUserId) {
      await base44.entities.AllowedUser.update(allowedUserId, { user_type: newType });
    }
    queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
  };

  const handleAssignClient = async () => {
    if (selectedClient) {
      // Remove existing assignment first
      const existingAssignment = getClientAssignment(selectedClient);
      if (existingAssignment) {
        await deleteAssignmentMutation.mutateAsync(existingAssignment.id);
      }

      // Create new assignment if advisor selected
      if (selectedAdvisor && selectedAdvisor !== 'none') {
        const selectedAdvisorUser = advisors.find(a => a.id === selectedAdvisor);
        await createAssignmentMutation.mutateAsync({
          client_id: selectedClient.id,
          client_email: selectedClient.email,
          client_name: selectedClient.full_name || '',
          advisor_id: selectedAdvisor,
          advisor_email: selectedAdvisorUser?.email || ''
        });
      }

      setShowAssignDialog(false);
      setSelectedClient(null);
      setSelectedAdvisor('');
    }
  };

  const handleRemoveAdvisor = async (client) => {
    const existingAssignment = getClientAssignment(client);
    if (existingAssignment) {
      await deleteAssignmentMutation.mutateAsync(existingAssignment.id);
    }
  };

  const getAdvisorName = (client) => {
    const assignment = getClientAssignment(client);
    if (assignment) {
      const advisor = advisors.find(a => a.id === assignment.advisor_id);
      return advisor?.full_name || advisor?.email || assignment.advisor_email || 'לא משויך';
    }
    return 'לא משויך';
  };

  if (!user || user.user_type !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center border-0 shadow-2xl bg-white/90 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין גישה</h2>
          <p className="text-slate-500">עמוד זה זמין למנהלי מערכת בלבד</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-purple-700 to-indigo-700 bg-clip-text text-transparent">ניהול מערכת</h1>
            <p className="text-slate-500 mt-2 text-lg">ניהול משתמשים, הגדרת תפקידים ושיוך לקוחות ליועצים</p>
          </div>
          <Button 
            onClick={() => setShowAddClientDialog(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
          >
            <Users className="w-4 h-4 ml-2" />
            הוסף לקוח חדש
          </Button>
        </div>

        {/* Webhook URL Card */}
        <Card className="border-0 shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Webhook className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Webhook להוספת לקוחות אוטומטית</h3>
                <p className="text-sm text-slate-600 mb-3">
                  שלח בקשת POST לכתובת הבאה עם הנתונים: <code className="bg-slate-200 px-2 py-1 rounded text-xs">{"{ \"name\": \"שם הלקוח\", \"email\": \"email@example.com\" }"}</code>
                </p>
                <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-slate-200">
                  <code className="flex-1 text-sm text-slate-700 break-all">
                    {window.location.origin}/api/functions/addClientWebhook
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/functions/addClientWebhook`);
                      alert('הכתובת הועתקה ללוח!');
                    }}
                    className="text-indigo-600 hover:bg-indigo-50"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-xl shadow-purple-100/50 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">מנהלים</p>
                <p className="text-3xl font-bold text-slate-800">
                  {allUsers.filter(u => u.user_type === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-blue-100/50 bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">יועצים</p>
                <p className="text-3xl font-bold text-slate-800">{advisors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">לקוחות</p>
                <p className="text-3xl font-bold text-slate-800">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              onClick={() => setUserFilter('all')}
              variant={userFilter === 'all' ? 'default' : 'outline'}
              className={`rounded-xl ${userFilter === 'all' ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white' : 'border-slate-200 text-slate-600'}`}
            >
              <Users className="w-4 h-4 ml-2" />
              כולם ({allUsers.length})
            </Button>
            <Button
              onClick={() => setUserFilter('clients')}
              variant={userFilter === 'clients' ? 'default' : 'outline'}
              className={`rounded-xl ${userFilter === 'clients' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'border-emerald-200 text-emerald-600'}`}
            >
              <User className="w-4 h-4 ml-2" />
              לקוחות ({clients.length})
            </Button>
            <Button
              onClick={() => setUserFilter('advisors')}
              variant={userFilter === 'advisors' ? 'default' : 'outline'}
              className={`rounded-xl ${userFilter === 'advisors' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'border-blue-200 text-blue-600'}`}
            >
              <Briefcase className="w-4 h-4 ml-2" />
              יועצים ({allUsers.filter(u => u.user_type === 'advisor').length})
            </Button>
            <Button
              onClick={() => setUserFilter('admins')}
              variant={userFilter === 'admins' ? 'default' : 'outline'}
              className={`rounded-xl ${userFilter === 'admins' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' : 'border-purple-200 text-purple-600'}`}
            >
              <Shield className="w-4 h-4 ml-2" />
              מנהלים ({admins.length})
            </Button>
            <Button
              onClick={() => setUserFilter('unassigned')}
              variant={userFilter === 'unassigned' ? 'default' : 'outline'}
              className={`rounded-xl ${userFilter === 'unassigned' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'border-orange-200 text-orange-600'}`}
            >
              <Unlink className="w-4 h-4 ml-2" />
              ללא יועץ ({unassignedClients.length})
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש משתמש לפי שם או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12 py-6 text-lg border-slate-200 focus:border-indigo-400 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-indigo-100">
              <UserCog className="w-5 h-5 text-indigo-600" />
            </div>
            {userFilter === 'all' && `כל המשתמשים (${filteredUsers.length})`}
            {userFilter === 'clients' && `לקוחות (${filteredUsers.length})`}
            {userFilter === 'advisors' && `יועצים (${filteredUsers.length})`}
            {userFilter === 'admins' && `מנהלים (${filteredUsers.length})`}
            {userFilter === 'unassigned' && `לקוחות ללא יועץ (${filteredUsers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-right font-semibold text-slate-600">שם</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">אימייל</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">תפקיד</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">יועץ משויך</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">תאריך הצטרפות</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-semibold text-slate-800">
                      {u.full_name || 'ללא שם'}
                    </TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell>
                      <Select 
                        value={u.user_type} 
                        onValueChange={(newType) => handleChangeUserType(u.id, u.allowedUserId, newType)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">לקוח</SelectItem>
                          <SelectItem value="advisor">יועץ</SelectItem>
                          <SelectItem value="admin">מנהל</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.user_type === 'client' ? (
                        getClientAssignment(u) ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 px-3 py-1">
                              <Check className="w-3 h-3 ml-1" />
                              {getAdvisorName(u)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const assignment = getClientAssignment(u);
                                if (assignment) {
                                  await deleteAssignmentMutation.mutateAsync(assignment.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                            <X className="w-3 h-3 ml-1" />
                            לא משויך
                          </Badge>
                        )
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(u.created_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditUser(u);
                            setEditName(u.full_name || '');
                            setEditEmail(u.email || '');
                            setShowEditDialog(true);
                          }}
                          className="border-[#105330]/30 text-[#105330] hover:bg-[#105330]/10 rounded-xl"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {u.user_type === 'client' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(u);
                              const assignment = getClientAssignment(u);
                              setSelectedAdvisor(assignment?.advisor_id || 'none');
                              setShowAssignDialog(true);
                            }}
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Link2 className="w-4 h-4 ml-1" />
                            {getClientAssignment(u) ? 'החלף יועץ' : 'שייך ליועץ'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(u)}
                          className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Client Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">שיוך לקוח ליועץ</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-slate-600 mb-4">
              שיוך הלקוח <strong className="text-slate-800">{selectedClient?.full_name || selectedClient?.email}</strong> ליועץ:
            </p>
            <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
              <SelectTrigger className="border-slate-200 rounded-xl py-6">
                <SelectValue placeholder="בחר יועץ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא יועץ (הסר שיוך)</SelectItem>
                {advisors.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.full_name || advisor.email} {advisor.user_type === 'admin' && '(מנהל)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)} className="rounded-xl border-slate-200">
              ביטול
            </Button>
            <Button 
              onClick={handleAssignClient}
              className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] rounded-xl shadow-lg"
            >
              {selectedAdvisor === 'none' ? 'הסר שיוך' : 'שייך לקוח'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setSaveSuccess(false);
      }}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">עריכת פרטי משתמש</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">שם מלא</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-[#105330]/30 rounded-xl py-6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">אימייל</Label>
              <Input
                value={editEmail}
                disabled
                className="border-[#105330]/30 rounded-xl py-6 bg-slate-100 text-slate-500"
              />
              <p className="text-xs text-slate-400">לא ניתן לשנות אימייל</p>
            </div>
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium text-center">
                ✓ הפרטים נשמרו בהצלחה
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl border-slate-200">
              סגור
            </Button>
            <Button 
              onClick={async () => {
                if (editUser.allowedUserId) {
                  // Update AllowedUser
                  await base44.entities.AllowedUser.update(editUser.allowedUserId, { full_name: editName });
                }
                setSaveSuccess(true);
                queryClient.invalidateQueries({ queryKey: ['allUsers'] });
                queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
              }}
              disabled={updateUserMutation.isPending}
              className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] rounded-xl shadow-lg"
            >
              {updateUserMutation.isPending ? 'שומר...' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">הוספת לקוח חדש</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">שם מלא</Label>
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="הזן שם מלא"
                className="border-[#105330]/30 rounded-xl py-6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">אימייל</Label>
              <Input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="הזן אימייל"
                className="border-[#105330]/30 rounded-xl py-6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#105330] font-semibold">שיוך ליועץ</Label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger className="border-[#105330]/30 rounded-xl py-6">
                  <SelectValue placeholder="בחר יועץ" />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.full_name || advisor.email} {advisor.user_type === 'admin' && '(מנהל)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClientDialog(false)} className="rounded-xl border-slate-200">
              ביטול
            </Button>
            <Button 
              onClick={() => {
                if (newClientName && newClientEmail && selectedAdvisor) {
                  createClientMutation.mutate({
                    full_name: newClientName,
                    email: newClientEmail,
                    user_type: 'client',
                    advisor_id: selectedAdvisor
                  });
                }
              }}
              disabled={!newClientName || !newClientEmail || !selectedAdvisor || createClientMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-lg"
            >
              {createClientMutation.isPending ? 'יוצר...' : 'הוסף לקוח'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}