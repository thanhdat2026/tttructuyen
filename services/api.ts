import {
    Student, Teacher, Staff, Class, AttendanceRecord, PersonStatus, FeeType, AttendanceStatus, ProgressReport, Income, Expense, CenterSettings, Payroll, SalaryType, Announcement, UserRole, Transaction, TransactionType, AppData
} from '../types';

// --- Core API Functions ---

export async function loadInitialData(): Promise<Omit<AppData, 'loading'>> {
    const response = await fetch('/api/data');
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Không thể kết nối đến máy chủ dữ liệu.');
    }
    return response.json();
}

async function saveData(data: Omit<AppData, 'loading'>): Promise<void> {
    const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Không thể lưu dữ liệu lên máy chủ.');
    }
}

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;


// --- API Wrappers for Mutations ---

// Each mutation function now follows a "load -> modify -> save" pattern to ensure atomicity.

export async function addStudent({ student, classIds }: { student: Student, classIds: string[] }): Promise<void> {
    const appData = await loadInitialData();
    if (appData.students.some(s => s.id === student.id)) {
        throw new Error(`Học viên với mã '${student.id}' đã tồn tại.`);
    }
    const newStudent = { ...student, createdAt: new Date().toISOString().split('T')[0], balance: 0 };
    appData.students.push(newStudent);
    appData.classes = appData.classes.map(c => {
        if (classIds.includes(c.id)) {
            return { ...c, studentIds: [...c.studentIds, newStudent.id] };
        }
        return c;
    });
    await saveData(appData);
}

export async function updateStudent({ originalId, updatedStudent, classIds }: { originalId: string, updatedStudent: Student, classIds: string[] }): Promise<void> {
    const appData = await loadInitialData();
    const newId = updatedStudent.id;

    if (originalId !== newId) {
        if (appData.students.some(s => s.id === newId)) {
             throw new Error(`Học viên với mã '${newId}' đã tồn tại.`);
        }
        appData.students = appData.students.map(s => s.id === originalId ? updatedStudent : s);
        appData.attendance = appData.attendance.map(a => a.studentId === originalId ? { ...a, studentId: newId } : a);
        appData.invoices = appData.invoices.map(i => i.studentId === originalId ? { ...i, studentId: newId, studentName: updatedStudent.name } : i);
        appData.progressReports = appData.progressReports.map(p => p.studentId === originalId ? { ...p, studentId: newId } : p);
        appData.transactions = appData.transactions.map(t => t.studentId === originalId ? { ...t, studentId: newId } : t);
    } else {
        appData.students = appData.students.map(s => s.id === originalId ? updatedStudent : s);
    }
    
    const finalStudentId = newId;
    const newClassIds = new Set(classIds);
    appData.classes = appData.classes.map(c => {
        const studentIds = new Set(c.studentIds);
        const wasInClass = studentIds.has(originalId);
        const shouldBeInClass = newClassIds.has(c.id);

        if(wasInClass) studentIds.delete(originalId);
        if(shouldBeInClass) studentIds.add(finalStudentId);
        
        return { ...c, studentIds: Array.from(studentIds) };
    });

    await saveData(appData);
}

export async function deleteStudent(studentId: string): Promise<void> {
    const appData = await loadInitialData();
    appData.students = appData.students.filter(s => s.id !== studentId);
    appData.classes = appData.classes.map(c => ({ ...c, studentIds: c.studentIds.filter(id => id !== studentId) }));
    appData.attendance = appData.attendance.filter(a => a.studentId !== studentId);
    appData.invoices = appData.invoices.filter(i => i.studentId !== studentId);
    appData.progressReports = appData.progressReports.filter(p => p.studentId !== studentId);
    appData.transactions = appData.transactions.filter(t => t.studentId !== studentId);
    await saveData(appData);
}

export async function addTeacher(data: Teacher): Promise<Teacher> {
    const appData = await loadInitialData();
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
    if (appData.teachers.some(item => item.id === newItem.id)) {
        throw new Error(`Một mục với ID ${newItem.id} đã tồn tại.`);
    }
    appData.teachers.push(newItem);
    await saveData(appData);
    return newItem;
}

export async function updateTeacher({ originalId, updatedTeacher }: { originalId: string, updatedTeacher: Teacher }): Promise<void> {
    const appData = await loadInitialData();
    if (originalId !== updatedTeacher.id) {
        if(appData.teachers.some(t => t.id === updatedTeacher.id)) throw new Error("Mã giáo viên đã tồn tại.");
        appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid)}));
    }
    appData.teachers = appData.teachers.map(t => t.id === originalId ? updatedTeacher : t);
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== originalId);
    await saveData(appData);
}

export async function deleteTeacher(teacherId: string): Promise<void> {
    const appData = await loadInitialData();
    appData.teachers = appData.teachers.filter(t => t.id !== teacherId);
    appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.filter(id => id !== teacherId)}));
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== teacherId);
    await saveData(appData);
}

export async function addStaff(data: Staff): Promise<Staff> {
    const appData = await loadInitialData();
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
     if (appData.staff.some(item => item.id === newItem.id)) {
        throw new Error(`Một mục với ID ${newItem.id} đã tồn tại.`);
    }
    appData.staff.push(newItem);
    await saveData(appData);
    return newItem;
}

export async function updateStaff({ originalId, updatedStaff }: { originalId: string, updatedStaff: Staff }): Promise<void> {
    const appData = await loadInitialData();
     if (originalId !== updatedStaff.id && appData.staff.some(s => s.id === updatedStaff.id)) {
        throw new Error("Mã nhân viên đã tồn tại.");
    }
    appData.staff = appData.staff.map(t => t.id === originalId ? updatedStaff : t);
    await saveData(appData);
}

export async function deleteStaff(staffId: string): Promise<void> {
    const appData = await loadInitialData();
    appData.staff = appData.staff.filter((item: any) => item.id !== staffId);
    await saveData(appData);
}

export async function addClass(data: Class): Promise<Class> {
    const appData = await loadInitialData();
     if (appData.classes.some(item => item.id === data.id)) {
        throw new Error(`Một mục với ID ${data.id} đã tồn tại.`);
    }
    appData.classes.push(data);
    await saveData(appData);
    return data;
}

export async function updateClass({ originalId, updatedClass }: { originalId: string, updatedClass: Class }): Promise<void> {
    const appData = await loadInitialData();
     if (originalId !== updatedClass.id && appData.classes.some(c => c.id === updatedClass.id)) {
        throw new Error("Mã lớp đã tồn tại.");
    }
    appData.classes = appData.classes.map(c => c.id === originalId ? updatedClass : c);
    await saveData(appData);
}

export async function deleteClass(classId: string): Promise<void> {
    const appData = await loadInitialData();
    appData.classes = appData.classes.filter(c => c.id !== classId);
    appData.attendance = appData.attendance.filter(a => a.classId !== classId);
    appData.progressReports = appData.progressReports.filter(pr => pr.classId !== classId);
    appData.announcements = appData.announcements.filter(ann => ann.classId !== classId);
    await saveData(appData);
}

export async function updateAttendance(records: AttendanceRecord[]): Promise<void> {
    const appData = await loadInitialData();
    const recordsByClassDate = new Map<string, AttendanceRecord[]>();
    records.forEach(r => {
        const key = `${r.classId}|${r.date}`;
        if (!recordsByClassDate.has(key)) recordsByClassDate.set(key, []);
        recordsByClassDate.get(key)!.push(r);
    });

    if (recordsByClassDate.size === 0) return;

    recordsByClassDate.forEach((newRecords, key) => {
        const [classId, date] = key.split('|');
        appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
        const recordsWithIds = newRecords.map(record => ({...record, id: record.id || generateUniqueId('ATT')}));
        appData.attendance.push(...recordsWithIds);
    });
    
    await saveData(appData);
}

export async function generateInvoices({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await loadInitialData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const activeStudents = appData.students.filter(s => s.status === PersonStatus.ACTIVE);

    for (const student of activeStudents) {
        let totalAmount = 0;
        let details = '';
        const studentClasses = appData.classes.filter(c => c.studentIds.includes(student.id));

        for (const cls of studentClasses) {
            let classFee = 0;
            if (cls.fee.type === FeeType.MONTHLY || cls.fee.type === FeeType.PER_COURSE) {
                classFee = cls.fee.amount;
                if (classFee > 0) details += `- Lớp ${cls.name}: ${classFee.toLocaleString('vi-VN')} ₫\n`;
            } else if (cls.fee.type === FeeType.PER_SESSION) {
                const attendedSessions = appData.attendance.filter(a => a.studentId === student.id && a.classId === cls.id && a.date.startsWith(monthStr) && (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE)).length;
                if (attendedSessions > 0) {
                    classFee = attendedSessions * cls.fee.amount;
                    details += `- Lớp ${cls.name}: ${attendedSessions} buổi x ${cls.fee.amount.toLocaleString('vi-VN')} ₫ = ${classFee.toLocaleString('vi-VN')} ₫\n`;
                }
            }
            totalAmount += classFee;
        }

        const existingInvoice = appData.invoices.find(inv => inv.studentId === student.id && inv.month === monthStr);

        if (existingInvoice) {
            if (existingInvoice.status === 'UNPAID' && (totalAmount !== existingInvoice.amount)) {
                const amountDifference = totalAmount - existingInvoice.amount;
                existingInvoice.amount = totalAmount;
                existingInvoice.details = details.trim();
                const relatedTransaction = appData.transactions.find(t => t.relatedInvoiceId === existingInvoice.id);
                if(relatedTransaction) relatedTransaction.amount = -totalAmount;
                const studentToUpdate = appData.students.find(s => s.id === student.id);
                if (studentToUpdate) studentToUpdate.balance -= amountDifference;
            }
        } else if (totalAmount > 0) {
            const invoiceId = generateUniqueId('INV');
            appData.invoices.push({ id: invoiceId, studentId: student.id, studentName: student.name, month: monthStr, amount: totalAmount, details: details.trim(), status: 'UNPAID', generatedDate: new Date().toISOString().split('T')[0], paidDate: null });
            appData.transactions.push({ id: generateUniqueId('TRX'), studentId: student.id, date: new Date().toISOString().split('T')[0], type: TransactionType.INVOICE, description: `Hóa đơn học phí tháng ${month}/${year}`, amount: -totalAmount, relatedInvoiceId: invoiceId });
            const studentToUpdate = appData.students.find(s => s.id === student.id);
            if (studentToUpdate) studentToUpdate.balance -= totalAmount;
        }
    }
    await saveData(appData);
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
    const appData = await loadInitialData();
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (!invoice || invoice.status === 'CANCELLED') return;
    if (invoice.status === 'PAID') throw new Error("Không thể hủy hóa đơn đã thanh toán.");

    invoice.status = 'CANCELLED';
    const student = appData.students.find(s => s.id === invoice.studentId);
    if (student) student.balance += invoice.amount;
    appData.transactions.push({ id: generateUniqueId('TRX'), studentId: invoice.studentId, date: new Date().toISOString().split('T')[0], type: TransactionType.ADJUSTMENT_CREDIT, description: `Hủy hóa đơn #${invoiceId}`, amount: invoice.amount, relatedInvoiceId: invoiceId });
    await saveData(appData);
}

export async function addAdjustment(payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }): Promise<void> {
    const appData = await loadInitialData();
    const finalAmount = payload.type === 'CREDIT' ? payload.amount : -payload.amount;
    const student = appData.students.find(s => s.id === payload.studentId);
    if (student) student.balance += finalAmount;
    appData.transactions.push({ id: generateUniqueId('TRX'), studentId: payload.studentId, date: payload.date, type: payload.type === 'CREDIT' ? TransactionType.PAYMENT : TransactionType.ADJUSTMENT_DEBIT, description: payload.description, amount: finalAmount });
    await saveData(appData);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
    const appData = await loadInitialData();
    const oldTransaction = appData.transactions.find(t => t.id === transaction.id);
    if (!oldTransaction) throw new Error("Giao dịch không tồn tại.");
    const amountDifference = transaction.amount - oldTransaction.amount;
    appData.transactions = appData.transactions.map(t => t.id === transaction.id ? transaction : t);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance += amountDifference;
    await saveData(appData);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
    const appData = await loadInitialData();
    const transaction = appData.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    appData.transactions = appData.transactions.filter(t => t.id !== transactionId);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance -= transaction.amount;
    await saveData(appData);
}

export const updateInvoiceStatus = async ({ invoiceId, status }: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => {
    const appData = await loadInitialData();
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = status;
        if (status === 'PAID') invoice.paidDate = new Date().toISOString().split('T')[0];
    }
    await saveData(appData);
}

export async function generatePayrolls({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await loadInitialData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    for(const teacher of appData.teachers.filter(t => t.status === PersonStatus.ACTIVE)) {
        let totalSalary = 0, sessionsTaught = 0;
        if (teacher.salaryType === SalaryType.MONTHLY) {
            totalSalary = teacher.rate;
        } else {
            const teacherClasses = appData.classes.filter(c => c.teacherIds.includes(teacher.id));
            const distinctSessions = new Set<string>();
            appData.attendance.forEach(a => {
                if (a.date.startsWith(monthStr) && teacherClasses.some(c => c.id === a.classId)) {
                    distinctSessions.add(`${a.classId}-${a.date}`);
                }
            });
            sessionsTaught = distinctSessions.size;
            totalSalary = sessionsTaught * teacher.rate;
        }
        const payrollId = `PAY-${teacher.id}-${monthStr}`;
        const newPayroll: Payroll = { id: payrollId, teacherId: teacher.id, teacherName: teacher.name, month: monthStr, sessionsTaught, rate: teacher.rate, baseSalary: teacher.salaryType === SalaryType.MONTHLY ? teacher.rate : 0, totalSalary, calculationDate: new Date().toISOString().split('T')[0] };
        const existingIndex = appData.payrolls.findIndex(p => p.id === payrollId);
        if (existingIndex !== -1) appData.payrolls[existingIndex] = newPayroll;
        else appData.payrolls.push(newPayroll);
    }
    await saveData(appData);
}

export async function updateSettings(settings: CenterSettings): Promise<void> {
    const appData = await loadInitialData();
    appData.settings = settings;
    await saveData(appData);
}

export async function addProgressReport(data: Omit<ProgressReport, 'id'>): Promise<ProgressReport> {
    const appData = await loadInitialData();
    const newItem = { ...data, id: generateUniqueId('PR') };
    appData.progressReports.push(newItem);
    await saveData(appData);
    return newItem;
}

export async function addIncome(data: Omit<Income, 'id'>): Promise<Income> {
    const appData = await loadInitialData();
    const newItem = { ...data, id: generateUniqueId('INC') };
    appData.income.push(newItem);
    await saveData(appData);
    return newItem;
}

export const updateIncome = (item: Income) => saveData({ ...(item as any) });
export const deleteIncome = async (itemId: string) => {
    const appData = await loadInitialData();
    appData.income = appData.income.filter(i => i.id !== itemId);
    await saveData(appData);
};

export async function addExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
    const appData = await loadInitialData();
    const newItem = { ...data, id: generateUniqueId('EXP') };
    appData.expenses.push(newItem);
    await saveData(appData);
    return newItem;
}
export const updateExpense = (item: Expense) => saveData({ ...(item as any) });
export const deleteExpense = async (itemId: string) => {
    const appData = await loadInitialData();
    appData.expenses = appData.expenses.filter(i => i.id !== itemId);
    await saveData(appData);
};

export async function addAnnouncement(data: Omit<Announcement, 'id'>): Promise<Announcement> {
    const appData = await loadInitialData();
    const newItem = { ...data, id: generateUniqueId('ANN'), createdAt: new Date().toISOString().split('T')[0] };
    appData.announcements.unshift(newItem);
    await saveData(appData);
    return newItem;
}

export async function deleteAnnouncement(id: string) {
    const appData = await loadInitialData();
    appData.announcements = appData.announcements.filter(a => a.id !== id);
    await saveData(appData);
}

export async function backupData(): Promise<Omit<AppData, 'loading'>> {
    return loadInitialData();
}

export async function restoreData(data: Omit<AppData, 'loading'>): Promise<void> {
    await saveData(data);
}

export const resetToMockData = async (): Promise<void> => {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) {
        throw new Error("Không thể khôi phục dữ liệu mặc định.");
    }
};

export const deleteAttendanceForDate = async ({ classId, date }: { classId: string, date: string }) => {
    const appData = await loadInitialData();
    appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
    await saveData(appData);
}

export async function completeOnboardingStep(step: string): Promise<void> {
    const appData = await loadInitialData();
    if (!appData.settings.onboardingStepsCompleted.includes(step)) {
        appData.settings.onboardingStepsCompleted.push(step);
    }
    await saveData(appData);
}

export const updateUserPassword = async ({ userId, role, newPassword }: { userId: string, role: UserRole, newPassword: string }) => {
    const appData = await loadInitialData();
    let userList;
    if (role === UserRole.PARENT) userList = appData.students;
    else if (role === UserRole.TEACHER) userList = appData.teachers;
    else if (role === UserRole.MANAGER || role === UserRole.ACCOUNTANT) userList = appData.staff;
    else throw new Error('Vai trò không hợp lệ.');
    const user = userList.find(u => u.id === userId);
    if (user) user.password = newPassword;
    else throw new Error('Không tìm thấy người dùng.');
    await saveData(appData);
}

export const clearCollections = async (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => {
    const appData = await loadInitialData();
    for (const key of collectionKeys) { (appData as any)[key] = []; }
    if (collectionKeys.includes('students')) {
        appData.attendance = []; appData.invoices = []; appData.progressReports = []; appData.transactions = [];
        appData.classes = appData.classes.map(c => ({...c, studentIds: []}));
    }
    if (collectionKeys.includes('teachers')) {
        appData.payrolls = [];
        appData.classes = appData.classes.map(c => ({...c, teacherIds: []}));
    }
    if (collectionKeys.includes('classes')) { appData.attendance = []; appData.progressReports = []; }
    await saveData(appData);
}

export const deleteAttendanceByMonth = async ({ month, year }: { month: number, year: number }) => {
    const appData = await loadInitialData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    appData.attendance = appData.attendance.filter(a => !a.date.startsWith(monthStr));
    await saveData(appData);
}

export async function clearAllTransactions(): Promise<void> {
    const appData = await loadInitialData();
    appData.students = appData.students.map(student => ({
        ...student,
        balance: 0,
    }));
    appData.transactions = [];
    appData.invoices = [];
    await saveData(appData);
}