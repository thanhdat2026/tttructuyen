
import type {
    AppData,
    AttendanceRecord,
    Payroll,
    Transaction,
    PayrollClassDetail
} from '../../types.js';

import {
    PersonStatus,
    FeeType,
    AttendanceStatus,
    SalaryType,
    UserRole,
    TransactionType,
    ExpenseCategory
} from '../../types.js';


const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// This function takes the current data and an operation, and returns the new data state.
// All logic is pure and operates on the provided data object.
export function applyOperation(
    data: Omit<AppData, 'loading'>, 
    operation: { op: string, payload: any }
): Omit<AppData, 'loading'> {
    const { op, payload } = operation;

    switch (op) {
        // STUDENT OPERATIONS
        case 'addStudent': {
            const { student, classIds } = payload;
            if (data.students.some(s => s.id === student.id)) throw new Error(`Học viên với mã '${student.id}' đã tồn tại.`);
            const newStudent = { ...student, createdAt: new Date().toISOString().split('T')[0], balance: 0 };
            data.students.push(newStudent);
            data.classes.forEach(c => {
                if (classIds.includes(c.id)) c.studentIds.push(newStudent.id);
            });
            break;
        }
        case 'updateStudent': {
            const { originalId, updatedStudent, classIds } = payload;
            if (originalId !== updatedStudent.id && data.students.some(s => s.id === updatedStudent.id)) throw new Error(`Học viên với mã '${updatedStudent.id}' đã tồn tại.`);
            
            data.students = data.students.map(s => s.id === originalId ? updatedStudent : s);
            if (originalId !== updatedStudent.id) {
                data.attendance.forEach(a => { if (a.studentId === originalId) a.studentId = updatedStudent.id; });
                data.invoices.forEach(i => { if (i.studentId === originalId) { i.studentId = updatedStudent.id; i.studentName = updatedStudent.name; } });
                data.progressReports.forEach(p => { if (p.studentId === originalId) p.studentId = updatedStudent.id; });
                data.transactions.forEach(t => { if (t.studentId === originalId) t.studentId = updatedStudent.id; });
            }
            const newClassIds = new Set(classIds);
            data.classes.forEach(c => {
                const studentIds = new Set(c.studentIds);
                if (studentIds.has(originalId)) studentIds.delete(originalId);
                if (newClassIds.has(c.id)) studentIds.add(updatedStudent.id);
                c.studentIds = Array.from(studentIds);
            });
            break;
        }
        case 'deleteStudent': {
            const { studentId } = payload;
            data.students = data.students.filter(s => s.id !== studentId);
            data.classes.forEach(c => { c.studentIds = c.studentIds.filter(id => id !== studentId); });
            data.attendance = data.attendance.filter(a => a.studentId !== studentId);
            data.invoices = data.invoices.filter(i => i.studentId !== studentId);
            data.progressReports = data.progressReports.filter(p => p.studentId !== studentId);
            data.transactions = data.transactions.filter(t => t.studentId !== studentId);
            break;
        }
        
        // TEACHER OPERATIONS
        case 'addTeacher': {
            if (data.teachers.some(item => item.id === payload.id)) throw new Error(`Giáo viên với mã '${payload.id}' đã tồn tại.`);
            data.teachers.push({ ...payload, createdAt: new Date().toISOString().split('T')[0] });
            break;
        }
        case 'updateTeacher': {
            const { originalId, updatedTeacher } = payload;
            if (originalId !== updatedTeacher.id && data.teachers.some(t => t.id === updatedTeacher.id)) throw new Error("Mã giáo viên đã tồn tại.");
            data.teachers = data.teachers.map(t => t.id === originalId ? updatedTeacher : t);
            if (originalId !== updatedTeacher.id) {
                data.classes.forEach(c => { c.teacherIds = c.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid); });
                data.payrolls = data.payrolls.filter(p => p.teacherId !== originalId);
            }
            break;
        }
        case 'deleteTeacher': {
            const { teacherId } = payload;
            data.teachers = data.teachers.filter(t => t.id !== teacherId);
            data.classes.forEach(c => { c.teacherIds = c.teacherIds.filter(id => id !== teacherId); });
            data.payrolls = data.payrolls.filter(p => p.teacherId !== teacherId);
            break;
        }

        // STAFF OPERATIONS
        case 'addStaff': {
            if (data.staff.some(item => item.id === payload.id)) throw new Error(`Nhân viên với mã '${payload.id}' đã tồn tại.`);
            data.staff.push({ ...payload, createdAt: new Date().toISOString().split('T')[0] });
            break;
        }
        case 'updateStaff': {
            const { originalId, updatedStaff } = payload;
            if (originalId !== updatedStaff.id && data.staff.some(s => s.id === updatedStaff.id)) throw new Error("Mã nhân viên đã tồn tại.");
            data.staff = data.staff.map(t => t.id === originalId ? updatedStaff : t);
            break;
        }
        case 'deleteStaff': {
            data.staff = data.staff.filter(item => item.id !== payload.staffId);
            break;
        }

        // CLASS OPERATIONS
        case 'addClass': {
            if (data.classes.some(item => item.id === payload.id)) throw new Error(`Lớp học với mã '${payload.id}' đã tồn tại.`);
            data.classes.push(payload);
            break;
        }
        case 'updateClass': {
            const { originalId, updatedClass } = payload;
            if (originalId !== updatedClass.id && data.classes.some(c => c.id === updatedClass.id)) throw new Error("Mã lớp đã tồn tại.");
            data.classes = data.classes.map(c => c.id === originalId ? updatedClass : c);
             if (originalId !== updatedClass.id) {
                data.attendance.forEach(a => { if (a.classId === originalId) a.classId = updatedClass.id; });
                data.progressReports.forEach(p => { if (p.classId === originalId) p.classId = updatedClass.id; });
            }
            break;
        }
        case 'deleteClass': {
            const { classId } = payload;
            data.classes = data.classes.filter(c => c.id !== classId);
            data.attendance = data.attendance.filter(a => a.classId !== classId);
            data.progressReports = data.progressReports.filter(pr => pr.classId !== classId);
            data.announcements = data.announcements.filter(ann => ann.classId !== classId);
            break;
        }

        // ATTENDANCE
        case 'updateAttendance': {
            const records: AttendanceRecord[] = payload;
            const recordsByClassDate = new Map<string, AttendanceRecord[]>();
            records.forEach(r => {
                const key = `${r.classId}|${r.date}`;
                if (!recordsByClassDate.has(key)) recordsByClassDate.set(key, []);
                recordsByClassDate.get(key)!.push(r);
            });

            if (recordsByClassDate.size === 0) break;

            recordsByClassDate.forEach((newRecords, key) => {
                const [classId, date] = key.split('|');
                data.attendance = data.attendance.filter(a => !(a.classId === classId && a.date === date));
                const recordsWithIds = newRecords.map(record => ({...record, id: record.id || generateUniqueId('ATT')}));
                data.attendance.push(...recordsWithIds);
            });
            break;
        }
        case 'deleteAttendanceForDate': {
            const { classId, date } = payload;
            data.attendance = data.attendance.filter(a => !(a.classId === classId && a.date === date));
            break;
        }
        case 'deleteAttendanceByMonth': {
            const { month, year } = payload;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            data.attendance = data.attendance.filter(a => !a.date.startsWith(monthStr));
            break;
        }

        // FINANCE / INVOICES
        case 'generateInvoices': {
            const { month, year } = payload;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            
            // Logic update: Also consider students who have attendance records in this month, even if inactive
            const activeStudentIds = new Set(data.students.filter(s => s.status === PersonStatus.ACTIVE).map(s => s.id));
            const studentsWithAttendanceIds = new Set<string>();
            
            data.attendance.forEach(a => {
                if (a.date.startsWith(monthStr)) {
                    studentsWithAttendanceIds.add(a.studentId);
                }
            });

            const studentsToInvoiceIds = new Set([...activeStudentIds, ...studentsWithAttendanceIds]);

            for (const studentId of studentsToInvoiceIds) {
                const student = data.students.find(s => s.id === studentId);
                if (!student) continue;

                let totalAmount = 0;
                let details = '';
                
                // Identify classes: Currently enrolled OR has attendance in this month
                const relevantClassIds = new Set<string>();

                data.classes.forEach(c => {
                    if (c.studentIds.includes(student.id)) {
                        relevantClassIds.add(c.id);
                    }
                });

                data.attendance.forEach(a => {
                    if (a.studentId === student.id && a.date.startsWith(monthStr)) {
                        relevantClassIds.add(a.classId);
                    }
                });

                for (const classId of relevantClassIds) {
                    const cls = data.classes.find(c => c.id === classId);
                    if (!cls) continue;

                    let classFee = 0;
                    const isEnrolled = cls.studentIds.includes(student.id);
                    
                    const attendedSessions = data.attendance.filter(a => 
                        a.studentId === student.id && 
                        a.classId === cls.id && 
                        a.date.startsWith(monthStr) && 
                        (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE)
                    ).length;

                    if (cls.fee.type === FeeType.MONTHLY || cls.fee.type === FeeType.PER_COURSE) {
                        // If monthly fee, charge if active&enrolled OR if they attended sessions (even if dropped out)
                        const shouldCharge = (student.status === PersonStatus.ACTIVE && isEnrolled) || attendedSessions > 0;

                        if (shouldCharge) {
                            classFee = cls.fee.amount;
                            if (classFee > 0) {
                                details += `- Lớp ${cls.name}: ${Math.round(classFee).toLocaleString('vi-VN')} ₫${!isEnrolled ? ' (Lớp cũ/Đã nghỉ)' : ''}\n`;
                            }
                        }
                    } else if (cls.fee.type === FeeType.PER_SESSION) {
                        if (attendedSessions > 0) {
                            classFee = attendedSessions * cls.fee.amount;
                            details += `- Lớp ${cls.name}: ${attendedSessions} buổi x ${Math.round(cls.fee.amount).toLocaleString('vi-VN')} ₫ = ${Math.round(classFee).toLocaleString('vi-VN')} ₫\n`;
                        }
                    }
                    totalAmount += classFee;
                }

                // Round total amount to avoid floating point errors
                totalAmount = Math.round(totalAmount);

                const existingInvoice = data.invoices.find(inv => inv.studentId === student.id && inv.month === monthStr);

                if (existingInvoice) {
                    // Update existing UNPAID invoice
                    // Always update generatedDate and details to reflect current 'Generate' action
                    if (existingInvoice.status === 'UNPAID') {
                        const amountDifference = totalAmount - existingInvoice.amount;
                        
                        existingInvoice.amount = totalAmount;
                        existingInvoice.details = details.trim();
                        existingInvoice.generatedDate = new Date().toISOString().split('T')[0]; // Update date to today
                        
                        // Update related transaction
                        const relatedTransaction = data.transactions.find(t => t.relatedInvoiceId === existingInvoice.id);
                        if(relatedTransaction) {
                            relatedTransaction.amount = -totalAmount;
                            relatedTransaction.date = existingInvoice.generatedDate; // Sync transaction date
                        }
                        
                        // Update student balance if amount changed
                        if (amountDifference !== 0) {
                            const studentToUpdate = data.students.find(s => s.id === student.id);
                            if (studentToUpdate) studentToUpdate.balance -= amountDifference;
                        }
                    }
                } else if (totalAmount > 0) {
                    // Create new invoice
                    const invoiceId = generateUniqueId('INV');
                    data.invoices.push({ id: invoiceId, studentId: student.id, studentName: student.name, month: monthStr, amount: totalAmount, details: details.trim(), status: 'UNPAID', generatedDate: new Date().toISOString().split('T')[0], paidDate: null });
                    
                    // Create debit transaction
                    data.transactions.push({ id: generateUniqueId('TRX'), studentId: student.id, date: new Date().toISOString().split('T')[0], type: TransactionType.INVOICE, description: `Hóa đơn học phí tháng ${month}/${year}`, amount: -totalAmount, relatedInvoiceId: invoiceId });
                    
                    // Update student balance
                    const studentToUpdate = data.students.find(s => s.id === student.id);
                    if (studentToUpdate) studentToUpdate.balance -= totalAmount;
                }
            }
            break;
        }
        case 'cancelInvoice': {
            const { invoiceId } = payload;
            const invoice = data.invoices.find(inv => inv.id === invoiceId);
            if (!invoice || invoice.status === 'CANCELLED') break;
            if (invoice.status === 'PAID') throw new Error("Không thể hủy hóa đơn đã thanh toán.");
            invoice.status = 'CANCELLED';
            const student = data.students.find(s => s.id === invoice.studentId);
            if (student) student.balance += invoice.amount;
            data.transactions.push({ id: generateUniqueId('TRX'), studentId: invoice.studentId, date: new Date().toISOString().split('T')[0], type: TransactionType.ADJUSTMENT_CREDIT, description: `Hủy hóa đơn #${invoiceId}`, amount: invoice.amount, relatedInvoiceId: invoiceId });
            break;
        }
        case 'updateInvoiceStatus': {
             const { invoiceId, status } = payload;
             const invoice = data.invoices.find(inv => inv.id === invoiceId);
             if (invoice) {
                invoice.status = status;
                if (status === 'PAID') invoice.paidDate = new Date().toISOString().split('T')[0];
                else invoice.paidDate = null;
            }
            break;
        }

        // TRANSACTIONS
        case 'addAdjustment': {
            const { studentId, amount, date, description, type } = payload;
            const finalAmount = type === 'CREDIT' ? amount : -amount;
            const student = data.students.find(s => s.id === studentId);
            if (student) student.balance += finalAmount;
            data.transactions.push({ id: generateUniqueId('TRX'), studentId, date, type: type === 'CREDIT' ? TransactionType.PAYMENT : TransactionType.ADJUSTMENT_DEBIT, description, amount: finalAmount });
            break;
        }
        case 'updateTransaction': {
            const transaction: Transaction = payload;
            const oldTransaction = data.transactions.find(t => t.id === transaction.id);
            if (!oldTransaction) throw new Error("Giao dịch không tồn tại.");
            const amountDifference = transaction.amount - oldTransaction.amount;
            data.transactions = data.transactions.map(t => t.id === transaction.id ? transaction : t);
            const student = data.students.find(s => s.id === transaction.studentId);
            if (student) student.balance += amountDifference;
            break;
        }
        case 'deleteTransaction': {
            const { transactionId } = payload;
            const transaction = data.transactions.find(t => t.id === transactionId);
            if (!transaction) break;
            data.transactions = data.transactions.filter(t => t.id !== transactionId);
            const student = data.students.find(s => s.id === transaction.studentId);
            if (student) student.balance -= transaction.amount;
            break;
        }
         case 'clearAllTransactions': {
            data.students.forEach(student => student.balance = 0);
            data.transactions = [];
            data.invoices = [];
            break;
        }

        // PAYROLL
        case 'generatePayrolls': {
            const { month, year } = payload;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const calculationDate = new Date().toISOString().split('T')[0];
            
            // Optimization: Pre-calculate sessions per class for the month using a Map
            const classSessionsMap = new Map<string, Set<string>>(); // classId -> Set of dates
            
            data.attendance.forEach(a => {
                if (a.date.startsWith(monthStr)) {
                    if (!classSessionsMap.has(a.classId)) {
                        classSessionsMap.set(a.classId, new Set());
                    }
                    classSessionsMap.get(a.classId)!.add(a.date);
                }
            });

            // Get all teachers
            const allTeachers = data.teachers;
            
            for(const teacher of allTeachers) {
                let baseSalary = 0, totalSessionsTaught = 0;
                
                // Find classes assigned to this teacher
                const teacherClasses = data.classes.filter(c => c.teacherIds.includes(teacher.id));
                const classDetails: PayrollClassDetail[] = [];
                
                // Calculate sessions for each assigned class based on pre-calculated map
                for (const cls of teacherClasses) {
                    const sessions = classSessionsMap.get(cls.id)?.size || 0;
                    
                    if (sessions > 0) {
                        classDetails.push({
                            classId: cls.id,
                            className: cls.name,
                            sessionsTaught: sessions
                        });
                        totalSessionsTaught += sessions;
                    }
                }

                // If teacher is inactive and has no sessions, skip
                if (teacher.status === PersonStatus.INACTIVE && totalSessionsTaught === 0) {
                    continue;
                }

                if (teacher.salaryType === SalaryType.MONTHLY) {
                    baseSalary = teacher.rate;
                } else {
                    baseSalary = totalSessionsTaught * teacher.rate;
                }
                
                const payrollId = `PAY-${teacher.id}-${monthStr}`;
                const existingPayroll = data.payrolls.find(p => p.id === payrollId);
                
                // Preserve existing manual edits if they exist
                const bonus = existingPayroll ? existingPayroll.bonus : 0;
                const deduction = existingPayroll ? existingPayroll.deduction : 0;
                const status = existingPayroll ? existingPayroll.status : 'UNPAID';
                const paidDate = existingPayroll ? existingPayroll.paidDate : undefined;
                
                // Ensure total salary is never negative and rounded
                const totalSalary = Math.max(0, Math.round(baseSalary + bonus - deduction));

                const newPayroll: Payroll = { 
                    id: payrollId, 
                    teacherId: teacher.id, 
                    teacherName: teacher.name, 
                    month: monthStr, 
                    sessionsTaught: totalSessionsTaught, 
                    rate: teacher.rate, 
                    baseSalary: Math.round(baseSalary), 
                    bonus,
                    deduction,
                    totalSalary,
                    status,
                    paidDate,
                    calculationDate: calculationDate,
                    classDetails
                };
                
                const existingIndex = data.payrolls.findIndex(p => p.id === payrollId);
                if (existingIndex !== -1) {
                    data.payrolls[existingIndex] = newPayroll;
                    
                    // IMPORTANT: If the payroll was already PAID, we must sync the expense amount
                    if (status === 'PAID') {
                        const expenseId = `EXP-${payrollId}`;
                        const existingExpense = data.expenses.find(e => e.id === expenseId);
                        if (existingExpense) {
                            existingExpense.amount = totalSalary;
                        }
                    }
                } else {
                    data.payrolls.push(newPayroll);
                }
            }
            break;
        }
        case 'updatePayroll': {
            const { payrollId, bonus, deduction, status } = payload;
            const payroll = data.payrolls.find(p => p.id === payrollId);
            if (!payroll) throw new Error("Bảng lương không tồn tại.");

            payroll.bonus = bonus;
            payroll.deduction = deduction;
            payroll.status = status;
            // Recalculate total
            payroll.totalSalary = Math.max(0, Math.round(payroll.baseSalary + bonus - deduction));
            
            const expenseId = `EXP-${payrollId}`;

            if (status === 'PAID') {
                // If marking as paid, set date if missing
                if (!payroll.paidDate) {
                     payroll.paidDate = new Date().toISOString().split('T')[0];
                }
                
                // Create or Update Expense record automatically
                const existingExpense = data.expenses.find(e => e.id === expenseId);
                if (existingExpense) {
                    existingExpense.amount = payroll.totalSalary;
                    existingExpense.description = `Lương T${payroll.month.split('-')[1]} - ${payroll.teacherName}`;
                    existingExpense.date = payroll.paidDate;
                } else {
                    data.expenses.push({
                        id: expenseId,
                        description: `Lương T${payroll.month.split('-')[1]} - ${payroll.teacherName}`,
                        amount: payroll.totalSalary,
                        category: ExpenseCategory.SALARY,
                        date: payroll.paidDate
                    });
                }
            } else if (status === 'UNPAID') {
                // If marking as unpaid, clear date and remove expense
                payroll.paidDate = undefined;
                data.expenses = data.expenses.filter(e => e.id !== expenseId);
            }
            break;
        }

        // OTHER
        case 'addProgressReport': {
            data.progressReports.push({ ...payload, id: generateUniqueId('PR') });
            break;
        }
        case 'addIncome': {
            data.income.push({ ...payload, id: generateUniqueId('INC') });
            break;
        }
        case 'updateIncome': {
            data.income = data.income.map(i => i.id === payload.id ? payload : i);
            break;
        }
        case 'deleteIncome': {
            data.income = data.income.filter(i => i.id !== payload.itemId);
            break;
        }
        case 'addExpense': {
            data.expenses.push({ ...payload, id: generateUniqueId('EXP') });
            break;
        }
        case 'updateExpense': {
            data.expenses = data.expenses.map(e => e.id === payload.id ? payload : e);
            break;
        }
        case 'deleteExpense': {
            data.expenses = data.expenses.filter(i => i.id !== payload.itemId);
            break;
        }
        case 'addAnnouncement': {
            const newAnnouncement = { ...payload, id: generateUniqueId('ANN'), createdAt: new Date().toISOString().split('T')[0] };
            data.announcements.unshift(newAnnouncement);
            break;
        }
        case 'deleteAnnouncement': {
            data.announcements = data.announcements.filter(a => a.id !== payload.id);
            break;
        }
        
        // SETTINGS & DATA MANAGEMENT
        case 'updateSettings': {
            data.settings = payload;
            break;
        }
        case 'updateUserPassword': {
            const { userId, role, newPassword } = payload;
            let userList;
            if (role === UserRole.PARENT) userList = data.students;
            else if (role === UserRole.TEACHER) userList = data.teachers;
            else if (role === UserRole.MANAGER || role === UserRole.ACCOUNTANT) userList = data.staff;
            else throw new Error('Vai trò không hợp lệ.');
            const user = userList.find(u => u.id === userId);
            if (user) user.password = newPassword;
            else throw new Error('Không tìm thấy người dùng.');
            break;
        }
        case 'clearCollections': {
            const collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[] = payload;
            for (const key of collectionKeys) { (data as any)[key] = []; }
            if (collectionKeys.includes('students')) {
                data.attendance = []; data.invoices = []; data.progressReports = []; data.transactions = [];
                data.classes.forEach(c => { c.studentIds = []; });
            }
            if (collectionKeys.includes('teachers')) {
                data.payrolls = [];
                data.classes.forEach(c => { c.teacherIds = []; });
            }
            if (collectionKeys.includes('classes')) { data.attendance = []; data.progressReports = []; }
            break;
        }

        default:
            throw new Error(`Thao tác không xác định: ${op}`);
    }

    return data;
}
