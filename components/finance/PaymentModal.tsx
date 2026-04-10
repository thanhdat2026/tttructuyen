
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyInput } from '../common/CurrencyInput';
import { Student } from '../../types';
import { useData } from '../../hooks/useDataContext';
import { useToast } from '../../hooks/useToast';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
}

import { getVietnamTime } from '../../utils/date';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, student }) => {
    const { addAdjustment } = useData();
    const { toast } = useToast();

    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(getVietnamTime().substring(0, 16));
    const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student) {
            if (student.balance < 0) {
                setAmount(Math.abs(student.balance));
            } else {
                setAmount(0);
            }
            setDate(getVietnamTime().substring(0, 16)); // Reset date on open
            setPaymentMethod('transfer'); // Reset payment method
        }
    }, [student, isOpen]);

    if (!student) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            toast.error("Số tiền thanh toán phải lớn hơn 0.");
            return;
        }
        setIsLoading(true);
        try {
            // 1. Record the payment transaction
            const finalDate = date.length === 16 ? `${date}:00` : date;
            await addAdjustment({
                studentId: student.id,
                amount: amount,
                date: finalDate,
                description: `Thanh toán học phí trực tiếp`,
                type: 'CREDIT',
                paymentMethod: paymentMethod,
            });

            toast.success(`Ghi nhận thanh toán ${amount.toLocaleString('vi-VN')} ₫ cho ${student.name}.`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi ghi nhận thanh toán.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ghi nhận thanh toán cho ${student.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Số tiền thanh toán (VND)</label>
                    <CurrencyInput value={amount} onChange={setAmount} className="form-input mt-1" />
                    <p className="text-xs text-gray-500 mt-1">
                        Hiện tại: <span className={student.balance < 0 ? 'text-red-500' : 'text-green-500'}>{student.balance.toLocaleString('vi-VN')} ₫</span>
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium">Ngày thanh toán</label>
                    <input type="datetime-local" step="1" value={date} onChange={e => setDate(e.target.value)} className="form-input mt-1" required />
                </div>
                <div>
                    <label className="block text-sm font-medium">Hình thức thanh toán</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'transfer' | 'cash')} className="form-select mt-1">
                        <option value="transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                    </select>
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit" isLoading={isLoading}>Ghi nhận</Button>
                </div>
            </form>
        </Modal>
    );
};
