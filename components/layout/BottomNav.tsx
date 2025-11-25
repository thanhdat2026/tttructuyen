
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES, ICONS } from '../../constants';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface BottomNavProps {
  onMenuClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick }) => {
  const { role } = useAuth();

  const getLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClasses = "flex flex-col items-center justify-center w-full h-full space-y-1";
    const activeClasses = "text-primary font-semibold";
    const inactiveClasses = "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800";
    return isActive ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
  };

  const isFinanceVisible = role === UserRole.ADMIN || role === UserRole.MANAGER || role === UserRole.ACCOUNTANT;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        <NavLink to={ROUTES.DASHBOARD} className={getLinkClass} end>
          {React.cloneElement(ICONS.dashboard, { className: "w-6 h-6" })}
          <span className="text-[10px]">Tổng quan</span>
        </NavLink>
        
        <NavLink to={ROUTES.CLASSES} className={getLinkClass}>
          {React.cloneElement(ICONS.classes, { className: "w-6 h-6" })}
          <span className="text-[10px]">Lớp học</span>
        </NavLink>

        <NavLink to={ROUTES.STUDENTS} className={getLinkClass}>
          {React.cloneElement(ICONS.students, { className: "w-6 h-6" })}
          <span className="text-[10px]">Học viên</span>
        </NavLink>

        {isFinanceVisible ? (
             <NavLink to={ROUTES.FINANCE} className={getLinkClass}>
                {React.cloneElement(ICONS.finance, { className: "w-6 h-6" })}
                <span className="text-[10px]">Tài chính</span>
            </NavLink>
        ) : (
            <NavLink to={ROUTES.TEACHERS} className={getLinkClass}>
                {React.cloneElement(ICONS.teachers, { className: "w-6 h-6" })}
                <span className="text-[10px]">Giáo viên</span>
            </NavLink>
        )}

        <button type="button" onClick={onMenuClick} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 group">
           {React.cloneElement(ICONS.menu, { className: "w-6 h-6 group-hover:text-gray-900 dark:group-hover:text-white" })}
           <span className="text-[10px] group-hover:text-gray-900 dark:group-hover:text-white">Menu</span>
        </button>
      </div>
    </div>
  );
};
