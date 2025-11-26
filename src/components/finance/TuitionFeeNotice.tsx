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
        <div ref={ref} className="bg-white p-2 text-black font-sans flex flex-col" style={{ width: '210mm', minHeight: 'auto', margin: '0 auto', boxSizing: 'border-box' }}>
            
            <div className="text-center mb-1">
                <h1 className="text-2xl font-bold uppercase tracking-wide mb-1 whitespace-nowrap" style={{color: settings.themeColor}}>{settings.name}</h1>
                <div className="text-xs text-black flex flex-col items-center justify-center">
                    <span>{settings.address}</span>
                    <span>Hotline: <span className="font-medium">{settings.phone}</span></span>
                </div>
                
                <div className="mt-1">
                    <h2 className="text-3xl font-extrabold uppercase text-black tracking-tight">THÔNG BÁO HỌC PHÍ</h2>
                    <p className="text-base text-black mt-1 font-medium">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                    <div className="flex items-center justify-center gap-4 text-xs text-black mt-1">
                        <span>Mã HĐ: <span className="font-mono font-bold">#{invoice.id.slice(-6)}</span></span>
                        <span className="text-gray-400">•</span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            <div className="mb-1 border border-black rounded-lg p-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-black pb-1">Thông tin Học viên</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-black text-xs mb-0.5">Họ và tên</span>
                        <span className="font-bold text-lg text-black">{student.name}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-black text-xs mb-0.5">Lớp đang học</span>
                        <span className="font-semibold text-black break-words leading-snug">
                            {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-black text-xs mb-0.5">Mã học viên</span>
                        <span className="font-mono font-semibold text-black">{student.id}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-black text-xs mb-0.5">Phụ huynh</span>
                        <span className="font-medium text-black">{student.parentName}</span>
                    </div>
                </div>
            </div>

            <div className="mb-1">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-black text-white">
                            <th className="py-1 px-2 text-left font-bold uppercase text-xs tracking-wider rounded-tl-md rounded-bl-md">Nội dung / Diễn giải</th>
                            <th className="py-1 px-2 text-right font-bold uppercase text-xs tracking-wider w-40 rounded-tr-md rounded-br-md">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/20">
                        {Math.round(outstandingDebt) > 0 && (
                            <tr>
                                <td className="py-1 px-2 font-medium text-black">Nợ cũ kỳ trước</td>
                                <td className="py-1 px-2 text-right font-bold text-black">{formatCurrency(outstandingDebt)}</td>
                            </tr>
                        )}
                        {Math.round(openingCredit) > 0 && (
                            <tr>
                                <td className="py-1 px-2 font-medium text-black">Đã thanh toán / Số dư kỳ trước</td>
                                <td className="py-1 px-2 text-right font-bold">-{formatCurrency(openingCredit)}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="py-1 px-2 align-top">
                                <p className="font-bold text-black text-base mb-0.5">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-black text-xs leading-relaxed whitespace-pre-wrap border-l-2 border-black/30 pl-2 mt-1">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-black text-base align-top">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="flex justify-end mt-1">
                    <div className="bg-black text-white rounded-lg shadow-xl px-4 py-1.5 text-center min-w-[220px]">
                        <span className="block text-[9px] uppercase tracking-widest text-gray-400">TỔNG THANH TOÁN</span>
                        <span className="block text-2xl font-bold tracking-tight leading-none">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-dashed border-black my-1"></div>

            <div className="mt-1">
                <h4 className="font-bold text-sm uppercase tracking-widest text-black mb-2 text-center">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="flex justify-between items-start gap-4">
                    {/* Left Column: Bank and Transfer Content */}
                    <div className="w-1/2 space-y-3 text-left">
                        <div className="text-black">
                           <p className="font-semibold text-base">{settings.bankName}</p>
                            <p className="font-bold text-2xl tracking-wider font-mono my-0.5">{settings.bankAccountNumber}</p>
                            <p className="font-semibold uppercase text-sm">{settings.bankAccountHolder}</p>
                        </div>
                        
                        <div>
                            <p className="text-[9px] text-black uppercase tracking-wider font-bold mb-1">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                            <div className="inline-block border border-black text-black font-mono font-bold text-base px-3 py-1 rounded-lg">
                                {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: QR Code */}
                    <div className="w-1/2 flex justify-center items-center">
                        {qrCodeUrl && (
                            <div className="text-center">
                                <div className="bg-white p-1 rounded-lg border border-black shadow-sm inline-block">
                                    <img 
                                        src={qrCodeUrl} 
                                        alt="QR Code" 
                                        className="w-40 h-40 object-contain"
                                        style={{ imageRendering: 'pixelated' }}
                                        crossOrigin="anonymous"
                                    />
                                </div>
                                <div className="mt-1 text-black text-[10px] uppercase tracking-wide font-medium">
                                    Quét mã để thanh toán
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
