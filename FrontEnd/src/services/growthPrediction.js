import { getAuthHeaders } from './authHeaders';
import { BACKEND_URL } from '../utils/apiConfig';

export async function predictGrowth(data) {

    const response = await fetch(
        `${BACKEND_URL}/growth`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
            },
            body: JSON.stringify(data),
        }
    );

    const result = await response.json();
    if (!response.ok || result.success === false) throw new Error(result.error || result.message || 'Prediction failed');
    return result;
}