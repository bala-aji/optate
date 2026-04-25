import React from 'react';

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="optate-text-[10px] optate-text-earth-clay optate-uppercase optate-font-bold optate-tracking-wider optate-block optate-mb-1">
    {children}
  </label>
);
