
import React, { useMemo, useState } from 'react';
import { useData } from '../../hooks/useDataContext';
import { useAuth } from '../../hooks/useAuth';
import { Table, Column } from '../common/Table';
import { Payroll, Teacher, UserRole } from '../../types';
import { ListItemCard } from '../common/ListItemCard';
import { Button } from '../common/Button';
import { PayslipModal } from './PayslipModal';
import { ICONS } from '../../constants';

interface TeacherPayrollTabProps {
    period: 'this_month' | 'last_month' | 'this_year';
}

const getPeriodDateRange = (period: 'this_month' | 'last_month' | 'this_year'): { startYear: number, endYear: number, startMonth: number, endMonth: number } => {
    const now = new Date();
    switch (period) {
        case 'this_month':
            return { startYear: now.getFullYear(), endYear: now.getFullYear(), startMonth: now.getMonth() + 1, endMonth: now.getMonth() + 1 };
        case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return { startYear: lastMonth.getFullYear(), endYear: lastMonth.getFullYear(), startMonth: lastMonth.getMonth() + 1, endMonth: lastMonth.getMonth() + 1 };
        case 'this_year':
            return { startYear: now.getFullYear(), endYear: now.getFullYear(), startMonth: 1, endMonth: 12 };
    }
};

export const TeacherPayrollTab: React.FC<TeacherPayrollTabProps> = ({ period }) => {
    const { state } = useData();
    const { user, role } = useAuth();
    const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
    const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

    const teacherPayrolls = useMemo(() => {
        if (!user || role !== UserRole.TEACHER) return [];
        
        const { startYear, endYear, startMonth, endMonth } = getPeriodDateRange(period);

        return state.payrolls
            .filter(p => {
                const [pYear, pMonth] = p.month.split('-').map(Number);
                const payrollDate = new Date(pYear, pMonth - 1);
                const startDate = new Date(startYear, startMonth - 1);
                const endDate = new Date(endYear, endMonth - 1);

                return p.teacherId === (user as Teacher).id &&
                       payrollDate >= startDate &&
                       payrollDate <= endDate;
            })
            .sort((a, b) => b.month.localeCompare(a.month));
    }, [state.payrolls, user, role, period]);

    const handleViewDetails = (payroll: Payroll) => {
        setSelectedPayroll(payroll);
        setIsPayslipModalOpen(true);
    };

    const columns: Column<Payroll>[] = [
        { header: 'Tháng', accessor: 'month', sortable: true },
        { header: 'Số buổi', accessor: 'sessionsTaught', sortable: true },
        { header: 'Lương Cơ bản', accessor: (item) => `${item.baseSalary.toLocaleString('vi-VN')} ₫` },
        { header: 'Thực lĩnh', accessor: (item) => <span className="font-bold text-primary">{item.totalSalary.toLocaleString('vi-VN')} ₫</span> },
        { 
            header: 'Trạng thái', 
            accessor: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.status === 'PAID' ? 'Đã nhận' : 'Chưa nhận'}
                </span>
            ),
            sortable: true,
            sortKey: 'status'
        },
    ];

    return (
        <div className="card-base">
            <h2 className="text-xl font-bold mb-4">Lịch sử Lương</h2>
            <div className="hidden md:block">
                <Table<Payroll>
                    columns={columns}
                    data={teacherPayrolls}
                    sortConfig={null}
                    onSort={() => {}}
                    actions={(item) => (
                        <Button size="sm" variant="secondary" onClick={() => handleViewDetails(item)}>
                            {ICONS.search} Chi tiết
                        </Button>
                    )}
                />
            </div>
             <div className="md:hidden space-y-4">
                {teacherPayrolls.map(item => (
                    <ListItemCard
                        key={item.id}
                        title={<span className="font-semibold">Bảng lương {item.month}</span>}
                        details={[
                            { label: "Thực lĩnh", value: <span className="font-bold">{item.totalSalary.toLocaleString('vi-VN')} ₫</span> },
                            { label: "Trạng thái", value: item.status === 'PAID' ? 'Đã nhận' : 'Chưa nhận' },
                        ]}
                        actions={
                            <Button size="sm" variant="secondary" onClick={() => handleViewDetails(item)}>
                                Chi tiết
                            </Button>
                        }
                    />
                ))}
            </div>
            
            <PayslipModal 
                isOpen={isPayslipModalOpen}
                onClose={() => setIsPayslipModalOpen(false)}
                payroll={selectedPayroll}
                readOnly={true}
            />
        </div>
    );
};
