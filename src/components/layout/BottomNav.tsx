import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface BottomNavProps {
  onMenuClick: () => void;
}

const navIcons = {
    dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 14H3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zm0-8H3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>,
    classes: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    students: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    finance: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    menu: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
}

export const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick }) => {
  const { role } = useAuth();

  const getLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClasses = "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200";
    const activeClasses = "text-primary font-semibold";
    const inactiveClasses = "text-gray-500 dark:text-gray-400 hover:text-primary";
    return isActive ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
  };

  const isFinanceVisible = role === UserRole.ADMIN || role === UserRole.MANAGER || role === UserRole.ACCOUNTANT || role === UserRole.VIEWER;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        <NavLink to={ROUTES.DASHBOARD} className={getLinkClass} end>
          {React.cloneElement(navIcons.dashboard, { className: "w-6 h-6" })}
          <span className="text-[10px]">Tổng quan</span>
        </NavLink>
        
        <NavLink to={ROUTES.CLASSES} className={getLinkClass}>
          {React.cloneElement(navIcons.classes, { className: "w-6 h-6" })}
          <span className="text-[10px]">Lớp học</span>
        </NavLink>

        <NavLink to={ROUTES.STUDENTS} className={getLinkClass}>
          {React.cloneElement(navIcons.students, { className: "w-6 h-6" })}
          <span className="text-[10px]">Học viên</span>
        </NavLink>

        {isFinanceVisible && (
             <NavLink to={ROUTES.FINANCE} className={getLinkClass}>
                {React.cloneElement(navIcons.finance, { className: "w-6 h-6" })}
                <span className="text-[10px]">Tài chính</span>
            </NavLink>
        )}

        <button type="button" onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 dark:text-gray-400 hover:text-primary group">
           {React.cloneElement(navIcons.menu, { className: "w-6 h-6" })}
           <span className="text-[10px]">Menu</span>
        </button>
      </div>
    </div>
  );
};
