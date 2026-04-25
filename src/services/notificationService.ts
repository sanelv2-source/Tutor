import { supabase } from '../supabaseClient';

export type NotificationType = 'message' | 'lesson' | 'assignment' | 'submission' | string;

/**
 * Creates a notification for a user
 * @param userId - The user's ID (auth.uid)
 * @param type - The type of notification
 * @param title - Short title for the notification
 * @param body - Main message content
 * @param link - Optional link for the notification
 * @returns Promise with the created notification or error
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  // Validate inputs
  if (!userId || !type || !title || !body) {
    console.error('Invalid notification params:', { userId, type, title, body });
    return { data: null, error: new Error('Missing required notification parameters') };
  }

  try {
    const result = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          type,
          title,
          body,
          link: link ?? null,
          is_read: false
        }
      ]);

    if (result.error) {
      console.error('Notification insert error:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Exception creating notification:', error);
    return { data: null, error };
  }
}
