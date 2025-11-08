import { kv } from '@vercel/kv';
import { getMockDataState } from './_lib/mockData';

const DATA_KEY = 'educenter_pro_data_kv_v1';

export default async function handler(request: Request) {
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