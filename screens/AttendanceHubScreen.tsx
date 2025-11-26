
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useData } from '../hooks/useDataContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Calendar } from '../components/common/Calendar';
import { ClassSchedule, UserRole, AttendanceRecord } from '../types';
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

const currentYear = new Date().getFullYear();
// Range: 2 years future, 8 years past
const years = Array.from({ length: 10 }, (_, i) => currentYear - i + 2); 
const months = Array.from({ length: 12 }, (_, i) => i + 1);

interface CalendarEvent {
    date: Date;
    title: string;
    link: string;
    color: string;
    linkState?: object;
    statusText: string; // Helper text for list view
}

export const AttendanceHubScreen: React.FC = () => {
    const { state, updateAttendance } = useData();
    const { role, user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list'); // Default to list for better mobile UX

    const selectedMonth = selectedDate.getMonth() + 1;
    const selectedYear = selectedDate.getFullYear();
    
    const canManage = role === UserRole.ADMIN || role === UserRole.MANAGER;
    const canExport = canManage || role === UserRole.TEACHER;

    // Detect mobile on mount to set default view
    useEffect(() => {
        if (window.innerWidth >= 768) {
            setViewMode('calendar');
        }
    }, []);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonth = parseInt(e.target.value, 10);
        setSelectedDate(new Date(selectedYear, newMonth - 1, 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value, 10);
        setSelectedDate(new Date(newYear, selectedMonth - 1, 1));
    };

    const handleCalendarNavigate = (date: Date) => {
        setSelectedDate(date);
    };

    const calendarEvents = useMemo(() => {
        const events: CalendarEvent[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Create a map for quick lookup of existing attendance
        // Key: "classId|dateString"
        const markedDates = new Set(state.attendance.map(a => `${a.classId}|${a.date}`));

        // Determine range to render: The entire selected month
        // We add some buffer days to handle the calendar grid view (previous/next month days)
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0);
        
        // Extend range to cover full calendar grid (start from Sunday before, end at Saturday after)
        const renderStart = new Date(startOfMonth);
        renderStart.setDate(renderStart.getDate() - renderStart.getDay()); // Go back to Sunday
        
        const renderEnd = new Date(endOfMonth);
        if (renderEnd.getDay() !== 6) {
            renderEnd.setDate(renderEnd.getDate() + (6 - renderEnd.getDay())); // Go forward to Saturday
        }

        // Iterate through every day in the render range
        for (let d = new Date(renderStart); d <= renderEnd; d.setDate(d.getDate() + 1)) {
            const currentDate = new Date(d);
            const dayOfWeek = currentDate.getDay();
            const dateString = currentDate.toISOString().split('T')[0];
            const isPast = currentDate < today;

            state.classes.forEach(cls => {
                // Check if the class is scheduled for this day of the week
                if (cls.schedule && cls.schedule.some(s => dayOfWeekToNumber[s.dayOfWeek] === dayOfWeek)) {
                    
                    // Check if attendance has already been taken
                    const isMarked = markedDates.has(`${cls.id}|${dateString}`);
                    
                    let color = '#9ca3af'; // Default Gray (Scheduled / Future)
                    let statusText = 'Sắp tới';

                    if (isMarked) {
                        // If marked, it's definitely done (Green)
                        // We prioritize existing records. This preserves history even if schedule changes later.
                        color = '#10b981'; 
                        statusText = 'Đã điểm danh';
                    } else if (isPast) {
                        // If past and NOT marked -> Missed/Late/Forgot (Red)
                        color = '#ef4444'; 
                        statusText = 'Chưa điểm danh';
                    } else {
                        // Future and NOT marked -> Scheduled (Gray)
                        color = '#6b7280';
                        statusText = 'Lịch học';
                    }

                    events.push({
                        date: new Date(currentDate),
                        title: cls.name,
                        link: ROUTES.ATTENDANCE_DETAIL.replace(':classId', cls.id).replace(':date', dateString),
                        color: color,
                        linkState: { returnTo: ROUTES.ATTENDANCE_HUB },
                        statusText: statusText
                    });
                }
            });
        }
        return events;
    }, [state.classes, state.attendance, selectedMonth, selectedYear]);
        
    const handleExport = () => {
        const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        let recordsToExport = state.attendance.filter(a => a.date.startsWith(monthStr));

        if (role === UserRole.TEACHER) {
            const teacherClassIds = new Set(state.classes.filter(c => (c.teacherIds || []).includes(user!.id)).map(c => c.id));
            recordsToExport = recordsToExport.filter(a => teacherClassIds.has(a.classId));
        }

        if (recordsToExport.length === 0) {
            toast.info(`Không có dữ liệu điểm danh trong tháng ${selectedMonth}/${selectedYear} để xuất.`);
            return;
        }

        const exportData = {
            month: monthStr,
            records: recordsToExport,
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diemdanh_thang_${selectedMonth}-${selectedYear}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Xuất dữ liệu thành công!');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Không thể đọc file.");
                
                const importedData = JSON.parse(text);

                if (!importedData.month || !Array.isArray(importedData.records)) {
                    throw new Error("Định dạng file không hợp lệ.");
                }

                await updateAttendance(importedData.records as AttendanceRecord[]);
                toast.success(`Đã nhập ${importedData.records.length} bản ghi điểm danh từ file. Dữ liệu đã được cập nhật.`);

            } catch (error: any) {
                toast.error(error.message || 'File không hợp lệ hoặc bị lỗi.');
            } finally {
                if(event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Group events by date for List View
    const eventsByDate = useMemo(() => {
        const grouped: Record<string, CalendarEvent[]> = {};
        // Sort events by date
        const sortedEvents = [...calendarEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        sortedEvents.forEach(event => {
            const dateKey = event.date.toISOString().split('T')[0];
            // Only include events for the selected month/year in the list view to keep it focused
            if (event.date.getMonth() + 1 === selectedMonth && event.date.getFullYear() === selectedYear) {
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(event);
            }
        });
        return grouped;
    }, [calendarEvents, selectedMonth, selectedYear]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">Lịch điểm danh</h1>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Danh sách
                    </button>
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Lịch
                    </button>
                </div>
            </div>
            
             <div className="card-base p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                        <span className="font-medium whitespace-nowrap">Thời gian:</span>
                        <select value={selectedMonth} onChange={handleMonthChange} className="form-select py-1.5 text-sm">
                            {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                        </select>
                        <select value={selectedYear} onChange={handleYearChange} className="form-select py-1.5 text-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        {canExport && (
                            <Button onClick={handleExport} variant="secondary" size="sm" className="whitespace-nowrap">
                                {ICONS.export} Xuất
                            </Button>
                        )}
                        {canManage && (
                            <>
                                <Button onClick={handleImportClick} variant="secondary" size="sm" className="whitespace-nowrap">
                                    {ICONS.restore} Nhập
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm px-1">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></span> Đã điểm danh</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></span> Chưa điểm danh</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-500 mr-1.5"></span> Lịch học</div>
            </div>
            
            {/* Calendar View */}
            {viewMode === 'calendar' && (
                <Calendar 
                    events={calendarEvents} 
                    displayDate={selectedDate}
                    onMonthChange={handleCalendarNavigate}
                />
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="space-y-4">
                    {Object.keys(eventsByDate).length > 0 ? (
                        Object.entries(eventsByDate).map(([dateStr, events]) => {
                            const date = new Date(dateStr);
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            return (
                                <div key={dateStr} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className={`px-4 py-2 font-semibold text-sm flex justify-between items-center ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                                        <span>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                                        {isToday && <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full">Hôm nay</span>}
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {events.map((event, idx) => (
                                            <Link 
                                                to={event.link} 
                                                state={event.linkState} 
                                                key={idx}
                                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: event.color }}></div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white">{event.title}</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{event.statusText}</p>
                                                    </div>
                                                </div>
                                                <div className="text-gray-400 group-hover:text-primary transition-colors">
                                                    {ICONS.chevronRight}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Không có lịch học nào trong tháng này.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
