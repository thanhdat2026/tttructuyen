import React, { useMemo } from 'react';
import { useData } from '../../hooks/useDataContext';
import { AttendanceStatus } from '../../types';
import { ICONS } from '../../constants';

interface AbsentStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
}

export const AbsentStudentsModal: React.FC<AbsentStudentsModalProps> = ({ isOpen, onClose, date }) => {
    const { state } = useData();

    const absentRecords = useMemo(() => {
        const records: { studentName: string; className: string; note: string; phone: string }[] = [];
        
        state.attendance.forEach(record => {
            if (record.date === date && record.status === AttendanceStatus.ABSENT) {
                const student = state.students.find(s => s.id === record.studentId);
                const cls = state.classes.find(c => c.id === record.classId);
                
                if (student && cls) {
                    records.push({
                        studentName: student.name,
                        className: cls.name,
                        note: record.note || '',
                        phone: student.phone || 'Không có',
                    });
                }
            }
        });
        
        return records.sort((a, b) => a.className.localeCompare(b.className) || a.studentName.localeCompare(b.studentName));
    }, [state.attendance, state.students, state.classes, date]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 md:p-6 border-b dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        Học sinh nghỉ ngày {new Date(date).toLocaleDateString('vi-VN')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        {ICONS.close}
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {absentRecords.length > 0 ? (
                        <div className="space-y-4">
                            {absentRecords.map((record, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{record.studentName}</h3>
                                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-xs font-semibold rounded-full">
                                            Vắng mặt
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <p><span className="font-medium">Lớp:</span> {record.className}</p>
                                        <p><span className="font-medium">SĐT:</span> {record.phone}</p>
                                        {record.note && (
                                            <p className="col-span-1 md:col-span-2 text-orange-600 dark:text-orange-400">
                                                <span className="font-medium">Ghi chú:</span> {record.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            Không có học sinh nào nghỉ trong ngày này.
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
