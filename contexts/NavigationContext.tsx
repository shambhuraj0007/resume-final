"use client";

import { createContext, useContext } from "react";

// Context to control navigation behavior
export const NavigationContext = createContext<{
  shouldNavigateOnAnalyze: boolean;
}>({ shouldNavigateOnAnalyze: false });

export const useNavigationContext = () => useContext(NavigationContext);
