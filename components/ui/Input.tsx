import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="optate-space-y-1">
      {label && <label className="optate-text-[10px] optate-text-earth-clay optate-uppercase optate-font-bold optate-tracking-wider">{label}</label>}
      <input 
        className={cn(
          "optate-w-full optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded-md optate-px-2 optate-py-1.5 optate-text-xs optate-text-earth-cream optate-outline-none optate-focus:border-earth-terracotta/50 optate-transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
};
