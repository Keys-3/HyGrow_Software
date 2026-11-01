import { getBackendUrl } from '../utils/apiConfig';

export async function predictGrowth(data) {
    const backendUrl = getBackendUrl();
    const response = await fetch(
        `${backendUrl}/growth`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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