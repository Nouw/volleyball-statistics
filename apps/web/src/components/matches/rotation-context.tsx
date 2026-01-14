"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OnCourtData } from "./on-court-players-card";

interface RotationContextValue {
  rotationState: OnCourtData | null;
  players: Array<{ id: string; name: string; number: number | null }>;
  loading: boolean;
  error: string | null;
}

const RotationContext = createContext<RotationContextValue | undefined>(undefined);

interface RotationProviderProps {
  value: RotationContextValue;
  children: ReactNode;
}

export function RotationProvider({ value, children }: RotationProviderProps) {
  return <RotationContext.Provider value={value}>{children}</RotationContext.Provider>;
}

export function useRotationContext() {
  const ctx = useContext(RotationContext);
  if (!ctx) throw new Error("useRotationContext must be used within RotationProvider");
  return ctx;
}
