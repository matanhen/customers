import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import WhatsAppConnectionSteps from '@/components/chat/WhatsAppConnectionSteps';

export default function WhatsAppConnect() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = (urlParams.get('client') || '').trim().toLowerCase();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const me = await base44.auth.me();
        if (targetEmail && me.email?.trim().toLowerCase() !== targetEmail) {
          if (active) setState({ mismatch: true });
          return;
        }
        const response = await base44.functions.invoke('getUserWhatsappLink', { email: me.email });
        if (!response.data?.personal_code) throw new Error('לא ניתן לטעון את הקוד האישי.');
        if (active) setState({ code: response.data.personal_code });
      } catch (error) {
        const status = error?.status || error?.response?.status;
        if (status === 401) base44.auth.redirectToLogin(window.location.href);
        else if (active) setState({ error: error.message || 'לא ניתן לטעון את החיבור.' });
      } finally {
        if (active) setState(current => ({ ...current, loading: false }));
      }
    };
    load();
    return () => { active = false; };
  }, [targetEmail]);
  return <section dir="rtl" className="mx-auto max-w-lg rounded-xl border bg-card p-6 text-card-foreground space-y-5">
    <h1 className="text-2xl font-bold">חיבור לבוט בווטסאפ</h1>
    {state.loading ? <p role="status">טוען את פרטי החיבור...</p> : state.mismatch ? <>
      <p>הקישור מיועד לחשבון <b dir="ltr">{targetEmail}</b>. יש לפתוח אותו מחשבון הלקוח, ולא מחשבון היועץ.</p>
      <Button onClick={() => { sessionStorage.removeItem('currentUser'); sessionStorage.removeItem('viewingClient'); base44.auth.logout(window.location.href); }}>התחבר לחשבון הלקוח</Button>
    </> : state.error ? <p role="alert" className="text-destructive">{state.error}</p> : <WhatsAppConnectionSteps personalCode={state.code} />}
  </section>;
}