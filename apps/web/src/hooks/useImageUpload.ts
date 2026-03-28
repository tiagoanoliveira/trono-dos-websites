import { api } from '@/lib/api';

type UploadType = 'avatar' | 'logo' | 'screenshot' | 'website-image';

export async function uploadImage(file: File, type: UploadType): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);

  const res = await api.post<{ key: string; url: string }>('/uploads/images', form);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message ?? 'Falha no upload');
  }

  return res.data.url;
}
