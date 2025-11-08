import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TuitionFeeNotice } from './TuitionFeeNotice';
import { Invoice } from '../../types';
import { ICONS } from '../../constants';

interface BulkInvoicePrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoices: Invoice[];
}

export const BulkInvoicePrintModal: React.FC<BulkInvoicePrintModalProps> = ({ isOpen, onClose, selectedInvoices }) => {
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal 
          isOpen={isOpen} 
          onClose={onClose} 
          title={`In Hàng loạt Hóa đơn (${selectedInvoices.length})`}
          isPrintable={true}
        >
            {/* This is the printable area. It will be targeted by CSS. */}
            <div id="printable-invoices">
                {selectedInvoices.map((invoice) => (
                    // Add a wrapper to ensure no margin collapse and apply break
                    <div key={invoice.id} className="invoice-page-break">
                        <TuitionFeeNotice invoice={invoice} />
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t dark:border-gray-700 print-hidden">
                <Button variant="secondary" onClick={onClose}>
                    Đóng
                </Button>
                <Button onClick={handlePrint}>
                    {ICONS.download} In
                </Button>
            </div>
        </Modal>
    );
};
