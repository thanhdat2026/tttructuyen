
import React, { useState, useEffect } from 'react';
import { ICONS } from '../../constants';
import { Link } from 'react-router-dom';

interface CalendarEvent {
    date: Date;
    title: string;
    link: string;
    color: string;
    linkState?: object;
}

interface CalendarProps {
    events: CalendarEvent[];
    displayDate?: Date; // New prop to control the month shown
    onMonthChange?: (date: Date) => void; // Callback when user changes month via calendar buttons
    viewMode?: 'month' | 'list'; // Optional prop if we want to support list view inside here later, but ignoring for now
}

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const Calendar: React.FC<CalendarProps> = ({ events, displayDate, onMonthChange }) => {
    const [currentDate, setCurrentDate] = useState(displayDate || new Date());

    // Sync internal state if displayDate prop changes
    useEffect(() => {
        if (displayDate) {
            setCurrentDate(displayDate);
        }
    }, [displayDate]);

    const changeMonth = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + amount);
        setCurrentDate(newDate);
        if (onMonthChange) {
            onMonthChange(newDate);
        }
    };

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{ICONS.chevronLeft}</button>
                <h2 className="text-base md:text-xl font-bold">
                    {`Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
                </h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{ICONS.chevronRight}</button>
            </div>
        );
    };

    const renderDays = () => {
        return (
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2">
                {dayNames.map(day => <div key={day} className="py-1">{day}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        if (monthEnd.getDay() !== 6) {
             endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
        }

        const rows = [];
        let days = [];
        let day = new Date(startDate);
        const today = new Date();
        today.setHours(0,0,0,0);

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = new Date(day);
                const isCurrentMonth = cloneDay.getMonth() === currentDate.getMonth();
                const isToday = cloneDay.getTime() === today.getTime();

                const dayEvents = events.filter(e => {
                    const eventDate = new Date(e.date);
                    return eventDate.getFullYear() === cloneDay.getFullYear() &&
                           eventDate.getMonth() === cloneDay.getMonth() &&
                           eventDate.getDate() === cloneDay.getDate();
                });

                days.push(
                    <div key={day.toString()} className={`p-0.5 md:p-1 min-h-[60px] md:h-28 border border-gray-200 dark:border-gray-700 flex flex-col ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                        <div className={`text-[10px] md:text-sm font-semibold flex items-center justify-center mb-1 ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 md:w-6 md:h-6' : ''} ${isCurrentMonth ? '' : 'text-gray-400'}`}>
                            {cloneDay.getDate()}
                        </div>
                        <div className="flex-1 space-y-0.5 md:space-y-1 overflow-y-auto max-h-[45px] md:max-h-[80px] scrollbar-hide">
                            {dayEvents.map((event, index) => (
                                <Link to={event.link} state={event.linkState} key={index} title={event.title} className="block text-[9px] md:text-xs px-1 py-0.5 rounded text-white truncate leading-tight" style={{backgroundColor: event.color}}>
                                    {event.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                );
                day.setDate(day.getDate() + 1);
            }
            rows.push(<div key={day.toString()} className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">{days}</div>);
            days = [];
        }
        return <div>{rows}</div>;
    };


    return (
        <div className="card-base p-2 md:p-4">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};
