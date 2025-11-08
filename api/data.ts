import { kv } from '@vercel/kv';
import { getMockDataState } from '../services/mockData';
import { AppData } from '../services/api';

// This is the key under which the entire application state will be stored in Vercel KV.
const DATA_KEY = 'educenter_pro_data_kv';

export default async function handler(request: Request) {
    // Handle GET request to fetch data
    if (request.method === 'GET') {
        try {
            let data = await kv.get<Omit<AppData, 'loading'>>(DATA_KEY);
            // If no data exists in KV (e.g., first run), initialize it with mock data.
            if (!data) {
                console.log('No data found in Vercel KV, initializing with mock data.');
                data = getMockDataState();
                await kv.set(DATA_KEY, data);
            }
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        } catch (error) {
            console.error('Vercel KV GET Error:', error);
            return new Response('Failed to retrieve data from Vercel KV.', { status: 500 });
        }
    }

    // Handle POST request to save data
    if (request.method === 'POST') {
        try {
            const newData: AppData = await request.json();
            // Basic validation to ensure we are not saving empty/corrupted data.
            if (!newData || typeof newData.settings !== 'object') {
                 return new Response('Invalid data format provided.', { status: 400 });
            }
            await kv.set(DATA_KEY, newData);
            return new Response(JSON.stringify({ message: 'Data saved successfully' }), { status: 200 });
        } catch (error) {
            console.error('Vercel KV SET Error:', error);
            return new Response('Failed to save data to Vercel KV.', { status: 500 });
        }
    }

    // Handle other methods
    return new Response('Method Not Allowed', { status: 405 });
}
