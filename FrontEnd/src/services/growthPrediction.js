import { getBackendUrl } from '../utils/apiConfig';
import { getAuthHeaders } from './authHeaders';

export async function predictGrowth(data) {
    const backendUrl = getBackendUrl();
    const authHeaders = await getAuthHeaders();
    const response = await fetch(
        `${backendUrl}/growth`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        let errMessage = `HTTP error ${response.status}`;
        try {
            const errJson = await response.json();
            errMessage = errJson.message || errJson.error || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
    }

    return response.json();
}