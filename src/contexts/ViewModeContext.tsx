import React, { createContext, useContext, useState } from 'react';

type ViewMode = 'grid' | 'list';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Загружаем сохраненный режим из localStorage или используем 'grid' по умолчанию
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem('viewMode');
    return (savedMode === 'grid' || savedMode === 'list') ? savedMode : 'grid';
  });

  // Сохраняем режим в localStorage при каждом изменении
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = (): ViewModeContextType => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
