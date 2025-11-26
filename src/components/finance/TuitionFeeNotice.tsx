
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
        <div ref={ref} className="bg-white p-8 md:p-12 text-gray-900 font-sans flex flex-col relative" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
            
            {/* Header */}
            <div className="flex flex-col items-center justify-center mb-8 border-b-2 border-gray-800 pb-6">
                <h1 className="text-2xl font-bold text-primary uppercase tracking-wide mb-1">{settings.name}</h1>
                <div className="text-sm text-gray-600 text-center">
                    <p>{settings.address}</p>
                    <p className="font-medium">Hotline: {settings.phone}</p>
                </div>
                
                <h2 className="text-4xl font-extrabold uppercase text-gray-900 mt-8 mb-2">THÔNG BÁO HỌC PHÍ</h2>
                <p className="text-lg font-medium text-gray-700">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                
                {/* Invoice Meta - No Frame */}
                <div className="flex items-center gap-4 text-sm mt-2 text-gray-500">
                    <span>Mã HĐ: <span className="font-mono font-bold text-gray-900">#{invoice.id.slice(-6)}</span></span>
                    <span className="w-px h-3 bg-gray-400"></span>
                    <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                </div>
            </div>

            {/* Student Info */}
            <div className="mb-8">
                <div className="grid grid-cols-2 gap-x-12 text-sm">
                    <div className="space-y-3">
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="text-gray-500 w-24 flex-shrink-0">Học viên:</span>
                            <span className="font-bold text-lg text-gray-900">{student.name}</span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="text-gray-500 w-24 flex-shrink-0">Mã HV:</span>
                            <span className="font-mono font-semibold text-gray-700">{student.id}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="text-gray-500 w-24 flex-shrink-0">Lớp:</span>
                            <span className="font-semibold text-gray-900 text-right flex-grow">
                                {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                            </span>
                        </div>
                        <div className="flex border-b border-gray-200 pb-1">
                            <span className="text-gray-500 w-24 flex-shrink-0">Phụ huynh:</span>
                            <span className="font-semibold text-gray-900 text-right flex-grow">{student.parentName}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Table */}
            <div className="flex-grow">
                <table className="w-full text-sm mb-6">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-3 text-left font-bold uppercase text-xs text-gray-600">Nội dung / Diễn giải</th>
                            <th className="py-3 text-right font-bold uppercase text-xs text-gray-600 w-40">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {outstandingDebt > 0 && (
                            <tr className="border-b border-gray-100">
                                <td className="py-3 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                                <td className="py-3 text-right font-medium text-gray-800">{formatCurrency(outstandingDebt)}</td>
                            </tr>
                        )}
                        {openingCredit > 0 && (
                            <tr className="border-b border-gray-100">
                                <td className="py-3 font-medium text-gray-600">Đã thanh toán / Số dư kỳ trước</td>
                                <td className="py-3 text-right font-medium text-green-600">-{formatCurrency(openingCredit)}</td>
                            </tr>
                        )}
                        <tr className="border-b border-gray-100">
                            <td className="py-4">
                                <p className="font-bold text-gray-900 text-base mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-gray-600 whitespace-pre-wrap pl-4 text-xs leading-relaxed">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-4 text-right font-bold text-gray-900 text-lg align-top">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Total Payment - Centered Amount in Box */}
                <div className="flex justify-end mt-4">
                    <div className="bg-gray-900 text-white rounded-xl shadow-lg p-4 min-w-[220px] text-center">
                        <span className="block text-xs uppercase tracking-widest text-gray-400 mb-1">Tổng thanh toán</span>
                        <span className="block text-3xl font-bold tracking-tight">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="mt-12 pt-8 border-t-2 border-gray-200 border-dashed text-center">
                <h4 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-6">Thông tin chuyển khoản</h4>
                
                <div className="flex flex-col items-center justify-center">
                    {/* Bank Info */}
                    <div className="text-gray-800 mb-6">
                        <div className="font-bold text-lg">{settings.bankName}</div>
                        <div className="text-2xl font-mono font-bold tracking-wider my-1">{settings.bankAccountNumber}</div>
                        <div className="text-sm font-medium uppercase text-gray-600">{settings.bankAccountHolder}</div>
                    </div>

                    {/* QR Code */}
                    {qrCodeUrl && (
                        <div className="mb-6 p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 object-contain rounded-lg" />
                        </div>
                    )}

                    {/* Transfer Content */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Nội dung chuyển khoản</p>
                        <p className="text-xl font-mono font-bold text-yellow-800">
                            {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-[10px] text-gray-400 italic">
                    Xin cảm ơn Quý phụ huynh đã đồng hành cùng {settings.name}!
                </div>
            </div>
        </div>
    );
});
