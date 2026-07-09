import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

function formatDisplay(val) {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val);
  if (str === '') return '';
  const negative = str.startsWith('-');
  const abs = negative ? str.slice(1) : str;
  const [intPart, ...rest] = abs.split('.');
  const decPart = rest.join('.');
  const intFormatted = intPart === '' ? '' : Number(intPart).toLocaleString('en-US');
  const body = str.includes('.') ? `${intFormatted}.${decPart}` : intFormatted;
  return negative ? `-${body}` : body;
}

export default function FormattedNumberInput({ value, onChange, ...props }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      const numVal = Number(value);
      const isEmpty = !value || isNaN(numVal) || numVal === 0;
      setText(isEmpty ? '' : formatDisplay(value));
    }
  }, [value, focused]);

  const handleChange = (e) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.\-]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = `${parts[0]}.${parts.slice(1).join('')}`;
    const num = raw === '' || raw === '.' || raw === '-' ? 0 : parseFloat(raw);
    onChange(isNaN(num) ? 0 : num);
    setText(formatDisplay(raw));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      dir="ltr"
      {...props}
    />
  );
}