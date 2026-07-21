import { useEffect, useId, useRef, useState } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Libellé accessible du champ. */
  ariaLabel: string;
}

/**
 * Liste déroulante personnalisée, aux couleurs du thème.
 *
 * Un `<select>` natif ne permet pas de styliser la liste ouverte (rendue par
 * l'OS). Ce composant la reconstruit en suivant le motif ARIA « listbox »
 * (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) :
 * - la liste ouverte reçoit le focus et expose l'option active via
 *   `aria-activedescendant` (les options ne sont pas focusables une à une) ;
 * - navigation complète au clavier : flèches, Origine/Fin, saisie au vol
 *   (typeahead), Entrée/Espace pour valider, Échap pour annuler ;
 * - le focus revient sur le bouton déclencheur à la fermeture.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Tampon de saisie au vol : on accumule les lettres tapées rapidement pour
  // sauter à l'option correspondante, puis on réinitialise après une pause.
  const typeahead = useRef({ buffer: '', timer: 0 });

  const baseId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = options[selectedIndex];
  const optionId = (index: number) => `${baseId}-option-${index}`;

  /** Ouvre la liste en positionnant l'option active sur la valeur courante. */
  const openList = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  /** Ferme la liste et rend le focus au bouton déclencheur. */
  const closeList = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const commit = (index: number) => {
    const opt = options[index];
    if (opt) onChange(opt.value);
    closeList();
  };

  // Fermeture au clic hors du composant (sans rendre le focus, l'utilisateur
  // agit ailleurs à la souris).
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // À l'ouverture, on donne le focus à la liste (pilotée par le clavier via
  // aria-activedescendant) et on garde l'option active visible.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  /** Saute à la première option dont le libellé commence par le texte saisi. */
  const runTypeahead = (char: string) => {
    window.clearTimeout(typeahead.current.timer);
    typeahead.current.buffer += char.toLowerCase();
    const match = options.findIndex((o) =>
      o.label.toLowerCase().startsWith(typeahead.current.buffer),
    );
    if (match >= 0) setActiveIndex(match);
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.buffer = '';
    }, 500);
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeList();
        break;
      case 'Tab':
        // On laisse le focus filer vers l'élément suivant, mais on referme.
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          runTypeahead(e.key);
        }
    }
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-listbox` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className="flex min-w-40 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <span>{current?.label ?? ''}</span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={`${baseId}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
        >
          {options.map((opt, index) => {
            const selected = opt.value === value;
            const active = index === activeIndex;
            return (
              <li
                key={opt.value}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onClick={() => commit(index)}
                onMouseMove={() => setActiveIndex(index)}
                className={[
                  'flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                  selected ? 'font-medium text-brand' : 'text-slate-700',
                  active ? 'bg-brand-light' : '',
                ].join(' ')}
              >
                {opt.label}
                {selected ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
