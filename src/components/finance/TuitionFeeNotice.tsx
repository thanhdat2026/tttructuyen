
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
        <div ref={ref} className="bg-white p-8 text-gray-900 font-sans flex flex-col" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header Section - Centered */}
            <div className="text-center mb-8">
                {/* Center Info */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-primary uppercase tracking-wide mb-1">{settings.name}</h1>
                    <div className="text-sm text-gray-600 flex flex-col items-center gap-1">
                        <span>{settings.address}</span>
                        <span className="font-semibold">Hotline: {settings.phone}</span>
                    </div>
                </div>
                
                <div className="w-32 h-1 bg-gray-200 mx-auto mb-6 rounded-full"></div>

                {/* Title & Invoice Info */}
                <div>
                    <h2 className="text-4xl font-bold uppercase text-gray-800 tracking-tight mb-3">THÔNG BÁO HỌC PHÍ</h2>
                    <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
                        <span className="font-bold bg-gray-100 px-3 py-1 rounded-full">Tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</span>
                        <span>Mã HĐ: <span className="font-mono font-bold">#{invoice.id.slice(-6)}</span></span>
                        <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* Student Info - Refined Grid */}
            <div className="mb-8 border border-gray-200 rounded-2xl p-6 bg-slate-50/50">
                <h3 className="font-bold text-base text-gray-800 mb-4 border-b border-gray-200 pb-2 uppercase tracking-wide">Thông tin Học viên</h3>
                <div className="grid grid-cols-12 gap-y-4 gap-x-6 text-sm">
                    
                    <div className="col-span-6 flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Họ và tên</span>
                        <span className="font-bold text-lg text-gray-900">{student.name}</span>
                    </div>
                    <div className="col-span-6 flex flex-col">
                        <span className="text-gray-500 text-xs mb-1">Lớp đang học</span>
                        <span className="font-semibold text-gray-900">
                            {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                        </span>
                    </div>

                    <div className="col-span-6 flex flex-col border-t border-gray-200 border-dashed pt-2">
                        <span className="text-gray-500 text-xs mb-1">Mã học viên</span>
                        <span className="font-mono font-semibold text-gray-700">{student.id}</span>
                    </div>
                    <div className="col-span-6 flex flex-col border-t border-gray-200 border-dashed pt-2">
                        <span className="text-gray-500 text-xs mb-1">Phụ huynh</span>
                        <span className="font-semibold text-gray-900">{student.parentName}</span>
                    </div>
                </div>
            </div>

            {/* Financial Table */}
            <div className="mb-8 flex-grow">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider text-xs rounded-tl-lg">NỘI DUNG / DIỄN GIẢI</th>
                            <th className="py-3 px-4 text-right font-semibold uppercase tracking-wider text-xs rounded-tr-lg w-48">THÀNH TIỀN</th>
                        </tr>
                    </thead>
                    <tbody className="border-l border-r border-b border-gray-200">
                        <tr className="border-b border-gray-100">
                            <td className="py-4 px-4 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                            <td className="py-4 px-4 text-right font-medium text-gray-800">{formatCurrency(outstandingDebt)}</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <td className="py-4 px-4 font-medium text-gray-600">Đã thanh toán / Số dư kỳ trước</td>
                            <td className="py-4 px-4 text-right font-medium text-green-600">-{formatCurrency(openingCredit)}</td>
                        </tr>
                        <tr className="bg-blue-50/30">
                            <td className="py-4 px-4 align-top">
                                <p className="font-bold text-gray-800 mb-1">Học phí tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                                {invoice.details && (
                                    <div className="text-gray-600 whitespace-pre-wrap pl-4 border-l-2 border-blue-200 text-xs leading-relaxed mt-2">
                                        {invoice.details}
                                    </div>
                                )}
                            </td>
                            <td className="py-4 px-4 text-right align-top font-bold text-gray-800 text-base">
                                {formatCurrency(invoice.amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* Total Block */}
                <div className="flex justify-end mt-6">
                    <div className="bg-gray-900 text-white px-8 py-5 rounded-xl shadow-lg flex flex-col items-end min-w-[300px]">
                        <span className="uppercase text-xs tracking-widest opacity-80 mb-1">TỔNG THANH TOÁN</span>
                        <span className="font-bold text-4xl leading-none">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            {/* Dashed Line */}
            <div className="w-full border-t-2 border-gray-300 border-dashed my-8"></div>

            {/* Payment Footer - Centered */}
            <div className="text-center">
                <h4 className="font-bold text-lg uppercase mb-6 tracking-widest text-gray-800">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="inline-block bg-white rounded-3xl p-8 border-2 border-gray-100 shadow-sm max-w-2xl mx-auto w-full">
                    
                    <div className="text-base text-gray-800 mb-6">
                        <p className="mb-1"><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold">{settings.bankName}</span></p>
                        <p className="text-2xl my-2 font-mono font-extrabold tracking-wider text-gray-900">{settings.bankAccountNumber}</p>
                        <p><span className="text-gray-500">Chủ tài khoản:</span> <span className="font-bold uppercase">{settings.bankAccountHolder}</span></p>
                    </div>

                    {/* QR Code - Enormous as requested */}
                    {qrCodeUrl && (
                        <div className="mb-6 flex justify-center">
                            <div className="relative">
                                <img src={qrCodeUrl} alt="QR Code" className="w-80 h-80 object-contain border-4 border-white rounded-2xl shadow-md" />
                                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    napas 247 <span className="text-red-500">|</span> {settings.bankName}
                                </div>
                                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center w-full">
                                     <p className="text-[10px] text-gray-400 mt-4">Quét mã để thanh toán</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="h-8"></div> 

                    {/* Transfer Content - Highlighted Box */}
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-900 font-mono font-bold text-2xl py-3 px-8 rounded-xl inline-block shadow-sm">
                            {`${normalizeInfoName(student.name)}HP${invoice.month.split('-')[1]}${invoice.month.split('-')[0].slice(-2)}`}
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-xs text-gray-400 italic">
                    <p>Xin cảm ơn Quý phụ huynh! Mọi thắc mắc vui lòng liên hệ văn phòng trung tâm.</p>
                </div>
            </div>
        </div>
    );
});
