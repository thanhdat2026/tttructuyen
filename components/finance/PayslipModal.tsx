
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Payroll } from '../../types';
import { CurrencyInput } from '../common/CurrencyInput';
import { useData } from '../../hooks/useDataContext';
import { useToast } from '../../hooks/useToast';
import { PrintablePayslip } from './PrintablePayslip';
import { ICONS } from '../../constants';

interface PayslipModalProps {
    isOpen: boolean;
    onClose: () => void;
    payroll: Payroll | null;
    readOnly?: boolean; // For teachers viewing their own slip
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, payroll, readOnly = false }) => {
    const { updatePayroll, state } = useData();
    const { toast } = useToast();
    
    const [bonus, setBonus] = useState(0);
    const [deduction, setDeduction] = useState(0);
    const [status, setStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && payroll) {
            setBonus(payroll.bonus || 0);
            setDeduction(payroll.deduction || 0);
            setStatus(payroll.status || 'UNPAID');
        }
    }, [isOpen, payroll]);

    const totalSalary = payroll ? payroll.baseSalary + bonus - deduction : 0;

    const handleSave = async () => {
        if (!payroll) return;
        setIsSaving(true);
        try {
            await updatePayroll({
                payrollId: payroll.id,
                bonus,
                deduction,
                status
            });
            toast.success('Cập nhật bảng lương thành công!');
            onClose();
        } catch (error) {
            toast.error('Lỗi khi cập nhật.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if (!printRef.current || !window.html2canvas || !payroll) return;
        setIsDownloading(true);
        try {
            const canvas = await window.html2canvas(printRef.current, { scale: 2, useCORS: true });
            const link = document.createElement('a');
            link.download = `PhieuLuong_${payroll.teacherName.replace(/\s/g, '_')}_${payroll.month}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            toast.error('Lỗi khi tải ảnh.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (!payroll) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết Lương: ${payroll.teacherName} (${payroll.month})`}>
            {/* Hidden printable area */}
            <div style={{ position: 'absolute', left: '-9999px' }}>
                <PrintablePayslip ref={printRef} payroll={{...payroll, bonus, deduction, totalSalary, status}} settings={state.settings} />
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Lương cơ bản / Lương dạy:</p>
                        <p className="font-bold text-lg">{payroll.baseSalary.toLocaleString('vi-VN')} ₫</p>
                        <p className="text-xs text-gray-400">({payroll.sessionsTaught} buổi)</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Thực lĩnh:</p>
                        <p className="font-bold text-lg text-primary">{totalSalary.toLocaleString('vi-VN')} ₫</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Thưởng thêm (VNĐ)</label>
                        <CurrencyInput 
                            value={bonus} 
                            onChange={readOnly ? () => {} : setBonus} 
                            className={`form-input ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Khấu trừ / Phạt (VNĐ)</label>
                        <CurrencyInput 
                            value={deduction} 
                            onChange={readOnly ? () => {} : setDeduction} 
                            className={`form-input ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                        />
                    </div>
                </div>

                {!readOnly && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Trạng thái thanh toán</label>
                        <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={status === 'UNPAID'} 
                                    onChange={() => setStatus('UNPAID')} 
                                    className="form-radio text-yellow-600"
                                />
                                <span className="ml-2 text-yellow-700 dark:text-yellow-400 font-medium">Chưa thanh toán</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={status === 'PAID'} 
                                    onChange={() => setStatus('PAID')} 
                                    className="form-radio text-green-600"
                                />
                                <span className="ml-2 text-green-700 dark:text-green-400 font-medium">Đã thanh toán</span>
                            </label>
                        </div>
                        {status === 'PAID' && (
                            <p className="text-xs text-gray-500 mt-1">* Khi chọn "Đã thanh toán", hệ thống sẽ tự động tạo một khoản Chi phí lương.</p>
                        )}
                    </div>
                )}
                
                {readOnly && (
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Trạng thái:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${payroll.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {payroll.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={handleDownload} isLoading={isDownloading}>
                        {ICONS.download} Tải phiếu lương
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Đóng</Button>
                        {!readOnly && <Button onClick={handleSave} isLoading={isSaving}>Lưu Cập nhật</Button>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
