import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AGENT_NAME = 'expense_tracker';

// A single button that opens the WhatsApp expense bot connect link.
// Visible to every user (client / advisor / admin), including when an advisor
// or admin is viewing a client — the link is the agent's WhatsApp number.
export default function ExpenseTrackerBot() {
  const [whatsappUrl, setWhatsappUrl] = useState('');

  useEffect(() => {
    try {
      const url = base44.agents.getWhatsAppConnectURL(AGENT_NAME);
      if (url) setWhatsappUrl(url);
    } catch (e) { /* agent may not be published yet */ }
  }, []);

  if (!whatsappUrl) return null;

  return (
    <Button
      onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <MessageCircle className="w-4 h-4 ml-2" />
      עדכן הוצאות בווצאפ
    </Button>
  );
}