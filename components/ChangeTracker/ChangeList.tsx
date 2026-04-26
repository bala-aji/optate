import React, { useState, useEffect } from 'react';
import { changeTracker, ElementChange } from '@/lib/change-tracker';
import { Label } from '@/components/ui/Label';
import { Trash2, Copy, Check, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ElementChange[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setChanges(changeTracker.getChanges());
    return changeTracker.subscribe(() => {
      setChanges(changeTracker.getChanges());
    });
  }, []);

  const handleCopy = () => {
    const report = generateReport(changes);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (changes.length === 0) {
    return (
      <div className="optate-p-12 optate-flex optate-flex-col optate-items-center optate-justify-center optate-text-center optate-gap-3">
        <RotateCcw size={32} className="optate-text-earth-clay/20" />
        <p className="optate-text-xs optate-text-earth-clay/50">No changes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="optate-space-y-6">
      <div className="optate-flex optate-items-center optate-justify-between">
        <h2 className="optate-text-earth-cream optate-font-medium optate-text-sm">Change Log</h2>
        <div className="optate-flex optate-gap-2">
          <button 
            onClick={() => changeTracker.clear()}
            className="optate-p-1.5 optate-rounded-md optate-text-earth-clay optate-hover:text-earth-rust optate-hover:bg-earth-rust/10 optate-transition-colors"
            title="Clear all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="optate-space-y-4">
        {changes.slice().reverse().map((change) => (
          <div key={change.id} className="optate-p-3 optate-bg-earth-loam/30 optate-border optate-border-earth-loam optate-rounded-lg optate-space-y-2">
            <div className="optate-flex optate-items-center optate-justify-between">
              <span className="optate-text-[9px] optate-text-earth-terracotta optate-font-bold optate-uppercase optate-tracking-wider">
                {change.type}
              </span>
              <span className="optate-text-[9px] optate-text-earth-clay">
                {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            <div className="optate-space-y-1">
              <div className="optate-text-[11px] optate-text-earth-cream optate-font-medium optate-flex optate-items-center optate-gap-2">
                <span className="optate-text-earth-terracotta-light">{change.property}:</span>
                <span className="optate-text-earth-clay optate-line-through optate-opacity-50">{change.oldValue}</span>
                <span className="optate-text-earth-olive-light">→</span>
                <span>{change.newValue}</span>
              </div>
              <code className="optate-text-[9px] optate-text-earth-clay optate-opacity-70 optate-break-all">
                {change.selector}
              </code>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleCopy}
        className={cn(
          "optate-w-full optate-py-3 optate-rounded-lg optate-flex optate-items-center optate-justify-center optate-gap-2 optate-font-bold optate-text-sm optate-transition-all",
          copied 
            ? "optate-bg-earth-olive optate-text-white" 
            : "optate-bg-earth-terracotta optate-text-white optate-hover:bg-earth-terracotta-light optate-shadow-lg optate-shadow-earth-terracotta/20"
        )}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? 'Copied Report!' : 'Copy Detailed Report'}
      </button>
    </div>
  );
};

function generateReport(changes: ElementChange[]): string {
  // Group by selector so multiple properties on the same element stay under one number
  const grouped = changes.reduce((acc, change) => {
    if (!acc[change.selector]) acc[change.selector] = [];
    acc[change.selector].push(change);
    return acc;
  }, {} as Record<string, ElementChange[]>);

  const entries = Object.entries(grouped);
  let report = `Optate Changes — ${entries.length} element${entries.length !== 1 ? 's' : ''} modified\n\n`;

  entries.forEach(([, elementChanges], index) => {
    const first = elementChanges[0];
    const path = first.shortPath || first.readablePath || first.selector;

    report += `${index + 1}. ${path}\n`;

    elementChanges.forEach(c => {
      if (c.type === 'style') {
        report += `   ${c.property}: ${c.oldValue} → ${c.newValue}\n`;
      } else {
        report += `   ${c.type}: ${c.oldValue} → ${c.newValue}\n`;
      }
    });

    report += `\n`;
  });

  return report.trim();
}
