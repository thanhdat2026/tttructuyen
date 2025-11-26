
import { forwardRef } from 'react';
import { Payroll, CenterSettings } from '../../types';

interface PrintablePayslipProps {
    payroll: Payroll;
    settings: CenterSettings;
}

const formatCurrency = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} ₫`;

export const PrintablePayslip = forwardRef<HTMLDivElement, PrintablePayslipProps>(({ payroll, settings }, ref) => {
    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-900" style={{ width: '210mm', margin: 'auto' }}>
            {/* Header */}
            <header className="text-center pb-4 border-b-2 border-gray-300 mb-6">
                <h1 className="text-xl font-bold uppercase" style={{ color: settings.themeColor }}>{settings.name}</h1>
                <p className="text-sm text-gray-600">{settings.address}</p>
                <p className="text-sm text-gray-600">SĐT: {settings.phone}</p>
                <h2 className="text-2xl font-bold mt-4 uppercase text-gray-800">PHIẾU LƯƠNG</h2>
                <p className="text-base italic text-gray-600">Kỳ: Tháng {payroll.month.split('-')[1]}/{payroll.month.split('-')[0]}</p>
            </header>

            {/* Receiver Info */}
            <div className="mb-6">
                <p><span className="font-bold">Người nhận:</span> {payroll.teacherName}</p>
                <p><span className="font-bold">Mã GV:</span> {payroll.teacherId}</p>
                <p><span className="font-bold">Ngày lập:</span> {new Date(payroll.calculationDate).toLocaleDateString('vi-VN')}</p>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-gray-400 text-sm mb-6">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-400 px-3 py-2 text-left">Khoản mục</th>
                        <th className="border border-gray-400 px-3 py-2 text-right">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-gray-400 px-3 py-2">Lương Cơ bản / Dạy (Số buổi: {payroll.sessionsTaught})</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(payroll.baseSalary)}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 px-3 py-2">Thưởng thêm</td>
                        <td className="border border-gray-400 px-3 py-2 text-right text-green-600">+{formatCurrency(payroll.bonus)}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 px-3 py-2">Khấu trừ / Phạt</td>
                        <td className="border border-gray-400 px-3 py-2 text-right text-red-600">-{formatCurrency(payroll.deduction)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                        <td className="border border-gray-400 px-3 py-2 text-lg">THỰC LĨNH</td>
                        <td className="border border-gray-400 px-3 py-2 text-right text-lg">{formatCurrency(payroll.totalSalary)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Signature */}
            <div className="grid grid-cols-2 gap-10 mt-12 text-center">
                <div>
                    <p className="font-bold">Người lập phiếu</p>
                    <p className="text-xs italic mt-16">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                    <p className="font-bold">Người nhận tiền</p>
                    <p className="text-xs italic mt-16">(Ký và ghi rõ họ tên)</p>
                </div>
            </div>
        </div>
    );
});
