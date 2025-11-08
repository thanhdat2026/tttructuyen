import { kv } from '@vercel/kv';
import { Student, Teacher, Staff, Class, AttendanceRecord, Invoice, ProgressReport, Income, Expense, CenterSettings, UserRole, SalaryType, Announcement, Transaction, PersonStatus, FeeType, Payroll, AppData } from '../types';

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

// This is the key under which the entire application state will be stored in Vercel KV.
const DATA_KEY = 'educenter_pro_data_kv_v1';

export default async function handler(request: Request) {
    // This function must be edge-compatible
    if (request.headers.get("x-vercel-edge-functions-exclude")) {
        return new Response("skipped");
    }

    // Handle GET request to fetch data
    if (request.method === 'GET') {
        try {
            let data = await kv.get<Omit<AppData, 'loading'>>(DATA_KEY);
            
            // If no data exists in KV, initialize with mock data, set it, and return it.
            if (!data) {
                console.log("KV store is empty. Initializing with mock data.");
                const mockData = getMockDataState();
                await kv.set(DATA_KEY, mockData);
                data = mockData; // Use the mock data for the response
            }

            return new Response(JSON.stringify(data), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                status: 200,
            });
        } catch (error) {
            console.error('Vercel KV GET Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown KV error';
            
            if (errorMessage.includes("Missing required environment variable")) {
                return new Response('Lỗi Cấu hình: Vui lòng kết nối Vercel KV database với project của bạn trong trang cài đặt Vercel.', { status: 500 });
            }

            return new Response(`Lỗi Máy chủ: Không thể lấy dữ liệu từ Vercel KV. Chi tiết: ${errorMessage}`, { status: 500 });
        }
    }

    // Handle POST request to save data
    if (request.method === 'POST') {
        try {
            const newData: AppData = await request.json();
            if (!newData || typeof newData.settings !== 'object') {
                 return new Response('Invalid data format provided.', { status: 400 });
            }
            await kv.set(DATA_KEY, newData);
            return new Response(JSON.stringify({ message: 'Data saved successfully' }), { status: 200 });
        } catch (error) {
            console.error('Vercel KV SET Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown KV error';
            if (errorMessage.includes("Missing required environment variable")) {
                return new Response('Lỗi Cấu hình: Vui lòng kết nối Vercel KV database với project của bạn.', { status: 500 });
            }
            return new Response(`Lỗi Máy chủ: Không thể lưu dữ liệu vào Vercel KV. Chi tiết: ${errorMessage}`, { status: 500 });
        }
    }

    // Handle other methods
    return new Response('Method Not Allowed', { status: 405 });
}