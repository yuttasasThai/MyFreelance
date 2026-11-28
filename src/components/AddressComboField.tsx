import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { AddressComboOption } from '../data/thaiAddressOptions.ts';

interface AddressComboFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  options: AddressComboOption[];
  emptyMessage?: string;
  onChange: (value: string) => void;
  onSelectOption: (option: AddressComboOption) => void;
}

export function AddressComboField({
  id,
  label,
  value,
  placeholder,
  required = false,
  options,
  emptyMessage = 'ไม่พบในรายการ — สามารถพิมพ์ข้อความเองได้',
  onChange,
  onSelectOption,
}: AddressComboFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [value, options.length]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  const optionCount = options.length;

  const trimmedValue = useMemo(() => value.trim(), [value]);

  const handleSelect = (option: AddressComboOption) => {
    onSelectOption(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(optionCount > 0 ? 0 : -1);
      } else if (optionCount > 0) {
        setHighlightedIndex((prev) => (prev + 1) % optionCount);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(optionCount > 0 ? optionCount - 1 : -1);
      } else if (optionCount > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? optionCount - 1 : prev - 1));
      }
      return;
    }

    if (e.key === 'Enter' && isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
      e.preventDefault();
      handleSelect(options[highlightedIndex]);
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          required={required}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {trimmedValue.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`ล้าง${label}`}
              onClick={() => {
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={`เปิดรายการ${label}`}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-500">{emptyMessage}</div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              className="max-h-52 divide-y divide-slate-100 overflow-y-auto py-1"
            >
              {options.map((option, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isExactMatch = option.value === trimmedValue;
                return (
                  <li
                    key={`${option.value}-${option.subtitle ?? ''}-${idx}`}
                    role="option"
                    aria-selected={isExactMatch}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(option);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-blue-50 text-blue-900'
                          : isExactMatch
                          ? 'bg-slate-50 font-semibold text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate font-medium">{option.value}</span>
                      {option.subtitle && (
                        <span className="shrink-0 truncate text-[11px] text-slate-500">
                          {option.subtitle}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
