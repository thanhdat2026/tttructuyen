
import React, { useMemo, useState } from 'react';
import { useData } from '../hooks/useDataContext';
import { Calendar } from '../components/common/Calendar';
import { ClassSchedule } from '../types';
import { ROUTES, ICONS } from '../constants';
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
    startTime: string;
    endTime: string;
}

const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const AttendanceHubScreen: React.FC = () => {
    const { state } = useData();
    const [displayMonth, setDisplayMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isScheduleVisible, setIsScheduleVisible] = useState(true);

    const normalizedSelectedDate = useMemo(() => {
        const d = new Date(selectedDate);
        d.setHours(0,0,0,0);
        return d;
    }, [selectedDate]);


    const monthlyCalendarEvents = useMemo(() => {
        const eventsMap = new Map<string, CalendarEvent>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDateString = (dateStr: string) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };
        
        const selectedYear = displayMonth.getFullYear();
        const selectedMonth = displayMonth.getMonth();
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

        state.attendance.forEach(record => {
            const recordDate = parseDateString(record.date);
            if (recordDate >= startOfMonth && recordDate <= endOfMonth) {
                const key = `${record.classId}|${record.date}`;
                const cls = state.classes.find(c => c.id === record.classId);
                if (cls) {
                    const scheduleForDay = cls.schedule.find(s => dayOfWeekToNumber[s.dayOfWeek] === recordDate.getDay());
                     eventsMap.set(key, {
                        date: recordDate,
                        title: cls.name,
                        link: ROUTES.ATTENDANCE_DETAIL.replace(':classId', cls.id).replace(':date', record.date),
                        color: '#10b981', // Green for "Done"
                        linkState: { returnTo: ROUTES.ATTENDANCE_HUB },
                        statusText: 'Đã điểm danh',
                        startTime: scheduleForDay?.startTime || 'N/A',
                        endTime: scheduleForDay?.endTime || 'N/A',
                    });
                }
            }
        });

        const loopDate = new Date(startOfMonth);
        while (loopDate <= endOfMonth) {
            const currentDate = new Date(loopDate);
            const dayOfWeek = currentDate.getDay();
            const dateString = formatDateString(currentDate);

            state.classes.forEach(cls => {
                cls.schedule?.forEach(s => {
                    if (dayOfWeekToNumber[s.dayOfWeek] === dayOfWeek) {
                        const key = `${cls.id}|${dateString}`;
                        if (!eventsMap.has(key)) {
                            const isPast = currentDate < today;
                            eventsMap.set(key, {
                                date: new Date(currentDate),
                                title: cls.name,
                                link: ROUTES.ATTENDANCE_DETAIL.replace(':classId', cls.id).replace(':date', dateString),
                                color: isPast ? '#ef4444' : '#9ca3af', // Red for "Unmarked" : Gray for "Scheduled"
                                linkState: { returnTo: ROUTES.ATTENDANCE_HUB },
                                statusText: isPast ? 'Chưa điểm danh' : 'Lịch học',
                                startTime: s.startTime,
                                endTime: s.endTime,
                            });
                        }
                    }
                });
            });
            loopDate.setDate(loopDate.getDate() + 1);
        }
        
        return Array.from(eventsMap.values());
    }, [state.classes, state.attendance, displayMonth]);
        
    const eventsForSelectedDay = useMemo(() => {
        const selectedDateString = formatDateString(normalizedSelectedDate);
        return monthlyCalendarEvents
            .filter(event => formatDateString(event.date) === selectedDateString)
            .sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [monthlyCalendarEvents, normalizedSelectedDate]);
    
    return (
        <div className="flex flex-col h-full -m-4 md:-m-6 text-gray-800 dark:text-white">
             <div className="p-4 md:p-6 pb-2 flex-shrink-0">
                <h2 className="text-xl md:text-2xl font-bold">Lịch điểm danh</h2>
            </div>
            <div className="px-4 md:px-6">
                <div className="card-base p-0 md:p-2">
                    <Calendar 
                        displayDate={displayMonth}
                        onMonthChange={setDisplayMonth}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />
                </div>
            </div>
            
            <div className="flex-grow bg-white dark:bg-gray-800 rounded-t-2xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden mt-4">
                <div className="px-4 pt-4 pb-2 flex-shrink-0">
                    <button
                        onClick={() => setIsScheduleVisible(!isScheduleVisible)}
                        className="w-full flex flex-col items-center py-1 group"
                        aria-expanded={isScheduleVisible}
                        aria-controls="schedule-list"
                    >
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors"></div>
                    </button>
                </div>

                <div
                    id="schedule-list"
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isScheduleVisible ? 'max-h-[70vh]' : 'max-h-0'}`}
                >
                    <div className="px-4 pb-4 overflow-y-auto h-full">
                        {eventsForSelectedDay.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                {eventsForSelectedDay.map((event, idx) => (
                                    <Link 
                                        to={event.link} 
                                        state={event.linkState} 
                                        key={idx}
                                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: event.color }}></div>
                                            <div>
                                                <h3 className="font-bold text-base text-gray-900 dark:text-white">{event.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                                    {event.statusText} • {event.startTime} - {event.endTime}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-gray-400 group-hover:text-primary transition-colors">
                                            {ICONS.chevronRight}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center py-10">
                                <p className="text-gray-500">Không có lịch trình</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
