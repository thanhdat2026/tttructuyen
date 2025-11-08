import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useData } from '../../hooks/useDataContext';
import { downloadAsCSV } from '../../services/csvExport';
import { PersonStatus, AttendanceStatus } from '../../types';
import { Table, SortConfig, Column } from '../common/Table';
import { Pagination } from '../common/Pagination';
import { ListItemCard } from '../common/ListItemCard';
import { Button } from '../common/Button';
import { ICONS } from '../../constants';
import { PrintableAttendanceReport, AttendanceReportData } from './PrintableAttendanceReport';

const ITEMS_PER_PAGE = 15;

interface AttendanceReportTabProps { 
    selectedMonth: number; 
    selectedYear: number; 
    classFilter: string; 
}

export const AttendanceReportTab: React.FC<AttendanceReportTabProps> = ({ selectedMonth, selectedYear, classFilter }) => {
    const { state } = useData();
    const { students, classes, attendance } = state;
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig<AttendanceReportData> | null>({ key: 'attendanceCount', direction: 'descending' });
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExportingImage, setIsExportingImage] = useState(false);

    const reportData = useMemo(() => {
        const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        
        let relevantStudents = students.filter(s => s.status === PersonStatus.ACTIVE);
        if (classFilter !== 'all') {
            const classStudentIds = new Set(classes.find(c => c.id === classFilter)?.studentIds || []);
            relevantStudents = relevantStudents.filter(s => classStudentIds.has(s.id));
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            relevantStudents = relevantStudents.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.id.toLowerCase().includes(lowerQuery));
        }

        const monthlyAttendance = attendance.filter(a => 
            a.date.startsWith(monthStr) &&
            (classFilter === 'all' || a.classId === classFilter) &&
            (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE)
        );

        const attendanceCounts = new Map<string, number>();
        monthlyAttendance.forEach(a => {
            attendanceCounts.set(a.studentId, (attendanceCounts.get(a.studentId) || 0) + 1);
        });

        return relevantStudents.map(student => ({
            id: student.id,
            name: student.name,
            classNames: classes.filter(c => c.studentIds.includes(student.id)).map(c => c.name).join(', '),
            attendanceCount: attendanceCounts.get(student.id) || 0
        }));

    }, [students, classes, attendance, selectedYear, selectedMonth, classFilter, searchQuery]);
    
    const sortedData = useMemo(() => {
        let sortableItems = [...reportData];
        if (sortConfig !== null) {
            const getLastName = (fullName: string) => {
                if (!fullName) return '';
                const parts = fullName.trim().split(/\s+/);
                return parts[parts.length - 1];
            };

            sortableItems.sort((a, b) => {
                if (sortConfig.key === 'name') {
                    const lastNameA = getLastName(a.name);
                    const lastNameB = getLastName(b.name);
                    
                    const lastNameComparison = lastNameA.localeCompare(lastNameB, 'vi');
                    
                    if (lastNameComparison !== 0) {
                        return sortConfig.direction === 'ascending' ? lastNameComparison : -lastNameComparison;
                    }

                    // If last names are the same, sort by full name for stability
                    const fullNameComparison = a.name.localeCompare(b.name, 'vi');
                    return sortConfig.direction === 'ascending' ? fullNameComparison : -fullNameComparison;
                }

                // Fallback for other columns
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [reportData, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, classFilter, selectedMonth, selectedYear]);
    
    const handleSort = (key: keyof AttendanceReportData) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleExport = () => {
        downloadAsCSV(sortedData, {
            id: 'Mã HV',
            name: 'Họ tên',
            classNames: 'Các lớp học',
            attendanceCount: `Số buổi có mặt (T${selectedMonth}/${selectedYear})`
        }, `BaoCaoChuyenCan_T${selectedMonth}_${selectedYear}.csv`);
    };
    
    const handleExportImage = () => {
        if (reportRef.current && window.html2canvas) {
            setIsExportingImage(true);
            window.html2canvas(reportRef.current, { scale: 2, useCORS: true }).then((canvas: any) => {
                const link = document.createElement('a');
                link.download = `BaoCaoChuyenCan_T${selectedMonth}_${selectedYear}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch((err: any) => {
                console.error("Lỗi xuất ảnh:", err);
            }).finally(() => {
                setIsExportingImage(false);
            });
        }
    };

    const columns: Column<AttendanceReportData>[] = [
        { header: 'Mã HV', accessor: 'id', sortable: true },
        { header: 'Họ tên', accessor: 'name', sortable: true },
        { header: 'Các lớp học', accessor: 'classNames', sortable: false },
        { header: 'Số buổi có mặt', accessor: 'attendanceCount', sortable: true },
    ];

    return (
        <>
            <div ref={reportRef} style={{ position: 'absolute', left: '-9999px', width: '210mm' }}>
                <PrintableAttendanceReport
                    data={sortedData}
                    title={`Thống kê Chuyên cần Tháng ${selectedMonth}/${selectedYear}`}
                />
            </div>
            <div className="card-base">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold">Thống kê Chuyên cần Tháng {selectedMonth}/{selectedYear}</h2>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleExportImage} variant="secondary" isLoading={isExportingImage}>
                            {ICONS.download} Xuất ảnh
                        </Button>
                        <Button onClick={handleExport} variant="secondary">{ICONS.export} Xuất CSV</Button>
                    </div>
                </div>
                <input 
                    type="text"
                    placeholder="Tìm học viên..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="form-input mb-4"
                />
                <div className="hidden md:block">
                    <Table
                        columns={columns}
                        data={paginatedData}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                    />
                </div>
                <div className="md:hidden space-y-4">
                     {paginatedData.map(item => (
                        <ListItemCard
                            key={item.id}
                            title={item.name}
                            details={[
                                { label: 'Mã HV', value: item.id },
                                { label: `Số buổi có mặt (T${selectedMonth})`, value: <span className="font-bold text-lg text-primary">{item.attendanceCount}</span> }
                            ]}
                        />
                    ))}
                </div>
                 {paginatedData.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={sortedData.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                )}
            </div>
        </>
    );
};