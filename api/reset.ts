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
    { "id": "HS001", "name": "Hoàng Thị Xuân", "createdAt": "2025-10-19", "status": PersonStatus.ACTIVE, "dob": "2013-01-01", "parentName": "Đào Thị Xuyến", "address": "", "balance": 0, "email": "hs001@example.com", "phone": "0372624435" },
    { "id": "HS002", "email": "hs002@example.com", "address": "", "parentName": "Đỗ Thị Ngọ", "balance": 0, "createdAt": "2025-10-19", "phone": "0868899158", "dob": "2013-01-01", "name": "Lê Gia Bảo", "status": PersonStatus.ACTIVE },
    { "id": "HS003", "status": PersonStatus.ACTIVE, "parentName": "Hoàng Thị Liên", "name": "Đào Quang Vĩnh Hưng", "address": "", "dob": "2013-01-01", "balance": 0, "phone": "0978282633", "email": "hs003@example.com", "createdAt": "2025-10-19" },
    { "id": "HS004", "phone": "0937830935", "balance": 0, "address": "", "createdAt": "2025-10-19", "status": PersonStatus.ACTIVE, "email": "hs004@example.com", "dob": "2013-01-01", "name": "Lê Thị Kim Ngân", "parentName": "Lê Văn Tá" },
    { "id": "HS005", "phone": "0978306800", "email": "hs005@example.com", "balance": 0, "address": "", "name": "Nguyễn Cẩm Tú", "createdAt": "2025-10-19", "dob": "2013-01-01", "parentName": "Nguyễn Thị Ngoan", "status": PersonStatus.ACTIVE },
    { "id": "HS006", "parentName": "Nguyễn Thị Yến", "phone": "0966330350", "status": PersonStatus.ACTIVE, "createdAt": "2025-10-19", "address": "", "name": "Nguyễn Thị Anh Thơ", "dob": "2013-01-01", "balance": 0, "email": "hs006@example.com" },
    { "id": "HS007", "parentName": "Đào Thị Huyền", "createdAt": "2025-10-19", "balance": 0, "phone": "0988846383", "status": PersonStatus.ACTIVE, "email": "hs007@example.com", "dob": "2013-01-01", "address": "", "name": "Đỗ Thành Đạt" },
    { "id": "HS008", "email": "hs008@example.com", "balance": -250000, "dob": "2013-01-01", "address": "", "createdAt": "2025-10-19", "name": "Quách Hải Đăng", "phone": "0968378995", "parentName": "Nguyễn Thị Chang", "status": PersonStatus.INACTIVE },
    { "id": "HS009", "name": "Đức Anh", "parentName": "Phụ huynh Đức Anh", "address": "", "balance": 0, "email": "hs009@example.com", "dob": "2013-01-01", "createdAt": "2025-10-19", "phone": "0353603657", "status": PersonStatus.ACTIVE },
    { "id": "HS010", "parentName": "Lê Thị Huệ", "balance": 0, "email": "hs010@example.com", "name": "Đào Thị Thùy Vân", "status": PersonStatus.INACTIVE, "dob": "2013-01-01", "phone": "0962221038", "createdAt": "2025-10-19", "address": "" },
    { "id": "HS011", "phone": "0398945679", "status": PersonStatus.ACTIVE, "parentName": "Nguyễn Thị Hường", "balance": 0, "email": "hs011@example.com", "createdAt": "2025-10-19", "dob": "2013-01-01", "address": "", "name": "Hoàng Gia Khánh" },
    { "id": "HS012", "phone": "0975793681", "createdAt": "2025-10-19", "status": PersonStatus.ACTIVE, "dob": "2013-01-01", "balance": 0, "name": "Đào Thị Ngân Hà", "address": "", "email": "hs012@example.com", "parentName": "Nguyễn Thị Tuyết" },
    { "id": "HS013", "createdAt": "2025-10-19", "email": "hs013@example.com", "phone": "0971875193", "parentName": "Đỗ Thị Hòa", "status": PersonStatus.ACTIVE, "address": "", "name": "Hoàng Văn Phúc", "dob": "2013-01-01", "balance": -200000 },
    { "id": "HS014", "balance": 0, "phone": "0966381191", "name": "Quách Thiện Triệu", "status": PersonStatus.ACTIVE, "createdAt": "2025-10-19", "email": "hs014@example.com", "parentName": "Đào Thùy Linh", "address": "", "dob": "2013-01-01" },
    { "id": "HS015", "name": "Quách Thị Phương Anh", "balance": 0, "parentName": "Đào Thị Ngoan", "createdAt": "2025-10-19", "email": "hs015@example.com", "status": PersonStatus.ACTIVE, "phone": "0379366500", "address": "", "dob": "2013-01-01" },
    { "id": "HS017", "phone": "0999909164", "status": PersonStatus.INACTIVE, "email": "hs017@example.com", "address": "", "balance": -800000, "parentName": "Phụ huynh Anh Quân", "dob": "2013-01-01", "name": "Anh Quân", "createdAt": "2025-10-19" },
    { "id": "HS018", "createdAt": "2025-10-19", "phone": "0781382675", "dob": "2013-01-01", "name": "Hương Giang", "balance": 0, "parentName": "Phụ huynh Hương Giang", "status": PersonStatus.ACTIVE, "email": "hs018@example.com", "address": "" },
    { "id": "HS019", "address": "", "phone": "0974472784", "parentName": "Nguyễn Thị Trà", "status": PersonStatus.ACTIVE, "balance": 0, "dob": "2013-01-01", "createdAt": "2025-10-19", "name": "Đào Thị Diệu Linh", "email": "hs019@example.com" },
    { "id": "HS020", "name": "Đào Quang Khải", "createdAt": "2025-10-19", "balance": -1400000, "email": "hs020@example.com", "parentName": "Đào Thị Hoa", "dob": "2013-01-01", "address": "", "phone": "0988560026", "status": PersonStatus.ACTIVE },
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
      "studentIds": ["HS001", "HS002", "HS003", "HS004", "HS005", "HS006", "HS007", "HS008", "HS009", "HS010", "HS011", "HS012", "HS013", "HS014", "HS015", "HS017", "HS160"], "subject": "Toán"
    },
    {
      "id": "L02", "fee": { "type": FeeType.PER_SESSION, "amount": 50000 }, "teacherIds": ["DAT", "QUYEN"],
      "studentIds": ["HS018", "HS019", "HS020"],
      "subject": "Toán", "name": "Toán 6 mục tiêu 8+", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "15:00", "endTime": "16:45"}, {"dayOfWeek": "Friday", "endTime": "16:45", "startTime": "15:00"}]
    }
];
const MOCK_ATTENDANCE: AttendanceRecord[] = [];
const MOCK_INVOICES: Invoice[] = [];
const MOCK_PROGRESS_REPORTS: ProgressReport[] = [];
const MOCK_TRANSACTIONS: Transaction[] = [
    { "id": "FT1760976132124", "type": TransactionType.ADJUSTMENT_DEBIT, "description": "Học phí tháng 9", "date": "2025-10-20", "studentId": "HS008", "amount": -250000 },
    { "id": "FT1760976164388", "studentId": "HS013", "type": TransactionType.ADJUSTMENT_DEBIT, "amount": -200000, "description": "Học phí tháng 9", "date": "2025-10-20" }
];
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

export default async function handler(request: any) {    
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
