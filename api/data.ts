import { kv } from '@vercel/kv';
import type { AppData } from '../types.js';
import { getMockDataState } from './_lib/mockData.js';
import { applyOperation } from './_lib/operations.js';

const DATA_KEY = 'educenter_pro_data_kv_v1';
const LOCK_KEY = 'educenter_pro_data_kv_v1_lock';
const LOCK_TTL_SECONDS = 10;

async function acquireLock(): Promise<boolean> {
  const result = await kv.set(LOCK_KEY, 'locked', { nx: true, ex: LOCK_TTL_SECONDS });
  return result === 'OK';
}

async function releaseLock(): Promise<void> {
  await kv.del(LOCK_KEY);
}

// Helper function to safely merge data against a default structure
function safeMergeWithDefault(sourceData: Partial<Omit<AppData, 'loading'>> | null, defaultState: Omit<AppData, 'loading'>): Omit<AppData, 'loading'> {
    const finalData = { ...defaultState };

    if (!sourceData) {
        return finalData;
    }

    // Handle settings object separately
    if (typeof sourceData.settings === 'object' && sourceData.settings !== null) {
        finalData.settings = { ...defaultState.settings, ...sourceData.settings };
    }

    // Explicitly check and merge array properties to prevent data loss from old backups
    const arrayKeys: (keyof Omit<AppData, 'loading' | 'settings'>)[] = [
        'students', 'teachers', 'staff', 'classes', 'attendance', 
        'invoices', 'progressReports', 'transactions', 'income', 
        'expenses', 'payrolls', 'announcements'
    ];

    for (const key of arrayKeys) {
        // Only accept the source data if it's a valid array.
        // Otherwise, the default empty array `[]` from `defaultState` will be kept, preventing data loss.
        if (Array.isArray(sourceData[key])) {
            (finalData as any)[key] = sourceData[key];
        }
    }

    return finalData;
}


export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method === 'GET') {
        try {
            const dataFromKV = await kv.get<Partial<Omit<AppData, 'loading'>>>(DATA_KEY);
            const defaultState = getMockDataState();
            
            const data = safeMergeWithDefault(dataFromKV, defaultState);

            if (!dataFromKV) {
                 console.log("KV store is empty. Seeding with initial data.");
                 await kv.set(DATA_KEY, data);
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

    if (request.method === 'POST') {
        let attempts = 0;
        const maxAttempts = 8;

        while (attempts < maxAttempts) {
            if (await acquireLock()) {
                try {
                    const operation = await request.json();
                    const defaultState = getMockDataState();
                    
                    if (operation.op === 'restoreData') {
                        const restoredDataFromFile = operation.payload as Partial<Omit<AppData, 'loading'>>;
                        const finalRestoredData = safeMergeWithDefault(restoredDataFromFile, defaultState);
                        
                        await kv.set(DATA_KEY, finalRestoredData);
                        return new Response(JSON.stringify(finalRestoredData), {
                            headers: { 'Content-Type': 'application/json' },
                            status: 200,
                        });
                    }

                    const dataFromKV = await kv.get<Omit<AppData, 'loading'>>(DATA_KEY) ?? defaultState;
                    const currentData = safeMergeWithDefault(dataFromKV, defaultState);

                    const newData = applyOperation(currentData, operation);
                    await kv.set(DATA_KEY, newData);
                    
                    return new Response(JSON.stringify(newData), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 200,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown operation error';
                    return new Response(`Thao tác thất bại: ${errorMessage}`, { status: 400 });
                } finally {
                    await releaseLock();
                }
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 250 * attempts));
        }

        return new Response('Máy chủ đang bận, vui lòng thử lại. Không thể khóa dữ liệu.', { status: 503 });
    }

    return new Response('Method Not Allowed', { status: 405 });
}