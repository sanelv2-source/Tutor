import { supabase } from '../supabaseClient';

export type NotificationType = 'vacation' | 'message' | 'task_submitted' | 'task_approved' | 'task_rejected' | 'resource' | 'alert' | 'info' | string;

/**
 * Sends a notification to a user
 * @param userId - The user's ID (auth.uid)
 * @param type - The type of notification
 * @param title - Short title for the notification
 * @param message - Main message content
 * @param link - Optional link for the notification
 * @returns Promise with the created notification or error
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  // Validate inputs
  if (!userId || !type || !title || !message) {
    console.error('Invalid notification params:', { userId, type, title, message });
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
          message,
          link: link ?? null,
          is_read: false,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (result.error) {
      console.error('Error inserting notification:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Exception while sending notification:', error);
    return { data: null, error };
  }
}

/**
 * Sends notifications to multiple users
 * @param userIds - Array of user IDs
 * @param type - The type of notification
 * @param title - Short title for the notification
 * @param message - Main message content
 * @param link - Optional link for the notification
 */
export async function sendNotificationBatch(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  if (!userIds || userIds.length === 0) {
    console.warn('sendNotificationBatch called with empty userIds');
    return;
  }

  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      link: link ?? null,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const result = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (result.error) {
      console.error('Error inserting batch notifications:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Exception while sending batch notifications:', error);
  }
}
