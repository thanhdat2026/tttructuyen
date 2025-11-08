import {
    Student, Teacher, Staff, Class, AttendanceRecord, Invoice, PersonStatus, FeeType, AttendanceStatus, ProgressReport, Income, Expense, CenterSettings, Payroll, SalaryType, Announcement, UserRole, Transaction, TransactionType
} from '../types';

export interface AppData {
  students: Student[];
  teachers: Teacher[];
  staff: Staff[];
  classes: Class[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  progressReports: ProgressReport[];
  transactions: Transaction[];
  income: Income[];
  expenses: Expense[];
  settings: CenterSettings;
  payrolls: Payroll[];
  announcements: Announcement[];
}

// --- Data Store Management (Online via Vercel KV) ---

async function getData(): Promise<AppData | null> {
    const response = await fetch('/api/data');
    if (!response.ok) {
        const errorText = await response.text();
        console.error("API call to /api/data failed:", response.status, errorText);
        throw new Error(errorText || 'Không thể tải dữ liệu từ máy chủ.');
    }
    const text = await response.text();
    if (text === 'null') {
        return null;
    }
    return JSON.parse(text);
}

async function setData(data: AppData) {
     const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Không thể lưu dữ liệu lên máy chủ.');
    }
}

// --- API Functions ---

export async function loadInitialData(): Promise<AppData | null> {
    return getData();
}

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

async function addDoc<T extends { id: string }>(collectionName: keyof Omit<AppData, 'settings'>, newItem: T): Promise<T> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const collection = appData[collectionName] as unknown as T[];
    if (collection.some(item => item.id === newItem.id)) {
        throw new Error(`Một mục với ID ${newItem.id} đã tồn tại trong ${collectionName}.`);
    }
    collection.push(newItem);
    await setData(appData);
    return newItem;
}


async function updateDoc<T extends { id: string }>(collectionName: keyof Omit<AppData, 'settings'>, docId: string, data: T): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const collection = appData[collectionName] as any[];
    
    if (!collection.some((item: any) => item.id === docId)) {
        throw new Error(`Tài liệu với id ${docId} không tìm thấy trong collection ${collectionName}.`);
    }

    appData[collectionName] = collection.map((item: any) => item.id === docId ? data : item) as any;
    await setData(appData);
}

async function deleteDoc(collectionName: keyof Omit<AppData, 'settings'>, docId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const collection = appData[collectionName] as any[];
    appData[collectionName] = collection.filter((item: any) => item.id !== docId) as any;
    await setData(appData);
}


// --- Students ---
export async function addStudent({ student, classIds }: { student: Student, classIds: string[] }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
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
    await setData(appData);
}

export async function updateStudent({ originalId, updatedStudent, classIds }: { originalId: string, updatedStudent: Student, classIds: string[] }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
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

    await setData(appData);
}

export async function deleteStudent(studentId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.students = appData.students.filter(s => s.id !== studentId);
    appData.classes = appData.classes.map(c => ({ ...c, studentIds: c.studentIds.filter(id => id !== studentId) }));
    appData.attendance = appData.attendance.filter(a => a.studentId !== studentId);
    appData.invoices = appData.invoices.filter(i => i.studentId !== studentId);
    appData.progressReports = appData.progressReports.filter(p => p.studentId !== studentId);
    appData.transactions = appData.transactions.filter(t => t.studentId !== studentId);
    await setData(appData);
}

// --- Teachers, Staff, Classes ---
export async function addTeacher(data: Teacher): Promise<Teacher> {
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('teachers', newItem);
}
export async function addStaff(data: Staff): Promise<Staff> {
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('staff', newItem);
}
export const addClass = (data: Class) => addDoc('classes', data);
export const addProgressReport = (data: Omit<ProgressReport, 'id'>) => addDoc('progressReports', { ...data, id: generateUniqueId('PR') } as ProgressReport);
export const addIncome = (data: Omit<Income, 'id'>) => addDoc('income', { ...data, id: generateUniqueId('INC') } as Income);
export const addExpense = (data: Omit<Expense, 'id'>) => addDoc('expenses', { ...data, id: generateUniqueId('EXP') } as Expense);
export async function addAnnouncement(data: Omit<Announcement, 'id'>): Promise<Announcement> {
    const newItem = { ...data, id: generateUniqueId('ANN'), createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('announcements', newItem);
}

export async function updateTeacher({ originalId, updatedTeacher }: { originalId: string, updatedTeacher: Teacher }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    if (originalId !== updatedTeacher.id) {
        if(appData.teachers.some(t => t.id === updatedTeacher.id)) throw new Error("Mã giáo viên đã tồn tại.");
        appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid)}));
    }
    appData.teachers = appData.teachers.map(t => t.id === originalId ? updatedTeacher : t);
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== originalId);
    await setData(appData);
}

export async function deleteTeacher(teacherId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.teachers = appData.teachers.filter(t => t.id !== teacherId);
    appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.filter(id => id !== teacherId)}));
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== teacherId);
    await setData(appData);
}

export async function updateStaff({ originalId, updatedStaff }: { originalId: string, updatedStaff: Staff }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
     if (originalId !== updatedStaff.id && appData.staff.some(s => s.id === updatedStaff.id)) {
        throw new Error("Mã nhân viên đã tồn tại.");
    }
    appData.staff = appData.staff.map(t => t.id === originalId ? updatedStaff : t);
    await setData(appData);
}

export const deleteStaff = (staffId: string) => deleteDoc('staff', staffId);

export async function updateClass({ originalId, updatedClass }: { originalId: string, updatedClass: Class }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
     if (originalId !== updatedClass.id && appData.classes.some(c => c.id === updatedClass.id)) {
        throw new Error("Mã lớp đã tồn tại.");
    }
    appData.classes = appData.classes.map(c => c.id === originalId ? updatedClass : c);
    await setData(appData);
}

export async function deleteClass(classId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.classes = appData.classes.filter(c => c.id !== classId);
    appData.attendance = appData.attendance.filter(a => a.classId !== classId);
    appData.progressReports = appData.progressReports.filter(pr => pr.classId !== classId);
    appData.announcements = appData.announcements.filter(ann => ann.classId !== classId);
    await setData(appData);
}

export const updateIncome = (item: Income) => updateDoc('income', item.id, item);
export const deleteIncome = (itemId: string) => deleteDoc('income', itemId);
export const updateExpense = (item: Expense) => updateDoc('expenses', item.id, item);
export const deleteExpense = (itemId: string) => deleteDoc('expenses', itemId);
export const deleteAnnouncement = (id: string) => deleteDoc('announcements', id);

// --- Settings ---
export async function updateSettings(settings: CenterSettings): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.settings = settings;
    await setData(appData);
}

export async function completeOnboardingStep(step: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    if (!appData.settings.onboardingStepsCompleted.includes(step)) {
        appData.settings.onboardingStepsCompleted.push(step);
    }
    await setData(appData);
}

// --- Complex Operations ---
export async function updateAttendance(records: AttendanceRecord[]): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");

    const recordsByClassDate = new Map<string, AttendanceRecord[]>();
    records.forEach(r => {
        const key = `${r.classId}|${r.date}`;
        if (!recordsByClassDate.has(key)) {
            recordsByClassDate.set(key, []);
        }
        recordsByClassDate.get(key)!.push(r);
    });

    if (recordsByClassDate.size === 0) {
        return;
    }

    recordsByClassDate.forEach((newRecords, key) => {
        const [classId, date] = key.split('|');
        
        appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
        
        const recordsWithIds = newRecords.map(record => ({
            ...record,
            id: record.id || generateUniqueId('ATT'),
        }));
        appData.attendance.push(...recordsWithIds);
    });
    
    await setData(appData);
}

export async function generateInvoices({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const activeStudents = appData.students.filter(s => s.status === PersonStatus.ACTIVE);

    for (const student of activeStudents) {
        let totalAmount = 0;
        let details = '';
        const studentClasses = appData.classes.filter(c => c.studentIds.includes(student.id));

        for (const cls of studentClasses) {
            let classFee = 0;
            const studentIsEnrolled = (cls.studentIds || []).includes(student.id);

            if (studentIsEnrolled) {
                if (cls.fee.type === FeeType.MONTHLY || cls.fee.type === FeeType.PER_COURSE) {
                    classFee = cls.fee.amount;
                    if (classFee > 0) {
                        details += `- Lớp ${cls.name}: ${classFee.toLocaleString('vi-VN')} ₫\n`;
                    }
                } else if (cls.fee.type === FeeType.PER_SESSION) {
                    const attendedSessions = appData.attendance.filter(a =>
                        a.studentId === student.id && a.classId === cls.id && a.date.startsWith(monthStr) &&
                        (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE)
                    ).length;
                    if (attendedSessions > 0) {
                        classFee = attendedSessions * cls.fee.amount;
                        details += `- Lớp ${cls.name}: ${attendedSessions} buổi x ${cls.fee.amount.toLocaleString('vi-VN')} ₫ = ${classFee.toLocaleString('vi-VN')} ₫\n`;
                    }
                }
            }
            totalAmount += classFee;
        }

        const transactionDescription = `Hóa đơn học phí tháng ${month}/${year}`;
        const existingInvoice = appData.invoices.find(inv => inv.studentId === student.id && inv.month === monthStr);

        if (existingInvoice) {
            if (existingInvoice.status === 'UNPAID' && (totalAmount !== existingInvoice.amount)) {
                const amountDifference = totalAmount - existingInvoice.amount;
                existingInvoice.amount = totalAmount;
                existingInvoice.details = details.trim();
                const studentToUpdate = appData.students.find(s => s.id === student.id);
                if (studentToUpdate) studentToUpdate.balance -= amountDifference;
                const relatedTransaction = appData.transactions.find(t => t.relatedInvoiceId === existingInvoice.id);
                if(relatedTransaction) relatedTransaction.amount = -totalAmount;
            }
        } else if (totalAmount > 0) {
            const invoiceId = generateUniqueId('INV');
            appData.invoices.push({
                id: invoiceId, studentId: student.id, studentName: student.name, month: monthStr,
                amount: totalAmount, details: details.trim(), status: 'UNPAID',
                generatedDate: new Date().toISOString().split('T')[0], paidDate: null,
            });
            appData.transactions.push({
                id: generateUniqueId('TRX'), studentId: student.id, date: new Date().toISOString().split('T')[0],
                type: TransactionType.INVOICE, description: transactionDescription,
                amount: -totalAmount, relatedInvoiceId: invoiceId,
            });
            const studentToUpdate = appData.students.find(s => s.id === student.id);
            if (studentToUpdate) studentToUpdate.balance -= totalAmount;
        }
    }
    await setData(appData);
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (!invoice || invoice.status === 'CANCELLED') return;
    if (invoice.status === 'PAID') throw new Error("Không thể hủy hóa đơn đã thanh toán.");

    invoice.status = 'CANCELLED';
    appData.transactions.push({
        id: generateUniqueId('TRX'), studentId: invoice.studentId, date: new Date().toISOString().split('T')[0],
        type: TransactionType.ADJUSTMENT_CREDIT, description: `Hủy hóa đơn #${invoiceId}`,
        amount: invoice.amount, relatedInvoiceId: invoiceId,
    });
    const student = appData.students.find(s => s.id === invoice.studentId);
    if (student) student.balance += invoice.amount;

    await setData(appData);
}

export async function addAdjustment(payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const finalAmount = payload.type === 'CREDIT' ? payload.amount : -payload.amount;

    appData.transactions.push({
        id: generateUniqueId('TRX'), studentId: payload.studentId, date: payload.date,
        type: payload.type === 'CREDIT' ? TransactionType.PAYMENT : TransactionType.ADJUSTMENT_DEBIT,
        description: payload.description, amount: finalAmount,
    });
    const student = appData.students.find(s => s.id === payload.studentId);
    if (student) student.balance += finalAmount;
    
    await setData(appData);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const oldTransaction = appData.transactions.find(t => t.id === transaction.id);
    if (!oldTransaction) throw new Error("Giao dịch không tồn tại.");

    const amountDifference = transaction.amount - oldTransaction.amount;
    appData.transactions = appData.transactions.map(t => t.id === transaction.id ? transaction : t);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance += amountDifference;

    await setData(appData);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const transaction = appData.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Giao dịch không tồn tại.");

    appData.transactions = appData.transactions.filter(t => t.id !== transactionId);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance -= transaction.amount;

    await setData(appData);
}

export const updateInvoiceStatus = async ({ invoiceId, status }: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = status;
        if (status === 'PAID') invoice.paidDate = new Date().toISOString().split('T')[0];
        await setData(appData);
    }
}

export async function generatePayrolls({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    for(const teacher of appData.teachers.filter(t => t.status === PersonStatus.ACTIVE)) {
        let totalSalary = 0;
        let sessionsTaught = 0;
        
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
        const newPayroll: Payroll = {
            id: payrollId, teacherId: teacher.id, teacherName: teacher.name, month: monthStr,
            sessionsTaught, rate: teacher.rate, baseSalary: teacher.salaryType === SalaryType.MONTHLY ? teacher.rate : 0,
            totalSalary, calculationDate: new Date().toISOString().split('T')[0],
        };

        const existingIndex = appData.payrolls.findIndex(p => p.id === payrollId);
        if (existingIndex !== -1) appData.payrolls[existingIndex] = newPayroll;
        else appData.payrolls.push(newPayroll);
    }
    await setData(appData);
}

// --- Data Management ---
export async function backupData(): Promise<AppData> {
    const data = await getData();
    if (!data) throw new Error("No data to back up.");
    return data;
}

export const restoreData = async (data: AppData): Promise<void> => setData(data);

export const resetToMockData = async (): Promise<void> => {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) {
        throw new Error("Failed to reset data on server.");
    }
};

export const deleteAttendanceForDate = async ({ classId, date }: { classId: string, date: string }) => {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
    await setData(appData);
}

export const updateUserPassword = async ({ userId, role, newPassword }: { userId: string, role: UserRole, newPassword: string }) => {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    let userList: (Student | Teacher | Staff)[];
    switch (role) {
        case UserRole.PARENT: userList = appData.students; break;
        case UserRole.TEACHER: userList = appData.teachers; break;
        case UserRole.MANAGER: case UserRole.ACCOUNTANT: userList = appData.staff; break;
        default: throw new Error('Vai trò không hợp lệ để cập nhật mật khẩu.');
    }
    const user = userList.find(u => u.id === userId);
    if (user) {
        user.password = newPassword;
        await setData(appData);
    } else {
        throw new Error('Không tìm thấy người dùng.');
    }
}

export const clearCollections = async (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    for (const key of collectionKeys) { (appData[key] as any) = []; }
    if (collectionKeys.includes('students')) {
        appData.attendance = []; appData.invoices = []; appData.progressReports = []; appData.transactions = [];
        appData.classes = appData.classes.map(c => ({...c, studentIds: []}));
    }
    if (collectionKeys.includes('teachers')) {
        appData.payrolls = [];
        appData.classes = appData.classes.map(c => ({...c, teacherIds: []}));
    }
    if (collectionKeys.includes('classes')) { appData.attendance = []; appData.progressReports = []; }
    await setData(appData);
}

export const deleteAttendanceByMonth = async ({ month, year }: { month: number, year: number }) => {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    appData.attendance = appData.attendance.filter(a => !a.date.startsWith(monthStr));
    await setData(appData);
}

export async function clearAllTransactions(): Promise<void> {
    const appData = await getData();
    if (!appData) throw new Error("Database not initialized");
    appData.students = appData.students.map(student => ({
        ...student,
        balance: 0,
    }));
    appData.transactions = [];
    appData.invoices = [];
    await setData(appData);
}