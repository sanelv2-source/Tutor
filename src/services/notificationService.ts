import { supabase } from '../supabaseClient';

export type NotificationType = 'vacation' | 'message' | 'resource' | 'alert' | 'info' | string;

export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  return supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        type,
        title,
        message,
        link: link ?? null,
        is_read: false
      }
    ])
    .select();
}
