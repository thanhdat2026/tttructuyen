
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
    .replace(/[^a-zA-Z0-9]/g, ''); // Remove spaces and special chars for banking consistency
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
        // If transaction exists, the debit amount was negative.
        // If not (preview/generation phase), we use -invoice.amount.
        const thisInvoiceDebitAmount = relatedTransaction ? relatedTransaction.amount : -invoice.amount;
        
        // Balance before this invoice = Current Balance - (This Invoice Debit, which is negative)
        // So Balance before = Current - (-Amount) = Current + Amount
        const balanceBeforeThisInvoice = currentRealTimeBalance - thisInvoiceDebitAmount;

        // If balance before was negative, it's debt.
        const outstandingDebt = balanceBeforeThisInvoice < 0 ? -balanceBeforeThisInvoice : 0;
        // If balance before was positive, it's credit/prepayment.
        const openingCredit = balanceBeforeThisInvoice > 0 ? balanceBeforeThisInvoice : 0;
        
        // Total Due = Debt + This Invoice - Credit
        const totalDue = outstandingDebt + invoice.amount - openingCredit;

        return {
            outstandingDebt: Math.round(outstandingDebt),
            openingCredit: Math.round(openingCredit),
            totalDue: Math.max(0, Math.round(totalDue)),
        };
    }, [student, transactions, invoice]);

    const qrCodeUrl = useMemo(() => {
        // Clean inputs to avoid URL breakage
        const bankBin = settings.bankBin?.replace(/\s+/g, '');
        const bankAccountNumber = settings.bankAccountNumber?.replace(/\s+/g, '');
        
        if (!bankAccountNumber || !bankBin || !student || financialData.totalDue <= 0) {
            return null;
        }

        const [year, month] = invoice.month.split('-');
        // Simplify description to ensure it fits and is valid
        const description = `${normalizeInfoName(student.name)}HP${month}${year.slice(-2)}`;
        
        const params: Record<string, string> = {
            amount: financialData.totalDue.toString(),
            addInfo: description,
        };
        
        if (settings.bankAccountHolder) {
            params.accountName = normalizeAccountName(settings.bankAccountHolder);
        }
        
        // Use compact2 template for standard QR
        return `https://img.vietqr.io/image/${bankBin}-${bankAccountNumber}-compact2.png?${new URLSearchParams(params).toString()}`;

    }, [settings, student, invoice, financialData.totalDue]);


    if (!student) return <div ref={ref}>Học viên không tồn tại.</div>;

    const { outstandingDebt, openingCredit, totalDue } = financialData;

    return (
        <div ref={ref} className="bg-white p-8 text-gray-900 font-sans flex flex-col" style={{ width: '210mm', minHeight: 'auto', margin: '0 auto', boxSizing: 'border-box' }}>
            
            {/* Header - Centered */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-blue-700 uppercase tracking-wide mb-1">{settings.name}</h1>
                <div className="text-sm text-gray-600 flex flex-col items-center justify-center gap-1">
                    <span>{settings.address}</span>
                    <span>Hotline: <span className="font-medium">{settings.phone}</span></span>
                </div>
                
                <div className="mt-8">
                    <h2 className="text-4xl font-extrabold uppercase text-gray-900 tracking-tight">THÔNG BÁO HỌC PHÍ</h2>
                    <p className="text-lg text-gray-600 mt-2 font-medium">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500 mt-2">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Mã HĐ: <strong>#{invoice.id.slice(-6)}</strong></span>
                        <span className="text-gray-300">•</span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* Student Info - Clean Grid */}
            <div className="mb-8 border border-gray-200 rounded-xl p-6 bg-slate-50/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Thông tin Học viên</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <div className="flex justify-between items-baseline border-b border-dashed border-gray-200 pb-1">
                        <span className="text-gray-500 text-sm">Họ và tên:</span>
                        <span className="font-bold text-lg text-gray-900">{student.name}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-dashed border-gray-200 pb-1">
                        <span className="text-gray-500 text-sm">Lớp đang học:</span>
                        <span className="font-semibold text-gray-900 text-right max-w-[60%] text-sm leading-tight">
                            {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                        </span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-dashed border-gray-200 pb-1">
                        <span className="text-gray-500 text-sm">Mã học viên:</span>
                        <span className="font-mono font-semibold text-gray-700">{student.id}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-dashed border-gray-200 pb-1">
                        <span className="text-gray-500 text-sm">Phụ huynh:</span>
                        <span className="font-medium text-gray-900">{student.parentName}</span>
                    </div>
                </div>
            </div>

            {/* Financial Table */}
            <div className="mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider rounded-tl-md rounded-bl-md">Nội dung / Diễn giải</th>
                            <th className="py-3 px-4 text-right font-bold uppercase text-xs tracking-wider w-40 rounded-tr-md rounded-br-md">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {outstandingDebt > 0 && (
                            <tr>
                                <td className="py-4 px-4 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                                <td className="py-4 px-4 text-right font-medium text-gray-800">{formatCurrency(outstandingDebt)}</td>
                            </tr>
                        )}
                        {openingCredit > 0 && (
                            <tr>
                                <td className="py-4 px-4 font-medium text-gray-600">Đã thanh toán / Số dư kỳ trước</td>
                                <td className="py-4 px-4 text-right font-medium text-green-600">-{formatCurrency(openingCredit)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="py-4 px-4 align-top">
                                <p className="font-bold text-gray-900 mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-gray-500 text-xs leading-relaxed whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900 align-top">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Total Payment Box - Floating Right or Centered based on design */}
                <div className="flex justify-end mt-6">
                    <div className="bg-gray-900 text-white rounded-xl shadow-lg px-8 py-4 text-center min-w-[250px]">
                        <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Tổng thanh toán</span>
                        <span className="block text-3xl font-bold tracking-tight leading-none">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-8"></div>

            {/* Footer Section - QR Code & Payment */}
            <div className="text-center">
                <h4 className="font-bold text-sm uppercase tracking-widest text-gray-600 mb-6">Thông tin chuyển khoản</h4>
                
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 inline-block max-w-2xl w-full shadow-sm">
                    <div className="flex flex-col items-center">
                        {/* Bank Info Text */}
                        <div className="mb-6 space-y-1">
                            <div className="text-gray-500 text-sm font-medium">Ngân hàng: <span className="text-gray-900 font-bold text-lg">{settings.bankName}</span></div>
                            <div className="text-3xl font-mono font-bold tracking-widest text-gray-800 my-2">{settings.bankAccountNumber}</div>
                            <div className="text-sm font-bold uppercase text-gray-600">Chủ tài khoản: {settings.bankAccountHolder}</div>
                        </div>

                        {/* QR Code */}
                        {qrCodeUrl && (
                            <div className="relative group mb-6">
                                <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-slate-200 rounded-2xl opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
                                <div className="relative bg-white p-3 rounded-2xl border border-gray-200 shadow-inner">
                                    <img 
                                        src={qrCodeUrl} 
                                        alt="QR Code" 
                                        className="w-80 h-80 object-contain" 
                                        style={{ imageRendering: 'pixelated' }}
                                        onError={(e) => {
                                            // Fallback if image fails to load
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-80 h-80 flex items-center justify-center text-red-500 text-sm bg-gray-50 rounded-xl border border-dashed border-red-300 p-4">Không thể tải mã QR.<br/>Vui lòng kiểm tra kết nối mạng hoặc thông tin ngân hàng.</div>';
                                        }}
                                    />
                                    <div className="flex justify-center mt-3 space-x-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
                                            <div className="w-2 h-1 bg-red-500 rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">napas 247</span>
                                        <div className="w-px h-3 bg-gray-300 mx-2"></div>
                                        <span className="text-[10px] font-bold text-red-600 uppercase">{settings.bankName}</span>
                                    </div>
                                    <div className="text-[10px] text-center text-gray-400 mt-2">
                                        <p className="font-bold text-gray-600 uppercase">{settings.bankAccountHolder}</p>
                                        <p>{settings.bankAccountNumber}</p>
                                        <p>Số tiền: {formatCurrency(totalDue)}</p>
                                    </div>
                                </div>
                                <div className="mt-3 bg-white border border-gray-200 text-gray-600 text-xs px-4 py-1 rounded-full inline-block shadow-sm">
                                    Quét mã để thanh toán
                                </div>
                            </div>
                        )}

                        {/* Transfer Content */}
                        <div className="text-center mt-2">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                            <div className="inline-block bg-yellow-50 border-2 border-yellow-300 text-yellow-800 font-mono font-bold text-xl px-8 py-3 rounded-xl shadow-sm transform hover:scale-105 transition-transform duration-200">
                                {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-xs text-gray-400 italic">
                    Xin cảm ơn Quý phụ huynh! Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.
                </div>
            </div>
        </div>
    );
});
