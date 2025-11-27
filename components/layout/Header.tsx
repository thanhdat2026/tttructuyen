

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useDataContext';
import { ICONS } from '../../constants';
import { CenterSettings, UserRole } from '../../types';
import { GlobalSearch } from '../common/GlobalSearch';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  pageTitle: string;
  onMenuClick: () => void;
}

const Clock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300 hidden lg:block">
            <time dateTime={currentTime.toISOString()}>
                {currentTime.toLocaleTimeString('vi-VN')}
                <span className="block text-xs font-normal">
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
            </time>
        </div>
    );
};


export const Header: React.FC<HeaderProps> = ({ pageTitle, onMenuClick }) => {
  const { user, role, logout } = useAuth();
  const { state, updateSettings } = useData();
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setIsUserMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const toggleTheme = () => {
    const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    const newSettings: CenterSettings = { ...state.settings, theme: newTheme };
    updateSettings(newSettings);
  };

  const menuButtonClass = "w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 gap-4 print:hidden">
        {/* Left Section */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white truncate">{pageTitle}</h1>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden lg:block">
            <GlobalSearch />
          </div>
          <Clock />
          
          {/* Unified User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button 
                onClick={() => setIsUserMenuOpen(prev => !prev)} 
                className="flex items-center gap-2 p-1.5 md:p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all"
            >
                 <div className="hidden sm:block text-right">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
                </div>
                {React.cloneElement(ICONS.user, { className: "w-6 h-6"})}
            </button>
            {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-50 transform origin-top-right transition-all">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 mb-1 sm:hidden">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{role}</p>
                    </div>
                    <div className="px-2">
                        <button onClick={() => { toggleTheme(); setIsUserMenuOpen(false); }} className={`${menuButtonClass} rounded-lg`} title={state.settings.theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}>
                            {state.settings.theme === 'light' ? ICONS.moon : ICONS.sun}
                            <span>Giao diện: {state.settings.theme === 'light' ? 'Sáng' : 'Tối'}</span>
                        </button>
                        {role !== UserRole.ADMIN && role !== UserRole.VIEWER && (
                            <button onClick={() => { setChangePasswordModalOpen(true); setIsUserMenuOpen(false); }} className={`${menuButtonClass} rounded-lg`}>
                                {ICONS.key}
                                <span>Đổi mật khẩu</span>
                            </button>
                        )}
                    </div>
                    <div className="my-1 border-t border-gray-100 dark:border-slate-700"></div>
                    <div className="px-2">
                        <button onClick={logout} className={`${menuButtonClass} text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20`}>
                            {ICONS.logout}
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </header>
      <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)} />
    </>
  );
};
