import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select input that behaves natively on desktop (Radix Select) and opens a
 * vaul bottom sheet on phones — every pick target is at least 44px tall.
 */
export default function ResponsiveSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'בחר...',
  title,
  triggerClassName,
  className,
  disabled = false,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn('rounded-xl bg-white dark:bg-slate-900', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={className}>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border border-[#105330]/20 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2.5 text-right text-base shadow-sm min-h-[44px] disabled:opacity-50',
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base text-right">{title || placeholder}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-6">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onValueChange(o.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-3 mb-1 rounded-xl text-right text-base min-h-[44px]',
                value === o.value
                  ? 'bg-[#105330]/10 text-[#105330] dark:text-emerald-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}