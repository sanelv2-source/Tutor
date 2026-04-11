import React, { useState, useEffect } from 'react';
import { Bell, Calendar, MessageCircle, FileText, X, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface NotificationItem {
  id: string;
  type: 'vacation' | 'message' | 'resource';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
}

interface NotificationsProps {
  studentId: string;
  tutorId: string;
  lastSeenAt: string | null;
  onMarkAsRead: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ studentId, tutorId, lastSeenAt, onMarkAsRead }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, lastSeenAt]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const since = lastSeenAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to 7 days ago
      const newNotifications: NotificationItem[] = [];

      // Fetch new vacation events
      const { data: vacations, error: vacationError } = await supabase
        .from('vacations')
        .select('id, date, created_at')
        .eq('tutor_id', tutorId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (!vacationError && vacations) {
        vacations.forEach(vacation => {
          newNotifications.push({
            id: `vacation-${vacation.id}`,
            type: 'vacation',
            title: 'Ny ferie/fravær',
            description: `Lærer har registrert ferie/fravær ${new Date(vacation.date).toLocaleDateString('no-NO')}`,
            date: vacation.created_at,
            icon: <Calendar className="w-4 h-4 text-purple-600" />
          });
        });
      }

      // Fetch new messages
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select(`
          id,
          body,
          created_at,
          sender:profiles(full_name),
          conversation:conversations!inner(tutor_id, student_id)
        `)
        .gte('created_at', since)
        .eq('conversation.tutor_id', tutorId)
        .eq('conversation.student_id', studentId)
        .order('created_at', { ascending: false });

      if (!messageError && messages) {
        messages.forEach(message => {
          newNotifications.push({
            id: `message-${message.id}`,
            type: 'message',
            title: 'Ny melding',
            description: `${message.sender?.[0]?.full_name || 'Lærer'}: ${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}`,
            date: message.created_at,
            icon: <MessageCircle className="w-4 h-4 text-blue-600" />
          });
        });
      }

      // Fetch new resources
      const { data: resourceAssignments, error: resourceError } = await supabase
        .from('resource_assignments')
        .select(`
          id,
          assigned_at,
          resource:resources(title, created_at)
        `)
        .eq('student_id', studentId)
        .gte('assigned_at', since)
        .order('assigned_at', { ascending: false });

      if (!resourceError && resourceAssignments) {
        resourceAssignments.forEach(assignment => {
          if (assignment.resource) {
            newNotifications.push({
              id: `resource-${assignment.id}`,
              type: 'resource',
              title: 'Ny ressurs',
              description: `Du har fått tilgang til: ${assignment.resource?.[0]?.title}`,
              date: assignment.assigned_at,
              icon: <FileText className="w-4 h-4 text-green-600" />
            });
          }
        });
      }

      // Sort notifications by date (newest first)
      newNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', studentId);

      if (!error) {
        onMarkAsRead();
        setNotifications([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const unreadCount = notifications.length;

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Varsler"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Varsler</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Laster varsler...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500">Ingen nye varsler</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {lastSeenAt ? `Sist sjekket: ${new Date(lastSeenAt).toLocaleString('no-NO')}` : 'Velkommen!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {notification.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.date).toLocaleString('no-NO')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleMarkAsRead}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Merk alle som lest
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications;