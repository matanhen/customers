// Printable HTML documents used when a monthly plan / balance PDF is sent to the
// advisor automation (rendered to PDF in the browser).
const fmt = (n) => `₪${Math.round(Number(n) || 0).toLocaleString()}`;
const BRAND = 'צעירים מתעשרים';

const escapeHtml = (text) => String(text ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(body) {
  return `<div style="font-family:Arial,'Heebo',sans-serif;direction:rtl;color:#1e293b;font-size:13px;">${body}</div>`;
}

function docHeader(title, clientName, monthLabel) {
  const today = new Date().toLocaleDateString('he-IL');
  return `
    <table style="width:100%;border-collapse:collapse;border-bottom:3px solid #105330;margin-bottom:22px;">
      <tr>
        <td style="padding:0 0 12px 0;text-align:right;vertical-align:bottom;">
          <div style="font-size:12px;color:#c8a863;font-weight:bold;">${BRAND}</div>
          <div style="font-size:25px;color:#105330;font-weight:bold;margin-top:6px;">${title}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">${[clientName, monthLabel].filter(Boolean).map(escapeHtml).join(' • ')}</div>
        </td>
        <td style="padding:0 0 12px 0;text-align:left;vertical-align:bottom;font-size:11px;color:#94a3b8;white-space:nowrap;">
          הופק בתאריך ${today}
        </td>
      </tr>
    </table>`;
}

function cards(items) {
  return `<div style="display:flex;gap:10px;margin-bottom:22px;">
    ${items.map(i => `<div style="flex:1;background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:#64748b;margin-bottom:5px;">${i.label}</div>
      <div style="font-size:15px;font-weight:bold;color:${i.color || '#1e293b'};">${i.value}</div>
      ${i.sub ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px;">${i.sub}</div>` : ''}
    </div>`).join('')}
  </div>`;
}

function sectionTitle(text) {
  return `<h2 style="font-size:17px;color:#105330;border-bottom:2px solid #105330;padding-bottom:6px;margin:0 0 12px 0;">${text}</h2>`;
}

function groupTitle(text) {
  return `<div style="font-size:13px;font-weight:bold;color:#105330;background:#f1f5f9;padding:6px 10px;border-radius:6px;margin:0 0 6px 0;">${text}</div>`;
}

function rowsTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
    <tbody>${rows.map(r => `<tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:9px 10px;text-align:right;font-size:13px;color:#334155;">${escapeHtml(r.label)}${r.sub ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${r.sub}</div>` : ''}</td>
      <td style="padding:9px 10px;text-align:left;font-size:13px;font-weight:bold;color:${r.color || '#1e293b'};white-space:nowrap;">${r.value}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

export function buildMonthlyPlanHtml({ plan = {}, monthLabel = '', clientName = '' }) {
  const num = (v) => Number(v) || 0;
  const income = num(plan.expected_income);
  const savings = num(plan.savings);
  const fixed = num(plan.fixed_expenses);
  const variable = num(plan.variable_expenses);
  const totalExpenses = fixed + variable + savings;
  const pct = (v) => (income > 0 ? Math.round((v / income) * 100) : 0);
  const investments = num(plan.investments_allocation);
  const dreams = num(plan.dreams_savings);
  const emergencyAlloc = num(plan.emergency_fund_allocation);
  const allocated = investments + dreams + emergencyAlloc;
  const emergencyCurrent = num(plan.emergency_fund_current);
  const emergencyTarget = (fixed + variable) * 3;
  const emergencyProgress = emergencyTarget > 0 ? Math.min(100, Math.round((emergencyCurrent / emergencyTarget) * 100)) : 0;

  return wrap(`
    ${docHeader('תכנון חודשי', clientName, monthLabel)}
    ${cards([
      { label: 'הכנסה צפויה', value: fmt(income), color: '#105330' },
      { label: 'סך הוצאות מתוכננות', value: fmt(totalExpenses), color: totalExpenses > income ? '#dc2626' : '#1e293b' },
      { label: '% מההכנסה', value: `${income > 0 ? Math.round((totalExpenses / income) * 100) : 0}%` },
      { label: 'יתרת עו"ש', value: fmt(plan.checking_balance), color: '#0369a1' },
    ])}
    ${sectionTitle('סיכום התכנון החודשי')}
    ${rowsTable([
      { label: 'הכנסה צפויה', value: fmt(income) },
      { label: 'חסכונות', sub: `${pct(savings)}% מההכנסה`, value: fmt(savings) },
      { label: 'הוצאות קבועות', sub: `${pct(fixed)}% מההכנסה`, value: fmt(fixed) },
      { label: 'יתרת הוצאות', sub: `${pct(variable)}% מההכנסה`, value: fmt(variable) },
      { label: 'סך הוצאות מתוכננות', value: fmt(totalExpenses), color: totalExpenses > income ? '#dc2626' : '#105330' },
      { label: 'נשאר לתזרים', value: fmt(income - totalExpenses), color: (income - totalExpenses) >= 0 ? '#105330' : '#dc2626' },
    ])}
    ${sectionTitle('חשבון החופש')}
    ${rowsTable([
      { label: 'השקעות', value: fmt(investments) },
      { label: 'חיסכון חלומות', value: fmt(dreams) },
      { label: 'קרן ביטחון (הקצאה)', value: fmt(emergencyAlloc) },
      { label: 'סה"כ הוקצה', value: `${fmt(allocated)} מתוך ${fmt(savings)}` },
    ])}
    ${sectionTitle('קרן הביטחון')}
    ${rowsTable([
      { label: 'סכום נוכחי בקרן', value: fmt(emergencyCurrent) },
      { label: 'יעד (3 חודשי מחייה)', value: fmt(emergencyTarget) },
      { label: 'הושלם', value: `${emergencyProgress}%` },
      { label: 'נשאר להשלים', value: fmt(Math.max(0, emergencyTarget - emergencyCurrent)) },
    ])}
    ${plan.notes && String(plan.notes).trim() ? `
      ${sectionTitle('הערות לחודש')}
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:13px;line-height:1.7;white-space:pre-wrap;margin-bottom:14px;">${escapeHtml(plan.notes)}</div>
    ` : ''}
  `);
}

export function buildBalanceHtml({
  assetGroups = [], liabilityGroups = [], pensionRows = [],
  totalAssets = 0, pensionTotal = 0, totalLiabilities = 0, netWorth = 0,
  totalMonthlyPayment = 0, totalAssetIncome = 0, assetCashFlow = 0,
  monthLabel = '', clientName = '',
}) {
  const assetsBody = assetGroups.filter(g => g.items.length).map(g => `
    ${groupTitle(g.label)}
    ${rowsTable(g.items.map(i => ({
      label: i.name,
      sub: Number(i.monthly_income) > 0 ? `תזרים: ${fmt(i.monthly_income)}/חודש` : '',
      value: fmt(i.value),
    })))}
  `).join('');

  const pensionBody = pensionRows.length ? `
    ${groupTitle('פנסיוני וקרנות')}
    ${rowsTable(pensionRows.map(p => ({ label: p.label, value: fmt(p.value) })))}
  ` : '';

  const liabilitiesBody = liabilityGroups.filter(g => g.items.length).map(g => `
    ${groupTitle(g.label)}
    ${rowsTable(g.items.map(i => ({
      label: i.name,
      sub: [
        Number(i.monthly_payment) > 0 ? `החזר: ${fmt(i.monthly_payment)}/חודש` : '',
        Number(i.interest_rate) > 0 ? `ריבית: ${i.interest_rate}%` : '',
      ].filter(Boolean).join(' • '),
      value: fmt(i.balance),
      color: '#b91c1c',
    })))}
  `).join('');

  return wrap(`
    ${docHeader('מאזן – איפה הכסף', clientName, monthLabel)}
    ${cards([
      { label: 'סה"כ נכסים', value: fmt(totalAssets + pensionTotal), color: '#059669', sub: pensionTotal > 0 ? `ללא פנסיוני: ${fmt(totalAssets)}` : '' },
      { label: 'סה"כ התחייבויות', value: fmt(totalLiabilities), color: '#dc2626', sub: totalMonthlyPayment > 0 ? `החזר חודשי: ${fmt(totalMonthlyPayment)}` : '' },
      { label: 'הון נקי', value: fmt(netWorth), color: netWorth >= 0 ? '#105330' : '#dc2626' },
      { label: 'תזרים', value: fmt(assetCashFlow), color: assetCashFlow >= 0 ? '#105330' : '#dc2626' },
    ])}
    ${sectionTitle('נכסים')}
    ${assetsBody || '<p style="color:#94a3b8;margin:0 0 14px 0;">אין נכסים</p>'}
    ${pensionBody}
    ${totalAssetIncome > 0 || totalMonthlyPayment > 0 ? `
      ${rowsTable([
        { label: 'הכנסה תזרימית מנכסים', value: fmt(totalAssetIncome), color: '#059669' },
        { label: 'הוצאה חודשית מהתחייבויות', value: fmt(totalMonthlyPayment), color: '#dc2626' },
        { label: 'תזרים נטו', value: fmt(assetCashFlow), color: assetCashFlow >= 0 ? '#105330' : '#dc2626' },
      ])}
    ` : ''}
    ${sectionTitle('התחייבויות')}
    ${liabilitiesBody || '<p style="color:#94a3b8;margin:0 0 14px 0;">אין התחייבויות</p>'}
    ${rowsTable([
      { label: 'סה"כ התחייבויות', value: fmt(totalLiabilities), color: '#b91c1c' },
      { label: 'הון נקי (נכסים + פנסיוני – התחייבויות)', value: fmt(netWorth), color: netWorth >= 0 ? '#105330' : '#dc2626' },
    ])}
  `);
}