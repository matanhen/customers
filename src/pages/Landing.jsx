import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Landing() {
  const [email, setEmail] = useState('');
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

      base44.auth.redirectToLogin('/Home');
    } catch (e) {
      setError('אירעה שגיאה. אנא נסה שוב.');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center p-4">
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
                  className="text-right h-12 rounded-xl border-slate-200 focus:border-[#105330] focus:ring-[#105330]"
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