import { createContext, useContext } from 'react';
import type { Units } from './units.ts';

/**
 * The current distance units, shared to every distance display without prop
 * drilling. Defaults to 'km' — and `formatDistance` renders km exactly as the
 * literals did before — so the feature is inert until a rider picks miles.
 */
export const UnitsContext = createContext<Units>('km');

export const useUnits = (): Units => useContext(UnitsContext);
