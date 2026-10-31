import { getAuthHeaders } from './authHeaders';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { BACKEND_URL } from '../utils/apiConfig';

export async function uploadDiseaseImage(asset) {
  try {
    if (!asset?.uri) {
      throw new Error('No image selected.');
    }

    const imageUri = asset.uri;

    const fileName =
      asset.fileName ||
      imageUri.split('/').pop() ||
      `leaf-${Date.now()}.jpg`;

    const mimeType =
      asset.mimeType ||
      'image/jpeg';

    let imageBase64;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };

        reader.onerror = reject;

        reader.readAsDataURL(blob);
      });
    } else {
      imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    const response = await fetch(
      `${BACKEND_URL}/api/disease-detect`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          imageBase64,
          fileName,
          mimeType,
        }),
      }
    );

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Disease detection failed');
    }

    return json;
  } catch (error) {
    console.error('uploadDiseaseImage:', error);
    throw error;
  }
}