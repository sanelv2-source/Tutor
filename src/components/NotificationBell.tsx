import React, { useEffect, useRef, useState } from 'react';
import { Bell, ExternalLink, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read?: boolean;
  created_at?: string;
}

const NotificationBell: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapNotification = (row: any): NotificationItem => ({
    id: row.id,
    type: row.type || 'info',
    title: row.title || 'Varsel',
    message: row.message || row.description || '',
    link: row.link || null,
    is_read: row.is_read,
    created_at: row.created_at || new Date().toISOString()
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        setUserId(data.user.id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);

      try {
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (!countError) {
          setUnreadCount(count ?? 0);
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('id, type, title, message, link, is_read, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setNotifications(data.map(mapNotification));
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = mapNotification(payload.new);
          setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setUnreadCount(0);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center p-2 text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm hover:text-slate-900 hover:border-slate-300 transition-colors"
        aria-label="Varsler"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[320px] rounded-3xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Varsler</p>
              <p className="text-xs text-slate-500">Siste 5 oppdateringer</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Lukk varsler"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                <p>Ingen nye varsler.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 mb-2 last:mb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600 leading-6 truncate">{notification.message}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {notification.type}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{notification.created_at ? new Date(notification.created_at).toLocaleString('no-NO') : ''}</span>
                    {notification.link && (
                      <a
                        href={notification.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Åpne
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 px-3 py-3">
            <button
              onClick={markAllAsRead}
              className="w-full rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Merk alle som lest
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
