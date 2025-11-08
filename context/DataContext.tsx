
import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Student, Teacher, Staff, Class, AttendanceRecord, ProgressReport, Income, Expense, CenterSettings, Announcement, Transaction, UserRole, AppData } from '../types';
import * as api from '../services/api';
import { MOCK_SETTINGS } from '../services/mockData';


interface AppState extends AppData {
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
    isSubmitting: boolean;
    isInitialOffline: boolean;
    setError: (error: string | null) => void;
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
    addIncome: (data: Omit<Income, 'id'>) => Promise<void>;
    updateIncome: (item: Income) => Promise<void>;
    deleteIncome: (itemId: string) => Promise<void>;
    addExpense: (data: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (item: Expense) => Promise<void>;
    deleteExpense: (itemId: string) => Promise<void>;
    updateSettings: (settings: CenterSettings) => Promise<void>;
    backupData: () => Promise<Omit<AppData, 'loading'>>;
    restoreData: (data: Omit<AppData, 'loading'>) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialOffline, setIsInitialOffline] = useState(false);

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    setError(null);
    setIsInitialOffline(false);
    try {
        const data = await api.loadInitialData();
        setState({ ...data, loading: false });
    } catch (err: any) {
        console.error("Không thể tải dữ liệu từ máy chủ:", err);
        setIsInitialOffline(true);
        setError(`Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại. Lỗi: ${err.message || 'Không rõ'}`);
        setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]); 

  const createMutation = <T,>(apiFunc: (payload: T) => Promise<any>) => async (payload: T) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
        const newState = await apiFunc(payload);
        setState({ ...newState, loading: false });
    } catch (err: any) {
         setError(`Thay đổi của bạn chưa được lưu. Vui lòng kiểm tra kết nối mạng và thử lại. Lỗi: ${err.message}`);
         throw err; // Re-throw for components that need to catch it
    } finally {
        setIsSubmitting(false);
    }
  };

  const value: DataContextType = {
    state,
    error,
    isSubmitting,
    isInitialOffline,
    setError,
    refreshData,
    addStudent: createMutation(api.addStudent),
    updateStudent: createMutation(api.updateStudent),
    deleteStudent: createMutation(api.deleteStudent),
    addTeacher: createMutation(api.addTeacher),
    updateTeacher: createMutation(api.updateTeacher),
    deleteTeacher: createMutation(api.deleteTeacher),
    addStaff: createMutation(api.addStaff),
    updateStaff: createMutation(api.updateStaff),
    deleteStaff: createMutation(api.deleteStaff),
    addClass: createMutation(api.addClass),
    updateClass: createMutation(api.updateClass),
    deleteClass: createMutation(api.deleteClass),
    addProgressReport: createMutation(api.addProgressReport),
    addIncome: createMutation(api.addIncome),
    updateIncome: createMutation(api.updateIncome),
    deleteIncome: createMutation(api.deleteIncome),
    addExpense: createMutation(api.addExpense),
    updateExpense: createMutation(api.updateExpense),
    deleteExpense: createMutation(api.deleteExpense),
    addAnnouncement: createMutation(api.addAnnouncement),
    deleteAnnouncement: createMutation(api.deleteAnnouncement),
    updateSettings: createMutation(api.updateSettings),
    updateAttendance: createMutation(api.updateAttendance),
    generateInvoices: createMutation(api.generateInvoices),
    cancelInvoice: createMutation(api.cancelInvoice),
    addAdjustment: createMutation(api.addAdjustment),
    updateTransaction: createMutation(api.updateTransaction),
    deleteTransaction: createMutation(api.deleteTransaction),
    updateInvoiceStatus: createMutation(api.updateInvoiceStatus),
    generatePayrolls: createMutation(api.generatePayrolls),
    backupData: api.backupData,
    restoreData: createMutation(api.restoreData as any),
    resetToMockData: async () => {
        await api.resetToMockData();
        await refreshData();
    },
    deleteAttendanceForDate: createMutation(api.deleteAttendanceForDate),
    updateUserPassword: createMutation(api.updateUserPassword),
    clearCollections: createMutation(api.clearCollections),
    deleteAttendanceByMonth: createMutation(api.deleteAttendanceByMonth),
    // FIX: `createMutation` expects a payload, but `clearAllTransactions` does not take one.
    // Implement this as a separate async function to handle the API call without a payload.
    clearAllTransactions: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const newState = await api.clearAllTransactions();
            setState({ ...newState, loading: false });
        } catch (err: any) {
            setError(`Thay đổi của bạn chưa được lưu. Vui lòng kiểm tra kết nối mạng và thử lại. Lỗi: ${err.message}`);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};