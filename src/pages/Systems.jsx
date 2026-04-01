import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import System5Steps from '../components/systems/System5Steps';
import SystemDecisionTree from '../components/systems/SystemDecisionTree';

const SYSTEMS = [
  {
    id: 'five_steps',
    emoji: '🏆',
    title: 'סיסטם 5 שלבים',
    desc: '7 מערכות מפורטות לכל תחום בחיים הפיננסיים',
    color: 'from-[#105330] to-[#1a7a4a]',
    component: System5Steps,
  },
  {
    id: 'decision_tree',
    emoji: '🌳',
    title: 'תגלה מה אתה צריך לעשות עכשיו',
    desc: 'עץ החלטות אישי – גלה את השלב הבא שלך לחופש כלכלי',
    color: 'from-blue-600 to-indigo-700',
    component: SystemDecisionTree,
  },
];

export default function Systems() {
  const [activeSystem, setActiveSystem] = useState(null);

  const active = SYSTEMS.find(s => s.id === activeSystem);
  const ActiveComponent = active?.component;

  if (activeSystem && ActiveComponent) {
    return (
      <div className="max-w-3xl mx-auto" dir="rtl">
        <button
          onClick={() => setActiveSystem(null)}
          className="flex items-center gap-2 text-[#105330] font-bold mb-6 hover:underline"
        >
          <ChevronRight className="w-5 h-5" />
          חזרה לסיסטמים
        </button>
        <ActiveComponent />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="relative mb-10 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#105330] via-[#0d4027] to-[#105330]" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#c8a863]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative px-8 py-12 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl lg:text-4xl font-black text-white mb-3">הסיסטמים שלנו</h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">בחר סיסטם והתחל לעבוד</p>
        </div>
      </div>

      {/* System Cards */}
      <div className="grid gap-5">
        {SYSTEMS.map((system) => (
          <button
            key={system.id}
            onClick={() => setActiveSystem(system.id)}
            className="text-right w-full group"
          >
            <div className={`bg-gradient-to-r ${system.color} rounded-3xl p-6 flex items-center justify-between shadow-xl group-hover:scale-[1.02] transition-all duration-300`}>
              <div className="flex items-center gap-5">
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{system.emoji}</span>
                <div>
                  <h2 className="text-2xl font-black text-white">{system.title}</h2>
                  <p className="text-white/70 text-sm mt-1">{system.desc}</p>
                </div>
              </div>
              <div className="text-white/50 group-hover:translate-x-[-4px] transition-transform duration-300 text-3xl">←</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}