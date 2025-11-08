import { kv } from '@vercel/kv';

// INLINED TYPES TO FIX VERCEL BUILD ISSUE
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  PARENT = 'PARENT',
  VIEWER = 'VIEWER',
}
export enum PersonStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  UNMARKED = 'UNMARKED',
}
export enum FeeType {
  PER_SESSION = 'PER_SESSION',
  MONTHLY = 'MONTHLY',
  PER_COURSE = 'PER_COURSE',
}
export enum SalaryType {
  PER_SESSION = 'PER_SESSION',
  MONTHLY = 'MONTHLY',
}
export interface BasePerson {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  status: PersonStatus;
  createdAt: string;
  password?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
}
export interface Student extends BasePerson {
  dob: string;
  parentName: string;
  email: string;
  balance: number;
}
export interface Teacher extends BasePerson {
  dob: string;
  qualification: string;
  subject: string;
  role: UserRole.TEACHER;
  salaryType: SalaryType;
  rate: number;
}
export interface Staff extends BasePerson {
  dob: string;
  position: string;
  role: UserRole.MANAGER | UserRole.ACCOUNTANT;
}
export interface ClassFee {
  type: FeeType;
  amount: number;
}
export interface ClassSchedule {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
}
export interface Class {
  id: string;
  name: string;
  teacherIds: string[];
  subject: string;
  schedule: ClassSchedule[];
  studentIds: string[];
  fee: ClassFee;
}
export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
}
export interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  amount: number;
  details: string;
  status: 'PAID' | 'UNPAID' | 'CANCELLED';
  generatedDate: string;
  paidDate: string | null;
}
export enum TransactionType {
    INVOICE = 'INVOICE',
    PAYMENT = 'PAYMENT',
    ADJUSTMENT_CREDIT = 'ADJUSTMENT_CREDIT',
    ADJUSTMENT_DEBIT = 'ADJUSTMENT_DEBIT',
}
export interface Transaction {
    id: string;
    studentId: string;
    date: string;
    type: TransactionType;
    description: string;
    amount: number;
    relatedInvoiceId?: string;
}
export interface ProgressReport {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  score: number;
  comments: string;
  createdBy: string;
}
export enum IncomeCategory {
  SALE = 'SALE',
  EVENT = 'EVENT',
  OTHER = 'OTHER',
}
export interface Income {
  id: string;
  description: string;
  amount: number;
  category: IncomeCategory;
  date: string;
}
export enum ExpenseCategory {
  SALARY = 'SALARY',
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  MARKETING = 'MARKETING',
  SUPPLIES = 'SUPPLIES',
  OTHER = 'OTHER',
}
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
}
export interface CenterSettings {
  name: string;
  address?: string;
  phone?: string;
  logoUrl: string;
  themeColor: string;
  sidebarColor?: string;
  theme: 'light' | 'dark';
  onboardingStepsCompleted: string[];
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankBin?: string;
  qrCodeUrl?: string;
  adminPassword?: string;
  viewerAccountActive?: boolean;
  loginHeaderContent?: string;
}
export interface Payroll {
  id: string;
  teacherId: string;
  teacherName: string;
  month: string;
  sessionsTaught: number;
  rate: number;
  baseSalary: number;
  totalSalary: number;
  calculationDate: string;
}
export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    createdBy: string;
    classId?: string;
}
export interface SearchResult {
  id: string;
  name: string;
  type: 'student' | 'teacher' | 'class';
  path: string;
  context?: string;
}
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
// END INLINED TYPES

// INLINED MOCK DATA TO FIX VERCEL BUILD ISSUE
const MOCK_STUDENTS: Student[] = [
    {
      "id": "HS001", "name": "Hoàng Thị Xuân", "createdAt": "2025-10-19", "status": PersonStatus.ACTIVE, "dob": "2013-01-01",
      "parentName": "Đào Thị Xuyến", "address": "", "balance": 0, "email": "hs001@example.com", "phone": "0372624435"
    },
    {
      "id": "HS002", "email": "hs002@example.com", "address": "", "parentName": "Đỗ Thị Ngọ", "balance": 0,
      "createdAt": "2025-10-19", "phone": "0868899158", "dob": "2013-01-01", "name": "Lê Gia Bảo", "status": PersonStatus.ACTIVE
    },
    {
      "id": "HS003", "status": PersonStatus.ACTIVE, "parentName": "Hoàng Thị Liên", "name": "Đào Quang Vĩnh Hưng", "address": "",
      "dob": "2013-01-01", "balance": 0, "phone": "0978282633", "email": "hs003@example.com", "createdAt": "2025-10-19"
    },
    { "id": "HS160", "address": "", "createdAt": "2025-10-30", "balance": 0, "email": "hs100@email.com", "dob": "2014-09-15", "phone": "0349496356", "name": "Đào Quang Uy Long", "status": PersonStatus.ACTIVE, "parentName": "" }
];
const MOCK_TEACHERS: Teacher[] = [
    {
      "id": "DAT", "name": "Lê Văn Đạt", "status": PersonStatus.ACTIVE, "subject": "Toán", "qualification": "Cử nhân Sư phạm",
      "salaryType": SalaryType.MONTHLY, "rate": 0, "createdAt": "2025-10-19", "dob": "1989-02-28", "email": "dat.lv@example.com",
      "address": "", "password": "28021989", "role": UserRole.TEACHER, "phone": "0822448444"
    },
    {
      "id": "QUYEN", "subject": "Đa năng", "email": "", "address": "", "rate": 0, "name": "Đào Thị Quyến", "qualification": "",
      "role": UserRole.TEACHER, "createdAt": "", "phone": "", "salaryType": SalaryType.MONTHLY, "dob": "1989-12-01", "status": PersonStatus.ACTIVE
    }
];
const MOCK_STAFF: Staff[] = [
    {
      "id": "NV01", "email": "", "status": PersonStatus.ACTIVE, "dob": "1989-02-28", "role": UserRole.MANAGER, "address": "", "phone": "",
      "name": "Lê Văn Đạt", "position": "Nhân viên", "createdAt": ""
    }
];
const MOCK_CLASSES: Class[] = [
    {
      "id": "L01", "fee": { "type": FeeType.PER_SESSION, "amount": 50000 }, "name": "Toán 6 cơ bản",
      "schedule": [{"endTime": "16:45", "dayOfWeek": "Thursday", "startTime": "15:00"}, {"dayOfWeek": "Sunday", "startTime": "15:00", "endTime": "16:45"}],
      "teacherIds": ["DAT", "QUYEN"],
      "studentIds": ["HS001", "HS002", "HS003", "HS160"], "subject": "Toán"
    }
];
const MOCK_ATTENDANCE: AttendanceRecord[] = [];
const MOCK_INVOICES: Invoice[] = [];
const MOCK_PROGRESS_REPORTS: ProgressReport[] = [];
const MOCK_TRANSACTIONS: Transaction[] = [];
const MOCK_INCOME: Income[] = [];
const MOCK_EXPENSES: Expense[] = [];
const MOCK_PAYROLLS: Payroll[] = [];
const MOCK_ANNOUNCEMENTS: Announcement[] = [];
const MOCK_SETTINGS: CenterSettings = {
    "name": "HỘ KINH DOANH QUẦY THUỐC THÀNH ĐẠT", "address": "166 Châu Mai, Dân Hòa, Hà Nội", "phone": "0976.452.689", "logoUrl": "",
    "themeColor": "#4f46e5", "sidebarColor": "#111827", "theme": "dark", "onboardingStepsCompleted": ["students", "classes", "teachers"],
    "bankName": "Techcombank", "bankAccountNumber": "110976452689", "bankAccountHolder": "DAO THI QUYEN", "bankBin": "970407", "qrCodeUrl": "",
    "adminPassword": "123456", "viewerAccountActive": true, "loginHeaderContent": "<p class=\"text-lg leading-7 text-indigo-200\">Hệ thống quản lý dạy thêm, trung tâm thông minh.<br/>Toàn diện, hiệu quả và dễ sử dụng.</p>"
};
function getMockDataState(): Omit<AppData, 'loading'> {
    return {
        students: MOCK_STUDENTS, teachers: MOCK_TEACHERS, staff: MOCK_STAFF, classes: MOCK_CLASSES, attendance: MOCK_ATTENDANCE,
        invoices: MOCK_INVOICES, progressReports: MOCK_PROGRESS_REPORTS, transactions: MOCK_TRANSACTIONS, income: MOCK_INCOME,
        expenses: MOCK_EXPENSES, payrolls: MOCK_PAYROLLS, announcements: MOCK_ANNOUNCEMENTS, settings: MOCK_SETTINGS,
    };
}
// END INLINED DATA

const DATA_KEY = 'educenter_pro_data_kv_v1';

export default async function handler(request: Request) {
    // This function must be edge-compatible
    if (request.headers["x-vercel-edge-functions-exclude"]) {
        return new Response("skipped");
    }
    
    if (request.method === 'POST') {
        try {
            const mockData = getMockDataState();
            await kv.set(DATA_KEY, mockData);
            return new Response(JSON.stringify({ message: 'Data reset successfully' }), { status: 200 });
        } catch (error) {
            console.error('Vercel KV Reset Error:', error);
            return new Response('Failed to reset data in Vercel KV.', { status: 500 });
        }
    }

    return new Response('Method Not Allowed', { status: 405 });
}