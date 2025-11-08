import React from 'react';

export interface AttendanceReportData {
    id: string;
    name: string;
    classNames: string;
    attendanceCount: number;
}

export const PrintableAttendanceReport: React.FC<{
    data: AttendanceReportData[];
    title: string;
}> = ({ data, title }) => {
    return (
        <div className="bg-white p-6 text-black font-sans">
            <h2 className="text-2xl font-bold text-center mb-6">{title}</h2>
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã HV</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Họ tên</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Các lớp học</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Số buổi có mặt</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map(item => (
                        <tr key={item.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{item.id}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{item.name}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{item.classNames}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-center">{item.attendanceCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};