import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function WhatsAppConnectionSteps({ personalCode }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const openWhatsApp = () => {
    setError('');
    try {
      const link = base44.agents.getWhatsAppConnectURL('expense_tracker');
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch {
      setError('לא ניתן לפתוח את החיבור כרגע. נסה שוב.');
    }
  };
  const copyCode = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(`קוד אישי : ${personalCode}`);
      setCopied(true);
    } catch {
      setError('לא ניתן להעתיק אוטומטית. אפשר לסמן ולהעתיק את הקוד שמופיע כאן.');
    }
  };
  return <div className="space-y-6">
    <div className="space-y-3">
      <h2 className="font-semibold">1. חיבור לאפליקציה</h2>
      <p className="text-sm text-muted-foreground">לחץ על הכפתור כדי לפתוח הודעת הפעלה חדשה בווטסאפ, ושלח אותה כפי שהיא, ללא שינוי וללא הוספת הקוד האישי.</p>
      <p className="text-xs font-medium text-destructive">אין לשלוח הודעת הפתיחה הישנה — היא פגה תוקף והבוט לא יזהה אותה.</p>
      <Button onClick={openWhatsApp} className="w-full">פתח חיבור רשמי בווטסאפ</Button>
    </div>
    <div className="space-y-3">
      <h2 className="font-semibold">2. זיהוי הלקוח</h2>
      <p className="text-sm text-muted-foreground">רק אחרי שהבוט אישר את החיבור, שלח באותה שיחה את הקוד האישי:</p>
      <p className="select-text rounded-lg border bg-muted p-3 font-mono text-lg" dir="rtl">קוד אישי : <span dir="ltr">{personalCode}</span></p>
      <Button variant="outline" onClick={copyCode} className="w-full">{copied ? 'הועתק, יש להדביק בשיחה עם הבוט' : 'העתק קוד אישי'}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}