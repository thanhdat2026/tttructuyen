
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

import { getVietnamTime } from '../../utils/date.js';


const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// This function takes the current data and an operation, and returns the new data state.
// All logic is pure and operates on the provided data object.
export function applyOperation(
    data: Omit<AppData, 'loading'>, 
    operation: { op: string, payload: any }
): Omit<AppData, 'loading'> {
    const { op, payload } = operation;

    const recalculateStudentInvoices = (studentId: string, triggerDate?: string) => {
        const student = data.students.find(s => s.id === studentId);
        if (!student) return;

        const studentInvoices = data.invoices.filter(inv => inv.studentId === studentId && inv.status !== 'CANCELLED');
        studentInvoices.sort((a, b) => new Date(a.generatedDate).getTime() - new Date(b.generatedDate).getTime());

        let totalActiveInvoiceAmount = studentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        let availableFunds = student.balance + totalActiveInvoiceAmount;

        for (const invoice of studentInvoices) {
            if (invoice.amount === 0) {
                if (invoice.status !== 'PAID') {
                    invoice.status = 'PAID';
                    invoice.paidDate = triggerDate || getVietnamTime();
                }
            } else if (availableFunds >= invoice.amount - 100) {
                if (invoice.status !== 'PAID') {
                    invoice.status = 'PAID';
                    invoice.paidDate = triggerDate || getVietnamTime();
                }
                availableFunds -= invoice.amount;
            } else {
                if (invoice.status !== 'UNPAID') {
                    invoice.status = 'UNPAID';
                    invoice.paidDate = null;
                }
                availableFunds -= invoice.amount;
            }
        }
    };

    switch (op) {
        // STUDENT OPERATIONS
        case 'addStudent': {
            const { student, classIds } = payload;
            if (data.students.some(s => s.id === student.id)) throw new Error(`Học viên với mã '${student.id}' đã tồn tại.`);
            const now = getVietnamTime();
            const newStudent = { 
                ...student, 
                createdAt: now.split('T')[0], 
                balance: 0, 
                statusChangedAt: now,
                statusHistory: [{ status: student.status, changedAt: now }]
            };
            data.students.push(newStudent);
            data.classes.forEach(c => {
                if (classIds.includes(c.id)) c.studentIds.push(newStudent.id);
            });
            break;
        }
        case 'updateStudent': {
            const { originalId, updatedStudent, classIds } = payload;
            if (originalId !== updatedStudent.id && data.students.some(s => s.id === updatedStudent.id)) throw new Error(`Học viên với mã '${updatedStudent.id}' đã tồn tại.`);
            
            const originalStudent = data.students.find(s => s.id === originalId);
            
            // Preserve existing history or initialize it
            updatedStudent.statusHistory = originalStudent?.statusHistory || [];
            if (originalStudent && !originalStudent.statusHistory && originalStudent.statusChangedAt) {
                 updatedStudent.statusHistory = [{ status: originalStudent.status, changedAt: originalStudent.statusChangedAt }];
            }

            if (originalStudent && originalStudent.status !== updatedStudent.status) {
                const now = getVietnamTime();
                updatedStudent.statusChangedAt = now;
                updatedStudent.statusHistory.push({ status: updatedStudent.status, changedAt: now });
            } else if (originalStudent && originalStudent.statusChangedAt) {
                updatedStudent.statusChangedAt = originalStudent.statusChangedAt;
            }

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
            if (data.transactions.some(t => t.studentId === studentId) || data.invoices.some(i => i.studentId === studentId)) {
                throw new Error("Không thể xóa học viên đã có dữ liệu giao dịch hoặc hóa đơn.");
            }
            if (data.attendance.some(a => a.studentId === studentId)) {
                throw new Error("Không thể xóa học viên đã có dữ liệu điểm danh.");
            }
            data.students = data.students.filter(s => s.id !== studentId);
            data.classes.forEach(c => { c.studentIds = c.studentIds.filter(id => id !== studentId); });
            data.progressReports = data.progressReports.filter(p => p.studentId !== studentId);
            break;
        }
        
        // TEACHER OPERATIONS
        case 'addTeacher': {
            if (data.teachers.some(item => item.id === payload.id)) throw new Error(`Giáo viên với mã '${payload.id}' đã tồn tại.`);
            data.teachers.push({ ...payload, createdAt: getVietnamTime().split('T')[0] });
            break;
        }
        case 'updateTeacher': {
            const { originalId, updatedTeacher } = payload;
            if (originalId !== updatedTeacher.id && data.teachers.some(t => t.id === updatedTeacher.id)) throw new Error("Mã giáo viên đã tồn tại.");
            
            const originalTeacher = data.teachers.find(t => t.id === originalId);
            const nameChanged = originalTeacher && originalTeacher.name !== updatedTeacher.name;

            data.teachers = data.teachers.map(t => t.id === originalId ? updatedTeacher : t);
            
            if (originalId !== updatedTeacher.id) {
                data.classes.forEach(c => { c.teacherIds = c.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid); });
                data.attendance.forEach(a => {
                    if (a.teacherIds) {
                        a.teacherIds = a.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid);
                    }
                });
                data.payrolls.forEach(p => {
                    if (p.teacherId === originalId) {
                        const oldPayrollId = p.id;
                        p.teacherId = updatedTeacher.id;
                        p.teacherName = updatedTeacher.name;
                        p.id = `PAY-${updatedTeacher.id}-${p.month}`;
                        
                        const expense = data.expenses.find(e => e.id === `EXP-${oldPayrollId}`);
                        if (expense) {
                            expense.id = `EXP-${p.id}`;
                            expense.description = `Lương T${p.month.split('-')[1]} - ${updatedTeacher.name}`;
                        }
                    }
                });
            } else if (nameChanged) {
                data.payrolls.forEach(p => {
                    if (p.teacherId === originalId) {
                        p.teacherName = updatedTeacher.name;
                        const expense = data.expenses.find(e => e.id === `EXP-${p.id}`);
                        if (expense) {
                            expense.description = `Lương T${p.month.split('-')[1]} - ${updatedTeacher.name}`;
                        }
                    }
                });
            }
            break;
        }
        case 'deleteTeacher': {
            const { teacherId } = payload;
            if (data.payrolls.some(p => p.teacherId === teacherId)) {
                throw new Error("Không thể xóa giáo viên đã có dữ liệu bảng lương.");
            }
            if (data.progressReports.some(p => p.createdBy === teacherId)) {
                throw new Error("Không thể xóa giáo viên đã có dữ liệu báo cáo học tập.");
            }
            data.teachers = data.teachers.filter(t => t.id !== teacherId);
            data.classes.forEach(c => { c.teacherIds = c.teacherIds.filter(id => id !== teacherId); });
            break;
        }

        // STAFF OPERATIONS
        case 'addStaff': {
            if (data.staff.some(item => item.id === payload.id)) throw new Error(`Nhân viên với mã '${payload.id}' đã tồn tại.`);
            data.staff.push({ ...payload, createdAt: getVietnamTime().split('T')[0] });
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
            
            const originalClass = data.classes.find(c => c.id === originalId);
            
            data.classes = data.classes.map(c => c.id === originalId ? updatedClass : c);
             if (originalId !== updatedClass.id) {
                data.attendance.forEach(a => { if (a.classId === originalId) a.classId = updatedClass.id; });
                data.progressReports.forEach(p => { if (p.classId === originalId) p.classId = updatedClass.id; });
                data.announcements.forEach(a => { if (a.classId === originalId) a.classId = updatedClass.id; });
            }
            
            if (originalClass && (originalId !== updatedClass.id || originalClass.name !== updatedClass.name)) {
                data.payrolls.forEach(p => {
                    if (p.classDetails) {
                        p.classDetails.forEach(cd => {
                            if (cd.classId === originalId) {
                                cd.classId = updatedClass.id;
                                cd.className = updatedClass.name;
                            }
                        });
                    }
                });
            }
            break;
        }
        case 'deleteClass': {
            const { classId } = payload;
            if (data.attendance.some(a => a.classId === classId)) {
                throw new Error("Không thể xóa lớp học đã có dữ liệu điểm danh.");
            }
            data.classes = data.classes.filter(c => c.id !== classId);
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
                const cls = data.classes.find(c => c.id === classId);
                const currentTeacherIds = cls ? cls.teacherIds : [];
                
                data.attendance = data.attendance.filter(a => !(a.classId === classId && a.date === date));
                const recordsWithIds = newRecords.map(record => ({
                    ...record, 
                    id: record.id || generateUniqueId('ATT'),
                    teacherIds: record.teacherIds || currentTeacherIds
                }));
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

                const coursesToMarkBilled: string[] = [];

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

                    if (cls.fee.type === FeeType.MONTHLY) {
                        // Only charge monthly fee if student is CURRENTLY enrolled and active.
                        // This prevents double-charging for monthly fees when a student transfers.
                        if (student.status === PersonStatus.ACTIVE && isEnrolled) {
                            classFee = cls.fee.amount;
                            if (classFee > 0) {
                                details += `- Lớp ${cls.name}: ${Math.round(classFee).toLocaleString('vi-VN')} ₫\n`;
                            }
                        }
                    } else if (cls.fee.type === FeeType.PER_COURSE) {
                        if (student.status === PersonStatus.ACTIVE && isEnrolled) {
                            if (!student.billedCourses?.includes(cls.id)) {
                                classFee = cls.fee.amount;
                                if (classFee > 0) {
                                    details += `- Lớp ${cls.name} (Trọn khóa): ${Math.round(classFee).toLocaleString('vi-VN')} ₫\n`;
                                }
                                coursesToMarkBilled.push(cls.id);
                            }
                        }
                    } else if (cls.fee.type === FeeType.PER_SESSION) {
                        // Always charge for per-session classes based on attendance, regardless of current enrollment.
                        // This correctly handles billing for past classes.
                        if (attendedSessions > 0) {
                            classFee = attendedSessions * cls.fee.amount;
                            details += `- Lớp ${cls.name}: ${attendedSessions} buổi x ${Math.round(cls.fee.amount).toLocaleString('vi-VN')} ₫ = ${Math.round(classFee).toLocaleString('vi-VN')} ₫\n`;
                        }
                    }
                    totalAmount += classFee;
                }

                // Apply discount if any
                if (student.discountPercentage && student.discountPercentage > 0) {
                    const discountAmount = Math.round(totalAmount * (student.discountPercentage / 100));
                    totalAmount -= discountAmount;
                    details += `- Miễn giảm (${student.discountPercentage}%): -${discountAmount.toLocaleString('vi-VN')} ₫\n`;
                }

                // Round total amount to avoid floating point errors
                totalAmount = Math.round(totalAmount);

                const existingInvoice = data.invoices.find(inv => inv.studentId === student.id && inv.month === monthStr && inv.status !== 'CANCELLED');

                if (existingInvoice) {
                    // Update existing invoice (even if PAID)
                    // Always update generatedDate and details to reflect current 'Generate' action
                    const amountDifference = totalAmount - existingInvoice.amount;
                    const detailsChanged = existingInvoice.details !== details.trim();
                    
                    existingInvoice.amount = totalAmount;
                    existingInvoice.details = details.trim();
                    
                    if (amountDifference !== 0 || detailsChanged) {
                        existingInvoice.generatedDate = getVietnamTime(); // Update date to today only if changed
                    }
                    
                    if (totalAmount === 0 && existingInvoice.status !== 'PAID') {
                        existingInvoice.status = 'PAID';
                        existingInvoice.paidDate = getVietnamTime();
                    }

                    // Update related transaction
                    const relatedTransaction = data.transactions.find(t => t.relatedInvoiceId === existingInvoice.id && t.type === TransactionType.INVOICE);
                    if(relatedTransaction) {
                        relatedTransaction.amount = -totalAmount;
                        relatedTransaction.date = existingInvoice.generatedDate; // Sync transaction date
                    }
                    
                    // Update student balance if amount changed
                    if (amountDifference !== 0) {
                        const studentToUpdate = data.students.find(s => s.id === student.id);
                        if (studentToUpdate) studentToUpdate.balance -= amountDifference;
                    }
                } else if (details.trim() !== '') {
                    // Create new invoice even if amount is 0 (e.g., 100% discount)
                    const invoiceId = generateUniqueId('INV');
                    const isZeroAmount = totalAmount === 0;
                    data.invoices.push({ 
                        id: invoiceId, 
                        studentId: student.id, 
                        studentName: student.name, 
                        month: monthStr, 
                        amount: totalAmount, 
                        details: details.trim(), 
                        status: isZeroAmount ? 'PAID' : 'UNPAID', 
                        generatedDate: getVietnamTime(), 
                        paidDate: isZeroAmount ? getVietnamTime() : null 
                    });
                    
                    // Create debit transaction
                    data.transactions.push({ id: generateUniqueId('TRX'), studentId: student.id, date: getVietnamTime(), type: TransactionType.INVOICE, description: `Hóa đơn học phí tháng ${month}/${year}`, amount: -totalAmount, relatedInvoiceId: invoiceId });
                    
                    // Update student balance
                    const studentToUpdate = data.students.find(s => s.id === student.id);
                    if (studentToUpdate) studentToUpdate.balance -= totalAmount;
                }
                
                // Recalculate invoice statuses for this student to handle pre-payments
                recalculateStudentInvoices(student.id, getVietnamTime());

                if (coursesToMarkBilled.length > 0) {
                    const studentToUpdate = data.students.find(s => s.id === student.id);
                    if (studentToUpdate) {
                        studentToUpdate.billedCourses = [...(studentToUpdate.billedCourses || []), ...coursesToMarkBilled];
                    }
                }
            }
            break;
        }
        case 'cancelInvoice': {
            const { invoiceId } = payload;
            const invoice = data.invoices.find(inv => inv.id === invoiceId);
            if (!invoice || invoice.status === 'CANCELLED') break;
            if (invoice.status === 'PAID' && invoice.amount > 0) throw new Error("Không thể hủy hóa đơn đã thanh toán.");
            invoice.status = 'CANCELLED';
            if (invoice.amount > 0) {
                const student = data.students.find(s => s.id === invoice.studentId);
                if (student) student.balance += invoice.amount;
                data.transactions.push({ id: generateUniqueId('TRX'), studentId: invoice.studentId, date: getVietnamTime(), type: TransactionType.ADJUSTMENT_CREDIT, description: `Hủy hóa đơn #${invoiceId}`, amount: invoice.amount, relatedInvoiceId: invoiceId });
            }
            recalculateStudentInvoices(invoice.studentId, getVietnamTime());
            break;
        }
        case 'updateInvoiceStatus': {
            const { invoiceId, status } = payload;
            const invoice = data.invoices.find(inv => inv.id === invoiceId);
            if (!invoice) throw new Error("Hóa đơn không tồn tại.");
            if (invoice.status === 'CANCELLED') throw new Error("Không thể cập nhật hóa đơn đã hủy.");
            
            const oldStatus = invoice.status;
            invoice.status = status;
            
            if (status === 'PAID' && oldStatus === 'UNPAID') {
                invoice.paidDate = getVietnamTime();
                // Create payment transaction
                data.transactions.push({
                    id: generateUniqueId('TRX'),
                    studentId: invoice.studentId,
                    date: getVietnamTime(),
                    type: TransactionType.PAYMENT,
                    description: `Thanh toán hóa đơn #${invoiceId}`,
                    amount: invoice.amount,
                    relatedInvoiceId: invoiceId,
                    paymentMethod: 'transfer'
                });
                const student = data.students.find(s => s.id === invoice.studentId);
                if (student) student.balance += invoice.amount;
            } else if (status === 'UNPAID' && oldStatus === 'PAID') {
                invoice.paidDate = null;
                // Remove related payment transaction
                const relatedTx = data.transactions.find(t => t.relatedInvoiceId === invoiceId && t.type === TransactionType.PAYMENT);
                if (relatedTx) {
                    data.transactions = data.transactions.filter(t => t.id !== relatedTx.id);
                    const student = data.students.find(s => s.id === invoice.studentId);
                    if (student) student.balance -= relatedTx.amount;
                }
            }
            
            recalculateStudentInvoices(invoice.studentId, getVietnamTime());
            break;
        }

        // TRANSACTIONS
        case 'addAdjustment': {
            const { studentId, amount, date, description, type, paymentMethod } = payload;
            const finalAmount = type === 'CREDIT' ? amount : -amount;
            const student = data.students.find(s => s.id === studentId);
            if (student) {
                student.balance += finalAmount;
                recalculateStudentInvoices(student.id, date);
            }
            data.transactions.push({ id: generateUniqueId('TRX'), studentId, date, type: type === 'CREDIT' ? TransactionType.PAYMENT : TransactionType.ADJUSTMENT_DEBIT, description, amount: finalAmount, paymentMethod: paymentMethod || 'transfer' });
            break;
        }
        case 'updateTransaction': {
            const transaction: Transaction = payload;
            const oldTransaction = data.transactions.find(t => t.id === transaction.id);
            if (!oldTransaction) throw new Error("Giao dịch không tồn tại.");
            const amountDifference = transaction.amount - oldTransaction.amount;
            data.transactions = data.transactions.map(t => t.id === transaction.id ? transaction : t);
            const student = data.students.find(s => s.id === transaction.studentId);
            if (student) {
                student.balance += amountDifference;
                recalculateStudentInvoices(student.id, transaction.date);
            }
            break;
        }
        case 'deleteTransaction': {
            const { transactionId } = payload;
            const transaction = data.transactions.find(t => t.id === transactionId);
            if (!transaction) break;
            data.transactions = data.transactions.filter(t => t.id !== transactionId);
            const student = data.students.find(s => s.id === transaction.studentId);
            if (student) {
                student.balance -= transaction.amount;
                recalculateStudentInvoices(student.id, transaction.date);
            }
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
            const calculationDate = getVietnamTime().split('T')[0];
            
            // Optimization: Pre-calculate sessions per class for the month using a Map
            // Now we need to track sessions per teacher per class
            const teacherClassSessionsMap = new Map<string, Set<string>>(); // "teacherId|classId" -> Set of dates
            
            data.attendance.forEach(a => {
                if (a.date.startsWith(monthStr)) {
                    // If attendance record has teacherIds, use them. Otherwise fallback to current class teachers
                    let tIds = a.teacherIds;
                    if (!tIds || tIds.length === 0) {
                        const cls = data.classes.find(c => c.id === a.classId);
                        tIds = cls ? cls.teacherIds : [];
                    }
                    
                    tIds.forEach(tId => {
                        const key = `${tId}|${a.classId}`;
                        if (!teacherClassSessionsMap.has(key)) {
                            teacherClassSessionsMap.set(key, new Set());
                        }
                        teacherClassSessionsMap.get(key)!.add(a.date);
                    });
                }
            });

            // Get all teachers
            const allTeachers = data.teachers;
            
            for(const teacher of allTeachers) {
                let baseSalary = 0, totalSessionsTaught = 0;
                const classDetails: PayrollClassDetail[] = [];
                
                // Find all classes this teacher taught this month
                const taughtClassIds = new Set<string>();
                for (const key of teacherClassSessionsMap.keys()) {
                    if (key.startsWith(`${teacher.id}|`)) {
                        taughtClassIds.add(key.split('|')[1]);
                    }
                }
                
                for (const classId of taughtClassIds) {
                    const cls = data.classes.find(c => c.id === classId);
                    const className = cls ? cls.name : 'Lớp đã xóa';
                    const sessions = teacherClassSessionsMap.get(`${teacher.id}|${classId}`)?.size || 0;
                    
                    if (sessions > 0) {
                        classDetails.push({
                            classId: classId,
                            className: className,
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
                     payroll.paidDate = getVietnamTime();
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
        case 'updateProgressReport': {
            const { id, ...updates } = payload;
            data.progressReports = data.progressReports.map(r => r.id === id ? { ...r, ...updates } : r);
            break;
        }
        case 'deleteProgressReport': {
            data.progressReports = data.progressReports.filter(r => r.id !== payload.reportId);
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
            if (payload.id.startsWith('EXP-PAY-')) {
                throw new Error("Không thể sửa phiếu chi tự động từ bảng lương.");
            }
            data.expenses = data.expenses.map(e => e.id === payload.id ? payload : e);
            break;
        }
        case 'deleteExpense': {
            if (payload.itemId.startsWith('EXP-PAY-')) {
                throw new Error("Không thể xóa phiếu chi tự động từ bảng lương.");
            }
            data.expenses = data.expenses.filter(i => i.id !== payload.itemId);
            break;
        }
        case 'addAnnouncement': {
            const newAnnouncement = { 
                ...payload, 
                id: generateUniqueId('ANN'), 
                createdAt: getVietnamTime() 
            };
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
