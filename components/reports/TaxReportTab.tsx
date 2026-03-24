import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../hooks/useDataContext';
import { TransactionType } from '../../types';
import { Button } from '../common/Button';
import { ICONS } from '../../constants';

export const TaxReportTab: React.FC = () => {
    const { state } = useData();
    const { transactions, income, settings } = state;
    
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [startMonth, setStartMonth] = useState(currentMonthStr);
    const [endMonth, setEndMonth] = useState(currentMonthStr);
    const [reportType, setReportType] = useState<'detailed' | 'monthly_summary'>('detailed');
    
    const printRef = useRef<HTMLDivElement>(null);

    const reportData = useMemo(() => {
        const [startYear, startM] = startMonth.split('-');
        const startDate = `${startYear}-${startM}-01`;
        
        const [endYear, endM] = endMonth.split('-');
        const endDate = new Date(parseInt(endYear), parseInt(endM), 0).toISOString().split('T')[0];

        const relevantTransactions = transactions
            .filter(t => {
                const isPayment = t.type === TransactionType.PAYMENT || t.type === TransactionType.ADJUSTMENT_CREDIT;
                const isWithin = t.date >= startDate && t.date <= endDate;
                const isNotRefund = !t.description.toLowerCase().includes('hủy hóa đơn');
                return isPayment && isWithin && isNotRefund && t.amount > 0;
            });
        
        const relevantIncome = income
            .filter(i => i.date >= startDate && i.date <= endDate);

        const combined = [
            ...relevantTransactions.map(t => ({ 
                date: t.date, 
                description: `Thu học phí - ${t.description}`, 
                amount: t.amount 
            })),
            ...relevantIncome.map(i => ({ 
                date: i.date, 
                description: i.description, 
                amount: i.amount 
            }))
        ];

        // Sort by date ascending
        combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (reportType === 'monthly_summary') {
            const monthlyMap = new Map<string, number>();
            combined.forEach(item => {
                const [y, m] = item.date.split('-');
                const key = `${y}-${m}`;
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + item.amount);
            });

            const summaryData = Array.from(monthlyMap.entries()).map(([key, amount]) => {
                const [y, m] = key.split('-');
                return {
                    date: `${y}-${m}-01`, // Use 1st of month for sorting/display
                    description: `Doanh thu tháng ${m}/${y}`,
                    amount
                };
            });
            summaryData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return summaryData;
        }

        return combined;
    }, [transactions, income, startMonth, endMonth, reportType]);

    const totalAmount = reportData.reduce((sum, item) => sum + item.amount, 0);

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        if (reportType === 'monthly_summary') {
            return `Tháng ${m}/${y}`;
        }
        return `${d}/${m}/${y}`;
    };

    const periodText = startMonth === endMonth 
        ? `Tháng ${startMonth.split('-')[1]} năm ${startMonth.split('-')[0]}`
        : `Từ tháng ${startMonth.split('-')[1]}/${startMonth.split('-')[0]} đến tháng ${endMonth.split('-')[1]}/${endMonth.split('-')[0]}`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Từ tháng
                        </label>
                        <input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="form-input w-full sm:w-auto"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Đến tháng
                        </label>
                        <input
                            type="month"
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="form-input w-full sm:w-auto"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Loại báo cáo
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as 'detailed' | 'monthly_summary')}
                            className="form-select w-full sm:w-auto"
                        >
                            <option value="detailed">Chi tiết từng khoản</option>
                            <option value="monthly_summary">Tổng hợp theo tháng</option>
                        </select>
                    </div>
                </div>
                <Button onClick={handlePrint} className="flex items-center gap-2">
                    {ICONS.print} In báo cáo
                </Button>
            </div>

            {/* Print Preview Area */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 overflow-x-auto text-black print-area">
                <div ref={printRef} className="min-w-[800px]" style={{ fontFamily: '"Times New Roman", Times, serif', backgroundColor: 'white', color: 'black', padding: '20px' }}>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-1/2">
                            <p className="font-bold uppercase">HỘ, CÁ NHÂN KINH DOANH: <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[100px] inline-block">{settings.name || ''}</span></p>
                            <p>Địa chỉ: <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[200px] inline-block whitespace-normal break-words">{settings.address || ''}</span></p>
                            <p>Mã số thuế: <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[150px] inline-block"></span></p>
                        </div>
                        <div className="w-1/2 text-right">
                            <p className="font-bold">Mẫu số S1a-HKD</p>
                            <p className="italic text-sm">(Kèm theo Thông tư số 152/2025/TT-BTC<br/>ngày 31 tháng 12 năm 2025 của Bộ trưởng<br/>Bộ Tài chính)</p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-bold uppercase mb-2">SỔ DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h1>
                        <p className="text-left max-w-2xl mx-auto">Địa điểm kinh doanh: <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[200px] inline-block whitespace-normal break-words">{settings.address || ''}</span></p>
                        <p className="text-left max-w-2xl mx-auto">Kỳ kê khai: <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[150px] inline-block">{periodText}</span></p>
                    </div>

                    {/* Table */}
                    <div className="mb-2 italic">Đơn vị tính: VNĐ</div>
                    <table className="w-full border-collapse border border-black mb-8 table-fixed">
                        <thead>
                            <tr>
                                <th className="border border-black p-2 text-center w-32">Ngày tháng</th>
                                <th className="border border-black p-2 text-center">Diễn giải</th>
                                <th className="border border-black p-2 text-center w-48">Số tiền</th>
                            </tr>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 text-center font-normal">A</th>
                                <th className="border border-black p-1 text-center font-normal">B</th>
                                <th className="border border-black p-1 text-center font-normal">1</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                reportData.map((row, index) => (
                                    <tr key={index}>
                                        <td className="border border-black p-2 text-center align-top">{formatDate(row.date)}</td>
                                        <td className="border border-black p-2 align-top whitespace-normal break-words">{row.description}</td>
                                        <td className="border border-black p-2 text-right align-top">{row.amount.toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="border border-black p-2 text-center h-8"></td>
                                    <td className="border border-black p-2 h-8"></td>
                                    <td className="border border-black p-2 h-8"></td>
                                </tr>
                            )}
                            <tr>
                                <td colSpan={2} className="border border-black p-2 font-bold text-center">Tổng cộng</td>
                                <td className="border border-black p-2 font-bold text-right">{totalAmount.toLocaleString('vi-VN')}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="flex justify-end mt-8">
                        <div className="text-center w-1/2">
                            <p className="italic mb-1">
                                Ngày <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[30px] inline-block text-center">{today.getDate()}</span> 
                                tháng <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[30px] inline-block text-center">{today.getMonth() + 1}</span> 
                                năm <span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[50px] inline-block text-center">{today.getFullYear()}</span>
                            </p>
                            <p className="font-bold uppercase">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br/>CÁ NHÂN KINH DOANH</p>
                            <p className="italic text-sm mb-24">(Ký, ghi rõ họ tên, đóng dấu (nếu có))</p>
                            <p className="font-bold"><span contentEditable className="outline-none border-b border-dashed border-gray-400 min-w-[150px] inline-block text-center">{settings.name}</span></p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0;
                        margin: 0;
                        border: none;
                        box-shadow: none;
                    }
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                }
            `}</style>
        </div>
    );
};
