import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';
  subtitle?: string;
}

const colorMap = {
  blue: { bg: 'bg-primary-50', icon: 'text-primary-600', border: 'border-primary-100' },
  green: { bg: 'bg-success-50', icon: 'text-success-600', border: 'border-green-100' },
  yellow: { bg: 'bg-warning-50', icon: 'text-warning-600', border: 'border-yellow-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  red: { bg: 'bg-danger-50', icon: 'text-danger-600', border: 'border-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  gray: { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-100' },
};

export default function StatCard({ title, value, icon, trend, color = 'blue', subtitle }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              {trend.value > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-success-500" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.value > 0
                    ? 'text-success-600'
                    : trend.value < 0
                    ? 'text-danger-600'
                    : 'text-gray-500'
                }`}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`${colors.bg} ${colors.icon} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}

