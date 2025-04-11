import React from 'react';
import { useTranslation } from 'react-i18next';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 p-1">
      <button
        onClick={() => onChange('grid')}
        className={`flex items-center justify-center p-2 rounded-md transition-all ${
          view === 'grid' 
            ? 'bg-primary-100 text-primary-700' 
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title={t('common.gridView')}
        aria-label={t('common.gridView')}
      >
        <Squares2X2Icon className="h-5 w-5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex items-center justify-center p-2 rounded-md transition-all ${
          view === 'list' 
            ? 'bg-primary-100 text-primary-700' 
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title={t('common.listView')}
        aria-label={t('common.listView')}
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ViewToggle;
