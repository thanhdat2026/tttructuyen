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
        <div ref={ref} className="bg-white p-4 text-black font-sans flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
            
            <div className="text-center mb-3">
                <h1 className="text-2xl font-bold uppercase tracking-wide mb-1 whitespace-nowrap" style={{color: settings.themeColor}}>{settings.name}</h1>
                <div className="text-xs text-black flex flex-col items-center justify-center">
                    <span>{settings.address}</span>
                    <span>Hotline: <span className="font-medium">{settings.phone}</span></span>
                </div>
                
                <div className="mt-3">
                    <h2 className="text-3xl font-extrabold uppercase text-black tracking-tight">THÔNG BÁO HỌC PHÍ</h2>
                    <p className="text-base text-black mt-1 font-medium">Tháng {invoice.month.split('-')[1]} năm {invoice.month.split('-')[0]}</p>
                    <div className="flex items-center justify-center gap-4 text-xs text-black mt-1">
                        <span>Mã HĐ: <span className="font-mono font-bold">#{invoice.id.slice(-6)}</span></span>
                        <span className="text-gray-400">•</span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            <div className="mb-3 border border-black p-3">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-2 border-b border-black pb-1">Thông tin Học viên</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div><span className="text-black text-xs">Họ và tên</span><p className="font-bold text-lg text-black">{student.name}</p></div>
                    <div><span className="text-black text-xs">Lớp đang học</span><p className="font-semibold text-black">{enrolledClasses.map(c=>c.name).join(', ')}</p></div>
                    <div><span className="text-black text-xs">Mã học viên</span><p className="font-mono font-semibold text-black">{student.id}</p></div>
                    <div><span className="text-black text-xs">Phụ huynh</span><p className="font-medium text-black">{student.parentName}</p></div>
                </div>
            </div>

            <div className="mb-3">
                <table className="w-full text-sm border-collapse border border-black">
                    <thead>
                        <tr>
                            <th className="py-1 px-2 text-left font-bold uppercase text-xs tracking-wider border border-black">Nội dung / Diễn giải</th>
                            <th className="py-1 px-2 text-right font-bold uppercase text-xs tracking-wider w-40 border border-black">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Math.round(outstandingDebt) > 0 && (
                            <tr className="border-b border-black"><td className="py-1 px-2 font-medium text-black">Nợ cũ kỳ trước</td><td className="py-1 px-2 text-right font-bold text-black">{formatCurrency(outstandingDebt)}</td></tr>
                        )}
                        {Math.round(openingCredit) > 0 && (
                            <tr className="border-b border-black"><td className="py-1 px-2 font-medium text-black">Đã thanh toán / Số dư kỳ trước</td><td className="py-1 px-2 text-right font-bold">-{formatCurrency(openingCredit)}</td></tr>
                        )}
                        <tr className="border-b border-black">
                            <td className="py-1 px-2 align-top">
                                <p className="font-bold text-black text-base">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && <div className="text-black text-xs whitespace-pre-wrap pl-2 mt-1">{invoice.details}</div>}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-black text-base align-top">{formatCurrency(invoice.amount)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="flex justify-end mt-2">
                    <div className="border border-black px-3 py-1 text-right">
                        <span className="block text-[9px] uppercase tracking-widest text-black">TỔNG THANH TOÁN</span>
                        <span className="block text-2xl font-bold tracking-tight text-black">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t-2 border-dashed border-black mt-auto pt-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-black mb-2 text-center">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="flex justify-between items-start gap-4 mt-2">
                    <div className="w-1/2 space-y-3 text-left">
                        <div className="text-black">
                           <p className="font-semibold text-base">{settings.bankName}</p>
                            <p className="font-bold text-2xl tracking-wider font-mono my-0.5">{settings.bankAccountNumber}</p>
                            <p className="font-semibold uppercase text-sm">{settings.bankAccountHolder}</p>
                        </div>
                        
                        <div>
                            <p className="text-[9px] text-black uppercase tracking-wider font-bold mb-1">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                            <div className="inline-block border border-black text-black font-mono font-bold text-base px-3 py-1">
                                {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                            </div>
                        </div>
                    </div>

                    <div className="w-1/2 flex flex-col items-center justify-start">
                        <div className="w-36 h-36">
                            {qrCodeUrl && (
                                <img 
                                    src={qrCodeUrl} 
                                    alt="QR Code" 
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            )}
                        </div>
                        <p className="mt-1 text-black text-[10px] uppercase tracking-wide font-medium">
                            Quét mã để thanh toán
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
});