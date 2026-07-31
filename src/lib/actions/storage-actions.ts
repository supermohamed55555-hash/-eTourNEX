'use server';

import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadMatchProof(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('match-proofs')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  // Return signed URL (7 day expiry)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('match-proofs')
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  if (signedError || !signedData?.signedUrl) {
    throw new Error('Failed to generate signed URL for uploaded proof.');
  }

  return signedData.signedUrl;
}
