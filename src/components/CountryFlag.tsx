import * as Flags from 'country-flag-icons/react/3x2';
import React from 'react';

type CountryFlagProps = {
  code: string; // ISO 2‑letter code, case‑insensitive
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Wrapper that renders the appropriate flag component from `country-flag-icons`.
 * The library exports each flag as a named export (e.g. `US`, `AR`).
 * We look up the component dynamically and render it if it exists.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ code, className, style }) => {
  const Icon = (Flags as any)[code.toUpperCase()];
  return Icon ? <Icon className={className} style={style} /> : null;
};
