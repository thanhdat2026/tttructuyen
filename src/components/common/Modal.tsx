
import React, { useEffect } from 'react';
import { ICONS } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isPrintable?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, isPrintable }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-end md:items-center p-0 md:p-4 ${!isPrintable ? 'print-hidden' : ''}`}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-lg shadow-xl flex flex-col transition-all duration-300 ease-in-out"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0 print-hidden">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {ICONS.close}
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto modal-content-wrapper flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
