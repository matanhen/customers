import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, X, ImagePlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LogoUploader() {
  const [logoUrl, setLogoUrl] = useState('');
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const recs = await base44.entities.SiteSettings.filter({ key: 'logo' });
        if (recs && recs[0]) {
          setLogoUrl(recs[0].logo_url || '');
          setRecordId(recs[0].id);
        }
      } catch (e) {
        console.error('Failed to load logo', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url;
      if (!url) throw new Error('No file_url returned');
      if (recordId) {
        await base44.entities.SiteSettings.update(recordId, { logo_url: url });
      } else {
        const created = await base44.entities.SiteSettings.create({ key: 'logo', logo_url: url });
        setRecordId(created.id);
      }
      setLogoUrl(url);
    } catch (e) {
      console.error('Upload failed', e);
      setError('העלאת התמונה נכשלה. נסה שוב.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!recordId) return;
    try {
      await base44.entities.SiteSettings.update(recordId, { logo_url: '' });
      setLogoUrl('');
    } catch (e) {
      console.error('Remove failed', e);
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-white/90 backdrop-blur-xl mb-6 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] shadow-lg shadow-emerald-500/30">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">לוגו דף הכניסה</h3>
            <p className="text-sm text-slate-500">תמונה שתופיע בדף הנחיתה במקום הסמל הישן</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> טוען...
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="לוגו"
                className="w-48 h-48 object-contain"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                <ImagePlus className="w-7 h-7" />
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#105330] text-white font-semibold text-sm hover:bg-[#0d4027] transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'מעלה...' : logoUrl ? 'החלף תמונה' : 'העלה תמונה'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {logoUrl && !uploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <X className="w-4 h-4 ml-1" /> הסר
                </Button>
              )}
              {error && <p className="text-red-600 text-sm w-full md:w-auto md:ml-4">{error}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}