
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
        <div ref={ref} className="bg-white p-8 text-gray-900 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
                <div>
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="h-20 w-auto mb-2" />
                    ) : (
                        <h1 className="text-2xl font-bold text-primary uppercase">{settings.name}</h1>
                    )}
                    <p className="text-sm mt-1 max-w-[300px]">{settings.address}</p>
                    <p className="text-sm">Hotline: {settings.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-gray-800">Thông Báo Học Phí</h2>
                    <p className="text-lg font-medium text-gray-600">Tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                    <p className="text-sm text-gray-500 mt-1">Mã HĐ: #{invoice.id.slice(-6)}</p>
                    <p className="text-sm text-gray-500">Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</p>
                </div>
            </div>

            {/* Student Info */}
            <div className="mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 border-b border-gray-300 pb-1">Thông tin Học viên</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><span className="font-semibold">Họ và tên:</span> {student.name}</p>
                            <p><span className="font-semibold">Mã học viên:</span> {student.id}</p>
                            <p><span className="font-semibold">Phụ huynh:</span> {student.parentName}</p>
                        </div>
                        <div>
                            <p><span className="font-semibold">Lớp đang học:</span></p>
                            <ul className="list-disc list-inside pl-1">
                                {enrolledClasses.length > 0 ? (
                                    enrolledClasses.map(c => <li key={c.id}>{c.name}</li>)
                                ) : (
                                    <li>(Không có lớp)</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Table */}
            <div className="mb-8">
                <h3 className="font-bold text-lg mb-2 text-gray-800">Chi tiết Công nợ</h3>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="py-3 px-4 text-left font-semibold rounded-tl-lg">Nội dung / Diễn giải</th>
                            <th className="py-3 px-4 text-right font-semibold rounded-tr-lg w-48">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="border border-gray-200">
                        {/* Previous Debt */}
                        <tr className="border-b border-gray-200">
                            <td className="py-3 px-4 font-medium text-gray-700">Nợ cũ kỳ trước</td>
                            <td className="py-3 px-4 text-right font-medium">{formatCurrency(outstandingDebt)}</td>
                        </tr>
                        {/* Previous Payment/Credit */}
                        <tr className="border-b border-gray-200">
                            <td className="py-3 px-4 font-medium text-gray-700">Đã thanh toán / Số dư kỳ trước</td>
                            <td className="py-3 px-4 text-right font-medium text-green-600">-{formatCurrency(openingCredit)}</td>
                        </tr>
                        {/* Current Month Fee */}
                        <tr className="bg-gray-50">
                            <td className="py-4 px-4 align-top">
                                <p className="font-bold text-gray-800 mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                <div className="text-gray-600 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
                                    {invoice.details}
                                </div>
                            </td>
                            <td className="py-4 px-4 text-right align-top font-bold text-gray-800">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-800">
                            <td className="py-4 px-4 text-right font-bold text-lg uppercase">Tổng thanh toán</td>
                            <td className="py-4 px-4 text-right font-bold text-2xl text-primary">
                                {formatCurrency(totalDue)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Payment & Signature */}
            <div className="flex gap-8 mt-auto">
                {/* Left: Payment Info */}
                <div className="flex-1">
                    <div className="border border-gray-300 rounded-lg p-4 bg-white h-full">
                        <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Thông tin Chuyển khoản</h4>
                        <div className="text-sm space-y-2">
                            <p><span className="font-semibold">Ngân hàng:</span> {settings.bankName}</p>
                            <p><span className="font-semibold">Số tài khoản:</span> <span className="font-mono font-bold text-lg">{settings.bankAccountNumber}</span></p>
                            <p><span className="font-semibold">Chủ tài khoản:</span> {settings.bankAccountHolder}</p>
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs text-gray-500 mb-1">Nội dung chuyển khoản:</p>
                                <p className="font-mono font-bold text-red-600 break-all">
                                    {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                                </p>
                            </div>
                        </div>
                        {qrCodeUrl && (
                            <div className="mt-4 text-center">
                                <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto border border-gray-200 rounded" />
                                <p className="text-xs text-gray-500 mt-1">Quét mã để thanh toán nhanh</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Signatures */}
                <div className="flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-4 text-center mb-20">
                        <div>
                            <p className="font-bold text-sm">Người lập phiếu</p>
                            <p className="text-xs italic text-gray-500">(Ký, ghi rõ họ tên)</p>
                        </div>
                        <div>
                            <p className="font-bold text-sm">Người nộp tiền</p>
                            <p className="text-xs italic text-gray-500">(Ký, ghi rõ họ tên)</p>
                        </div>
                    </div>
                    
                    <div className="text-center text-xs text-gray-500">
                        <p>Xin cảm ơn Quý phụ huynh!</p>
                        <p>Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
