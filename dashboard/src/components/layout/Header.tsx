import { Search, Bell, Filter } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  children?: React.ReactNode;
}

export default function Header({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  showFilters,
  onToggleFilters,
  children,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between px-6 h-16">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar persona, comuna..."
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          )}

          {showFilters !== undefined && onToggleFilters && (
            <button
              onClick={onToggleFilters}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          )}

          {children}

          <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">AS</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-700">Dra. Andrea Soto</p>
              <p className="text-xs text-gray-400">Coordinadora</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

