
import { useMemo, forwardRef } from 'react';
import { useData } from '../../hooks/useDataContext';
import { Invoice, TransactionType } from '../../types';

interface TuitionFeeNoticeProps {
    invoice: Invoice;
}

const formatCurrency = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} ₫`;

const normalizeInfoName = (name: string) => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '');
};

const normalizeAccountName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase();
};

export const TuitionFeeNotice = forwardRef<HTMLDivElement, TuitionFeeNoticeProps>(({ invoice }, ref) => {
    const { state } = useData();
    const { students, transactions, settings, classes } = state;

    const student = useMemo(() => students.find(s => s.id === invoice.studentId), [students, invoice]);

    const enrolledClasses = useMemo(() => {
        if (!student) return [];
        return classes.filter(c => c.studentIds.includes(student.id));
    }, [classes, student]);

    const financialData = useMemo(() => {
        if (!student) {
            return { outstandingDebt: 0, openingCredit: 0, totalDue: 0 };
        }

        const currentRealTimeBalance = student.balance;
        const relatedTransaction = transactions.find(t => t.relatedInvoiceId === invoice.id && t.type === TransactionType.INVOICE);
        const thisInvoiceDebitAmount = relatedTransaction ? relatedTransaction.amount : -invoice.amount;
        const balanceBeforeThisInvoice = currentRealTimeBalance - thisInvoiceDebitAmount;

        const outstandingDebt = balanceBeforeThisInvoice < 0 ? -balanceBeforeThisInvoice : 0;
        const openingCredit = balanceBeforeThisInvoice > 0 ? balanceBeforeThisInvoice : 0;
        
        const totalDue = outstandingDebt + invoice.amount - openingCredit;

        return {
            outstandingDebt,
            openingCredit,
            totalDue: Math.max(0, totalDue),
        };
    }, [student, transactions, invoice]);

    const qrCodeUrl = useMemo(() => {
        const { bankAccountNumber, bankBin, bankAccountHolder } = settings;
        if (!bankAccountNumber || !bankBin || !student || financialData.totalDue <= 0) {
            return null;
        }

        const [year, month] = invoice.month.split('-');
        const description = `${normalizeInfoName(student.name)}HP${month}${year.slice(-2)}`;
        
        const params: Record<string, string> = {
            amount: Math.round(financialData.totalDue).toString(),
            addInfo: description,
        };
        
        if (bankAccountHolder) {
            params.accountName = normalizeAccountName(bankAccountHolder);
        }
        
        return `https://img.vietqr.io/image/${bankBin}-${bankAccountNumber}-compact2.png?${new URLSearchParams(params).toString()}`;

    }, [settings, student, invoice, financialData.totalDue]);


    if (!student) return <div ref={ref}>Học viên không tồn tại.</div>;

    const { outstandingDebt, openingCredit, totalDue } = financialData;

    return (
        <div ref={ref} className="bg-white p-10 text-gray-900 font-sans flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-10 border-b-4 border-gray-800 pb-6">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-primary uppercase tracking-wide leading-tight mb-2">{settings.name}</h1>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{settings.address}</p>
                        <p>Hotline: <span className="font-semibold">{settings.phone}</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-bold uppercase text-gray-800 tracking-tighter">Thông Báo Học Phí</h2>
                    <div className="mt-2 text-gray-600">
                        <p className="text-lg font-medium">Tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                        <p className="text-sm">Mã HĐ: <span className="font-mono font-bold">#{invoice.id.slice(-6)}</span></p>
                        <p className="text-sm">Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                </div>
            </div>

            {/* Student Info - Clean Layout */}
            <div className="mb-10 border border-gray-200 rounded-xl p-6 bg-gray-50/50">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2">Thông tin Học viên</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-200 border-dashed pb-1">
                        <span className="text-gray-500">Họ và tên:</span>
                        <span className="font-bold text-lg">{student.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 border-dashed pb-1">
                        <span className="text-gray-500">Lớp đang học:</span>
                        <span className="font-semibold text-right text-wrap max-w-[60%]">
                            {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 border-dashed pb-1">
                        <span className="text-gray-500">Mã học viên:</span>
                        <span className="font-mono font-semibold">{student.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 border-dashed pb-1">
                        <span className="text-gray-500">Phụ huynh:</span>
                        <span className="font-semibold">{student.parentName}</span>
                    </div>
                </div>
            </div>

            {/* Financial Table - Professional Look */}
            <div className="mb-8 flex-grow">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider text-xs rounded-tl-lg">Nội dung / Diễn giải</th>
                            <th className="py-3 px-4 text-right font-semibold uppercase tracking-wider text-xs rounded-tr-lg w-48">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="border-l border-r border-b border-gray-200">
                        {/* Previous Debt */}
                        <tr className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(outstandingDebt)}</td>
                        </tr>
                        {/* Previous Payment/Credit */}
                        <tr className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium text-gray-600">Đã thanh toán / Số dư kỳ trước</td>
                            <td className="py-3 px-4 text-right font-medium text-green-600">-{formatCurrency(openingCredit)}</td>
                        </tr>
                        {/* Current Month Fee */}
                        <tr className="bg-blue-50/30">
                            <td className="py-4 px-4 align-top">
                                <p className="font-bold text-gray-800 mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                <div className="text-gray-600 whitespace-pre-wrap pl-4 border-l-2 border-blue-200 text-xs leading-relaxed mt-2">
                                    {invoice.details}
                                </div>
                            </td>
                            <td className="py-4 px-4 text-right align-top font-bold text-gray-800 text-base">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Total Section */}
                <div className="flex justify-end mt-4">
                    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg min-w-[300px]">
                        <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-sm tracking-wide">Tổng thanh toán</span>
                            <span className="font-bold text-3xl">{formatCurrency(totalDue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Footer - Centered & Big QR */}
            <div className="mt-auto pt-8 border-t-2 border-gray-800 border-dashed">
                <div className="text-center">
                    <h4 className="font-bold text-lg uppercase mb-6 tracking-widest text-gray-800">Thông tin chuyển khoản</h4>
                    
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm max-w-xl mx-auto">
                        <div className="text-sm space-y-1 mb-4 text-gray-700">
                            <p><span className="font-semibold">Ngân hàng:</span> {settings.bankName}</p>
                            <p className="text-lg"><span className="font-semibold">Số tài khoản:</span> <span className="font-mono font-bold tracking-wider">{settings.bankAccountNumber}</span></p>
                            <p><span className="font-semibold">Chủ tài khoản:</span> {settings.bankAccountHolder}</p>
                        </div>

                        {qrCodeUrl && (
                            <div className="my-4 relative">
                                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 border-4 border-white rounded-xl shadow-md" />
                                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-full shadow text-[10px] font-bold text-gray-500 border whitespace-nowrap">Quét mã để thanh toán</div>
                            </div>
                        )}

                        <div className="mt-4 w-full">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nội dung chuyển khoản (Bắt buộc)</p>
                            <div className="bg-yellow-100 border-2 border-yellow-300 text-yellow-900 font-mono font-bold text-xl py-2 px-4 rounded-lg inline-block">
                                {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-gray-400 italic">
                        <p>Xin cảm ơn Quý phụ huynh! Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
