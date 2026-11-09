import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function SearchableSelect({ value, onValueChange, items, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isMobile = useIsMobile();
  const selectedItem = items.find((i) => i.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.searchText || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  // Mobile: native-feeling vaul bottom sheet with search
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-xl border border-[#105330]/30 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2.5 text-right text-base min-h-[44px]',
              className
            )}
          >
            <span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
            <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base text-right">{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש..."
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pr-9 pl-3 text-base"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-2 pb-6">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">לא נמצאו תוצאות</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { onValueChange(item.value); setOpen(false); setQuery(''); }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-3 mb-1 rounded-xl text-right text-base min-h-[44px]',
                    value === item.value
                      ? 'bg-[#105330]/10 text-[#105330] dark:text-emerald-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {value === item.value && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn('w-full justify-between border-[#105330]/30 rounded-xl font-normal dark:bg-slate-900 dark:border-slate-700', className)}
        >
          <span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[16rem]" align="start">
        <Command>
          <CommandInput placeholder="חיפוש..." />
          <CommandList>
            <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.searchText ? `${item.label} ${item.searchText}` : item.label}
                  onSelect={() => { onValueChange(item.value); setOpen(false); }}
                >
                  <Check className={cn('ml-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}