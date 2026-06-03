import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PensionManager from '../components/investments/PensionManager';

export default function Pension() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    try {
      const c = JSON.parse(sessionStorage.getItem('viewingClient') || '{}');
      if (c.id) setViewingClientId(c.id);
    } catch {}
  }, []);

  const userId = viewingClientId || user?.id;

  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#105330]">פנסיוני</h1>
        <p className="text-[#105330]/70 text-sm mt-1">ניהול קרנות פנסיה וקרן השתלמות</p>
      </div>
      <PensionManager userId={userId} />
    </div>
  );
}