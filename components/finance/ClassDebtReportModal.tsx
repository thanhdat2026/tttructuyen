import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PrintableClassDebtReport } from './PrintableClassDebtReport';
import { Student } from '../../types';
import { useData } from '../../hooks/useDataContext';
import { useToast } from '../../hooks/useToast';
import { ICONS } from '../../constants';

interface ClassDebtReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    className: string;
}

export const ClassDebtReportModal: React.FC<ClassDebtReportModalProps> = ({ isOpen, onClose, students, className }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const { state } = useData();
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!reportRef.current || !window.html2canvas) {
            toast.error("Không thể tải ảnh, vui lòng thử lại.");
            return;
        }
        setIsDownloading(true);
        try {
            const canvas = await window.html2canvas(reportRef.current, { scale: 2.5, useCORS: true });
            const link = document.createElement('a');
            link.download = `BaoCaoTaiChinh_Lop_${className.replace(/\s/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Lỗi khi xuất ảnh báo cáo:", error);
            toast.error("Lỗi khi xuất ảnh báo cáo.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <Modal 
          isOpen={isOpen} 
          onClose={onClose} 
          title={`Báo cáo Tài chính - Lớp ${className}`}
        >
            <div className="bg-gray-200 dark:bg-gray-900 p-4 overflow-y-auto max-h-[60vh]">
                <div className="mx-auto" style={{ width: '210mm' }}>
                    <div ref={reportRef}>
                        <PrintableClassDebtReport 
                            students={students}
                            className={className}
                            settings={state.settings}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>
                    Đóng
                </Button>
                <Button onClick={handleDownload} isLoading={isDownloading}>
                    {ICONS.download} Tải ảnh
                </Button>
            </div>
        </Modal>
    );
};