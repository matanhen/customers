import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Copy, Loader2 } from 'lucide-react';

// Copies a client's personal WhatsApp link (with their personal code) to the
// clipboard in a single click. Works for every client — including clients that
// registered but have not logged in yet.
export default function CopyPersonalLinkButton({ client, className = '' }) {
  const [state, setState] = useState('idle'); // idle | loading | copied

  const handleCopy = async () => {
    if (!client?.id && !client?.email) return;
    setState('loading');
    try {
      const res = await base44.functions.invoke('getUserWhatsappLink', {
        user_id: client.id || '',
        email: client.email || '',
      });
      const link = res?.data?.link;
      if (!link) throw new Error('link not available');
      try {
        await navigator.clipboard.writeText(link);
      } catch (e) {
        const el = document.createElement('textarea');
        el.value = link;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      console.error('Failed to copy WhatsApp link', e);
      setState('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === 'loading'}
      title="העתקת הקישור האישי של הלקוח"
      className={`inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 ${className}`}
    >
      {state === 'loading' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : state === 'copied' ? (
        <Check className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {state === 'copied' ? 'הועתק!' : 'העתק קישור'}
    </button>
  );
}