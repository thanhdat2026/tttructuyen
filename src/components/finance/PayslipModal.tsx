
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyInput } from '../common/CurrencyInput';
import { Payroll } from '../../types';
import { useData } from '../../hooks/useDataContext';
import { useToast } from '../../hooks/useToast';
import { ICONS } from '../../constants';
import { PrintablePayslip } from './PrintablePayslip';

interface PayslipModalProps {
    isOpen: boolean;
    onClose: () => void;
    payroll: Payroll | null;
    readOnly?: boolean;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, payroll, readOnly = false }) => {
    const { state, updatePayroll } = useData();
    const { toast } = useToast();
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [status, setStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
    const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (payroll) {
            setBonus(payroll.bonus || 0);
            setDeduction(payroll.deduction || 0);
            setStatus(payroll.status || 'UNPAID');
            setPaidDate(payroll.paidDate || new Date().toISOString().split('T')[0]);
        }
    }, [payroll, isOpen]);

    const baseSalary = payroll ? payroll.baseSalary : 0;
    const totalSalary = baseSalary + bonus - deduction;

    const handleSave = async () => {
        if (!payroll || readOnly) return;
        setIsSaving(true);
        try {
            const updatedPayroll: Payroll = {
                ...payroll,
                bonus,
                deduction,
                totalSalary,
                status,
                paidDate: status === 'PAID' ? paidDate : undefined,
            };
            await updatePayroll(updatedPayroll);
            toast.success('Đã cập nhật bảng lương.');
            onClose();
        } catch (error) {
            toast.error('Lỗi khi cập nhật bảng lương.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!printRef.current || !window.html2canvas) {
            toast.error("Lỗi thư viện xuất ảnh.");
            return;
        }
        setIsExporting(true);
        try {
            const canvas = await window.html2canvas(printRef.current, { scale: 2, useCORS: true });
            const link = document.createElement('a');
            link.download = `PhieuLuong_${payroll?.teacherName}_${payroll?.month}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Lỗi khi xuất ảnh.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!payroll) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết Lương: ${payroll.teacherName} (${payroll.month})`}>
            {/* Hidden Printable Area */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <PrintablePayslip 
                    ref={printRef} 
                    payroll={{...payroll, bonus, deduction, totalSalary, status, paidDate: status === 'PAID' ? paidDate : undefined}} 
                    settings={state.settings} 
                />
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold border-b pb-2 dark:border-slate-600">Thu nhập</h4>
                        <div className="flex justify-between">
                            <span>Lương cơ bản / dạy:</span>
                            <span className="font-bold">{payroll.baseSalary.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Thưởng (+):</span>
                            {readOnly ? (
                                <span className="font-semibold">{bonus.toLocaleString('vi-VN')} ₫</span>
                            ) : (
                                <CurrencyInput value={bonus} onChange={setBonus} className="form-input w-32 text-right py-1" />
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold border-b pb-2 dark:border-slate-600">Khấu trừ</h4>
                        <div className="flex justify-between items-center">
                            <span>Phạt/Giảm trừ (-):</span>
                            {readOnly ? (
                                <span className="font-semibold text-red-600">{deduction.toLocaleString('vi-VN')} ₫</span>
                            ) : (
                                <CurrencyInput value={deduction} onChange={setDeduction} className="form-input w-32 text-right py-1" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-300">Thực lĩnh:</span>
                    <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">{totalSalary.toLocaleString('vi-VN')} ₫</span>
                </div>

                <div className="border-t pt-4 dark:border-gray-700">
                    <h4 className="font-semibold mb-3">Trạng thái Thanh toán</h4>
                    <div className="flex items-center gap-4">
                        {readOnly ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {status === 'PAID' ? `Đã thanh toán (${paidDate})` : 'Chưa thanh toán'}
                            </span>
                        ) : (
                            <>
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="status" 
                                        value="UNPAID" 
                                        checked={status === 'UNPAID'} 
                                        onChange={() => setStatus('UNPAID')}
                                        className="form-radio h-4 w-4 text-yellow-600"
                                    />
                                    <span className="ml-2">Chưa thanh toán</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="status" 
                                        value="PAID" 
                                        checked={status === 'PAID'} 
                                        onChange={() => setStatus('PAID')}
                                        className="form-radio h-4 w-4 text-green-600"
                                    />
                                    <span className="ml-2">Đã thanh toán</span>
                                </label>
                            </>
                        )}
                    </div>
                    {!readOnly && status === 'PAID' && (
                        <div className="mt-3">
                            <label className="block text-sm font-medium mb-1">Ngày thanh toán:</label>
                            <input 
                                type="date" 
                                value={paidDate} 
                                onChange={(e) => setPaidDate(e.target.value)} 
                                className="form-input w-auto"
                            />
                            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động tạo phiếu Chi khi bạn lưu trạng thái Đã thanh toán.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={handleExport} isLoading={isExporting} disabled={isExporting}>
                        {ICONS.download} Tải ảnh phiếu
                    </Button>
                    {!readOnly ? (
                        <Button onClick={handleSave} isLoading={isSaving}>
                            Lưu thay đổi
                        </Button>
                    ) : (
                        <Button onClick={onClose}>
                            Đóng
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
