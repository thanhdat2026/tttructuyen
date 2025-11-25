
import { forwardRef } from 'react';
import { Payroll, CenterSettings } from '../../types';

interface PrintablePayslipProps {
    payroll: Payroll;
    settings: CenterSettings;
}

const formatCurrency = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} ₫`;

export const PrintablePayslip = forwardRef<HTMLDivElement, PrintablePayslipProps>(({ payroll, settings }, ref) => {
    // Explicitly set text color to black using inline styles to override any potential dark mode inheritance
    const textStyle = { color: '#000' };

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-sm" style={{ width: '210mm', minHeight: '148mm', margin: 'auto', ...textStyle }}>
            {/* Header */}
            <header className="text-center pb-2 border-b border-gray-300" style={textStyle}>
                <h1 className="text-lg font-bold uppercase">{settings.name}</h1>
                <p className="text-xs">{settings.address}</p>
                <h2 className="text-xl font-bold mt-4 uppercase">PHIẾU LƯƠNG</h2>
                <p className="text-xs">Kỳ: {payroll.month}</p>
            </header>

            {/* Info */}
            <section className="mt-6">
                <div className="grid grid-cols-2 gap-x-8">
                    <p><strong className="inline-block w-24">Mã GV:</strong> {payroll.teacherId}</p>
                    <p><strong className="inline-block w-24">Họ tên:</strong> {payroll.teacherName}</p>
                    <p><strong className="inline-block w-24">Ngày lập:</strong> {payroll.calculationDate}</p>
                    <p><strong className="inline-block w-24">Trạng thái:</strong> {payroll.status === 'PAID' ? `Đã thanh toán (${payroll.paidDate})` : 'Chưa thanh toán'}</p>
                </div>
            </section>

            {/* Table */}
            <section className="mt-6">
                <table className="w-full text-left text-sm border-collapse" style={textStyle}>
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-2 px-2 border border-gray-400">Diễn giải</th>
                            <th className="py-2 px-2 border border-gray-400 text-right">Số tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="py-2 px-2 border border-gray-400">Lương cơ bản / Theo buổi ({payroll.sessionsTaught} buổi)</td>
                            <td className="py-2 px-2 border border-gray-400 text-right">{formatCurrency(payroll.baseSalary)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-2 border border-gray-400">Thưởng (+)</td>
                            <td className="py-2 px-2 border border-gray-400 text-right">{formatCurrency(payroll.bonus)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-2 border border-gray-400">Khấu trừ (-)</td>
                            <td className="py-2 px-2 border border-gray-400 text-right">{formatCurrency(payroll.deduction)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-50">
                            <td className="py-2 px-2 border border-gray-400 text-right uppercase">Thực lĩnh</td>
                            <td className="py-2 px-2 border border-gray-400 text-right text-lg">{formatCurrency(payroll.totalSalary)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            {/* Footer */}
            <footer className="flex justify-between mt-12 text-center" style={textStyle}>
                <div className="w-1/2">
                    <p className="font-semibold">Người lập phiếu</p>
                    <p className="mt-12">(Ký tên)</p>
                </div>
                <div className="w-1/2">
                    <p className="font-semibold">Người nhận</p>
                    <p className="mt-12">{payroll.teacherName}</p>
                </div>
            </footer>
        </div>
    );
});
