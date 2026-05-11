import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const allowedUsers = await base44.entities.AllowedUser.filter({ email: email.trim().toLowerCase() });

      if (allowedUsers.length === 0) {
        setError('הכניסה ללקוחות בלבד. האימייל שהזנת אינו רשום במערכת.');
        setLoading(false);
        return;
      }

      base44.auth.redirectToLogin(`/Home?email=${encodeURIComponent(email.trim())}`);
    } catch (e) {
      setError('אירעה שגיאה. אנא נסה שוב.');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Green header stripe */}
          <div className="h-2 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />

          <div className="p-10">
            {/* Logo / Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] flex items-center justify-center mx-auto mb-5 shadow-lg">
                <span className="text-white text-2xl font-bold">צ</span>
              </div>
              <p className="text-xs font-semibold text-[#c8a863] uppercase tracking-widest mb-2">מערכת פרימיום לניהול כסף</p>
              <h1 className="text-3xl font-bold text-slate-800 mb-1">צעירים מתעשרים</h1>
              <p className="text-slate-500 text-sm">ברוכים הבאים</p>
            </div>

            {/* Form */}
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