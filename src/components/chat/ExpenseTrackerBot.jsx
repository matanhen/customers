import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Connect only from the client's own signed-in browser session.
export default function ExpenseTrackerBot() {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate('/WhatsAppConnect')}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      <MessageCircle className="w-4 h-4 ml-2" />
      עדכן הוצאות בווצאפ
    </Button>
  );
}