import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const ChatList = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [linkedTutorId, setLinkedTutorId] = useState<string | null>(null);
  const [studentRecordId, setStudentRecordId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      if (userData.user) {
        setCurrentUserId(userData.user.id);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .single();
          
        setUserRole(profile?.role || null);

        if (profile?.role === 'student') {
          const { data: studentRecord } = await supabase
            .from('students')
            .select('id, tutor_id')
            .eq('profile_id', userData.user.id)
            .maybeSingle();
            
          if (studentRecord) {
            setStudentRecordId(studentRecord.id);
            setLinkedTutorId(studentRecord.tutor_id);
          }
        }
      }
    };
    fetchUser();
    fetchConversations();
  }, []);

  const fetchAvailableStudents = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      if (!userData.user) return;

      console.log("Fetching available students for tutor:", userData.user.id);
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('tutor_id', userData.user.id);

      if (error) {
        console.error("Error fetching students from DB:", error);
        throw error;
      }
      console.log("Fetched students from DB:", data);
      
      // Filter out students that already have a conversation
      const existingStudentIds = conversations.map(c => 
        Array.isArray(c.student) ? c.student[0]?.id : c.student?.id
      );
      
      const filtered = (data || []).filter(s => !existingStudentIds.includes(s.id));
      console.log("Filtered available students:", filtered);
      setAvailableStudents(filtered);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const getOrCreateConversation = async (studentId: string) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('Ikke logget inn');
    }

    const tutorId = authData.user.id;

    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select(`
        id,
        tutor_id,
        created_at,
        updated_at,
        last_message_at,
        tutor_unread_count,
        student_unread_count,
        student:students (
          id,
          full_name,
          profile_id
        ),
        tutor:profiles!tutor_id (
          id,
          full_name
        )
      `)
      .eq('tutor_id', tutorId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        created_at: now,
        updated_at: now,
        last_message_at: now,
      })
      .select(`
        id,
        tutor_id,
        created_at,
        updated_at,
        last_message_at,
        tutor_unread_count,
        student_unread_count,
        student:students (
          id,
          full_name,
          profile_id
        ),
        tutor:profiles!tutor_id (
          id,
          full_name
        )
      `)
      .single();

    if (createError) {
      throw createError;
    }

    return created;
  };

  const handleStartNewChat = async (studentId: string) => {
    console.log('Selected student:', studentId);
    console.log('Starting conversation...');
    try {
      const data = await getOrCreateConversation(studentId);
      
      // Check if conversation is already in state
      const isExisting = conversations.some(c => c.id === data.id);
      if (!isExisting) {
        setConversations(prev => [data, ...prev]);
      }
      
      setActiveConversation(data);
      setShowNewChatModal(false);
      fetchMessages(data.id);
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
    }
  };

  const handleStudentStartChat = async () => {
    if (!currentUserId || !linkedTutorId || !studentRecordId) return;

    // Check if conversation already exists
    const existingConv = conversations.find(c => c.tutor_id === linkedTutorId);
    if (existingConv) {
      handleConversationClick(existingConv);
      return;
    }

    // Create new conversation
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          tutor_id: linkedTutorId,
          student_id: studentRecordId,
        })
        .select(`
          id,
          tutor_id,
          created_at,
          updated_at,
          last_message_at,
          tutor_unread_count,
          student_unread_count,
          student:students (
            id,
            full_name,
            profile_id
          ),
          tutor:profiles!tutor_id (
            id,
            full_name
          )
        `)
        .single();

      if (error) throw error;
      
      setConversations(prev => [data, ...prev]);
      setActiveConversation(data);
      fetchMessages(data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  useEffect(() => {
    let channel: any;
    if (activeConversation) {
      channel = supabase
        .channel(`messages:${activeConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversation.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          tutor_id,
          created_at,
          updated_at,
          last_message_at,
          tutor_unread_count,
          student_unread_count,
          student:students (
            id,
            full_name,
            profile_id
          ),
          tutor:profiles!tutor_id (
            id,
            full_name
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      const userId = userData.user?.id;
      if (userId && data) {
        const unreadMessages = data.filter(m => m.sender_id !== userId && !m.read_at);
        if (unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages.map(m => m.id));
            
          // Reset unread count in conversation
          const updateField = data[0]?.conversation_id ? 
            (userId === conversations.find(c => c.id === conversationId)?.tutor_id ? 'tutor_unread_count' : 'student_unread_count') 
            : null;
            
          if (updateField) {
            await supabase
              .from('conversations')
              .update({ [updateField]: 0 })
              .eq('id', conversationId);
          }
            
          fetchConversations(); // Refresh list to clear badge
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleConversationClick = (conv: any) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
  };

  const handleBack = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !activeConversation) return;

    // Optimistic clear
    setNewMessage('');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Ikke logget inn');
      }

      const senderId = authData.user.id;

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id, tutor_id, student_id')
        .eq('id', activeConversation.id)
        .single();

      if (conversationError || !conversation) {
        throw new Error('Fant ikke samtalen.');
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, profile_id')
        .eq('id', conversation.student_id)
        .single();

      if (studentError || !student) {
        throw new Error('Fant ikke elev for samtalen.');
      }

      const isTutor = senderId === conversation.tutor_id;
      const recipientId = isTutor ? (student.profile_id || null) : conversation.tutor_id;

      if (isTutor && !recipientId) {
        alert("Eleven har ikke aktivert kontoen sin ennå.");
        setNewMessage(trimmed); // Revert optimistic clear
        return;
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: senderId,
          recipient_id: recipientId,
          body: trimmed,
        });

      if (insertError) {
        throw insertError;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic clear if failed
      setNewMessage(trimmed);
    }
  };

  const getChatName = (conv: any, userId: string | undefined) => {
    if (conv.tutor_id === userId) {
      if (!conv.student) return 'Ukjent elev';
      if (Array.isArray(conv.student)) return conv.student[0]?.full_name || 'Ukjent elev';
      return conv.student.full_name || 'Ukjent elev';
    } else {
      if (!conv.tutor) return 'Ukjent lærer';
      if (Array.isArray(conv.tutor)) return conv.tutor[0]?.full_name || 'Ukjent lærer';
      return conv.tutor.full_name || 'Ukjent lærer';
    }
  };

  const getUnreadCount = (conv: any, userId: string | undefined) => {
    if (conv.tutor_id === userId) {
      return conv.tutor_unread_count || 0;
    } else {
      return conv.student_unread_count || 0;
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Ukjent elev' || name === 'Ukjent lærer') return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-slate-50 flex h-[calc(100vh-8rem)] text-slate-800 font-sans rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      
      {/* Sidebar / Chat List */}
      <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-slate-200 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-600" />
            {userRole === 'student' ? 'Meldinger med lærer' : 'Meldinger'}
          </h1>
          {userRole === 'student' ? (
            <button 
              onClick={handleStudentStartChat}
              disabled={!linkedTutorId}
              title="Skriv til lærer"
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white p-2 rounded-full transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => {
                fetchAvailableStudents();
                setShowNewChatModal(true);
              }}
              title="Start ny samtale"
              className="bg-violet-600 hover:bg-violet-500 text-white p-2 rounded-full transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition-colors"
              placeholder="Søk..."
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Henter samtaler...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {userRole === 'student' ? (
                linkedTutorId ? 'Skriv en melding til læreren din' : 'Du er ikke koblet til en lærer ennå'
              ) : (
                'Ingen samtaler funnet.'
              )}
            </div>
          ) : (
            conversations.map((chat) => {
              const chatName = getChatName(chat, currentUserId);
              const initials = getInitials(chatName);
              const unread = getUnreadCount(chat, currentUserId);
              const lastMessage = chat.last_message || '...';
              const isActive = activeConversation?.id === chat.id;
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => handleConversationClick(chat)}
                  className={`chat-item flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${isActive ? 'bg-white border border-slate-200 shadow-sm' : 'hover:bg-slate-100 border border-transparent'}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm sm:text-base border border-violet-200">
                      {initials}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                        {unread}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`text-sm sm:text-base font-semibold truncate ${unread > 0 || isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900 transition-colors'}`}>
                        {chatName}
                      </h3>
                      <span className={`text-[10px] sm:text-xs whitespace-nowrap ml-2 ${unread > 0 ? 'text-violet-600 font-medium' : 'text-slate-400'}`}>
                        {formatTime(chat.last_message_at || chat.created_at)}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                      {lastMessage}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-slate-200 bg-white">
              <button 
                onClick={handleBack}
                className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm border border-violet-200">
                  {getInitials(getChatName(activeConversation, currentUserId))}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{getChatName(activeConversation, currentUserId)}</h2>
                  <p className="text-xs text-violet-600">Aktiv nå</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white">
              {messagesLoading ? (
                <div className="flex justify-center items-center h-full text-slate-500">
                  Henter meldinger...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-slate-500">
                  Ingen meldinger ennå. Start samtalen!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isCurrentUser = msg.sender_id === currentUserId;
                  const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-2`}>
                      {showHeader && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-medium text-slate-500">
                            {isCurrentUser ? 'Du' : getChatName(activeConversation, currentUserId)}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar next to message */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isCurrentUser ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {isCurrentUser ? 'Du' : getInitials(getChatName(activeConversation, currentUserId))[0]}
                        </div>
                        
                        <div className={`rounded-2xl px-4 py-3 ${
                          isCurrentUser 
                            ? 'bg-violet-600 text-white rounded-br-sm shadow-sm' 
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.body || msg.content || msg.message || '...'}</p>
                          <span className={`text-[10px] block mt-1.5 ${isCurrentUser ? 'text-violet-200 text-right' : 'text-slate-400 text-left'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Skriv en melding..."
                    className="w-full bg-slate-100 text-slate-800 placeholder-slate-400 rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white p-3.5 rounded-full transition-all shadow-sm flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <MessageSquare className="w-16 h-16 text-slate-200 mb-4" />
            <h2 className="text-xl font-medium text-slate-700 mb-2">Dine meldinger</h2>
            <p className="max-w-md text-sm">Velg en samtale fra listen til venstre for å starte å chatte, eller start en ny samtale.</p>
          </div>
        )}
      </div>

      {/* New Chat Modal (Only for Tutors) */}
      {showNewChatModal && userRole !== 'student' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Start ny samtale</h2>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableStudents.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Ingen nye elever å starte samtale med.</p>
              ) : (
                availableStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => handleStartNewChat(student.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-800 border border-transparent hover:border-slate-200"
                  >
                    {student.full_name || 'Ukjent elev'}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

