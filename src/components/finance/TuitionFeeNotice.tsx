
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
            <div className="flex justify-between items-start mb-8 border-b-4 border-gray-800 pb-6">
                {/* Left: Center Info */}
                <div className="flex-1 pr-4">
                    <h1 className="text-2xl font-bold text-primary uppercase tracking-wide leading-tight mb-2">{settings.name}</h1>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p>{settings.address}</p>
                        <p className="font-semibold">Hotline: {settings.phone}</p>
                    </div>
                </div>
                
                {/* Right: Title & Invoice Info */}
                <div className="text-right flex flex-col items-end pl-4">
                    <h2 className="text-4xl font-bold uppercase text-gray-800 tracking-tight mb-2">THÔNG BÁO HỌC PHÍ</h2>
                    {/* Centered invoice info relative to the title block */}
                    <div className="text-center w-full">
                        <p className="text-lg font-bold text-gray-700">Tháng {invoice.month.split('-')[1]}/{invoice.month.split('-')[0]}</p>
                        <div className="text-xs text-gray-500 mt-1 flex justify-center gap-3">
                            <span>Mã HĐ: <span className="font-mono font-bold text-gray-700">#{invoice.id.slice(-6)}</span></span>
                            <span>|</span>
                            <span>Ngày lập: {new Date(invoice.generatedDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Info */}
            <div className="mb-8 border border-gray-200 rounded-xl p-6 bg-slate-50">
                <h3 className="font-bold text-base text-gray-800 mb-4 border-b border-gray-300 pb-2">Thông tin Học viên</h3>
                <div className="grid grid-cols-12 gap-y-3 text-sm">
                    
                    <div className="col-span-2 text-gray-500">Họ và tên:</div>
                    <div className="col-span-4 font-bold text-lg text-gray-800">{student.name}</div>
                    
                    <div className="col-span-2 text-gray-500 pl-4">Lớp đang học:</div>
                    <div className="col-span-4 font-semibold text-gray-800">
                        {enrolledClasses.length > 0 ? enrolledClasses.map(c => c.name).join(', ') : '(Không có lớp)'}
                    </div>

                    <div className="col-span-2 text-gray-500">Mã học viên:</div>
                    <div className="col-span-4 font-mono font-semibold text-gray-700">{student.id}</div>

                    <div className="col-span-2 text-gray-500 pl-4">Phụ huynh:</div>
                    <div className="col-span-4 font-semibold text-gray-800">{student.parentName}</div>
                </div>
            </div>

            {/* Financial Table */}
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
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-600">Nợ cũ kỳ trước</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(outstandingDebt)}</td>
                        </tr>
                        {/* Previous Payment/Credit */}
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
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
                
                {/* Total Section - Full Width Block */}
                <div className="flex justify-end mt-6">
                    <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-6">
                        <span className="font-bold uppercase text-sm tracking-wider">TỔNG THANH TOÁN</span>
                        <span className="font-bold text-3xl leading-none">{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            {/* Dotted Divider */}
            <div className="w-full border-t-2 border-gray-300 border-dashed my-6"></div>

            {/* Payment Footer - Centered & Big QR */}
            <div className="text-center">
                <h4 className="font-bold text-lg uppercase mb-6 tracking-widest text-gray-800">THÔNG TIN CHUYỂN KHOẢN</h4>
                
                <div className="inline-block bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm max-w-2xl mx-auto w-full">
                    
                    {/* Bank Info */}
                    <div className="text-base space-y-1 mb-6 text-gray-700">
                        <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold">{settings.bankName}</span></p>
                        <p className="text-xl my-2"><span className="text-gray-500 text-base">Số tài khoản:</span> <span className="font-mono font-extrabold tracking-widest text-blue-900">{settings.bankAccountNumber}</span></p>
                        <p><span className="text-gray-500">Chủ tài khoản:</span> <span className="font-bold uppercase">{settings.bankAccountHolder}</span></p>
                    </div>

                    {/* QR Code */}
                    {qrCodeUrl && (
                        <div className="mb-6 flex justify-center">
                            <div className="relative">
                                <img src={qrCodeUrl} alt="QR Code" className="w-80 h-80 border-8 border-white rounded-2xl shadow-md" />
                                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow text-xs font-bold text-gray-500 border whitespace-nowrap">Quét mã để thanh toán</div>
                            </div>
                        </div>
                    )}

                    {/* Transfer Content Box */}
                    <div className="mt-6">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                        <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-900 font-mono font-bold text-2xl py-3 px-6 rounded-xl inline-block shadow-sm">
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
