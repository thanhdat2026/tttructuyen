import {
    Student, Teacher, Staff, Class, AttendanceRecord, ProgressReport, Income, Expense, CenterSettings, Payroll, Announcement, UserRole, Transaction, AppData
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

async function patchData(operation: { op: string, payload?: any }): Promise<AppData> {
    const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
    }
    return response.json();
}

// --- API Wrappers for Mutations ---

export const addStudent = (payload: { student: Student, classIds: string[] }) => patchData({ op: 'addStudent', payload });
export const updateStudent = (payload: { originalId: string, updatedStudent: Student, classIds: string[] }) => patchData({ op: 'updateStudent', payload });
export const deleteStudent = (studentId: string) => patchData({ op: 'deleteStudent', payload: { studentId } });

export const addTeacher = (payload: Teacher) => patchData({ op: 'addTeacher', payload });
export const updateTeacher = (payload: { originalId: string, updatedTeacher: Teacher }) => patchData({ op: 'updateTeacher', payload });
export const deleteTeacher = (teacherId: string) => patchData({ op: 'deleteTeacher', payload: { teacherId } });

export const addStaff = (payload: Staff) => patchData({ op: 'addStaff', payload });
export const updateStaff = (payload: { originalId: string, updatedStaff: Staff }) => patchData({ op: 'updateStaff', payload });
export const deleteStaff = (staffId: string) => patchData({ op: 'deleteStaff', payload: { staffId } });

export const addClass = (payload: Class) => patchData({ op: 'addClass', payload });
export const updateClass = (payload: { originalId: string, updatedClass: Class }) => patchData({ op: 'updateClass', payload });
export const deleteClass = (classId: string) => patchData({ op: 'deleteClass', payload: { classId } });

export const updateAttendance = (payload: AttendanceRecord[]) => patchData({ op: 'updateAttendance', payload });
export const deleteAttendanceForDate = (payload: { classId: string, date: string }) => patchData({ op: 'deleteAttendanceForDate', payload });
export const deleteAttendanceByMonth = (payload: { month: number; year: number; }) => patchData({ op: 'deleteAttendanceByMonth', payload });

export const generateInvoices = (payload: { month: number, year: number }) => patchData({ op: 'generateInvoices', payload });
export const cancelInvoice = (invoiceId: string) => patchData({ op: 'cancelInvoice', payload: { invoiceId } });
export const updateInvoiceStatus = (payload: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => patchData({ op: 'updateInvoiceStatus', payload });

export const addAdjustment = (payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }) => patchData({ op: 'addAdjustment', payload });
export const updateTransaction = (payload: Transaction) => patchData({ op: 'updateTransaction', payload });
export const deleteTransaction = (transactionId: string) => patchData({ op: 'deleteTransaction', payload: { transactionId } });
export const clearAllTransactions = () => patchData({ op: 'clearAllTransactions' });

export const generatePayrolls = (payload: { month: number, year: number }) => patchData({ op: 'generatePayrolls', payload });

export const updateSettings = (payload: CenterSettings) => patchData({ op: 'updateSettings', payload });
export const updateUserPassword = (payload: { userId: string; role: UserRole; newPassword: string; }) => patchData({ op: 'updateUserPassword', payload });

export const addProgressReport = (payload: Omit<ProgressReport, 'id'>) => patchData({ op: 'addProgressReport', payload });

export const addIncome = (payload: Omit<Income, 'id'>) => patchData({ op: 'addIncome', payload });
export const updateIncome = (payload: Income) => patchData({ op: 'updateIncome', payload });
export const deleteIncome = (itemId: string) => patchData({ op: 'deleteIncome', payload: { itemId } });

export const addExpense = (payload: Omit<Expense, 'id'>) => patchData({ op: 'addExpense', payload });
export const updateExpense = (payload: Expense) => patchData({ op: 'updateExpense', payload });
export const deleteExpense = (itemId: string) => patchData({ op: 'deleteExpense', payload: { itemId } });

export const addAnnouncement = (payload: Omit<Announcement, 'id'>) => patchData({ op: 'addAnnouncement', payload });
export const deleteAnnouncement = (id: string) => patchData({ op: 'deleteAnnouncement', payload: { id } });

export const clearCollections = (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => patchData({ op: 'clearCollections', payload: collectionKeys });

export async function backupData(): Promise<Omit<AppData, 'loading'>> {
    return loadInitialData();
}

export async function restoreData(data: Omit<AppData, 'loading'>): Promise<void> {
    const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'restoreData', payload: data }), // Use the patch endpoint for consistency
    });
     if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
    }
}

export const resetToMockData = async (): Promise<void> => {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) {
        throw new Error("Không thể khôi phục dữ liệu mặc định.");
    }
};
