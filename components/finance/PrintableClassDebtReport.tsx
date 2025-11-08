import React, { forwardRef } from 'react';
import { Student, CenterSettings } from '../../types';

interface PrintableClassDebtReportProps {
    students: Student[];
    className: string;
    settings: CenterSettings;
}

const formatCurrencyWithSign = (amount: number) => {
    const roundedAmount = Math.round(amount);
    return `${roundedAmount.toLocaleString('vi-VN')} ₫`;
};

const formatCurrency = (amount: number) => `${Math.abs(Math.round(amount)).toLocaleString('vi-VN')} ₫`;

export const PrintableClassDebtReport = forwardRef<HTMLDivElement, PrintableClassDebtReportProps>(({ students, className, settings }, ref) => {
    
    const totalDebt = students
        .filter(s => s.balance < 0)
        .reduce((sum, s) => sum + s.balance, 0);

    // Explicitly set text color to black using inline styles to override any potential dark mode inheritance issues during canvas rendering.
    const textStyle = { color: '#000' };

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-sm" style={{ width: '210mm', minHeight: '297mm', margin: 'auto', ...textStyle }}>
            {/* Header */}
            <header className="text-center pb-2" style={textStyle}>
                <h1 className="text-lg font-bold uppercase">{settings.name}</h1>
                <p className="text-xs">{settings.address}</p>
                <div className="w-full border-t border-black my-4"></div>
                <h2 className="text-xl font-bold mt-4 uppercase">BÁO CÁO TÀI CHÍNH - LỚP {className.toUpperCase()}</h2>
                <p className="text-xs">Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
            </header>

            {/* Table */}
            <section className="mt-8">
                <table className="w-full text-left text-xs border-collapse" style={textStyle}>
                    <thead>
                        <tr>
                            <th className="py-2 px-2 font-bold border border-black w-12 text-center">STT</th>
                            <th className="py-2 px-2 font-bold border border-black w-24">Mã HV</th>
                            <th className="py-2 px-2 font-bold border border-black">Họ tên</th>
                            <th className="py-2 px-2 font-bold border border-black text-right w-40">Số dư</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={student.id}>
                                <td className="py-2 px-2 border border-black text-center">{index + 1}</td>
                                <td className="py-2 px-2 border border-black">{student.id}</td>
                                <td className="py-2 px-2 border border-black">{student.name}</td>
                                <td className={`py-2 px-2 border border-black text-right ${student.balance < 0 ? 'font-bold' : ''}`}>
                                    {formatCurrencyWithSign(student.balance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold">
                            <td colSpan={3} className="py-2 px-2 border border-black text-right">TỔNG CÔNG NỢ</td>
                            <td className="py-2 px-2 border border-black text-right">{formatCurrency(totalDebt)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            {/* Footer */}
            <footer className="text-right text-xs" style={{marginTop: '100px', ...textStyle}}>
                <p className="font-semibold">Người lập báo cáo</p>
                <p className="mt-16">(Ký và ghi rõ họ tên)</p>
            </footer>
        </div>
    );
});