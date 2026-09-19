import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function PhoneBulkUpdate() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type !== 'application/pdf') {
      setError('נא להעלות קובץ PDF בלבד');
      return;
    }
    setError('');
    setFile(f);
    setResult(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      // Upload the PDF file
      const uploadRes = await base44.integrations.Core.UploadPublicFile({ file });
      const fileUrl = uploadRes.file_url;

      // Call the backend function to process the file
      const res = await base44.functions.invoke('updatePhonesFromPDF', { file_url: fileUrl });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setResult(res.data);
      }
    } catch (e) {
      setError(e.message || 'שגיאה בעיבוד הקובץ');
    }
    setProcessing(false);
  };

  return (
    <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-xl bg-indigo-100">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
          </div>
          עדכון טלפונים מקובץ PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <p className="text-sm text-slate-500">
          העלה קובץ PDF המכיל כתובות אימייל ומספרי טלפון של לקוחות. המערכת תזהה לקוחות קיימים לפי האימייל ותעדכן את מספר הטלפון שלהם.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <Label className="text-[#105330] font-semibold mb-2 block">בחר קובץ PDF</Label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-xl file:border-0 file:bg-[#105330] file:px-4 file:py-2.5 file:text-white file:font-medium file:cursor-pointer hover:file:bg-[#0d4027] cursor-pointer"
            />
          </div>
          <Button
            onClick={handleProcess}
            disabled={!file || processing}
            className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] rounded-xl shadow-lg sm:mt-7"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> מעבד...</>
            ) : (
              <><FileText className="w-4 h-4 ml-2" /> עדכן טלפונים</>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle className="w-5 h-5" />
              עודכנו {result.updated} מתוך {result.total} אנשי קשר
            </div>
            {result.notFound > 0 && (
              <p className="text-sm text-amber-600">{result.notFound} אימיילים לא נמצאו במערכת</p>
            )}
            {result.results?.filter(r => r.status === 'updated').length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {result.results.filter(r => r.status === 'updated').map((r, i) => (
                  <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    {r.name || r.email} → {r.phone}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}