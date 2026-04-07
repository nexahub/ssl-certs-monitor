// Fichier: frontend/src/components/ExpirationGauge.tsx
import React from 'react';

interface ExpirationGaugeProps {
  daysRemaining: number;
}

export default function ExpirationGauge({ daysRemaining }: ExpirationGaugeProps) {
  const maxDays = 90; 
  // On s'assure que le pourcentage est un nombre valide
  const safeDays = Math.max(0, daysRemaining);
  const percentage = Math.min(100, (safeDays / maxDays) * 100);
  
  let colorClass = "text-green-400";
  let strokeClass = "stroke-green-500";
  let glowClass = "shadow-[0_0_10px_rgba(34,211,238,0.2)]";

  if (daysRemaining <= 15) {
    colorClass = "text-red-400";
    strokeClass = "stroke-red-500";
    glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.4)]";
  } else if (daysRemaining <= 30) {
    colorClass = "text-amber-400";
    strokeClass = "stroke-amber-500";
    glowClass = "shadow-[0_0_10px_rgba(245,158,11,0.3)]";
  }

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/50 ${glowClass}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-slate-800"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          className={`${strokeClass} transition-all duration-1000 ease-out`}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span className={`text-sm font-bold ${colorClass}`}>{safeDays}</span>
        <span className="text-[8px] text-slate-500 font-bold uppercase">j</span>
      </div>
    </div>
  );
}