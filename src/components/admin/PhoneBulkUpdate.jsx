import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function PhoneBulkUpdate() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);
  const [addResult, setAddResult] = useState(null);
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
    setAddResult(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setResult(null);
    setAddResult(null);

    try {
      const uploadRes = await base44.integrations.Core.UploadPublicFile({ file });
      const fileUrl = uploadRes.file_url;

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

  const handleAddMissing = async () => {
    if (!result?.notFoundClients || result.notFoundClients.length === 0) return;
    setAdding(true);
    try {
      const res = await base44.functions.invoke('addMissingClients', {
        clients: result.notFoundClients,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setAddResult(res.data);
      }
    } catch (e) {
      setError(e.message || 'שגיאה בהוספת לקוחות');
    }
    setAdding(false);
  };

  return (
    <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-xl bg-indigo-100">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
          </div>
          עדכון פרטי לקוחות מקובץ PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <p className="text-sm text-slate-500">
          העלה קובץ PDF עם עמודות: שם, אימייל, טלפון, ושם יועץ (אופציונלי). המערכת תזהה לקוחות קיימים לפי האימייל ותעדכן את השם, הטלפון והיועץ המשויך. לקוחות שלא קיימים יוצגו עם אפשרות להוסיפם.
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
              <><FileText className="w-4 h-4 ml-2" /> עדכן פרטים</>
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
          <div className="space-y-3">
            {/* Summary */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              result.failed > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className={`w-5 h-5 ${result.failed > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                <span className={result.failed > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  עודכנו {result.updated} מתוך {result.total} אנשי קשר
                </span>
              </div>
              {result.notFound > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {result.notFound} לקוחות לא קיימים במערכת
                </p>
              )}
              {result.failed > 0 && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {result.failed} לקוחות לא הועלו בהצלחה
                </p>
              )}
            </div>

            {/* Failed details */}
            {result.failed > 0 && result.results?.filter(r => r.status === 'failed').length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-semibold text-red-700 mb-2">לקוחות שנכשלו:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.results.filter(r => r.status === 'failed').map((r, i) => (
                    <div key={i} className="text-xs text-red-600 flex items-center gap-2">
                      <XCircle className="w-3 h-3 shrink-0" />
                      {r.name || r.email || 'לא ידוע'} - {r.error || 'שגיאה'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Updated details */}
            {result.results?.filter(r => r.status === 'updated').length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm font-semibold text-emerald-700 mb-2">לקוחות שעודכנו בהצלחה:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.results.filter(r => r.status === 'updated').map((r, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      {r.name || r.email} → {r.phone}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not found clients - option to add */}
            {result.notFound > 0 && result.notFoundClients?.length > 0 && !addResult && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                  <AlertTriangle className="w-5 h-5" />
                  {result.notFound} לקוחות מהקובץ לא קיימים באפליקציה
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.notFoundClients.map((c, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-medium">{c.name || 'ללא שם'}</span>
                      {c.email && <span className="text-slate-400">• {c.email}</span>}
                      {c.phone && <span className="text-slate-400">• {c.phone}</span>}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-blue-600 font-medium">תרצה להוסיף אותם או שלא?</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddMissing}
                    disabled={adding}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-lg"
                  >
                    {adding ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> מוסיף...</>
                    ) : (
                      <><UserPlus className="w-4 h-4 ml-2" /> כן, הוסף את כולם</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Add result */}
            {addResult && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                addResult.failed > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle className={`w-5 h-5 ${addResult.failed > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                  <span className={addResult.failed > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                    נוספו {addResult.added} לקוחות חדשים
                  </span>
                </div>
                {addResult.failed > 0 && (
                  <p className="text-sm text-red-600">{addResult.failed} לקוחות לא התווספו בהצלחה</p>
                )}
                {addResult.results?.filter(r => r.status === 'failed').length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                    {addResult.results.filter(r => r.status === 'failed').map((r, i) => (
                      <div key={i} className="text-xs text-red-600 flex items-center gap-2">
                        <XCircle className="w-3 h-3 shrink-0" />
                        {r.name || r.email} - {r.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}