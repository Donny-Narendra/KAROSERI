import React, { createContext, useContext, type ReactNode } from 'react';
import { 
  useStageSettings as useStageSettingsHook, 
  type UseStageSettingsReturn, 
  DEFAULT_STAGE_NAMES, 
  EXACT_ENUM_MAP,
  resolveStageIndex,
  getStageDisplayName, 
  getCachedStageAliases, 
  setCachedStageAliases,
  broadcastStageSettings
} from '../hooks/useStageSettings';

const StageContext = createContext<UseStageSettingsReturn | undefined>(undefined);

export const StageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const stageSettings = useStageSettingsHook();

  return (
    <StageContext.Provider value={stageSettings}>
      {children}
    </StageContext.Provider>
  );
};

export function useStageContext(): UseStageSettingsReturn {
  const context = useContext(StageContext);
  if (!context) {
    // Graceful fallback to the standalone hook if provider is not present
    return useStageSettingsHook();
  }
  return context;
}

export { 
  DEFAULT_STAGE_NAMES, 
  EXACT_ENUM_MAP,
  resolveStageIndex,
  getStageDisplayName, 
  getCachedStageAliases, 
  setCachedStageAliases, 
  broadcastStageSettings 
};
export default StageContext;
