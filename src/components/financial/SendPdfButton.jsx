import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { htmlToPdfBase64 } from '@/lib/pdfFromHtml';

// Advisor / admin only: renders the current document to PDF and sends it together
// with the client's email to the advisor automation webhook.
export default function SendPdfButton({ buildHtml, filename, clientEmail }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setStatus('sending');
    setError('');
    try {
      const pdf_base64 = await htmlToPdfBase64(buildHtml());
      const response = await base44.functions.invoke('sendPdfToWebhook', {
        email: clientEmail,
        filename,
        pdf_base64,
      });
      if (response?.data?.success) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(response?.data?.error || 'השליחה נכשלה');
      }
    } catch (e) {
      setStatus('error');
      setError(e?.response?.data?.error || e?.message || 'השליחה נכשלה');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={handleSend}
        disabled={status === 'sending'}
        variant="outline"
        className="border-[#105330] text-[#105330] hover:bg-[#105330]/5 font-semibold"
      >
        {status === 'sending'
          ? <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          : <FileDown className="w-4 h-4 ml-2" />}
        {status === 'sending' ? 'שולח PDF...' : 'שליחת PDF'}
      </Button>
      {status === 'sent' && (
        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          הקובץ נשלח בהצלחה
        </span>
      )}
      {status === 'error' && (
        <span className="text-sm text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </span>
      )}
    </div>
  );
}