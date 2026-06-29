import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function Landing() {
  useEffect(() => {
    base44.auth.redirectToLogin('/Home');
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] flex items-center justify-center mx-auto mb-5 shadow-lg">
              <span className="text-white text-2xl font-bold">צ</span>
            </div>
            <p className="text-xs font-semibold text-[#c8a863] uppercase tracking-widest mb-2">מערכת פרימיום לניהול כסף</p>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">צעירים מתעשרים</h1>
            <p className="text-slate-500 text-sm mt-4">מעביר לדף ההתחברות...</p>
            <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin mx-auto mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}