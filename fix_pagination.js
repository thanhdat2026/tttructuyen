const fs = require('fs');

const files = [
    './screens/TeachersScreen.tsx',
    './screens/StudentsScreen.tsx',
    './screens/StaffScreen.tsx',
    './components/finance/InvoicesTab.tsx',
    './components/finance/IncomeTab.tsx',
    './components/finance/ExpenseTab.tsx',
    './components/finance/PayrollTab.tsx',
    './components/reports/TransactionHistoryReportTab.tsx',
    './components/reports/AbsentStudentsReportTab.tsx',
    './components/reports/AttendanceReportTab.tsx'
];

const useEffectCode = `
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage === 0 && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);
`;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if totalPages is defined
    if (content.includes('const totalPages =')) {
        // Insert after const totalPages = ...
        const regex = /(const totalPages = [^\n]+)/;
        if (!content.includes('if (currentPage > totalPages && totalPages > 0)')) {
            content = content.replace(regex, `$1\n${useEffectCode}`);
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});
