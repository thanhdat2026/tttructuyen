
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
    .replace(/[^a-zA-Z0-9]/g, '');
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
            outstandingDebt: Math.round(outstandingDebt),
            openingCredit: Math.round(openingCredit),
            totalDue: Math.max(0, Math.round(totalDue)),
        };
    }, [student, transactions, invoice]);

    const qrCodeUrl = useMemo(() => {
        const bankBin = settings.bankBin?.replace(/\s+/g, '');
        const bankAccountNumber = settings.bankAccountNumber?.replace(/\s+/g, '');

        if (!bankAccountNumber || !bankBin || !student || financialData.totalDue <= 0) {
            return null;
        }

        const [year, month] = invoice.month.split('-');
        const description = `${normalizeInfoName(student.name)}HP${month}${year.slice(-2)}`;
        
        const params: Record<string, string> = {
            amount: financialData.totalDue.toString(),
            addInfo: description,
        };
        
        if (settings.bankAccountHolder) {
            params.accountName = normalizeAccountName(settings.bankAccountHolder);
        }
        
        return `https://img.vietqr.io/image/${bankBin}-${bankAccountNumber}-compact2.png?${new URLSearchParams(params).toString()}`;

    }, [settings, student, invoice, financialData.totalDue]);


    if (!student) return <div ref={ref}>Học viên không tồn tại.</div>;

    const { outstandingDebt, openingCredit, totalDue } = financialData;

    return (
        <div ref={ref} className="bg-white p-10 text-gray-900 font-sans flex flex-col" style={{ width: '210mm', minHeight: 'auto', margin: '0 auto', boxSizing: 'border-box' }}>
            
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-700 uppercase tracking-wide mb-2 whitespace-nowrap">{settings.name}</h1>
                <div className="text-sm text-gray-600 flex flex-col items-center justify-center gap-1">
                    <span>{settings.address}</span>
                    <span>Hotline: <span className="font-medium">{settings.phone}</span></span>
                </div>
                
                <div className="mt-8">
                    <h2 className="text-4xl font-extrabold uppercase text-gray-900 tracking-tight">THÔNG BÁO HỌC PHÍ</h2>
                    <p className="text-lg text-gray-600 mt-2 font-medium">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-3">
                        <span>Mã HĐ: <span className="font-mono font-bold text-gray-900">#{invoice.id.slice(-6)}</span></span>
                        <span className="text-gray-400">•</span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-slate-50/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Thông tin Học viên</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Họ và tên</span>
                        <span className="font-bold text-xl text-gray-900">{student.name}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Lớp đang học</span>
                        <span className="font-semibold text-gray-900 break-words leading-snug">
                            {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Mã học viên</span>
                        <span className="font-mono font-semibold text-gray-700">{student.id}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Phụ huynh</span>
                        <span className="font-medium text-gray-900">{student.parentName}</span>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider rounded-tl-md rounded-bl-md">Nội dung / Diễn giải</th>
                            <th className="py-3 px-4 text-right font-bold uppercase text-xs tracking-wider w-48 rounded-tr-md rounded-br-md">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {outstandingDebt > 0 && (
                            <tr>
                                <td className="py-3 px-4 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                                <td className="py-3 px-4 text-right font-bold text-gray-800">{formatCurrency(outstandingDebt)}</td>
                            </tr>
                        )}
                        {openingCredit > 0 && (
                            <tr>
                                <td className="py-3 px-4 font-medium text-gray-600">Đã thanh toán / Số dư kỳ trước</td>
                                <td className="py-3 px-4 text-right font-bold text-green-600">-{formatCurrency(openingCredit)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="py-3 px-4 align-top">
                                <p className="font-bold text-gray-900 text-base mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-gray-500 text-xs leading-relaxed whitespace-pre-wrap border-l-2 border-gray-200 pl-3 mt-1">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-gray-900 text-base align-top">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="flex justify-end mt-6">
                    <div className="bg-gray-900 text-white rounded-lg shadow-xl px-8 py-4 text-center min-w-[250px]">
                        <span className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1 text-center">TỔNG THANH TOÁN</span>
                        <span className="block text-3xl font-bold tracking-tight leading-none text-center">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-6"></div>

            <div className="text-center">
                <h4 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-200 inline-block pb-1">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="bg-white rounded-3xl p-6 border border-gray-100 inline-block max-w-2xl w-full">
                    <div className="flex flex-col items-center">
                        <div className="mb-4 space-y-1">
                            <div className="text-gray-500 text-base font-medium">Ngân hàng: <span className="text-gray-900 font-bold">{settings.bankName}</span></div>
                            <div className="text-3xl font-mono font-bold tracking-widest text-gray-800 my-1">{settings.bankAccountNumber}</div>
                            <div className="text-base font-bold uppercase text-gray-600">Chủ tài khoản: {settings.bankAccountHolder}</div>
                        </div>

                        {qrCodeUrl && (
                            <div className="relative group mb-4">
                                <div className="absolute -inset-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl opacity-60"></div>
                                <div className="relative bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                    <img 
                                        src={qrCodeUrl} 
                                        alt="QR Code" 
                                        className="w-80 h-80 object-contain" 
                                        style={{ imageRendering: 'pixelated' }}
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-80 h-80 flex items-center justify-center text-red-500 text-sm bg-gray-50 rounded-xl border border-dashed border-red-300 p-4">Không thể tải mã QR.<br/>Vui lòng kiểm tra kết nối mạng.</div>';
                                        }}
                                    />
                                </div>
                                <div className="mt-3 text-gray-400 text-xs uppercase tracking-wide font-medium">
                                    Quét mã để thanh toán
                                </div>
                            </div>
                        )}

                        <div className="text-center mt-4 w-full">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                            <div className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-800 font-mono font-bold text-xl px-8 py-3 rounded-lg w-full max-w-md">
                                {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-xs text-gray-400 italic">
                    Xin cảm ơn Quý phụ huynh! Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.
                </div>
            </div>
        </div>
    );
});
