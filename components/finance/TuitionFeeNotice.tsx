
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
        <div ref={ref} className="bg-white p-10 md:p-14 text-gray-900 font-sans flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header - Centered Layout */}
            <div className="text-center mb-8 pb-6 border-b-4 border-gray-900">
                <div className="mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-primary uppercase tracking-wide leading-tight mb-1">{settings.name}</h1>
                    <div className="text-sm text-gray-600">
                        <span className="block">{settings.address}</span>
                        <span className="block mt-1 font-medium">Hotline: {settings.phone}</span>
                    </div>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-extrabold uppercase text-gray-900 tracking-tight mb-2 mt-6">THÔNG BÁO HỌC PHÍ</h2>
                
                <div className="text-gray-700 flex flex-col items-center gap-1">
                    <p className="text-lg font-semibold">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                    <div className="flex items-center gap-3 text-sm mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-300">Mã HĐ: <strong>#{invoice.id.slice(-6)}</strong></span>
                        <span className="text-gray-400">•</span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* Student Info - Improved Grid with Wrapping */}
            <div className="mb-8 border border-gray-200 rounded-2xl p-6 bg-slate-50 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b border-gray-200 pb-2 uppercase tracking-wide text-xs">Thông tin Học viên</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-gray-200 border-dashed pb-1">
                            <span className="text-gray-500 whitespace-nowrap mr-4">Họ và tên:</span>
                            <span className="font-bold text-lg text-gray-900">{student.name}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-200 border-dashed pb-1">
                            <span className="text-gray-500 whitespace-nowrap mr-4">Mã học viên:</span>
                            <span className="font-mono font-semibold text-gray-700">{student.id}</span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-200 border-dashed pb-1">
                            <span className="text-gray-500 whitespace-nowrap mr-4 pt-1">Lớp đang học:</span>
                            <span className="font-semibold text-right text-gray-900 leading-snug">
                                {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                            </span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-200 border-dashed pb-1">
                            <span className="text-gray-500 whitespace-nowrap mr-4">Phụ huynh:</span>
                            <span className="font-semibold text-gray-900">{student.parentName}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Table */}
            <div className="mb-8 flex-grow">
                <table className="w-full text-sm border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="py-3 px-4 text-left font-bold uppercase tracking-wider text-xs rounded-tl-lg">Nội dung / Diễn giải</th>
                            <th className="py-3 px-4 text-right font-bold uppercase tracking-wider text-xs rounded-tr-lg w-48">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="border border-gray-200">
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
                        <tr className="bg-blue-50/20">
                            <td className="py-4 px-4 align-top">
                                <p className="font-bold text-gray-900 mb-1 text-base">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-gray-700 whitespace-pre-wrap pl-3 border-l-2 border-blue-300 text-xs leading-relaxed mt-2">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-4 px-4 text-right align-top font-bold text-gray-900 text-lg">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Total Section */}
                <div className="flex justify-end">
                    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-xl flex items-center gap-6 border-2 border-gray-900">
                        <span className="font-bold uppercase text-sm tracking-widest text-gray-300">TỔNG THANH TOÁN</span>
                        <span className="font-bold text-3xl md:text-4xl tracking-tight">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            {/* Dashed Separator */}
            <div className="w-full border-t-2 border-gray-300 border-dashed my-8"></div>

            {/* Payment Footer - Centered, Large QR, No Signatures */}
            <div className="text-center mt-auto">
                <h4 className="font-bold text-xl uppercase mb-6 tracking-widest text-gray-900 border-b-2 border-gray-900 inline-block pb-1 px-4">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-inner max-w-2xl mx-auto">
                    {/* Bank Info */}
                    <div className="text-base space-y-2 mb-8 text-gray-800">
                        <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold text-lg">{settings.bankName}</span></p>
                        <div className="text-3xl font-mono font-bold tracking-widest text-gray-900 py-2">{settings.bankAccountNumber}</div>
                        <p><span className="text-gray-500">Chủ tài khoản:</span> <span className="font-bold uppercase tracking-wide">{settings.bankAccountHolder}</span></p>
                    </div>

                    {/* Massive QR Code */}
                    {qrCodeUrl && (
                        <div className="mb-8 relative group inline-block">
                            <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-md"></div>
                            <div className="relative bg-white p-3 rounded-2xl shadow-lg">
                                <img src={qrCodeUrl} alt="QR Code" className="w-80 h-80 rounded-lg object-contain" />
                            </div>
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-md border border-gray-200 flex items-center gap-2 whitespace-nowrap">
                                <img src="https://img.vietqr.io/image/vietqr-compact.png" alt="VietQR" className="h-5" />
                                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Quét để thanh toán</span>
                            </div>
                        </div>
                    )}

                    {/* Highlighted Transfer Content */}
                    <div className="w-full max-w-lg">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 font-mono font-bold text-2xl py-3 px-4 rounded-xl shadow-sm break-all text-center tracking-wide">
                            {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-xs text-gray-400 italic">
                    <p>Xin cảm ơn Quý phụ huynh! Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.</p>
                </div>
            </div>
        </div>
    );
});
