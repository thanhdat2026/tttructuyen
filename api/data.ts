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

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method === 'GET') {
        try {
            const dataFromKV = await kv.get<Partial<Omit<AppData, 'loading'>>>(DATA_KEY);
            const defaultState = getMockDataState();
            let data: Omit<AppData, 'loading'>;

            if (!dataFromKV) {
                console.log("KV store is empty. Seeding with initial data.");
                data = defaultState;
                await kv.set(DATA_KEY, data);
            } else {
                // Hợp nhất dữ liệu đã truy xuất với trạng thái mặc định để đảm bảo tất cả các khóa đều có mặt.
                // Điều này làm cho ứng dụng tương thích với các cấu trúc dữ liệu cũ hơn.
                data = {
                    ...defaultState,
                    ...dataFromKV,
                    // Hợp nhất sâu các cài đặt để tránh mất cài đặt cũ khi thêm cài đặt mới
                    settings: {
                        ...defaultState.settings,
                        ...(dataFromKV.settings || {}),
                    },
                };
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
                    
                    if (operation.op === 'restoreData') {
                        const defaultState = getMockDataState();
                        const restoredDataFromFile = operation.payload;

                        // Hợp nhất dữ liệu đã khôi phục với các giá trị mặc định để đảm bảo schema được cập nhật.
                        // Điều này ngăn chặn việc mất các trường dữ liệu có thể không tồn tại trong một tệp sao lưu cũ.
                        const finalRestoredData = {
                            ...defaultState,
                            ...restoredDataFromFile,
                            settings: {
                                ...defaultState.settings,
                                ...(restoredDataFromFile.settings || {}),
                            },
                        };

                        await kv.set(DATA_KEY, finalRestoredData);
                        return new Response(JSON.stringify(finalRestoredData), {
                            headers: { 'Content-Type': 'application/json' },
                            status: 200,
                        });
                    }

                    const data = await kv.get<Omit<AppData, 'loading'>>(DATA_KEY) ?? getMockDataState();
                    const newData = applyOperation(data, operation);
                    await kv.set(DATA_KEY, newData);
                    
                    return new Response(JSON.stringify(newData), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 200,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown operation error';
                    return new Response(`Operation failed: ${errorMessage}`, { status: 400 });
                } finally {
                    await releaseLock();
                }
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 250 * attempts));
        }

        return new Response('Server is busy, please try again. Could not acquire data lock.', { status: 503 });
    }

    return new Response('Method Not Allowed', { status: 405 });
}
