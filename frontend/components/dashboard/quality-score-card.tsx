'use client';

import { cn } from '@/lib/utils';
import { qualityLabel } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QualityScoreCardProps {
  score: number;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function QualityScoreCard({
  score,
  previousScore,
  size = 'md',
  showLabel = true,
  className,
}: QualityScoreCardProps) {
  const { label, color } = qualityLabel(score);

  const sizeConfig = {
    sm: { svgSize: 64, radius: 26, stroke: 4, fontSize: 'text-sm', labelSize: 'text-[10px]' },
    md: { svgSize: 96, radius: 38, stroke: 5, fontSize: 'text-xl', labelSize: 'text-xs' },
    lg: { svgSize: 128, radius: 52, stroke: 6, fontSize: 'text-2xl', labelSize: 'text-sm' },
  };

  const { svgSize, radius, stroke, fontSize, labelSize } = sizeConfig[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 90
      ? '#10b981'
      : score >= 70
        ? '#3b82f6'
        : score >= 50
          ? '#f59e0b'
          : '#ef4444';

  const bgStrokeColor =
    score >= 90
      ? '#10b98120'
      : score >= 70
        ? '#3b82f620'
        : score >= 50
          ? '#f59e0b20'
          : '#ef444420';

  const trend = previousScore !== undefined ? score - previousScore : 0;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="-rotate-90"
        >
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={bgStrokeColor}
            strokeWidth={stroke}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold text-zinc-100', fontSize)}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className={cn('font-medium', labelSize, color)}>{label}</span>
          {previousScore !== undefined && trend !== 0 && (
            <span className={cn('flex items-center', labelSize)}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
