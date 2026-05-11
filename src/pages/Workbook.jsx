import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import WorkbookPage from '../components/workbook/WorkbookPage';

export default function Workbook() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [viewerEmail, setViewerEmail] = useState(null);

  useEffect(() => {
    loadUser();
    const clientData = sessionStorage.getItem('viewingClient');
    if (clientData) {
      try {
        const client = JSON.parse(clientData);
        setViewingClientId(client.id);
      } catch (e) {}
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setViewerEmail(currentUser.email);
    } catch (e) {}
  };

  const effectiveUserId = viewingClientId || user?.id;

  if (!effectiveUserId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]" dir="rtl">
        <div className="w-8 h-8 border-4 border-[#105330] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkbookPage userId={effectiveUserId} viewerEmail={viewerEmail} />
  );
}