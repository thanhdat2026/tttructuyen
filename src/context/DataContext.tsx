
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
        await apiFunc(payload);
        await refreshData();
    } catch (err: any) {
         setError(`Thay đổi của bạn chưa được lưu. Lỗi: ${err.message}`);
         throw err;
    } finally {
        setIsSubmitting(false);
    }
  };

  // Helper for simple additions that can optimistically update state or just append
  // Note: For this app structure, we rely mostly on full refresh or specific state updates for complex types
  // but we can keep the pattern consistent.

  const value: DataContextType = {
    state,
    error,
    isInitialOffline,
    refreshData,
    addStudent: async (payload) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
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
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateStudent: async (payload) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
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
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteStudent: createRefreshingFunc(api.deleteStudent),
    addTeacher: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newTeacher = await api.addTeacher(data);
            setState(prev => ({...prev, teachers: [...prev.teachers, newTeacher]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateTeacher: async (payload) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateTeacher(payload);
            if (payload.originalId !== payload.updatedTeacher.id) {
                await refreshData();
            } else {
                setState(prev => ({...prev, teachers: prev.teachers.map(t => t.id === payload.originalId ? payload.updatedTeacher : t)}));
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteTeacher: createRefreshingFunc(api.deleteTeacher),
    addStaff: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newStaff = await api.addStaff(data);
            setState(prev => ({...prev, staff: [...prev.staff, newStaff]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateStaff: async (payload) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateStaff(payload);
            if (payload.originalId !== payload.updatedStaff.id) {
                await refreshData();
            } else {
                setState(prev => ({...prev, staff: prev.staff.map(s => s.id === payload.originalId ? payload.updatedStaff : s)}));
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteStaff: createRefreshingFunc(api.deleteStaff),
    addClass: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newClass = await api.addClass(data);
            setState(prev => ({...prev, classes: [...prev.classes, newClass]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateClass: async (payload) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateClass(payload);
            if (payload.originalId !== payload.updatedClass.id) {
                await refreshData();
            } else {
                setState(prev => ({...prev, classes: prev.classes.map(c => c.id === payload.originalId ? payload.updatedClass : c)}));
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteClass: createRefreshingFunc(api.deleteClass),
    addProgressReport: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newReport = await api.addProgressReport(data);
            setState(prev => ({ ...prev, progressReports: [...prev.progressReports, newReport]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    addIncome: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newItem = await api.addIncome(data);
            setState(prev => ({ ...prev, income: [...prev.income, newItem]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateIncome: async (item) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateIncome(item);
            setState(prev => ({...prev, income: prev.income.map(i => i.id === item.id ? item : i)}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteIncome: async (itemId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.deleteIncome(itemId);
            setState(prev => ({...prev, income: prev.income.filter(i => i.id !== itemId)}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    addExpense: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newItem = await api.addExpense(data);
            setState(prev => ({ ...prev, expenses: [...prev.expenses, newItem]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateExpense: async (item) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateExpense(item);
            setState(prev => ({...prev, expenses: prev.expenses.map(i => i.id === item.id ? item : i)}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteExpense: async (itemId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.deleteExpense(itemId);
            setState(prev => ({...prev, expenses: prev.expenses.filter(i => i.id !== itemId)}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    addAnnouncement: async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newAnnouncement = await api.addAnnouncement(data);
            setState(prev => ({...prev, announcements: [newAnnouncement, ...prev.announcements]}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    deleteAnnouncement: async (id) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.deleteAnnouncement(id);
            setState(prev => ({...prev, announcements: prev.announcements.filter(a => a.id !== id)}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    },
    updateSettings: async (settings) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.updateSettings(settings);
            setState(prev => ({...prev, settings}));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
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
    deleteAttendanceForDate: createRefreshingFunc(api.deleteAttendanceForDate),
    updateUserPassword: async (payload) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          await api.updateUserPassword(payload);
      } catch (err: any) {
          setError(err.message);
          throw err;
      } finally {
          setIsSubmitting(false);
      }
    },
    clearCollections: createRefreshingFunc(api.clearCollections),
    deleteAttendanceByMonth: createRefreshingFunc(api.deleteAttendanceByMonth),
    clearAllTransactions: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await api.clearAllTransactions();
            await refreshData();
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
