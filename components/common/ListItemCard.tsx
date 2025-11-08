import React from 'react';

interface ListItemCardProps {
  title: React.ReactNode;
  details: { label: string; value: React.ReactNode }[];
  status?: { text: string; colorClasses: string };
  actions?: React.ReactNode;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const ListItemCard: React.FC<ListItemCardProps> = ({ title, details, status, actions, onSelect, isSelected }) => {
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click from triggering when clicking on buttons, links, or the checkbox itself
    if (e.target instanceof HTMLElement) {
        if (e.target.closest('button, a, input[type="checkbox"]')) {
            return;
        }
    }
    onSelect?.();
  };
  
  return (
    <div 
      className={`card-base p-4 space-y-3 transition-colors duration-200 ${onSelect ? 'cursor-pointer' : ''} ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-primary' : ''}`}
      onClick={onSelect ? handleCardClick : undefined}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 flex items-start gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()} // Stop propagation to the card's onClick
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1.5 shrink-0"
            />
          )}
          <div className="flex-1 text-lg font-semibold">{title}</div>
        </div>
        
        {status && (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${status.colorClasses} whitespace-nowrap`}>
            {status.text}
          </span>
        )}
      </div>
      
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm ${onSelect ? 'pl-7' : ''}`}>
        {details.map((detail, index) => (
          <div key={index} className="truncate">
            <p className="text-gray-500 dark:text-gray-400 text-xs">{detail.label}</p>
            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{detail.value}</p>
          </div>
        ))}
      </div>

      {actions && (
        <div className="flex justify-end items-center gap-2 border-t dark:border-gray-700 pt-3">
          {actions}
        </div>
      )}
    </div>
  );
};
