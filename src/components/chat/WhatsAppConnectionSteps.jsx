import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function WhatsAppConnectionSteps({ personalCode, link }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const openWhatsApp = () => {
    setError('');
    try {
      // The personal link already carries the activation message with the
      // client's personal code — it opens the conversation directly.
      const target = link || base44.agents.getWhatsAppConnectURL('expense_tracker');
      window.open(target, '_blank', 'noopener,noreferrer');
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
      <h2 className="font-semibold">1. חיבור לבוט בווטסאפ</h2>
      <p className="text-sm text-muted-foreground">לחץ על הכפתור — ווטסאפ ייפתח עם הודעת הפתיחה והקוד האישי שלך. שלח אותה כפי שהיא.</p>
      <Button onClick={openWhatsApp} className="w-full bg-blue-600 hover:bg-blue-700 text-white">פתח שיחה בווטסאפ</Button>
    </div>
    <div className="space-y-3">
      <h2 className="font-semibold">2. אם הבוט לא זיהה אותך</h2>
      <p className="text-sm text-muted-foreground">שלח באותה שיחה את הקוד האישי:</p>
      <p className="select-text rounded-lg border bg-muted p-3 font-mono text-lg" dir="rtl">קוד אישי : <span dir="ltr">{personalCode}</span></p>
      <Button onClick={copyCode} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{copied ? 'הועתק, יש להדביק בשיחה עם הבוט' : 'העתק קוד אישי'}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}