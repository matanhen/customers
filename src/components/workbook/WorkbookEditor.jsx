import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Save, Plus, Trash2, GripVertical } from 'lucide-react';

export default function WorkbookEditor({ sections, onSave, onClose }) {
  const [editedSections, setEditedSections] = useState(
    sections.map(s => ({ ...s, questions: [...(s.questions || [])] }))
  );
  const [saving, setSaving] = useState(false);

  const updateSection = (idx, field, value) => {
    setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const updateQuestion = (sIdx, qIdx, field, value) => {
    setEditedSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      const questions = s.questions.map((q, j) => j === qIdx ? { ...q, [field]: value } : q);
      return { ...s, questions };
    }));
  };

  const addQuestion = (sIdx) => {
    setEditedSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      const newQ = { key: `q_${Date.now()}`, label: '', type: 'textarea' };
      return { ...s, questions: [...s.questions, newQ] };
    }));
  };

  const removeQuestion = (sIdx, qIdx) => {
    setEditedSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, questions: s.questions.filter((_, j) => j !== qIdx) };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const section of editedSections) {
      const existing = await base44.entities.WorkbookContent.filter({ section_key: section.section_key });
      const data = {
        section_key: section.section_key,
        title: section.title,
        content: section.content,
        questions: section.questions,
        order: section.order,
      };
      if (existing.length > 0) {
        await base44.entities.WorkbookContent.update(existing[0].id, data);
      } else {
        await base44.entities.WorkbookContent.create(data);
      }
    }
    setSaving(false);
    onSave(editedSections);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4" dir="rtl">
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <button onClick={onClose} className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm">
          <ArrowRight className="w-4 h-4" />
          חזרה
        </button>
        <h2 className="font-bold text-orange-800 text-lg">עריכת תוכן החוברת (מנהל בלבד)</h2>
        <Button onClick={handleSave} disabled={saving} size="sm" className="mr-auto bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 ml-1" />
          {saving ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>

      {editedSections.map((section, sIdx) => (
        <div key={section.section_key} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <div className="flex-1 space-y-2">
              <Input
                value={section.title}
                onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
                className="font-bold text-[#105330] border-dashed"
                placeholder="כותרת סעיף"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">תוכן / הסבר (יופיע מעל השאלות)</label>
            <Textarea
              value={section.content || ''}
              onChange={(e) => updateSection(sIdx, 'content', e.target.value)}
              className="text-sm min-h-[80px] resize-none border-dashed"
              placeholder="הזן תוכן והסבר לסעיף..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">שאלות</span>
              <Button size="sm" variant="outline" onClick={() => addQuestion(sIdx)} className="text-xs h-7 px-2">
                <Plus className="w-3 h-3 ml-1" />
                הוסף שאלה
              </Button>
            </div>
            {section.questions.map((q, qIdx) => (
              <div key={q.key} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1 space-y-2">
                  <Input
                    value={q.label}
                    onChange={(e) => updateQuestion(sIdx, qIdx, 'label', e.target.value)}
                    placeholder="טקסט השאלה"
                    className="text-sm border-dashed"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(sIdx, qIdx, 'type', e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="text">שדה קצר</option>
                    <option value="textarea">שדה ארוך</option>
                    <option value="rating">דירוג 1-10</option>
                  </select>
                </div>
                <button onClick={() => removeQuestion(sIdx, qIdx)} className="text-red-400 hover:text-red-600 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pb-8">
        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#105330] hover:bg-[#0d4027]">
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'שומר...' : 'שמור את כל השינויים'}
        </Button>
      </div>
    </div>
  );
}