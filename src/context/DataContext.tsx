
import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Student, Teacher, Staff, Class, AttendanceRecord, Invoice, ProgressReport, Income, Expense, CenterSettings, Payroll, Announcement, Transaction, UserRole, AppData } from '../types';
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
    setError: React.Dispatch<React.SetStateAction<string | null>>;
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
    updatePayroll: (payload: { payrollId: string; bonus: number; deduction: number; status: 'PAID' | 'UNPAID' }) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    setError(null);
    setIsInitialOffline(false);
    try {
        const data = await api.loadInitialData();
        setState({ ...data, loading: false });
    } catch (err: any) {
        console.error("Failed to load local data:", err);
        setIsInitialOffline(true);
        setError('Không thể tải dữ liệu cục bộ. Vui lòng cho phép trang web lưu trữ dữ liệu và thử lại.');
        setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Generic handler for operations that return the full AppData state
  const handleStateUpdateOperation = <T,>(apiFunc: (payload: T) => Promise<Omit<AppData, 'loading'>>) => async (payload: T) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
        const newState = await apiFunc(payload);
        setState({ ...newState, loading: false });
    } catch (err: any) {
         setError(`Thao tác thất bại: ${err.message}`);
         throw err;
    } finally {
        setIsSubmitting(false);
    }
  };

  // Helper for functions that don't return state (or complex ones where we prefer full refresh)
  const createRefreshingFunc = <T,>(apiFunc: (payload: T) => Promise<any>) => async (payload: T) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
        await apiFunc(payload);
        await refreshData();
    } catch (err: any) {
         setError(`Thao tác thất bại: ${err.message}`);
         throw err;
    } finally {
        setIsSubmitting(false);
    }
  };

  const value: DataContextType = {
    state,
    error,
    setError,
    isInitialOffline,
    refreshData,
    
    addStudent: handleStateUpdateOperation(api.addStudent),
    updateStudent: handleStateUpdateOperation(api.updateStudent),
    deleteStudent: handleStateUpdateOperation(api.deleteStudent),
    
    addTeacher: handleStateUpdateOperation(api.addTeacher),
    updateTeacher: handleStateUpdateOperation(api.updateTeacher),
    deleteTeacher: handleStateUpdateOperation(api.deleteTeacher),
    
    addStaff: handleStateUpdateOperation(api.addStaff),
    updateStaff: handleStateUpdateOperation(api.updateStaff),
    deleteStaff: handleStateUpdateOperation(api.deleteStaff),
    
    addClass: handleStateUpdateOperation(api.addClass),
    updateClass: handleStateUpdateOperation(api.updateClass),
    deleteClass: handleStateUpdateOperation(api.deleteClass),
    
    updateAttendance: handleStateUpdateOperation(api.updateAttendance),
    deleteAttendanceForDate: handleStateUpdateOperation(api.deleteAttendanceForDate),
    deleteAttendanceByMonth: handleStateUpdateOperation(api.deleteAttendanceByMonth),
    
    addProgressReport: handleStateUpdateOperation(api.addProgressReport),
    
    generateInvoices: handleStateUpdateOperation(api.generateInvoices),
    cancelInvoice: handleStateUpdateOperation(api.cancelInvoice),
    updateInvoiceStatus: handleStateUpdateOperation(api.updateInvoiceStatus),
    
    addAdjustment: handleStateUpdateOperation(api.addAdjustment),
    updateTransaction: handleStateUpdateOperation(api.updateTransaction),
    deleteTransaction: handleStateUpdateOperation(api.deleteTransaction),
    clearAllTransactions: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newState = await api.clearAllTransactions();
            setState({ ...newState, loading: false });
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },

    generatePayrolls: handleStateUpdateOperation(api.generatePayrolls),
    updatePayroll: handleStateUpdateOperation(api.updatePayroll),
    
    addIncome: handleStateUpdateOperation(api.addIncome),
    updateIncome: handleStateUpdateOperation(api.updateIncome),
    deleteIncome: handleStateUpdateOperation(api.deleteIncome),
    
    addExpense: handleStateUpdateOperation(api.addExpense),
    updateExpense: handleStateUpdateOperation(api.updateExpense),
    deleteExpense: handleStateUpdateOperation(api.deleteExpense),
    
    addAnnouncement: handleStateUpdateOperation(api.addAnnouncement),
    deleteAnnouncement: handleStateUpdateOperation(api.deleteAnnouncement),
    
    updateSettings: handleStateUpdateOperation(api.updateSettings),
    
    updateUserPassword: handleStateUpdateOperation(api.updateUserPassword),
    clearCollections: handleStateUpdateOperation(api.clearCollections),
    
    backupData: api.backupData,
    restoreData: handleStateUpdateOperation(api.restoreData as any),
    
    resetToMockData: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.resetToMockData();
            await refreshData();
        } catch (err: any) {
            setError(err.message);
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
