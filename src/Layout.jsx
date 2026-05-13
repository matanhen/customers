import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
        Home, TrendingUp, PiggyBank, Target, Calendar,
        Menu, X, LogOut, Users, UserCog, ChevronRight, User, Settings, Save, GraduationCap, BookOpen
      } from 'lucide-react';
import FinancialAdvisor from './components/chat/FinancialAdvisor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Layout({ children }) {
  const location = useLocation();
  const currentPageName = location.pathname.replace('/', '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always load viewingClient from sessionStorage
    try {
      const clientData = sessionStorage.getItem('viewingClient');
      if (clientData) {
        setViewingClient(JSON.parse(clientData));
      }
    } catch (e) {
      sessionStorage.removeItem('viewingClient');
    }

    // Check cache first
    try {
      const cachedUser = sessionStorage.getItem('currentUser');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        // Use cached user if less than 5 minutes old
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          setUser(parsed.user);
          setEditName(parsed.user.full_name || '');
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      sessionStorage.removeItem('currentUser');
    }

    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      let currentUser = await base44.auth.me();
      
      // Update last login date only once per session
      try {
        const lastUpdate = sessionStorage.getItem('lastLoginUpdate');
        if (!lastUpdate || Date.now() - parseInt(lastUpdate) > 60 * 60 * 1000) {
          await base44.entities.User.update(currentUser.id, { 
            last_login_date: new Date().toISOString() 
          });
          sessionStorage.setItem('lastLoginUpdate', Date.now().toString());
        }
      } catch (e) { /* non-critical */ }
      
      // If user already has a valid user_type - use immediately (fast path)
      if (currentUser.user_type && ['client', 'advisor', 'admin'].includes(currentUser.user_type)) {
        setUser(currentUser);
        setEditName(currentUser.full_name || '');
        try {
          sessionStorage.setItem('currentUser', JSON.stringify({ user: currentUser, timestamp: Date.now() }));
        } catch (e) { /* storage full */ }
        setIsLoading(false);

        // Background sync: check if AllowedUser changed role
        try {
          const allowedUsers = await base44.entities.AllowedUser.filter({ email: currentUser.email });
          const allowedUserType = allowedUsers[0]?.user_type;
          if (allowedUserType && allowedUserType !== currentUser.user_type) {
            await base44.entities.User.update(currentUser.id, { user_type: allowedUserType });
            const updated = await base44.auth.me();
            setUser(updated);
            try {
              sessionStorage.setItem('currentUser', JSON.stringify({ user: updated, timestamp: Date.now() }));
            } catch (e) { /* storage full */ }
          }
        } catch (e) { /* non-critical background sync */ }
        return;
      }
      
      // New user - check AllowedUser
      let allowedUsers = [];
      try {
        allowedUsers = await base44.entities.AllowedUser.filter({ email: currentUser.email });
      } catch (e) { /* continue */ }

      if (allowedUsers.length === 0) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }
      
      // Found in AllowedUser - update user_type
      const allowedUser = allowedUsers[0];
      try {
        await base44.entities.User.update(currentUser.id, { 
          user_type: allowedUser.user_type,
          full_name: currentUser.full_name || allowedUser.full_name || ''
        });
        
        // Update ClientAdvisorAssignment in background
        base44.entities.ClientAdvisorAssignment.filter({ client_email: currentUser.email })
          .then(assignments => {
            assignments.forEach(assignment => {
              if (!assignment.client_id || assignment.client_id === '') {
                base44.entities.ClientAdvisorAssignment.update(assignment.id, {
                  client_id: currentUser.id
                }).catch(() => {});
              }
            });
          }).catch(() => {});
        
        currentUser = await base44.auth.me();
      } catch (updateError) {
        console.log('Failed to update user type', updateError);
      }
      
      setUser(currentUser);
      setEditName(currentUser.full_name || '');
      try {
        sessionStorage.setItem('currentUser', JSON.stringify({ user: currentUser, timestamp: Date.now() }));
      } catch (e) { /* storage full */ }
      setIsLoading(false);
    } catch (e) {
      console.log('Error loading user', e);
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      // Update user entity in database
      await base44.entities.User.update(user.id, { full_name: editName });
      const updatedUser = { ...user, full_name: editName };
      setUser(updatedUser);
      sessionStorage.setItem('currentUser', JSON.stringify({ user: updatedUser, timestamp: Date.now() }));
      setShowProfileDialog(false);
    } catch (e) {
      console.error('Failed to update profile', e);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('viewingClient');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('lastLoginUpdate');
    base44.auth.logout();
  };

  const exitClientView = () => {
    sessionStorage.removeItem('viewingClient');
    setViewingClient(null);
    window.location.href = createPageUrl('AdvisorDashboard');
  };

  const goBack = () => {
    window.history.back();
  };

  const isAdvisor = user?.user_type === 'advisor';
  const isAdmin = user?.user_type === 'admin';

  const getUserRoleLabel = () => {
    if (isAdmin) return 'מנהל';
    if (isAdvisor) return 'יועץ';
    return 'לקוח';
  };

  const menuItems = [
    { name: 'דף הבית', page: 'Home', icon: Home },
    { name: 'התנהלות כלכלית', page: 'FinancialManagement', icon: PiggyBank },
    { name: 'השקעות', page: 'Investments', icon: TrendingUp },
    { name: 'תכנון חופש כלכלי', page: 'FinancialFreedom', icon: Target },
    { name: 'קביעת פגישה', page: 'Appointments', icon: Calendar },
    { name: 'חוברת עבודה', page: 'Workbook', icon: BookOpen },
    { name: 'האקדמיה', externalUrl: 'https://academy.matanhen.com', icon: GraduationCap },
  ];

  const ADVISOR_ONLY_EMAILS = ['nivdavid7@gmail.com', 'idanhen@gmail.com'];
  const isAdvisorOnlyUser = user?.email && ADVISOR_ONLY_EMAILS.includes(user.email.toLowerCase());

  if (isAdvisor || isAdmin) {
    menuItems.push({ name: 'דשבורד יועץ', page: 'AdvisorDashboard', icon: Users });
  }

  if (isAdmin && !isAdvisorOnlyUser) {
    menuItems.push({ name: 'ניהול מערכת', page: 'AdminDashboard', icon: UserCog });
  }

  // Show loading screen
  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#105330] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#105330] font-semibold">טוען...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized screen if user is not registered
  if (isUnauthorized) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-red-200">
            <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-3">הכניסה ללקוחות בלבד</h1>
              <p className="text-slate-600 mb-8 leading-relaxed">
                אתה לא רשום במערכת. רק לקוחות רשומים יכולים להיכנס לאפליקציה.
                <br />
                אנא פנה למנהל המערכת להוספתך כלקוח.
              </p>
              <Button
                onClick={async () => {
                  await base44.auth.logout();
                  window.location.reload();
                }}
                className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] shadow-lg px-8 py-6 text-lg rounded-xl"
              >
                <LogOut className="w-5 h-5 ml-2" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef]">
      <style>{`
        :root {
          --primary: #105330;
          --primary-light: #1a7a4a;
          --accent: #c8a863;
          --accent-light: #d4b87a;
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: #105330 transparent;
        }
        
        *::-webkit-scrollbar {
          width: 6px;
        }
        
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
          background-color: #105330;
          border-radius: 20px;
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#105330] via-[#0d4027] to-[#105330] shadow-2xl">
        <div className="max-w-7xl mx-auto">
          {/* Main Nav Row */}
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                צעירים מתעשרים
              </h1>
              {/* Academy Button - Mobile */}
              <a
                href="https://academy.matanhen.com"
                target="_blank"
                rel="noopener noreferrer"
                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 font-medium bg-[#1f9d47] text-white shadow-lg hover:bg-[#1a8a3f]"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-sm">האקדמיה</span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;

                if (item.externalUrl) {
                  return (
                    <a
                      key={item.name}
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium bg-[#1f9d47] text-white shadow-lg hover:bg-[#1a8a3f]"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium
                      ${isActive 
                        ? 'bg-[#c8a863] text-[#105330] shadow-lg' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Actions */}
            <div className="flex items-center gap-4">
              {user && (
                <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                  <DialogTrigger asChild>
                    <button className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
                      <div className="p-2 rounded-lg bg-[#c8a863]">
                        <User className="w-4 h-4 text-[#105330]" />
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-sm">{user.full_name || user.email}</p>
                        <p className="text-[#c8a863] text-xs font-medium">{getUserRoleLabel()}</p>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent dir="rtl">
                    <DialogHeader>
                      <DialogTitle>עריכת פרטים אישיים</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>שם מלא</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="הזן שם מלא"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>אימייל</Label>
                        <Input value={user.email} disabled className="bg-gray-100" />
                      </div>
                      <div className="space-y-2">
                        <Label>תפקיד</Label>
                        <Input value={getUserRoleLabel()} disabled className="bg-gray-100" />
                      </div>
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={saving}
                        className="w-full bg-[#105330] hover:bg-[#0d4027]"
                      >
                        <Save className="w-4 h-4 ml-2" />
                        {saving ? 'שומר...' : 'שמור שינויים'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white/80 hover:text-white hover:bg-red-500/20 rounded-xl"
              >
                <LogOut className="w-4 h-4 lg:ml-2" />
                <span className="hidden lg:inline">יציאה</span>
              </Button>
              
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Client View Banner */}
          {viewingClient && (
            <div className="px-4 lg:px-8 py-2.5 bg-[#c8a863] flex items-center justify-between border-t border-[#b8943d]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#105330] animate-pulse" />
                <span className="text-[#105330] font-bold text-sm">
                  👁️ צופה בלקוח: {viewingClient.full_name}
                </span>
                {viewingClient.email && (
                  <span className="text-[#105330]/70 text-xs hidden sm:inline">({viewingClient.email})</span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exitClientView}
                className="text-[#105330] hover:bg-[#105330]/10 rounded-lg text-sm font-semibold"
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                חזרה לדשבורד
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0d4027] border-t border-white/10">
            <div className="px-4 py-4 space-y-2">
              {/* Mobile User Info */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl mb-4">
                  <div className="p-2 rounded-lg bg-[#c8a863]">
                    <User className="w-4 h-4 text-[#105330]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{user.full_name || user.email}</p>
                    <p className="text-[#c8a863] text-xs font-medium">{getUserRoleLabel()}</p>
                  </div>
                </div>
              )}
              
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;

                if (item.externalUrl) {
                  return (
                    <a
                      key={item.name}
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-[#1f9d47] text-white shadow-lg hover:bg-[#1a8a3f]"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isActive 
                        ? 'bg-[#c8a863] text-[#105330]' 
                        : 'text-white/80 hover:bg-white/10'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`${viewingClient ? 'pt-28' : 'pt-20'} min-h-screen`}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>

      {/* Floating AI Financial Advisor */}
      <FinancialAdvisor />
    </div>
  );

}