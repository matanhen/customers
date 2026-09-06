import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FINANCIAL_STEPS, getStepValue, getStepTarget, getStepGap, formatCurrency } from './financialPlanSteps';

function buildPrintHTML({ planData, situation, currentStep, nextStep, logoUrl }) {
  const step = FINANCIAL_STEPS.find(s => s.id === currentStep) || FINANCIAL_STEPS[0];
  const gap = getStepGap(currentStep, situation, planData?.step_targets, planData?.step_currents);
  const value = getStepValue(currentStep, situation, planData?.step_currents);
  const target = getStepTarget(currentStep, situation, planData?.step_targets);

  const situationItems = [
    { label: 'הכנסה חודשית', value: formatCurrency(situation.income) },
    { label: 'הוצאות חודשיות', value: formatCurrency(situation.totalExpenses) },
    { label: 'תזרים חודשי', value: formatCurrency(situation.cashFlow) },
    { label: 'מצב עו"ש', value: formatCurrency(situation.checkingBalance) },
    { label: 'סך חובות', value: formatCurrency(situation.totalLiabilities) },
    { label: 'סך נכסים', value: formatCurrency(situation.totalAssets) },
    { label: 'הכנסה פסיבית', value: formatCurrency(situation.passiveIncome) },
  ];

  const journeyHTML = FINANCIAL_STEPS.map(s => {
    const isCurrent = s.id === currentStep;
    const isPast = s.id < currentStep;
    const icon = isPast ? '✓' : isCurrent ? '●' : '○';
    const color = isPast ? '#105330' : isCurrent ? '#c8a863' : '#cbd5e1';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <div style="width:32px;height:32px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;flex-shrink:0;">${icon}</div>
        <div style="flex:1;">
          <div style="font-weight:bold;color:${isPast ? '#105330' : isCurrent ? '#c8a863' : '#94a3b8'};font-size:14px;">${s.label}${isCurrent ? ' — אתה כאן' : ''}</div>
          <div style="color:#94a3b8;font-size:12px;">${s.description}</div>
        </div>
      </div>`;
  }).join('');

  const actionsHTML = (planData?.actions || []).map(a => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
      <div style="width:18px;height:18px;border-radius:4px;border:2px solid ${a.completed ? '#105330' : '#cbd5e1'};background:${a.completed ? '#105330' : 'white'};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">${a.completed ? '✓' : ''}</div>
      <span style="${a.completed ? 'text:#94a3b8;text-decoration:line-through;' : 'color:#1e293b;'}font-size:13px;">${a.name}</span>
      ${a.amount > 0 ? `<span style="color:#105330;font-weight:bold;font-size:13px;margin-right:auto;">${formatCurrency(a.amount)}</span>` : ''}
    </div>`).join('');

  return `
    <div style="font-family:Arial,'Heebo',sans-serif;direction:rtl;color:#1e293b;">
      ${logoUrl ? `<img src="${logoUrl}" style="height:50px;float:left;margin-bottom:20px;" />` : ''}
      <div style="clear:both;"></div>
      <h1 style="font-size:28px;color:#105330;margin:0 0 4px 0;font-weight:bold;">התוכנית הפיננסית של ${planData?.client_name || 'הלקוח'}</h1>
      ${planData?.main_goal ? `<p style="font-size:16px;color:#c8a863;margin:0 0 24px 0;font-weight:500;">המטרה המרכזית: ${planData.main_goal}</p>` : '<div style="height:24px;"></div>'}

      <h2 style="font-size:18px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">המצב שלך היום</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px;">
        ${situationItems.map(item => `
          <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px;">${item.label}</div>
            <div style="font-size:16px;font-weight:bold;color:#1e293b;">${item.value}</div>
          </div>`).join('')}
      </div>

      <h2 style="font-size:18px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">היעד הבא</h2>
      <div style="background:#105330;color:white;border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="font-size:14px;opacity:0.8;margin-bottom:4px;">${step.label}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><div style="font-size:11px;opacity:0.7;">יעד</div><div style="font-size:18px;font-weight:bold;">${step.unit ? formatCurrency(target) : 'פתיחת תיק'}</div></div>
          <div><div style="font-size:11px;opacity:0.7;">היום</div><div style="font-size:18px;font-weight:bold;">${step.unit ? formatCurrency(value) : value ? 'פתוח' : 'לא פתוח'}</div></div>
          <div><div style="font-size:11px;opacity:0.7;">פער</div><div style="font-size:18px;font-weight:bold;color:#c8a863;">${formatCurrency(gap)}</div></div>
        </div>
      </div>

      <h2 style="font-size:18px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">המסלול המלא</h2>
      <div style="margin-bottom:24px;">${journeyHTML}</div>

      ${planData?.actions?.length > 0 ? `
        <h2 style="font-size:18px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">תוכנית פעולה</h2>
        <div style="margin-bottom:24px;">${actionsHTML}</div>
      ` : ''}

      ${planData?.personal_goal_name ? `
        <h2 style="font-size:18px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">המטרה האישית</h2>
        <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:24px;">
          <div style="font-weight:bold;font-size:15px;margin-bottom:6px;">${planData.personal_goal_name}</div>
          ${planData.personal_goal_amount > 0 ? `<div style="font-size:13px;color:#64748b;">סכום יעד: ${formatCurrency(planData.personal_goal_amount)}</div>` : ''}
          ${planData.personal_goal_date ? `<div style="font-size:13px;color:#64748b;">תאריך יעד: ${planData.personal_goal_date}</div>` : ''}
          ${planData.personal_goal_monthly > 0 ? `<div style="font-size:13px;color:#64748b;">יעד חודשי: ${formatCurrency(planData.personal_goal_monthly)}</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

export async function exportPlanToPDF({ planData, situation, currentStep, logoUrl }) {
  const nextStep = currentStep;
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;right:-9999px;top:0;width:794px;padding:40px;background:white;';
  container.innerHTML = buildPrintHTML({ planData, situation, currentStep, nextStep, logoUrl });
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position -= 297;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`תכנית_פיננסית_${planData?.client_name || 'לקוח'}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}