import { useRef, useEffect, useState, useMemo } from 'react';
import { CountryFlag } from './CountryFlag';


export interface Country {
  code: string
  name: string
  flag: string
  areaCode: string
}

export const countries: Country[] = [
  { code: 'AR', name: 'Argentina', flag: 'ar', areaCode: '+54' },
  { code: 'AU', name: 'Australia', flag: 'au', areaCode: '+61' },
  { code: 'BO', name: 'Bolivia', flag: 'bo', areaCode: '+591' },
  { code: 'BR', name: 'Brasil', flag: 'br', areaCode: '+55' },
  { code: 'CA', name: 'Canadá', flag: 'ca', areaCode: '+1' },
  { code: 'CL', name: 'Chile', flag: 'cl', areaCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: 'co', areaCode: '+57' },
  { code: 'CR', name: 'Costa Rica', flag: 'cr', areaCode: '+506' },
  { code: 'DO', name: 'República Dominicana', flag: 'do', areaCode: '+1-809' },
  { code: 'EC', name: 'Ecuador', flag: 'ec', areaCode: '+593' },
  { code: 'ES', name: 'España', flag: 'es', areaCode: '+34' },
  { code: 'US', name: 'Estados Unidos', flag: 'us', areaCode: '+1' },
  { code: 'GT', name: 'Guatemala', flag: 'gt', areaCode: '+502' },
  { code: 'HN', name: 'Honduras', flag: 'hn', areaCode: '+504' },
  { code: 'MX', name: 'México', flag: 'mx', areaCode: '+52' },
  { code: 'NI', name: 'Nicaragua', flag: 'ni', areaCode: '+505' },
  { code: 'PA', name: 'Panamá', flag: 'pa', areaCode: '+507' },
  { code: 'PE', name: 'Perú', flag: 'pe', areaCode: '+51' },
  { code: 'PR', name: 'Puerto Rico', flag: 'pr', areaCode: '+1-787' },
  { code: 'PY', name: 'Paraguay', flag: 'py', areaCode: '+595' },
  { code: 'SV', name: 'El Salvador', flag: 'sv', areaCode: '+503' },
  { code: 'UY', name: 'Uruguay', flag: 'uy', areaCode: '+598' },
  { code: 'VE', name: 'Venezuela', flag: 've', areaCode: '+58' },
  { code: 'DE', name: 'Alemania', flag: 'de', areaCode: '+49' },
  { code: 'AT', name: 'Austria', flag: 'at', areaCode: '+43' },
  { code: 'BE', name: 'Bélgica', flag: 'be', areaCode: '+32' },
  { code: 'CH', name: 'Suiza', flag: 'ch', areaCode: '+41' },
  { code: 'CZ', name: 'República Checa', flag: 'cz', areaCode: '+420' },
  { code: 'DK', name: 'Dinamarca', flag: 'dk', areaCode: '+45' },
  { code: 'EE', name: 'Estonia', flag: 'ee', areaCode: '+372' },
  { code: 'FI', name: 'Finlandia', flag: 'fi', areaCode: '+358' },
  { code: 'FR', name: 'Francia', flag: 'fr', areaCode: '+33' },
  { code: 'GB', name: 'Reino Unido', flag: 'gb', areaCode: '+44' },
  { code: 'GR', name: 'Grecia', flag: 'gr', areaCode: '+30' },
  { code: 'HR', name: 'Croacia', flag: 'hr', areaCode: '+385' },
  { code: 'HU', name: 'Hungría', flag: 'hu', areaCode: '+36' },
  { code: 'IE', name: 'Irlanda', flag: 'ie', areaCode: '+353' },
  { code: 'IT', name: 'Italia', flag: 'it', areaCode: '+39' },
  { code: 'LT', name: 'Lituania', flag: 'lt', areaCode: '+370' },
  { code: 'LU', name: 'Luxemburgo', flag: 'lu', areaCode: '+352' },
  { code: 'LV', name: 'Letonia', flag: 'lv', areaCode: '+371' },
  { code: 'MT', name: 'Malta', flag: 'mt', areaCode: '+356' },
  { code: 'NL', name: 'Países Bajos', flag: 'nl', areaCode: '+31' },
  { code: 'NO', name: 'Noruega', flag: 'no', areaCode: '+47' },
  { code: 'PL', name: 'Polonia', flag: 'pl', areaCode: '+48' },
  { code: 'PT', name: 'Portugal', flag: 'pt', areaCode: '+351' },
  { code: 'RO', name: 'Rumania', flag: 'ro', areaCode: '+40' },
  { code: 'SE', name: 'Suecia', flag: 'se', areaCode: '+46' },
  { code: 'SI', name: 'Eslovenia', flag: 'si', areaCode: '+386' },
  { code: 'SK', name: 'Eslovaquia', flag: 'sk', areaCode: '+421' },
  { code: 'CN', name: 'China', flag: 'cn', areaCode: '+86' },
  { code: 'HK', name: 'Hong Kong', flag: 'hk', areaCode: '+852' },
  { code: 'ID', name: 'Indonesia', flag: 'id', areaCode: '+62' },
  { code: 'IL', name: 'Israel', flag: 'il', areaCode: '+972' },
  { code: 'IN', name: 'India', flag: 'in', areaCode: '+91' },
  { code: 'JP', name: 'Japón', flag: 'jp', areaCode: '+81' },
  { code: 'KR', name: 'Corea del Sur', flag: 'kr', areaCode: '+82' },
  { code: 'MY', name: 'Malasia', flag: 'my', areaCode: '+60' },
  { code: 'PH', name: 'Filipinas', flag: 'ph', areaCode: '+63' },
  { code: 'SG', name: 'Singapur', flag: 'sg', areaCode: '+65' },
  { code: 'TH', name: 'Tailandia', flag: 'th', areaCode: '+66' },
  { code: 'TW', name: 'Taiwán', flag: 'tw', areaCode: '+886' },
  { code: 'VN', name: 'Vietnam', flag: 'vn', areaCode: '+84' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: 'nz', areaCode: '+64' },
  { code: 'FJ', name: 'Fiyi', flag: 'fj', areaCode: '+679' },
  { code: 'PG', name: 'Papúa Nueva Guinea', flag: 'pg', areaCode: '+675' },
  { code: 'ZA', name: 'Sudáfrica', flag: 'za', areaCode: '+27' },
  { code: 'EG', name: 'Egipto', flag: 'eg', areaCode: '+20' },
  { code: 'KE', name: 'Kenia', flag: 'ke', areaCode: '+254' },
  { code: 'MA', name: 'Marruecos', flag: 'ma', areaCode: '+212' },
  { code: 'NG', name: 'Nigeria', flag: 'ng', areaCode: '+234' },
  { code: 'TN', name: 'Túnez', flag: 'tn', areaCode: '+216' },
  { code: 'AE', name: 'Emiratos Árabes', flag: 'ae', areaCode: '+971' },
  { code: 'SA', name: 'Arabia Saudita', flag: 'sa', areaCode: '+966' },
  { code: 'QA', name: 'Catar', flag: 'qa', areaCode: '+974' },
  { code: 'KW', name: 'Kuwait', flag: 'kw', areaCode: '+965' },
  { code: 'BH', name: 'Baréin', flag: 'bh', areaCode: '+973' },
  { code: 'TR', name: 'Turquía', flag: 'tr', areaCode: '+90' },
]

export interface CountryDropdownProps {
  countries?: Country[]
  value?: string
  onChange: (code: string) => void
  disabled?: boolean
  placeholder?: string
  error?: string
  id?: string
  label?: string
}

export function findCountry(codeOrName?: string, list: Country[] = countries): Country | undefined {
  if (!codeOrName) return undefined
  const query = codeOrName.trim().toLowerCase()
  return list.find(
    (c) => c.code.toLowerCase() === query || c.name.toLowerCase() === query || c.flag.toLowerCase() === query
  )
}

export default function CountryDropdown({
  countries: countriesList = countries,
  value,
  onChange,
  disabled = false,
  placeholder = 'Seleccionar país',
  error,
  id,
  label,
}: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Encuentra el país seleccionado por código o nombre
  const selectedCountry = useMemo(() => {
    return findCountry(value, countriesList)
  }, [value, countriesList])

  // Filtrar países según término de búsqueda
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countriesList
    const term = searchTerm.toLowerCase().trim()
    return countriesList.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.areaCode.includes(term)
    )
  }, [countriesList, searchTerm])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        const activeElement = document.activeElement
        const isInput =
          activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
        if (isInput) return

        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setIsOpen(true)
          setHighlightedIndex(0)
        }
        return
      }

      const filtered = filteredCountries
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
            onChange(filtered[highlightedIndex].code)
            setIsOpen(false)
            setSearchTerm('')
            setHighlightedIndex(-1)
          }
          break
        case 'Escape':
          setIsOpen(false)
          setSearchTerm('')
          setHighlightedIndex(-1)
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCountries, highlightedIndex, onChange])

  // Hacer scroll automático al elemento resaltado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const toggleOpen = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHighlightedIndex(0)
      setSearchTerm('')
    }
  }

  return (
    <div className="d2-country-dropdown" ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="d2-form-label">
          {label}
        </label>
      )}
      <div className="d2-dropdown-wrapper">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          className={`d2-dropdown-trigger${error ? ' has-error' : ''}${isOpen ? ' is-active' : ''}`}
          onClick={toggleOpen}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || 'Seleccionar país'}
        >
          <span className="d2-dropdown-selected">
            {selectedCountry ? (
              <>
                    <CountryFlag code={selectedCountry.code} className="d2-flag-icon w-5 h-4 mr-2" />
                <span className="d2-country-name">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="d2-dropdown-placeholder">{placeholder}</span>
            )}
          </span>
          <svg
            className={`d2-dropdown-arrow${isOpen ? ' open' : ''}`}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <div className="d2-dropdown-panel" role="presentation">
            <div className="d2-dropdown-search">
              <input
                type="text"
                placeholder="Buscar país o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <ul
              ref={listRef}
              className="d2-dropdown-list"
              role="listbox"
              aria-label={label || 'Lista de países'}
            >
              {filteredCountries.map((country, index) => (
                <li
                  key={country.code}
                  className={`d2-dropdown-item${
                    index === highlightedIndex ? ' highlighted' : ''
                  }${selectedCountry?.code === country.code ? ' selected' : ''}`}
                  onClick={() => {
                    onChange(country.code)
                    setIsOpen(false)
                    setSearchTerm('')
                    setHighlightedIndex(-1)
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={selectedCountry?.code === country.code}
                >
                  <CountryFlag code={country.code} className="d2-flag-icon w-5 h-4 mr-2" />
                  <span className="d2-item-name">{country.name}</span>
                  <span className="d2-dropdown-code">{country.code}</span>
                </li>
              ))}
              {filteredCountries.length === 0 && (
                <li className="d2-dropdown-empty">
                  No se encontraron países
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="d2-form-field-error">{error}</p>}
    </div>
  )
}
