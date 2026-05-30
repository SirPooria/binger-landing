import { Platform } from 'react-native';
import { API_BASE_URL, getAccessToken } from './api';

export async function uploadImageAsync(uri: string): Promise<string> {
  const token = await getAccessToken();
  const form = new FormData();

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, 'upload.jpg');
  } else {
    const filename = uri.split('/').pop() ?? 'upload.jpg';
    const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    form.append('file', { uri, name: filename, type } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const text = await res.text();
  let json: { data?: { url: string }; error?: string; message?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`آپلود ناموفق — پاسخ سرور نامعتبر (${res.status})`);
  }
  if (!res.ok || !json.data?.url) {
    throw new Error(json.message ?? json.error ?? `Upload failed (${res.status})`);
  }
  return json.data.url;
}
