import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ICONS } from '../../constants';
import { useToast } from '../../hooks/useToast';

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const qrCodeUrl = "https://img.vietqr.io/image/970405-2204205571130-compact2.png?accountName=LE%20VAN%20DAT";
    const accountDetails = {
        holder: "LE VAN DAT",
        bank: "AGRIBANK",
        number: "2204205571130",
    };

    const handleCopy = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                toast.success("Đã sao chép số tài khoản!");
            }, () => {
                toast.error("Sao chép thất bại.");
            });
        } else {
            toast.error("Trình duyệt không hỗ trợ tính năng này.");
        }
    };

    return (
        <Modal 
          isOpen={isOpen} 
          onClose={onClose} 
          title=""
        >
            <div className="text-center">
                <div className="flex justify-center items-center gap-2 mb-4">
                    <span className="text-pink-500">{React.cloneElement(ICONS.heart, {width: 28, height: 28})}</span>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Mời tác giả một ly cà phê</h2>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Cảm ơn thầy/cô đã sử dụng ứng dụng!
                    <br />
                    Đây là một sản phẩm miễn phí được tạo ra với mong muốn hỗ trợ công việc của các giáo viên. Nếu thầy/cô thấy ứng dụng này hữu ích, hãy ủng hộ tác giả một ly cà phê để có thêm động lực phát triển nhé!
                </p>

                <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
                        <img src={qrCodeUrl} alt="VietQR Code" className="w-64 h-64 mx-auto" />
                    </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-left text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Chủ tài khoản:</span>
                        <span className="font-bold">{accountDetails.holder}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Ngân hàng:</span>
                        <span className="font-bold">{accountDetails.bank}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <div>
                           <span className="text-gray-500 dark:text-gray-400">Số tài khoản:</span>
                           <span className="font-bold ml-2">{accountDetails.number}</span>
                        </div>
                        <button onClick={() => handleCopy(accountDetails.number)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Sao chép số tài khoản">
                           {ICONS.copy}
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button onClick={onClose} variant="secondary">Đóng</Button>
                </div>
            </div>
        </Modal>
    );
};