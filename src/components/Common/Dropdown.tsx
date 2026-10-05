import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
  value: string | number;
  label: React.ReactNode;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  searchPlaceholder?: string;
  prefixIcon?: React.ReactNode;
  align?: 'left' | 'right';
  fullWidth?: boolean;
  dropdownWidth?: string;
  children?: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  name,
  value,
  defaultValue,
  onChange,
  onValueChange,
  options,
  placeholder = 'Chọn...',
  disabled = false,
  required = false,
  className = '',
  menuClassName = '',
  size = 'md',
  searchable,
  searchPlaceholder = 'Tìm kiếm...',
  prefixIcon,
  align = 'left',
  fullWidth = false,
  dropdownWidth,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(
    value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync internal value when controlled value changes
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value));
    }
  }, [value]);

  // Extract DropdownOption from children (<option> tags) if options prop not passed
  const parsedOptions = useMemo<DropdownOption[]>(() => {
    if (options && options.length > 0) return options;
    if (!children) return [];

    const extracted: DropdownOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.type === 'option' || (child.props && 'value' in child.props))) {
        extracted.push({
          value: child.props.value !== undefined ? child.props.value : '',
          label: child.props.children !== undefined ? child.props.children : String(child.props.value ?? ''),
          disabled: child.props.disabled
        });
      }
    });
    return extracted;
  }, [options, children]);

  const selectedValue = value !== undefined ? String(value) : internalValue;

  const currentOption = useMemo(() => {
    return parsedOptions.find(o => String(o.value) === String(selectedValue));
  }, [parsedOptions, selectedValue]);

  // Filter options when searching
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return parsedOptions;
    const q = searchQuery.toLowerCase().trim();
    return parsedOptions.filter(opt => {
      const labelStr = typeof opt.label === 'string' ? opt.label : String(opt.value);
      const subStr = opt.sublabel || '';
      return labelStr.toLowerCase().includes(q) || subStr.toLowerCase().includes(q);
    });
  }, [parsedOptions, searchQuery]);

  // Determine if search bar should be displayed
  const shouldShowSearch = searchable === true || (searchable !== false && parsedOptions.length >= 10);

  // Positioning coordinates for fixed portal
  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    placeAbove: boolean;
  }>({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placeAbove: false
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(280, (filteredOptions.length || 1) * 36 + (shouldShowSearch ? 50 : 16));
    const placeAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setCoords({
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: rect.width,
      placeAbove
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, filteredOptions.length, shouldShowSearch]);

  // Close when clicked outside or ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    const stringVal = String(val);
    setInternalValue(stringVal);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);

    if (onValueChange) {
      onValueChange(stringVal);
    }
    if (onChange) {
      onChange({
        target: {
          value: stringVal,
          name: name || id || ''
        }
      });
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else if (filteredOptions.length > 0) {
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter' && isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
      e.preventDefault();
      const opt = filteredOptions[focusedIndex];
      if (!opt.disabled) {
        handleSelect(opt.value);
      }
    }
  };

  // Size styling tokens
  const sizeClasses = {
    sm: 'h-8 text-xs py-1 px-2.5 rounded-xl gap-1.5',
    md: 'h-10 text-xs sm:text-sm py-2 px-3 rounded-xl gap-2',
    lg: 'h-11 text-sm py-2.5 px-3.5 rounded-xl gap-2'
  }[size];

  return (
    <div className={`relative inline-block ${fullWidth || className.includes('w-full') ? 'w-full' : ''}`}>
      {/* Hidden native input for HTML form validation & form submit compatibility */}
      {required && (
        <input
          type="text"
          value={selectedValue}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Custom Dropdown Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setFocusedIndex(-1);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex items-center justify-between bg-white border border-pink-200/80 hover:border-[#fb6f92] focus:outline-none focus:border-[#fb6f92] focus:ring-2 focus:ring-pink-200/50 shadow-xs transition duration-150 cursor-pointer select-none text-left ${sizeClasses} ${
          fullWidth ? 'w-full' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''} ${
          isOpen ? 'border-[#fb6f92] ring-2 ring-pink-200/50' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate pr-1.5 min-w-0">
          {prefixIcon && <span className="shrink-0 text-slate-400">{prefixIcon}</span>}
          {currentOption?.icon && <span className="shrink-0">{currentOption.icon}</span>}
          <span className={`truncate font-semibold ${className.includes('text-white') ? 'text-white' : currentOption ? 'text-[#181a2e]' : 'text-slate-400 font-normal'}`}>
            {currentOption ? currentOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#a93054] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Menu via Portal (Safe from overflow-hidden clipping & z-index issues) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          style={{
            position: 'fixed',
            top: coords.placeAbove ? 'auto' : `${coords.top}px`,
            bottom: coords.placeAbove ? `${coords.bottom}px` : 'auto',
            left: align === 'right'
              ? 'auto'
              : `${Math.max(8, Math.min(coords.left, window.innerWidth - Math.max(coords.width, 180) - 8))}px`,
            right: align === 'right'
              ? `${Math.max(8, window.innerWidth - (coords.left + coords.width))}px`
              : 'auto',
            minWidth: dropdownWidth ? undefined : `${Math.max(coords.width, 180)}px`,
            width: dropdownWidth || undefined,
            zIndex: 99999
          }}
          className={`bg-white border border-pink-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ${menuClassName}`}
        >
          {/* Search box if list is long or explicitly requested */}
          {shouldShowSearch && (
            <div className="p-2 border-b border-pink-100 bg-[#fbf8ff] sticky top-0 z-10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-white border border-pink-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#181a2e] placeholder-slate-400 focus:outline-none focus:border-[#fb6f92]"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Scrollable list of options */}
          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 italic">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(selectedValue);
                const isFocused = idx === focusedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (opt.disabled) return;
                      handleSelect(opt.value);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-pink-50 text-[#a93054] font-bold shadow-2xs'
                        : isFocused
                        ? 'bg-pink-50/60 text-[#a93054]'
                        : 'text-[#4e4447] hover:bg-pink-50/50 hover:text-[#181a2e]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          ({opt.sublabel})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#a93054] shrink-0 ml-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const Select: React.FC<DropdownProps> = Dropdown;
export default Dropdown;
