import { kv } from '@vercel/kv';
import type { AppData } from '../types';
import { getMockDataState } from './_lib/mockData.js';

// This is the key under which the entire application state will be stored in Vercel KV.
const DATA_KEY = 'educenter_pro_data_kv_v1';

export default async function handler(request: any) {
    if (request.method === 'GET') {
        try {
            let data = await kv.get<Omit<AppData, 'loading'>>(DATA_KEY);
            
            if (!data) {
                console.log("KV store is empty. Initializing with mock data.");
                const mockData = getMockDataState();
                await kv.set(DATA_KEY, mockData);
                data = mockData;
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

    return new Response('Method Not Allowed', { status: 405 });
}