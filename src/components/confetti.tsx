'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const ConfettiPiece = ({ style, className }: { style: React.CSSProperties; className: string }) => (
  <div
    className={cn('absolute w-2 h-3 rounded-full animate-confetti-fall', className)}
    style={style}
  ></div>
);

export const Confetti = () => {
  const [pieces, setPieces] = React.useState<React.ReactNode[]>([]);

  React.useEffect(() => {
    const colors = ['bg-primary', 'bg-accent', 'bg-secondary'];
    const newPieces = Array.from({ length: 150 }).map((_, i) => {
      const style: React.CSSProperties = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
      };
      const colorClass = colors[Math.floor(Math.random() * colors.length)];
      return <ConfettiPiece key={i} style={style} className={colorClass} />;
    });
    setPieces(newPieces);
  }, []);

  return <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">{pieces}</div>;
};
