
import React, { useMemo, useState } from 'react';
import { useData } from '../hooks/useDataContext';
import { Calendar } from '../components/common/Calendar';
import { ClassSchedule, AttendanceRecord } from '../types';
import { ROUTES, ICONS } from '../constants';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';

const dayOfWeekToNumber: Record<ClassSchedule['dayOfWeek'], number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
};

interface CalendarEvent {
    date: Date;
    title: string;
    link: string;
    color: string;
    linkState?: object;
    statusText: string;
}

export const AttendanceHubScreen: React.FC = () => {
    const { state } = useData();
    const [activeDate, setActiveDate] = useState(new Date());
    
    // Set hours to 0 to compare dates correctly
    activeDate.setHours(0,0,0,0);

    const calendarEvents = useMemo(() => {
        const events: CalendarEvent[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDateString = (dateStr: string) => {
            if (!dateStr) return new Date();
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const formatDateString = (date: Date) => {
            return date.toISOString().split('T')[0];
        };
        
        const selectedYear = activeDate.getFullYear();
        const selectedMonth = activeDate.getMonth();
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

        const existingSessions = new Set<string>();

        // 1. Process actual attendance records
        state.attendance.forEach(record => {
            const recordDate = parseDateString(record.date);
            if (recordDate >= startOfMonth && recordDate <= endOfMonth) {
                const key = `${record.classId}|${record.date}`;
                if (!existingSessions.has(key)) {
                    const cls = state.classes.find(c => c.id === record.classId);
                    if (cls) {
                        events.push({
                            date: recordDate,
                            title: cls.name,
                            link: ROUTES.ATTENDANCE_DETAIL.replace(':classId', cls.id).replace(':date', record.date),
                            color: '#10b981', // Green
                            linkState: { returnTo: ROUTES.ATTENDANCE_HUB },
                            statusText: 'Đã điểm danh'
                        });
                        existingSessions.add(key);
                    }
                }
            }
        });

        // 2. Fill in scheduled classes
        const loopDate = new Date(startOfMonth);
        while (loopDate <= endOfMonth) {
            const currentDate = new Date(loopDate);
            const dayOfWeek = currentDate.getDay();
            const dateString = formatDateString(currentDate);
            const isPast = currentDate < today;

            state.classes.forEach(cls => {
                if (cls.schedule && cls.schedule.some(s => dayOfWeekToNumber[s.dayOfWeek] === dayOfWeek)) {
                    const key = `${cls.id}|${dateString}`;
                    if (!existingSessions.has(key)) {
                        let color = '#9ca3af'; // Gray
                        let statusText = 'Lịch học';
                        if (isPast) {
                            color = '#ef4444'; // Red
                            statusText = 'Chưa điểm danh';
                        }
                        events.push({
                            date: currentDate,
                            title: cls.name,
                            link: ROUTES.ATTENDANCE_DETAIL.replace(':classId', cls.id).replace(':date', dateString),
                            color: color,
                            linkState: { returnTo: ROUTES.ATTENDANCE_HUB },
                            statusText: statusText
                        });
                    }
                }
            });
            loopDate.setDate(loopDate.getDate() + 1);
        }
        return events;
    }, [state.classes, state.attendance, activeDate]);
        
    const eventsForSelectedDay = useMemo(() => {
        const selectedDateString = activeDate.toISOString().split('T')[0];
        return calendarEvents.filter(event => 
            event.date.toISOString().split('T')[0] === selectedDateString
        ).sort((a,b) => a.title.localeCompare(b.title));
    }, [calendarEvents, activeDate]);

    return (
        <div className="flex flex-col h-full -m-4 md:-m-6 bg-gray-100 dark:bg-black text-gray-800 dark:text-white">
             <div className="p-4 md:p-6 pb-0 flex-shrink-0">
                <h1 className="text-2xl md:text-3xl font-bold">Lịch điểm danh</h1>
            </div>
            <div className="p-4 md:p-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                    <Calendar 
                        displayDate={activeDate}
                        onMonthChange={setActiveDate}
                        selectedDate={activeDate}
                        onDateSelect={setActiveDate}
                    />
                </div>
            </div>
            <div className="text-center -mt-2 mb-4">
                 <Button variant="secondary" size="sm" onClick={() => setActiveDate(new Date())}>Hôm nay</Button>
            </div>
            
            <div className="flex-grow bg-white dark:bg-gray-900 rounded-t-2xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] p-4 flex flex-col">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 flex-shrink-0"></div>
                <h2 className="font-bold text-lg text-center mb-3 flex-shrink-0">Lớp học ở đây</h2>
                
                <div className="flex-grow overflow-y-auto">
                    {eventsForSelectedDay.length > 0 ? (
                        <div className="space-y-3">
                            {eventsForSelectedDay.map((event, idx) => (
                                <Link 
                                    to={event.link} 
                                    state={event.linkState} 
                                    key={idx}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: event.color }}></div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900 dark:text-white">{event.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">{event.statusText}</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 group-hover:text-primary transition-colors">
                                        {ICONS.chevronRight}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center">
                            <p className="text-gray-500">Không có lịch trình</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
