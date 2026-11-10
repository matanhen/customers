import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const REMEMBERED_EMAIL_KEY = 'remembered_email';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''; } catch (e) { return ''; }
  });
  const [autoLogin, setAutoLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Fetch admin-uploaded logo (public endpoint, no auth required)
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const result = await base44.functions.invoke('getSiteLogo', {});
        if (result?.data?.logo_url) {
          setLogoUrl(result.data.logo_url);
        }
      } catch (e) {
        // ignore — landing still works without logo
      }
    };
    loadLogo();
  }, []);

  // Returning users: recognize the device and go straight in, no email typing.
  useEffect(() => {
    if (isAuthenticated) return;
    let remembered = '';
    try { remembered = (localStorage.getItem(REMEMBERED_EMAIL_KEY) || '').trim(); } catch (e) { return; }
    const alreadyTried = sessionStorage.getItem('auto_login_attempted') === 'true';
    if (!remembered || alreadyTried) return;

    setAutoLogin(true);
    base44.functions.invoke('checkEmailAllowed', { email: remembered })
      .then((result) => {
        if (!result?.data?.allowed) {
          try { localStorage.removeItem(REMEMBERED_EMAIL_KEY); } catch (e) { /* ignore */ }
          setEmail('');
          setAutoLogin(false);
          return;
        }
        sessionStorage.setItem('auto_login_attempted', 'true');
        base44.auth.redirectToLogin('/Home');
      })
      .catch(() => setAutoLogin(false));
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const result = await base44.functions.invoke('checkEmailAllowed', { email: email.trim() });
      
      if (!result.data?.allowed) {
        setError('הכניסה למשתמשים רשומים בלבד. האימייל שהזנת אינו רשום במערכת.');
        setLoading(false);
        return;
      }

      try { localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim()); } catch (e) { /* ignore */ }
      const returnTo = window.location.pathname === '/WhatsAppConnect'
        ? window.location.href
        : '/Home';
      base44.auth.redirectToLogin(returnTo);
    } catch (e) {
      setError('אירעה שגיאה. אנא נסה שוב.');
      setLoading(false);
    }
  };

  // Already signed in on this device — straight into the app.
  if (isAuthenticated) return <Navigate to="/Home" replace />;

  if (autoLogin) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#fcf8ee] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#105330] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#105330] font-semibold">מזהה אותך ומתחבר...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#fcf8ee] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
          <div className="p-10">
            <div className="text-center mb-8">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="לוגו"
                  className="w-20 h-20 object-contain rounded-2xl mx-auto mb-5 shadow-sm"
                />
              )}
              <p className="text-lg font-bold text-[#105330] uppercase tracking-widest mb-2">מערכת פרימיום לניהול כסף</p>
              <p className="text-slate-500 text-sm">ברוכים הבאים</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-slate-700 font-semibold text-center mb-4">התחבר לחשבון שלך</p>
                <Input
                  type="email"
                  placeholder="כתובת אימייל"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="text-right h-12 rounded-xl border-slate-200 focus:border-[#105330] focus:ring-[#105330] text-black"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={loading || !email.trim()}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] text-white font-semibold text-base shadow-lg"
              >
                {loading ? 'בודק...' : 'כניסה למערכת'}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          © {new Date().getFullYear()} צעירים מתעשרים. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  );
}