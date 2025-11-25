
import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Student, Teacher, Staff, Class, AttendanceRecord, Invoice, ProgressReport, Income, Expense, CenterSettings, Payroll, Announcement, Transaction, UserRole } from '../types';
import * as api from '../services/api';
import { MOCK_SETTINGS } from '../services/mockData';


interface AppState {
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
  loading: boolean;
}

const initialState: AppState = {
  students: [],
  teachers: [],
  staff: [],
  classes: [],
  attendance: [],
  invoices: [],
  progressReports: [],
  transactions: [],
  income: [],
  expenses: [],
  settings: MOCK_SETTINGS,
  payrolls: [],
  announcements: [],
  loading: true,
};

interface DataContextType {
    state: AppState;
    error: string | null;
    isInitialOffline: boolean;
    refreshData: () => Promise<void>;
    addStudent: (payload: { student: Student, classIds: string[] }) => Promise<void>;
    updateStudent: (payload: { originalId: string, updatedStudent: Student, classIds: string[] }) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    addTeacher: (data: Teacher) => Promise<void>;
    updateTeacher: (payload: { originalId: string, updatedTeacher: Teacher }) => Promise<void>;
    deleteTeacher: (teacherId: string) => Promise<void>;
    addStaff: (data: Staff) => Promise<void>;
    updateStaff: (payload: { originalId: string, updatedStaff: Staff }) => Promise<void>;
    deleteStaff: (staffId: string) => Promise<void>;
    addClass: (data: Class) => Promise<void>;
    updateClass: (payload: { originalId: string, updatedClass: Class }) => Promise<void>;
    deleteClass: (classId: string) => Promise<void>;
    updateAttendance: (records: AttendanceRecord[]) => Promise<void>;
    addProgressReport: (data: Omit<ProgressReport, 'id'>) => Promise<void>;
    generateInvoices: (payload: { month: number, year: number }) => Promise<void>;
    cancelInvoice: (invoiceId: string) => Promise<void>;
    addAdjustment: (payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }) => Promise<void>;
    updateTransaction: (transaction: Transaction) => Promise<void>;
    deleteTransaction: (transactionId: string) => Promise<void>;
    updateInvoiceStatus: (payload: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => Promise<void>;
    generatePayrolls: (payload: { month: number, year: number }) => Promise<void>;
    updatePayroll: (payroll: Payroll) => Promise<void>;
    addIncome: (data: Omit<Income, 'id'>) => Promise<void>;
    updateIncome: (item: Income) => Promise<void>;
    deleteIncome: (itemId: string) => Promise<void>;
    addExpense: (data: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (item: Expense) => Promise<void>;
    deleteExpense: (itemId: string) => Promise<void>;
    updateSettings: (settings: CenterSettings) => Promise<void>;
    backupData: () => Promise<Omit<AppState, 'loading'>>;
    restoreData: (data: Omit<AppState, 'loading'>) => Promise<void>;
    resetToMockData: () => Promise<void>;
    addAnnouncement: (data: Omit<Announcement, 'id'>) => Promise<void>;
    deleteAnnouncement: (id: string) => Promise<void>;
    deleteAttendanceForDate: (payload: { classId: string, date: string }) => Promise<void>;
    updateUserPassword: (payload: { userId: string; role: UserRole; newPassword: string; }) => Promise<void>;
    clearCollections: (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => Promise<void>;
    deleteAttendanceByMonth: (payload: { month: number; year: number; }) => Promise<void>;
    clearAllTransactions: () => Promise<void>;
}


export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isInitialOffline, setIsInitialOffline] = useState(false);

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    setError(null);
    setIsInitialOffline(false);
    try {
        const data = await api.loadInitialData();
        setState({ ...data, loading: false });
    } catch (err: any) {
        console.error("Failed to load local data:", err);
        // This error now implies a problem with localStorage, not network.
        setIsInitialOffline(true);
        setError('Không thể tải dữ liệu cục bộ. Vui lòng cho phép trang web lưu trữ dữ liệu và thử lại.');
        setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Helper for functions that are complex and should trigger a full data refresh
  const createRefreshingFunc = <T,>(apiFunc: (payload: T) => Promise<any>) => async (payload: T) => {
    await apiFunc(payload);
    await refreshData();
  };

  const value: DataContextType = {
    state,
    error,
    isInitialOffline,
    refreshData,
    addStudent: async (payload) => {
        await api.addStudent(payload);
        const newStudent = { ...payload.student, createdAt: new Date().toISOString().split('T')[0], balance: 0 };
        setState(prev => {
            const classIdsSet = new Set(payload.classIds);
            return {
                ...prev,
                students: [...prev.students, newStudent],
                classes: prev.classes.map(c => 
                    classIdsSet.has(c.id) 
                    ? { ...c, studentIds: [...c.studentIds, newStudent.id] } 
                    : c
                ),
            };
        });
    },
    updateStudent: async (payload) => {
        await api.updateStudent(payload);
        if (payload.originalId !== payload.updatedStudent.id) {
            await refreshData();
        } else {
            setState(prev => {
                const newStudents = prev.students.map(s => s.id === payload.originalId ? payload.updatedStudent : s);
                const newClassIds = new Set(payload.classIds);
                const oldClassIds = new Set(prev.classes.filter(c => c.studentIds.includes(payload.originalId)).map(c => c.id));
                
                const newClasses = prev.classes.map(c => {
                    const wasIn = oldClassIds.has(c.id);
                    const isIn = newClassIds.has(c.id);
                    if (wasIn && !isIn) {
                        return { ...c, studentIds: c.studentIds.filter(id => id !== payload.originalId) };
                    }
                    if (!wasIn && isIn) {
                        return { ...c, studentIds: [...c.studentIds, payload.originalId] };
                    }
                    return c;
                });
    
                return { ...prev, students: newStudents, classes: newClasses };
            });
        }
    },
    deleteStudent: createRefreshingFunc(api.deleteStudent),
    addTeacher: async (data) => {
        const newState = await api.addTeacher(data);
        setState({ ...newState, loading: false });
    },
    updateTeacher: async (payload) => {
        const newState = await api.updateTeacher(payload);
        setState({ ...newState, loading: false });
    },
    deleteTeacher: createRefreshingFunc(api.deleteTeacher),
    addStaff: async (data) => {
        const newState = await api.addStaff(data);
        setState({ ...newState, loading: false });
    },
    updateStaff: async (payload) => {
        const newState = await api.updateStaff(payload);
        setState({ ...newState, loading: false });
    },
    deleteStaff: createRefreshingFunc(api.deleteStaff),
    addClass: async (data) => {
        const newState = await api.addClass(data);
        setState({ ...newState, loading: false });
    },
    updateClass: async (payload) => {
        const newState = await api.updateClass(payload);
        setState({ ...newState, loading: false });
    },
    deleteClass: createRefreshingFunc(api.deleteClass),
    addProgressReport: async (data) => {
        const newState = await api.addProgressReport(data);
        setState({ ...newState, loading: false });
    },
    addIncome: async (data) => {
        const newState = await api.addIncome(data);
        setState({ ...newState, loading: false });
    },
    updateIncome: async (item) => {
        const newState = await api.updateIncome(item);
        setState({ ...newState, loading: false });
    },
    deleteIncome: async (itemId) => {
        const newState = await api.deleteIncome(itemId);
        setState({ ...newState, loading: false });
    },
    addExpense: async (data) => {
        const newState = await api.addExpense(data);
        setState({ ...newState, loading: false });
    },
    updateExpense: async (item) => {
        const newState = await api.updateExpense(item);
        setState({ ...newState, loading: false });
    },
    deleteExpense: async (itemId) => {
        const newState = await api.deleteExpense(itemId);
        setState({ ...newState, loading: false });
    },
    addAnnouncement: async (data) => {
        const newState = await api.addAnnouncement(data);
        setState({ ...newState, loading: false });
    },
    deleteAnnouncement: async (id) => {
        const newState = await api.deleteAnnouncement(id);
        setState({ ...newState, loading: false });
    },
    updateSettings: async (settings) => {
        const newState = await api.updateSettings(settings);
        setState({ ...newState, loading: false });
    },
    // Keep full refresh for complex/bulk operations
    updateAttendance: createRefreshingFunc(api.updateAttendance),
    generateInvoices: createRefreshingFunc(api.generateInvoices),
    cancelInvoice: createRefreshingFunc(api.cancelInvoice),
    addAdjustment: createRefreshingFunc(api.addAdjustment),
    updateTransaction: createRefreshingFunc(api.updateTransaction),
    deleteTransaction: createRefreshingFunc(api.deleteTransaction),
    updateInvoiceStatus: createRefreshingFunc(api.updateInvoiceStatus),
    generatePayrolls: createRefreshingFunc(api.generatePayrolls),
    updatePayroll: createRefreshingFunc(api.updatePayroll),
    backupData: api.backupData,
    restoreData: createRefreshingFunc(api.restoreData as any),
    resetToMockData: async () => {
        await api.resetToMockData();
        await refreshData();
    },
    deleteAttendanceForDate: createRefreshingFunc(api.deleteAttendanceForDate),
    updateUserPassword: async (payload) => {
      // No data refresh needed for this, just a direct API call
      await api.updateUserPassword(payload);
    },
    clearCollections: createRefreshingFunc(api.clearCollections),
    deleteAttendanceByMonth: createRefreshingFunc(api.deleteAttendanceByMonth),
    clearAllTransactions: async () => {
        await api.clearAllTransactions();
        await refreshData();
    },
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
