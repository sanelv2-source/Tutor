import React, { useState, useEffect } from 'react';
// @ts-ignore - papaparse types
import Papa from 'papaparse';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CreditCard, 
  MessageSquare, 
  MessageCircle,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Send,
  Smile,
  Meh,
  Frown,
  Link as LinkIcon,
  FileText,
  BookOpen,
  Video,
  Trash2,
  X,
  User,
  Smartphone,
  Upload,
  LifeBuoy,
  Bot,
  Bell,
  Download
} from 'lucide-react';
import Logo from './Logo';
import InviteStudent from './InviteStudent';
import CalendarModal from './CalendarModal';
import { ChatList } from './ChatList';
import PaymentWall from './PaymentWall';
import WelcomeGuide from './WelcomeGuide';
import TeacherProfile from './TeacherProfile';
import AIAssistant from './AIAssistant';
import NotificationBell from './NotificationBell';
import SupportFeedback from './SupportFeedback';
import TeacherOperations from './TeacherOperations';
import StudentDetailModal from './StudentDetailModal';
import FreePlanSponsorCard from './FreePlanSponsorCard';
import { supabase } from '../supabaseClient';
import { readApiJson } from '../utils/api';
import { trackAnalyticsEvent, trackEvent } from '../utils/analytics';
import { createNotification } from '../services/notificationService';
import type { GoogleCalendarEvent } from '../lib/googleCalendar';
import {
  PLAN_LIMITS,
  PLAN_NAMES,
  canCreateInvoice,
  canCreateLesson,
  canCreateStudent,
  getPlanLimit,
  getUpgradeMessage,
  normalizePlan,
  shouldShowAds,
  type SubscriptionPlan,
} from '../lib/plans';

const AI_ASSISTANT_ENABLED = import.meta.env.VITE_AI_ASSISTANT_ENABLED === 'true';
const GOOGLE_CALENDAR_ENABLED = import.meta.env.VITE_GOOGLE_CALENDAR_ENABLED === 'true';

export default function Dashboard({ onNavigate, user, onLogout }: { onNavigate: (page: string) => void, user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('profil');
  const [reportStatus, setReportStatus] = useState<'great' | 'good' | 'needs_focus'>('great');
  const [masteryLevel, setMasteryLevel] = useState(80);
  const [isSendingVipps, setIsSendingVipps] = useState<number | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [homework, setHomework] = useState('');
  const [topic, setTopic] = useState('Algebra & Ligninger'); // Standard emne
  const [profile, setProfile] = useState<{ name?: string, trial_ends_at: string, subscription_status: string, plan?: SubscriptionPlan, meet_link?: string, phone?: string } | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [meetLinkInput, setMeetLinkInput] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [planLimitNotice, setPlanLimitNotice] = useState<string | null>(null);
  const userPlan = normalizePlan(profile?.plan || user?.plan || (profile?.subscription_status === 'active' ? 'pro' : 'free'));
  const planLimits = PLAN_LIMITS[userPlan];
  
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [fasteTider, setFasteTider] = useState<any[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

const saveMeetLink = async (link: string) => {
    if (!authUserId) return;
    setIsSavingLink(true);
    const { error } = await supabase
      .from('profiles')
      .update({ meet_link: link })
      .eq('id', authUserId);
    setIsSavingLink(false);
    if (error) {
      console.error("Feil ved lagring av lenke:", error);
      showToast("Feil ved lagring av lenke");
    } else {
      showToast("Videolenke lagret!");
      setProfile(prev => prev ? { ...prev, meet_link: link } : null);
    }
  };

  const fetchTutorProfile = React.useCallback(async () => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }
      if (authUser) {
        setAuthUserId(authUser.id);
        let { data, error } = await supabase
          .from('profiles')
          .select('full_name, trial_ends_at, subscription_status, plan, meet_link, phone')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error && isSchemaCacheColumnError(error)) {
          ({ data, error } = await supabase
            .from('profiles')
            .select('full_name, trial_ends_at, subscription_status, meet_link, phone')
            .eq('id', authUser.id)
            .maybeSingle());
        }

        if (error) throw error;

        if (data) {
          setProfile({
            name: data.full_name,
            trial_ends_at: data.trial_ends_at,
            subscription_status: data.subscription_status,
            plan: normalizePlan(data.plan || (data.subscription_status === 'active' ? 'pro' : 'free')),
            meet_link: data.meet_link,
            phone: data.phone || ''
          });
          if (data.meet_link) {
            setMeetLinkInput(data.meet_link);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchTutorProfile();
  }, [fetchTutorProfile]);

  useEffect(() => {
    if ((!AI_ASSISTANT_ENABLED || !planLimits.aiAssistant) && activeTab === 'ai') {
      setActiveTab('profil');
    }
  }, [activeTab, planLimits.aiAssistant]);

  useEffect(() => {
    if (activeTab === 'betaling') {
      fetchTutorProfile();
    }
  }, [activeTab, fetchTutorProfile]);

  const handleTeacherProfileSaved = React.useCallback((savedProfile: { full_name?: string; phone?: string; meet_link?: string }) => {
    setProfile(prev => ({
      name: savedProfile.full_name ?? prev?.name ?? '',
      trial_ends_at: prev?.trial_ends_at ?? '',
      subscription_status: prev?.subscription_status ?? 'trial',
      plan: prev?.plan ?? normalizePlan(user?.plan),
      meet_link: savedProfile.meet_link ?? prev?.meet_link,
      phone: savedProfile.phone ?? prev?.phone ?? ''
    }));
  }, []);

  const isTrialExpired = profile && userPlan !== 'free' &&
    profile.subscription_status !== 'active' && 
    new Date(profile.trial_ends_at) < new Date();
    
  const needsOnboarding = profile && !profile.name;

  // Mock data fjernet, starter med tomme lister
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'PDF' });
  const [resourceSource, setResourceSource] = useState<'link' | 'file'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStudentsForResource, setSelectedStudentsForResource] = useState<string[]>([]);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [deleteResourceConfirmModal, setDeleteResourceConfirmModal] = useState<{isOpen: boolean, resourceId: string, resourceTitle: string, filePath: string | null} | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedVippsInvoice, setSelectedVippsInvoice] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetailModal, setStudentDetailModal] = useState<any>(null);
  const [vippsModalOpen, setVippsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [vippsAmount, setVippsAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [subject, setSubject] = useState('');
  const [vippsRecipientEmail, setVippsRecipientEmail] = useState('');

  const isDateInCurrentMonth = (value: unknown) => {
    const date = new Date(String(value || ''));
    const now = new Date();
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const currentMonthlyLessonCount = React.useMemo(
    () => lessons.filter((lesson) => isDateInCurrentMonth(lesson.lesson_date || lesson.created_at)).length,
    [lessons]
  );

  const currentMonthlyInvoiceCount = React.useMemo(
    () => invoices.filter((invoice) => isDateInCurrentMonth(invoice.due_date || invoice.created_at)).length,
    [invoices]
  );

  const isMissingPhone = (value: unknown) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return !normalized || normalized === 'ikke oppgitt' || normalized === 'mangler nummer';
  };

  const getStudentPhone = (student: any) => {
    const phone = student?.phone || student?.parent_phone || student?.parentPhone || student?.mobile || student?.parent_mobile || '';
    return isMissingPhone(phone) ? '' : String(phone).trim();
  };

  const getStudentEmail = (student: any) => {
    return String(student?.parentEmail || student?.parent_email || student?.email || '').trim();
  };

  const getInvoiceStudentName = (invoice: any) => invoice?.student_name || invoice?.student || '';

  const findStudentForInvoice = (invoice: any) => {
    const studentName = getInvoiceStudentName(invoice);
    return students.find(s =>
      s.id === invoice?.student_id ||
      s.full_name === studentName ||
      s.name === studentName
    );
  };

  const getInvoiceRecipientEmail = (invoice: any) => {
    return String(invoice?.email || getStudentEmail(findStudentForInvoice(invoice))).trim();
  };

  const getInvoiceDescription = (invoice: any) => {
    return invoice?.description || invoice?.subject || 'privatundervisning';
  };

  const isInvoicePaid = (invoice: any) => {
    const status = String(invoice?.status || '').toLowerCase();
    return status === 'paid' || status === 'betalt';
  };

  const isInvoiceDraft = (invoice: any) => {
    const status = String(invoice?.status || '').toLowerCase();
    return status === 'draft' || status === 'utkast';
  };

  const getInvoicePaymentLink = (invoice: any) => {
    return invoice?.public_token ? `${window.location.origin}/invoice/${invoice.public_token}` : '';
  };

  const getTeacherVippsPhone = (invoice?: any) => {
    const phone = profile?.phone || '';
    return isMissingPhone(phone) ? '' : String(phone).trim();
  };

  const formatVippsPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 8) return digits.replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3');
    if (digits.length === 10 && digits.startsWith('47')) {
      return `+47 ${digits.slice(2).replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3')}`;
    }
    return phone;
  };

  const isSchemaCacheColumnError = (error: any) => {
    const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
    return /schema cache|Could not find .* column|column .* does not exist/i.test(message);
  };

  const saveInvoiceWithSchemaFallback = async (invoice: any, fullPayload: any, fallbackPayload: any) => {
    const runSave = (payload: any) => invoice.id
      ? supabase.from('invoices').update(payload).eq('id', invoice.id)
      : supabase.from('invoices').insert([payload]);

    let { data, error } = await runSave(fullPayload).select().single();

    if (error && isSchemaCacheColumnError(error)) {
      ({ data, error } = await runSave(fallbackPayload).select().single());
    }

    if (error) throw error;
    return data;
  };

  const ensureVippsInvoiceSaved = async (invoice: any) => {
    if (invoice?.id && invoice?.public_token) return invoice;
    const isNewInvoice = !invoice?.id;

    if (isNewInvoice && !canCreateInvoice(userPlan, currentMonthlyInvoiceCount)) {
      await handlePlanLimitReached('invoices', currentMonthlyInvoiceCount, 'vipps_payment_request');
      throw new Error(getUpgradeMessage(userPlan, 'invoices'));
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError && userError.message.includes('Refresh Token')) {
      await supabase.auth.signOut().catch(() => {});
    }
    if (!user) throw new Error('Vennligst logg inn på nytt.');

    const legacyPayload = {
      student_name: getInvoiceStudentName(invoice),
      amount: Number(invoice.amount),
      due_date: invoice.due_date || new Date().toISOString().split('T')[0],
      status: invoice.status || 'pending',
      method: 'Vipps',
      tutor_id: user.id,
      email: getInvoiceRecipientEmail(invoice) || null
    };

    const payload = {
      ...legacyPayload,
      student_id: invoice.student_id || null,
      tutor_phone: getTeacherVippsPhone(invoice) || null,
      payment_link: null,
      description: getInvoiceDescription(invoice)
    };

    const data = await saveInvoiceWithSchemaFallback(invoice, payload, legacyPayload);

    const savedInvoice = { ...invoice, ...payload, ...data };
    setSelectedVippsInvoice(savedInvoice);

    if (isNewInvoice) {
      await trackAnalyticsEvent('invoice_created', { method: 'Vipps', source: 'vipps_payment_request' });
    }

    if (invoice.id) {
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, ...savedInvoice } : inv));
    } else {
      fetchInvoices();
    }

    return savedInvoice;
  };

  const resetVippsForm = () => {
    setSelectedStudent(null);
    setVippsRecipientEmail('');
    setTotalAmount('');
    setSubject('');
  };

  const handleSendVippsPaymentRequest = async (invoice: any, resetAfterSend = false) => {
    const recipientEmail = getInvoiceRecipientEmail(invoice);
    const tutorPhone = getTeacherVippsPhone(invoice);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Legg inn en gyldig e-postadresse til eleven eller foresatt.');
      return false;
    }

    if (!tutorPhone) {
      alert('Læreren mangler mobilnummer på profilen. Legg inn mobilnummer på profil-siden først.');
      return false;
    }

    const invoiceToSave = {
      ...invoice,
      email: recipientEmail,
      tutor_phone: tutorPhone,
      payment_link: null
    };

    try {
      const savedInvoice = await ensureVippsInvoiceSaved(invoiceToSave);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const jwt = sessionData.session?.access_token;
      if (!jwt) throw new Error('Du må være logget inn for å sende e-post.');

      const response = await fetch('/api/payment/send-vipps-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          invoiceId: savedInvoice.id,
          studentId: invoice.student_id || savedInvoice.student_id || null,
          recipientEmail,
          paymentPageUrl: getInvoicePaymentLink(savedInvoice)
        })
      });

      await readApiJson(response, 'Kunne ikke sende betalingskravet på e-post');
      const sentPayload = {
        status: 'request_sent',
        request_sent_at: new Date().toISOString(),
        tutor_phone: tutorPhone,
        payment_link: null,
        email: recipientEmail
      };

      setInvoices(prev => prev.map(inv => inv.id === savedInvoice.id ? { ...inv, ...sentPayload } : inv));
      fetchInvoices();
      fetchPaymentStats();
      showToast('Betalingskrav sendt på e-post. Status: venter på betaling.');
      setSelectedVippsInvoice(null);

      if (resetAfterSend) {
        resetVippsForm();
      }

      return true;
    } catch (error: any) {
      console.error(error);
      alert('Kunne ikke sende betalingskravet: ' + error.message);
      return false;
    }
  };

  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [showBulkImportHelp, setShowBulkImportHelp] = useState(false);

  const handleGoToVippsPreparation = () => {
    if (!selectedStudent) return alert("Vennligst velg en elev.");
    if (!totalAmount || Number(totalAmount) <= 0) return alert("Vennligst skriv inn et gyldig beløp.");

    const recipientEmail = vippsRecipientEmail || getStudentEmail(selectedStudent);
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return alert(`Eleven ${selectedStudent.name} mangler e-postadresse. Legg inn e-post først.`);
    }

    handleSendVippsPaymentRequest({
      student_id: selectedStudent.id,
      student_name: selectedStudent.name,
      amount: Number(totalAmount),
      description: subject || selectedStudent.subject || 'Privatundervisning',
      email: recipientEmail,
      due_date: new Date().toISOString().split('T')[0],
      tutor_phone: getTeacherVippsPhone() || null
    }, true);
  };

  const handleOpenVippsModal = (student: any) => {
    const email = getStudentEmail(student);
    if (!email) {
      alert("Kan ikke sende betalingskrav: E-post til elev eller foresatt mangler.");
      return;
    }
    setSelectedStudent(student);
    setVippsRecipientEmail(email);
    setVippsModalOpen(true);
  };

  const trackCalendarConnectedOnce = React.useCallback(async () => {
    if (!authUserId) return;
    const storageKey = `tutorflyt_calendar_connected_${authUserId}`;

    try {
      if (localStorage.getItem(storageKey) === 'true') return;
      await trackAnalyticsEvent('calendar_connected', { provider: 'google', source: 'calendar_read' }, { userId: authUserId });
      localStorage.setItem(storageKey, 'true');
    } catch (error) {
      console.warn('Could not persist calendar analytics marker:', error);
    }
  }, [authUserId]);

  const fetchCalendar = React.useCallback(async () => {
    if (!GOOGLE_CALENDAR_ENABLED) {
      setCalendarEvents([]);
      setCalendarError(null);
      setIsLoadingCalendar(false);
      return;
    }

    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const { fetchGoogleCalendarEvents } = await import('../lib/googleCalendar');
      const events = await fetchGoogleCalendarEvents();
      setCalendarEvents(events);
      await trackCalendarConnectedOnce();
    } catch (error: any) {
      setCalendarError(error.message);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, [trackCalendarConnectedOnce]);

  const handleSyncCalendar = async () => {
    if (!GOOGLE_CALENDAR_ENABLED) {
      showToast('Google Kalender blir tilgjengelig senere i Pro.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        }
      });
      
      if (error) throw error;

      if (data?.url) {
        const authWindow = window.open(
          data.url,
          'oauth_popup',
          'width=600,height=700'
        );

        if (!authWindow) {
          showToast('Vennligst tillat popup-vinduer for å koble til Google Kalender');
        }
      }
    } catch (error: any) {
      console.error("Login feil:", error.message);
      showToast("Kunne ikke koble til Google Kalender: " + error.message);
    }
  };

  const notifyVacationStudents = async (dates: string[]) => {
    if (!authUserId || dates.length === 0) return;

    try {
      const { data: linkedStudents, error: studentError } = await supabase
        .from('students')
        .select('profile_id')
        .eq('tutor_id', authUserId)
        .not('profile_id', 'is', null);

      if (studentError || !linkedStudents) {
        console.error('Error fetching linked students for notifications:', studentError);
        return;
      }

      const profileIds = (linkedStudents as Array<{ profile_id: string | null }>)
        .map((row) => row.profile_id)
        .filter(Boolean) as string[];

      if (profileIds.length === 0) {
        console.warn('DEBUG: No students found for this tutor!');
        return;
      }

      console.log('DEBUG: Fetched linked student profile ids for notifications:', profileIds);
      const teacherName = user?.name || 'Læreren';
      const notificationTitle = `${teacherName} har lagt inn ferie`;
      const notificationMessage = dates.length === 1
        ? `Fri registrert: ${new Date(dates[0]).toLocaleDateString('no-NO')}.`
        : `Fri registrert: ${dates
            .map((date) => new Date(date).toLocaleDateString('no-NO'))
            .join(', ')}.`;

      console.log('Attempting to send vacation notifications to students:', { profileIds, notificationTitle, notificationMessage });

      const results = await Promise.all(profileIds.map((profileId) =>
        createNotification(
          profileId,
          'vacation',
          notificationTitle,
          notificationMessage,
          '/student/portal'
        )
      ));

      console.log('Vacation notification results:', results);
    } catch (error) {
      console.error('Feil ved sending av varsler til elever:', error);
    }
  };

  const saveVacation = async (dates: string[]) => {
    console.log('DEBUG: Starting vacation save process');
    console.log('Auth user id:', authUserId);
    const insertPayload = dates.map(date => ({
      tutor_id: authUserId,
      vacation_date: date,
      description: ''
    }));
    console.log('Insert payload:', insertPayload);
    console.log('SENDING NOTIFICATION TO SUPABASE', { insertPayload });

    if (authUserId) {
      try {
        const { data, error } = await supabase.from('tutor_vacation').insert(insertPayload);
        console.log('Insert result:', data);
        console.log('Insert error:', error);
        
        if (error) {
          console.error("Kunne ikke lagre ferie til Supabase, bruker lokal state", error);
          setVacationDays(prev => [...prev, ...dates]);
        } else {
          console.log('DEBUG: Vacation saved, now fetching students for tutor:', authUserId);
          await fetchVacations();
          console.log('Vacation saved in Supabase, calling notifyVacationStudents', { dates });
          await notifyVacationStudents(dates);
        }
      } catch (err) {
        console.error("Feil ved lagring av ferie:", err);
        setVacationDays(prev => [...prev, ...dates]);
      }
    } else {
      setVacationDays(prev => [...prev, ...dates]);
    }
  };

  const fetchVacations = React.useCallback(async () => {
    if (!authUserId) return;
    
    try {
      // CLEAN FETCH: No joins, no relationships - just simple flat query
      const { data, error } = await supabase
        .from('tutor_vacation')
        .select('*')
        .eq('tutor_id', authUserId);
      
      console.log('Raw data from Supabase (tutor vacations):', data);
      
      if (error) {
        console.error("Error fetching vacations:", error);
        setVacations([]);
        setVacationDays([]);
      } else if (data && Array.isArray(data)) {
        setVacations(data);
        setVacationDays(data.map(v => v.vacation_date));
        console.log(`Successfully loaded ${data.length} vacation records for tutor`);
      } else {
        setVacations([]);
        setVacationDays([]);
      }
    } catch (error) {
      console.error("Exception while fetching vacations:", error);
      setVacations([]);
      setVacationDays([]);
    }
  }, [authUserId]);

  const fetchStudents = React.useCallback(async () => {
    if (!authUserId) return;
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('tutor_id', authUserId);
      
    if (data) {
      setStudents(data.map(s => ({
        id: s.id,
        name: s.full_name || s.name,
        full_name: s.full_name || s.name,
        subject: s.subject || 'Fag: Ikke oppgitt',
        parent: s.parent_email ? 'Oppgitt' : 'Ikke oppgitt',
        phone: s.phone || s.parent_phone || s.mobile || s.parent_mobile || 'Ikke oppgitt',
        parentPhone: s.parent_phone || s.phone || s.mobile || s.parent_mobile || '',
        email: s.email || '',
        parentEmail: s.parent_email || s.email
      })));
    }
  }, [authUserId]);

  const fetchSubmissions = React.useCallback(async () => {
    if (!authUserId) return;
    
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        answer_text,
        status,
        created_at,
        assignment_id,
        file_url,
        students ( full_name ),
        reports ( topic ),
        assignments!submissions_assignment_id_fkey ( title )
      `)
      .eq('tutor_id', authUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Feil ved henting av svar:", error);
    } else {
      setSubmissions(data || []);
    }
  }, [authUserId]);

  const oppdaterStatus = async (submissionId: string, assignmentId: string, nyStatus: string) => {
    try {
      // Get submission details to find student
      const { data: submissionData, error: fetchError } = await supabase
        .from('submissions')
        .select('student_id, students(profile_id)')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submissionData) {
        console.error('Error fetching submission:', fetchError);
      }

      // 1. Oppdater selve innsendingen
      const { error: subError } = await supabase
        .from('submissions')
        .update({ status: nyStatus })
        .eq('id', submissionId);

      // 2. Oppdater oppgaven slik at elevens dashboard endrer farge
      let assignError = null;
      if (assignmentId) {
        const { error } = await supabase
          .from('assignments')
          .update({ status: nyStatus })
          .eq('id', assignmentId);
        assignError = error;
      }

      if (subError || assignError) {
        console.error("Feil ved oppdatering:", subError || assignError);
        showToast("Kunne ikke oppdatere oppgave: " + (subError?.message || assignError?.message));
      } else {
        // Send notification to student about task status
        try {
          if (submissionData && Array.isArray(submissionData.students) && submissionData.students.length > 0 && submissionData.students[0]?.profile_id) {
            const studentProfileId = submissionData.students[0].profile_id;
            const notificationTitle = nyStatus === 'approved' ? 'Oppgave godkjent! ✅' : 'Oppgave avvist ❌';
            const notificationMessage = nyStatus === 'approved'
              ? 'Din lærer har godkjent oppgaven din.'
              : 'Din lærer har gitt tilbakemelding på oppgaven din.';
            
            await createNotification(
              studentProfileId,
              nyStatus === 'approved' ? 'task_approved' : 'task_rejected',
              notificationTitle,
              notificationMessage,
              '/student/portal'
            );
          }
        } catch (notificationError) {
          console.error('Error sending task status notification:', notificationError);
          // Don't fail the whole status update if notification fails
        }

        // Oppdaterer lista lokalt så svaret forsvinner med en gang
        setSubmissions(submissions.filter(sub => sub.id !== submissionId));
        showToast(nyStatus === 'approved' ? "Oppgave godkjent! ✅" : "Oppgave avvist! ❌");
      }
    } catch (error) {
      console.error('Unexpected error in oppdaterStatus:', error);
      showToast('En uventet feil oppstod');
    }
  };

  const fetchFasteTider = React.useCallback(async () => {
    if (!authUserId) return;
    try {
      const { data, error } = await supabase
        .from('faste_tider')
        .select('*')
        .eq('tutor_id', authUserId);
      
      if (error) {
        console.error("Kunne ikke hente faste tider fra Supabase:", error);
      } else if (data) {
        setFasteTider(data);
      }
    } catch (err) {
      console.error("Feil ved henting av faste tider", err);
    }
  }, [authUserId]);

  const fetchLessons = React.useCallback(async () => {
    if (!authUserId) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('tutor_id', authUserId)
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error("Kunne ikke hente timer fra Supabase:", error);
      } else if (data) {
        setLessons(data);
        // Map to schedule format
        const formattedSchedule = data.map(lesson => ({
          id: lesson.id,
          time: lesson.start_time,
          date: lesson.lesson_date,
          student: lesson.student_name,
          subject: 'Time',
          status: 'upcoming',
          amount: 500
        }));
        setSchedule(formattedSchedule);
      }
    } catch (err) {
      console.error("Feil ved henting av timer", err);
    }
  }, [authUserId]);

  const fetchResources = React.useCallback(async () => {
    if (!authUserId) return;
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        resource_assignments(student_id)
      `)
      .eq('tutor_id', authUserId)
      .order('created_at', { ascending: false });

    if (data) setResources(data);
  }, [authUserId]);

  const fetchNotifications = React.useCallback(async () => {
    if (!authUserId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (data) setNotifications(data);
  }, [authUserId]);

  const markNotificationAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  useEffect(() => {
    if (authUserId) {
      fetchStudents();
      fetchLessons();
      fetchVacations();
      fetchResources();
      fetchNotifications();
    }
  }, [authUserId, fetchStudents, fetchLessons, fetchVacations, fetchResources, fetchNotifications]);

  useEffect(() => {
    fetchCalendar();
    fetchFasteTider();
  }, [fetchCalendar, fetchFasteTider]);

  useEffect(() => {
    fetchSubmissions();

    // Lytt etter nye innleveringer i sanntid!
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'submissions' }, 
        () => {
          fetchSubmissions(); // Henter lista på nytt når noen sender inn
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubmissions]);

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsBulkImporting(true);
    Papa.parse(file, {
      header: true,
      complete: async (results: any) => {
        const rows = results.data as { name: string; email: string }[];
        for (const row of rows) {
          if (row.name && row.email) {
            await supabase.from('student_invitations').insert({
              name: row.name,
              email: row.email,
              tutor_id: authUserId,
            });
          }
        }
        setIsBulkImporting(false);
        showToast('Masseimport fullført!');
        fetchStudents();
      },
      error: (error: any) => {
        console.error('CSV parse error:', error);
        setIsBulkImporting(false);
        showToast('Kunne ikke lese CSV-filen');
      }
    });
  };

  const handleDeleteLesson = (lessonId: string) => {
    setDeleteLessonConfirmModal({ isOpen: true, lessonId });
  };

  const handleCompleteLesson = async (lesson: any) => {
    try {
      const completedAt = new Date().toISOString();
      let { error } = await supabase
        .from('lessons')
        .update({ status: 'Fullført', completed_at: completedAt })
        .eq('id', lesson.id);

      if (error && isSchemaCacheColumnError(error)) {
        ({ error } = await supabase
          .from('lessons')
          .update({ status: 'Fullført' })
          .eq('id', lesson.id));
      }

      if (error) {
        console.error("Kunne ikke markere time som fullført:", error.message);
        showToast("Kunne ikke markere time som fullført. Prøv igjen.");
        return;
      }

      const student = students.find(s =>
        s.id === lesson.student_id ||
        s.name === lesson.student_name ||
        s.full_name === lesson.student_name
      );
      const amount = Math.round((Number(lesson.hourly_rate || 500) * Number(lesson.duration_minutes || 60)) / 60);
      const dueDate = new Date().toISOString().split('T')[0];
      const description = `${lesson.duration_minutes || 60} min privatundervisning ${lesson.lesson_date || dueDate}`;

      const fullPayload = {
        student_id: student?.id || lesson.student_id || null,
        student_name: lesson.student_name,
        amount,
        due_date: dueDate,
        status: 'draft',
        method: 'Vipps',
        tutor_id: authUserId,
        email: getStudentEmail(student) || null,
        tutor_phone: getTeacherVippsPhone() || null,
        description,
        lesson_id: lesson.id,
        created_from_lesson: true
      };

      const fallbackPayload = {
        student_name: lesson.student_name,
        amount,
        due_date: dueDate,
        status: 'draft',
        method: 'Vipps',
        tutor_id: authUserId,
        email: getStudentEmail(student) || null
      };

      const invoiceData = await saveInvoiceWithSchemaFallback({}, fullPayload, fallbackPayload);

      if (invoiceData?.id) {
        const { error: lessonInvoiceError } = await supabase
          .from('lessons')
          .update({ invoice_id: invoiceData.id })
          .eq('id', lesson.id);

        if (lessonInvoiceError && !isSchemaCacheColumnError(lessonInvoiceError)) {
          console.warn('Kunne ikke koble fakturautkast til time:', lessonInvoiceError.message);
        }
      }

      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status: 'Fullført', completed_at: completedAt, invoice_id: invoiceData?.id } : l));
      fetchInvoices();
      if (invoiceData?.id) {
        await trackAnalyticsEvent('invoice_created', { method: 'Vipps', source: 'lesson_completion' });
      }
      setActiveTab('betaling');
      showToast('Timen er fullført og fakturautkast er opprettet.');
    } catch (error: any) {
      console.error("Feil ved fullføring av time:", error.message);
      showToast("En feil oppstod. Prøv igjen.");
    }
  };

  const confirmDeleteResource = async () => {
    if (!deleteResourceConfirmModal) return;
    const { resourceId, filePath } = deleteResourceConfirmModal;

    try {
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('resources')
          .remove([filePath]);
        if (storageError) console.error('Storage deletion error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (dbError) throw dbError;

      setResources(resources.filter(r => r.id !== resourceId));
      showToast('Ressurs slettet');
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      showToast(`Kunne ikke slette ressurs: ${error.message}`);
    } finally {
      setDeleteResourceConfirmModal(null);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deleteLessonConfirmModal) return;
    const { lessonId } = deleteLessonConfirmModal;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
        
      if (error) {
        console.error("Klarte ikke slette:", error.message);
        showToast("Kunne ikke slette timen. Prøv igjen.");
      } else {
        // Oppdater listen på skjermen med en gang (viktig!)
        setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
        showToast('Timen ble slettet');
      }
    } catch (error: any) {
      console.error('Feil ved sletting av time:', error);
      showToast('Kunne ikke slette timen: ' + error.message);
    } finally {
      setDeleteLessonConfirmModal(null);
    }
  };

  const deleteVacation = async (vacationId: string) => {
    console.log('vacationId:', vacationId);
    
    if (!confirm("Er du sikker på at du vil slette denne feriedagen?")) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tutor_vacation')
        .delete()
        .eq('id', vacationId)
        .eq('tutor_id', authUserId);
        
      console.log('delete result:', data);
      console.log('delete error:', error);
      
      if (error) {
        console.error("Klarte ikke slette ferie:", error);
        showToast("Kunne ikke slette ferien. Prøv igjen.");
      } else {
        // Reload vacations from database instead of relying only on local state
        await fetchVacations();
        showToast('Ferie ble slettet');
      }
    } catch (error: any) {
      console.error('Feil ved sletting av ferie:', error);
      showToast('Kunne ikke slette ferien: ' + error.message);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    setDeleteConfirmModal({ isOpen: true, studentId, studentName });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteConfirmModal) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteConfirmModal.studentId);
        
      if (error) throw error;
      
      // Oppdater state umiddelbart for at eleven skal forsvinne fra skjermen
      setStudents(prev => prev.filter(s => s.id.toString() !== deleteConfirmModal.studentId.toString()));
      
      showToast(`${deleteConfirmModal.studentName} er slettet.`);
      // Vi kan fortsatt kalle fetchStudents for å sikre at alt er synkronisert, 
      // men UI-et oppdateres umiddelbart takket være linjen over.
      fetchStudents();
    } catch (err: any) {
      console.error('Feil ved sletting av elev:', err);
      showToast(`Kunne ikke slette elev: ${err.message}`);
    } finally {
      setDeleteConfirmModal(null);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [fixedLessonData, setFixedLessonData] = useState({ name: '', day: '2026-03-23', time: '14:00', studentId: '', duration: '60' });
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('month');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState<string | null>(null);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [vacations, setVacations] = useState<Array<{id: string, tutor_id: string, vacation_date: string, description: string, tutor_name: string}>>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, studentId: string, studentName: string } | null>(null);
  const [deleteLessonConfirmModal, setDeleteLessonConfirmModal] = useState<{ isOpen: boolean, lessonId: string } | null>(null);
  const [newItemData, setNewItemData] = useState({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [taskModal, setTaskModal] = useState<{ isOpen: boolean, studentId: string, studentName: string } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAttachment, setTaskAttachment] = useState<File | null>(null);
  const [isSendingTask, setIsSendingTask] = useState(false);

  const sendTaskToStudent = async (studentId: string) => {
    if (!authUserId) return;
    setIsSendingTask(true);
    
    try {
      let attachmentPath = null;
      if (taskAttachment) {
        const fileExt = taskAttachment.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${authUserId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, taskAttachment);
          
        if (uploadError) throw uploadError;
        attachmentPath = filePath;
      }

      const { error } = await supabase
        .from('assignments')
        .insert([
          { 
            tutor_id: authUserId, 
            student_id: studentId, 
            title: taskTitle,
            description: taskContent,
            due_date: taskDueDate || null,
            attachment_path: attachmentPath
          }
        ]);
        
      if (error) throw error;

      // Notify student of new assignment
      try {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('profile_id')
          .eq('id', studentId)
          .single();

        if (student?.profile_id) {
          await createNotification(
            student.profile_id,
            'assignment',
            'Ny oppgave',
            `Du har fått en ny oppgave: ${taskTitle}`,
            '/tasks'
          );
        }
      } catch (notificationError) {
        console.error('Error sending assignment notification:', notificationError);
      }
      
      showToast("Oppgave sendt!");
      setTaskModal(null);
      setTaskTitle('');
      setTaskContent('');
      setTaskDueDate('');
      setTaskAttachment(null);
    } catch (err: any) {
      console.error("Feil ved sending av oppgave:", err);
      showToast("Kunne ikke sende oppgave: " + err.message);
    } finally {
      setIsSendingTask(false);
    }
  };
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [calendarModal, setCalendarModal] = useState<{ isOpen: boolean, title: string, mode: 'faste_tider' | 'ferie' } | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const stats = React.useMemo(() => {
    const now = new Date();
    const monthInvoices = invoices.filter(inv => {
      const date = new Date(inv.due_date || inv.created_at || inv.date || '');
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const paidInvoices = monthInvoices.filter(isInvoicePaid);
    const pendingInvoices = monthInvoices.filter(inv => !isInvoicePaid(inv) && !isInvoiceDraft(inv));
    const earned = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const pending = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const vippsPaid = paidInvoices
      .filter(inv => String(inv.method || '').toLowerCase().includes('vipps'))
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return {
      earned,
      pending,
      vippsPercent: earned > 0 ? Math.round((vippsPaid / earned) * 100) : 0
    };
  }, [invoices]);

  const fetchPaymentStats = React.useCallback(() => {
    // Payment stats are derived from invoices so they update immediately with invoice state.
  }, []);

  const filteredStudents = React.useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;

    return students.filter(student => [
      student.name,
      student.full_name,
      student.subject,
      student.email,
      student.parentEmail,
      student.phone,
    ].some(value => String(value || '').toLowerCase().includes(query)));
  }, [studentSearch, students]);

  const paymentStatusByStudent = React.useMemo(() => {
    return students.map(student => {
      const studentInvoices = invoices.filter(inv =>
        inv.student_id === student.id ||
        String(inv.student_name || inv.student || '').trim().toLowerCase() === String(student.full_name || student.name || '').trim().toLowerCase()
      );
      const paid = studentInvoices.filter(isInvoicePaid).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      const pending = studentInvoices
        .filter(inv => !isInvoicePaid(inv) && !isInvoiceDraft(inv))
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      const drafts = studentInvoices.filter(isInvoiceDraft).length;

      return {
        id: student.id,
        name: student.name || student.full_name,
        paid,
        pending,
        drafts,
        count: studentInvoices.length,
      };
    }).filter(row => row.count > 0 || row.pending > 0 || row.drafts > 0);
  }, [students, invoices]);

  React.useEffect(() => {
    fetchVacations();
  }, [fetchVacations]);

  const fetchInvoices = React.useCallback(async () => {
    if (!authUserId) return;
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tutor_id', authUserId)
      .order('due_date', { ascending: false });

    if (data) setInvoices(data);
  }, [authUserId]);

  const oppdaterFakturaStatus = async (id: string | number, nyStatus: string) => {
    const paidStatus = nyStatus === 'paid' || nyStatus === 'betalt';
    const payload = paidStatus ? { status: nyStatus, paid_at: new Date().toISOString() } : { status: nyStatus };
    let { error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', id);

    if (error && isSchemaCacheColumnError(error)) {
      ({ error } = await supabase
        .from('invoices')
        .update({ status: nyStatus })
        .eq('id', id));
    }
      
    if (!error) {
      // Oppdater lokalt state så fargen endres med en gang
      setInvoices(prev => prev.map(inv => inv.id === id ? {...inv, ...payload} : inv));
      return true;
    }

    console.error('Feil ved oppdatering av fakturastatus:', error);
    showToast(`Kunne ikke oppdatere betaling: ${error.message}`);
    return false;
  };

  const generateMonthlyReport = (valgtMåned = new Date().getMonth(), valgtÅr = new Date().getFullYear()) => {
    const månedsInvoices = invoices.filter(inv => {
      const date = new Date(inv.due_date);
      return !isInvoiceDraft(inv) && date.getMonth() === valgtMåned && date.getFullYear() === valgtÅr;
    });

    const total = månedsInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const totalPaid = månedsInvoices.filter(isInvoicePaid).reduce((sum, i) => sum + Number(i.amount || 0), 0);

    return {
      totalRequested: total,
      totalPaid: totalPaid,
      count: månedsInvoices.length,
      månedNavn: new Date(valgtÅr, valgtMåned).toLocaleString('no-NO', { month: 'long' })
    };
  };

  const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Object.keys(rows[0] || {});
    if (headers.length === 0) {
      showToast('Ingen data å eksportere.');
      return;
    }

    const escapeCsvValue = (value: any) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(',')),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportInvoicesCsv = () => {
    const rows = invoices.map(inv => ({
      dato: inv.due_date || inv.created_at || '',
      elev: inv.student_name || inv.student || '',
      beskrivelse: getInvoiceDescription(inv),
      belop: Number(inv.amount || 0),
      metode: inv.method || '',
      status: isInvoicePaid(inv) ? 'betalt' : isInvoiceDraft(inv) ? 'utkast' : 'venter',
      epost: getInvoiceRecipientEmail(inv),
    }));

    downloadCsv(`tutorflyt-fakturaer-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportMonthlyIncomeCsv = () => {
    const now = new Date();
    const rows = invoices
      .filter(inv => {
        const date = new Date(inv.due_date || inv.created_at || '');
        return !isInvoiceDraft(inv) && !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .map(inv => ({
        dato: inv.due_date || inv.created_at || '',
        elev: inv.student_name || inv.student || '',
        beskrivelse: getInvoiceDescription(inv),
        fakturert: Number(inv.amount || 0),
        innbetalt: isInvoicePaid(inv) ? Number(inv.amount || 0) : 0,
        utestaende: isInvoicePaid(inv) ? 0 : Number(inv.amount || 0),
        metode: inv.method || '',
        status: isInvoicePaid(inv) ? 'betalt' : 'venter',
      }));

    downloadCsv(`tutorflyt-manedsrapport-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`, rows);
  };

  const sendEpostFaktura = (inv: any) => {
    const subject = encodeURIComponent(`Faktura for undervisning - ${inv.student_name || inv.student}`);
    const body = encodeURIComponent(
      `Hei!\n\nTakk for timen! Her er betalingsdetaljer:\n\n` +
      `Beløp: ${inv.amount} kr\n` +
      `Betales til Vipps: ${profile?.phone || ''}\n\n` +
      `Vennlig hilsen din Tutor.`
    );

    // Prøv window.open istedenfor window.location for å unngå blokkering
    const mailtoUrl = `mailto:${inv.email || ''}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    
    // Vi oppdaterer statusen til 'Fakturert' i databasen samtidig
    oppdaterFakturaStatus(inv.id, 'Fakturert');
  };

  const markerSomBetalt = async (id: string | number) => {
    const updated = await oppdaterFakturaStatus(id, 'paid');
    if (updated) showToast('Betaling bekreftet');
  };

  const slettFaktura = async (id: string | number) => {
    console.log("Forsøker å slette faktura med ID:", id);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .select();

      console.log("Slett-respons:", { data, error });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.warn("Ingen rader ble slettet. Dette kan skyldes manglende DELETE-rettigheter (RLS) i Supabase.");
        showToast("Feil: Kunne ikke slette. Sjekk at du har en DELETE-policy i Supabase.");
        return;
      }

      showToast('Faktura slettet');
      fetchInvoices();
      fetchPaymentStats();
    } catch (err: any) {
      console.error('Feil ved sletting av faktura:', err);
      showToast(`Kunne ikke slette faktura: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchPaymentStats();
    fetchInvoices();
  }, [fetchPaymentStats, fetchInvoices]);

  const mergedSchedule = React.useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD format
    
    const localItems = schedule.map(s => ({
      ...s,
      source: 'local',
      sortTime: s.time.split(' - ')[0]
    }));

    const fasteItems = fasteTider
      .filter(ft => ft.date === todayStr)
      .map(ft => {
        const startHour = parseInt(ft.time.split(':')[0]);
        const endHour = (startHour + 1).toString().padStart(2, '0');
        const minutes = ft.time.split(':')[1];
        return {
          id: ft.id,
          time: `${ft.time} - ${endHour}:${minutes}`,
          student: 'Fast tid',
          subject: 'Lærerportalen',
          status: 'upcoming',
          source: 'supabase',
          sortTime: ft.time
        };
      });

    const gcItems = GOOGLE_CALENDAR_ENABLED ? calendarEvents
      .filter(ce => {
        const startDate = new Date(ce.start.dateTime || ce.start.date || '');
        return startDate.toLocaleDateString('sv-SE') === todayStr;
      })
      .map(ce => {
        const startDate = new Date(ce.start.dateTime || ce.start.date || '');
        const endDate = new Date(ce.end.dateTime || ce.end.date || '');
        const startTimeStr = startDate.toLocaleTimeString('no-NB', { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = endDate.toLocaleTimeString('no-NB', { hour: '2-digit', minute: '2-digit' });
        
        return {
          id: ce.id,
          time: `${startTimeStr} - ${endTimeStr}`,
          student: ce.summary,
          subject: 'Google Kalender',
          status: 'upcoming',
          source: 'google',
          sortTime: startTimeStr
        };
      }) : [];

    const combined = [...localItems, ...fasteItems, ...gcItems];
    
    // Filter out Google Calendar events that we just created to avoid duplicates
    const filteredCombined = combined.filter(item => {
      if (item.source === 'google' && item.student === 'Fast tid (Lærerportalen)') {
        return false;
      }
      return true;
    });

    return filteredCombined.sort((a, b) => a.sortTime.localeCompare(b.sortTime));
  }, [schedule, fasteTider, calendarEvents]);

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (needsOnboarding && authUserId) {
    return <WelcomeGuide userId={authUserId} onComplete={(name) => setProfile({ ...profile, name })} />;
  }

  if (isTrialExpired) {
    return <PaymentWall onUpgrade={() => onNavigate('payment')} />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePlanLimitReached = async (
    limitName: 'students' | 'lessons' | 'invoices',
    currentCount: number,
    source: string
  ) => {
    const limitKey = limitName === 'students'
      ? 'maxStudents'
      : limitName === 'lessons'
        ? 'maxLessonsPerMonth'
        : 'maxInvoicesPerMonth';
    const message = getUpgradeMessage(userPlan, limitName);

    setPlanLimitNotice(message);
    showToast(message);
    await trackEvent('plan_limit_reached', {
      plan: userPlan,
      limit: limitName,
      current_count: currentCount,
      max_allowed: getPlanLimit(userPlan, limitKey),
      source,
    }, { userId: authUserId });
  };

  const copyToClipboard = (text: string | number, label: string) => {
    navigator.clipboard.writeText(text.toString());
    showToast(`${label} kopiert!`);
  };

  const handleAddAction = () => {
    if (activeTab === 'rapporter') {
      showToast('Bruk skjemaet under for å opprette en ny rapport.');
      return;
    }
    if (activeTab === 'ressurser') {
      showToast('Bruk skjemaet "Legg til ny ressurs" for å legge til filer eller lenker.');
      return;
    }
    setShowAddModal(true);
    setNewItemData({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
  };

  const handleSendReport = async () => {
    if (!selectedStudentId) {
      showToast('Vennligst velg en elev først!');
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);

    try {
      // 1. LAGRE I SUPABASE (for historikk)
      const { error: dbError } = await supabase
        .from('reports')
        .insert([
          { 
            student_id: selectedStudentId, 
            status: reportStatus, 
            mastery_level: masteryLevel,
            comment: reportComment,
            homework: homework,
            topic: topic,
            created_at: new Date()
          }
        ]);

      if (dbError) throw dbError;

      // 2. SENDE PROFESJONELL E-POST VIA RESEND
      let emailSent = false;
      let emailError = '';
      
      if (student?.email || student?.parentEmail) {
        const targetEmail = student.email || student.parentEmail;
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData.session?.access_token;
        
        const response = await fetch('/api/send-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            studentEmail: targetEmail,
            studentName: student.full_name || student.name,
            topic,
            reportStatus,
            masteryLevel,
            reportComment,
            homework
          }),
        });
        
        try {
          await readApiJson(response, 'Kunne ikke sende e-post via Resend');
          emailSent = true;
          console.log(`E-post sendt til ${targetEmail} via Resend!`);
        } catch (error: any) {
          emailError = error.message || 'Kunne ikke sende e-post via Resend';
          console.error('Resend error:', emailError);
        }
      }

      if (emailError) {
        showToast(`Rapport lagret, men e-post feilet: ${emailError}`);
      } else if (emailSent) {
        showToast(`Rapport lagret og sendt til ${student?.full_name || student?.name}!`);
      } else {
        showToast(`Rapport lagret for ${student?.full_name || student?.name} (Ingen e-post oppgitt)`);
      }
      
      // Tøm skjemaet etter sending
      setReportComment('');
      setHomework('');
    } catch (error) {
      console.error('Feil ved sending:', error);
      showToast('Kunne ikke sende rapport. Prøv igjen.');
    }
  };

  const handleSaveNewItem = async () => {
    if (!newItemData.name) return;
    if (!authUserId) {
      showToast('Du må være logget inn for å lagre.');
      return;
    }

    if (activeTab === 'betaling' && newItemData.method !== 'Vipps') {
      if (!newItemData.email || !newItemData.email.includes('@')) {
        showToast('Vennligst oppgi en gyldig e-postadresse.');
        return;
      }
    }
    
    if (activeTab === 'oversikt') {
      if (!canCreateStudent(userPlan, students.length)) {
        await handlePlanLimitReached('students', students.length, 'manual_add');
        return;
      }

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('students')
          .insert([
            { 
              full_name: newItemData.name,
              subject: newItemData.detail || 'Nytt fag',
              email: newItemData.email || '',
              tutor_id: authUserId,
              status: 'active'
            }
          ]);
          
        if (error) throw error;
        
        await trackAnalyticsEvent('student_created', { source: 'manual_add' });
        showToast(newItemData.email ? `Invitasjon sendt til ${newItemData.email}!` : 'Elev lagt til!');
        fetchStudents();
      } catch (err: any) {
        console.error('Feil ved lagring av elev:', err);
        showToast(`Kunne ikke legge til elev: ${err.message}`);
      } finally {
        setIsSaving(false);
        setShowAddModal(false);
        setNewItemData({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
      }
    } else if (activeTab === 'timeplan') {
      if (!canCreateLesson(userPlan, currentMonthlyLessonCount)) {
        await handlePlanLimitReached('lessons', currentMonthlyLessonCount, 'manual_add');
        return;
      }

      setIsSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Ikke logget inn');

        let selectedStudentName = newItemData.name;
        if (newItemData.studentId) {
          const student = students.find(s => s.id === newItemData.studentId);
          if (student) {
            selectedStudentName = student.full_name;
          }
        }

        const lesson_date = newItemData.date || new Date().toISOString().split('T')[0];
        const start_time = newItemData.detail ? (newItemData.detail.length === 5 ? `${newItemData.detail}:00` : newItemData.detail) : '12:00:00';
        const duration_minutes = parseInt(newItemData.duration) || 60;

        const { error } = await supabase
          .from('lessons')
          .insert({
            tutor_id: user.id,
            student_id: newItemData.studentId || null,
            student_name: selectedStudentName,
            lesson_date,
            start_time,
            duration_minutes,
            is_recurring: false,
          });

        if (error) throw error;

        await trackAnalyticsEvent('lesson_created', { source: 'manual_add' });

        // Notify student of new lesson
        if (newItemData.studentId) {
          try {
            const { data: student, error: studentError } = await supabase
              .from('students')
              .select('profile_id')
              .eq('id', newItemData.studentId)
              .single();

            if (student?.profile_id) {
              await createNotification(
                student.profile_id,
                'lesson',
                'Ny time',
                `Du har fått en ny time planlagt: ${lesson_date} kl. ${start_time}`,
                '/calendar'
              );
            }
          } catch (notificationError) {
            console.error('Error sending lesson notification:', notificationError);
          }
        }
        
        showToast("Timene er lagret i skyen! 🚀");
        fetchLessons();
      } catch (err: any) {
        console.error("Feil ved lagring:", err.message);
        showToast(`Kunne ikke lagre time: ${err.message}`);
      } finally {
        setIsSaving(false);
        setShowAddModal(false);
        setNewItemData({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
      }
    } else if (activeTab === 'betaling') {
      if (!canCreateInvoice(userPlan, currentMonthlyInvoiceCount)) {
        await handlePlanLimitReached('invoices', currentMonthlyInvoiceCount, 'manual_add');
        return;
      }

      setIsSaving(true);
      try {
        const amount = parseInt(newItemData.detail) || 500;
        
        // 1. Hent den aktive brukeren direkte fra Supabase auth
        const { data: { user: activeUser }, error: userError } = await supabase.auth.getUser();
        if (userError && userError.message.includes('Refresh Token')) {
          await supabase.auth.signOut().catch(() => {});
        }

        // 2. Sjekk om vi faktisk fant en bruker før vi går videre
        if (!activeUser || !activeUser.id) {
          showToast("Feil: Fant ikke bruker-ID. Prøv å logge ut og inn igjen.");
          setIsSaving(false);
          return;
        }

        console.log("Henter profil for ID:", activeUser.id);

        // 3. Nå bruker vi 'activeUser.id' som vi VET eksisterer
        const { data: tutorProfile, error: profileError } = await supabase
          .from('profiles')
          .select('phone, full_name')
          .eq('id', activeUser.id)
          .single();

        if (profileError || !tutorProfile) {
          console.error("Profil-feil:", profileError);
          showToast("Kunne ikke hente Vipps-nummeret ditt fra profilen. Sjekk at du har fylt ut profil-siden din!");
          setIsSaving(false);
          return;
        }

        // Rens nummeret for mellomrom hvis nødvendig
        const cleanPhone = tutorProfile.phone ? tutorProfile.phone.replace(/\D/g, '') : '';

        if (newItemData.method === 'Vipps') {
          const student = students.find(s => s.full_name === newItemData.name);
          const recipientEmail = newItemData.email || getStudentEmail(student);
          if (!recipientEmail || !recipientEmail.includes('@')) {
            alert("Kan ikke sende betalingskrav: E-post til elev eller foresatt mangler.");
            setIsSaving(false);
            return;
          }
          setSelectedVippsInvoice({
            student_id: student?.id || null,
            student_name: newItemData.name,
            amount: amount,
            description: subject || student?.subject || 'Privatundervisning',
            email: recipientEmail,
            due_date: newItemData.date || new Date().toISOString().split('T')[0],
            tutor_phone: cleanPhone || null
          });
          setShowAddModal(false);
          setIsSaving(false);
          setNewItemData({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
          return;
        }

        const { data: invoiceData, error } = await supabase
          .from('invoices')
          .insert([
            {
              student_name: newItemData.name,
              amount: amount,
              due_date: newItemData.date || new Date().toISOString().split('T')[0],
              status: 'Sendt', // Vi setter status til Sendt med en gang
              method: newItemData.method || 'Faktura',
              tutor_id: activeUser.id,
              email: newItemData.email || null,
              tutor_phone: cleanPhone
            }
          ])
          .select()
          .single();
          
        if (error) throw error;

        await trackAnalyticsEvent('invoice_created', {
          method: newItemData.method || 'Faktura',
          source: 'manual_add',
        });
        
        // 2. Send e-post via backend
        if (newItemData.email && invoiceData) {
          try {
            const res = await fetch('/api/payment/send-invoice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                invoiceId: invoiceData.id
              }),
            });

            const resData = await res.json();
            console.log("E-post API svar:", resData);

            if (res.ok) {
              showToast("Faktura lagret og e-post sendt! 🚀");
            } else {
              showToast("Faktura lagret, men e-post feilet: " + (resData.error || resData.message));
            }
          } catch (err) {
            console.error("Nettverksfeil ved sending:", err);
            showToast("Faktura lagret, men nettverksfeil ved sending av e-post.");
          }
        } else {
          showToast("Faktura lagret! 🚀 (Ingen e-post oppgitt)");
        }
        
        setShowAddModal(false);
        fetchInvoices();
        fetchPaymentStats();
      } catch (err: any) {
        console.error('Feil ved opprettelse av faktura:', err);
        showToast(`Kunne ikke opprette faktura: ${err.message}`);
      } finally {
        setIsSaving(false);
        setNewItemData({ name: '', detail: '', email: '', date: '', method: 'Faktura', studentId: '', duration: '60' });
      }
    }
  };

  const handleSendVippsRequest = async (sessionId: number) => {
    setIsSendingVipps(sessionId);
    
    const session = schedule.find(s => s.id === sessionId);
    const student = students.find(s => s.name === session?.student);
    
    if (!session || !student) {
      setIsSendingVipps(null);
      return;
    }

    try {
      // 1. Hent den aktive brukeren direkte fra Supabase auth
      const { data: { user: activeUser }, error: userError } = await supabase.auth.getUser();
      if (userError && userError.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
      }

      // 2. Sjekk om vi faktisk fant en bruker før vi går videre
      if (!activeUser || !activeUser.id) {
        showToast("Feil: Fant ikke bruker-ID. Prøv å logge ut og inn igjen.");
        setIsSendingVipps(null);
        return;
      }

      console.log("Henter profil for ID:", activeUser.id);

      // 3. Nå bruker vi 'activeUser.id' som vi VET eksisterer
      const { data: tutorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('phone, full_name')
        .eq('id', activeUser.id)
        .single();

      if (profileError || !tutorProfile) {
        console.error("Profil-feil:", profileError);
        showToast("Kunne ikke hente Vipps-nummeret ditt fra profilen. Sjekk at du har fylt ut profil-siden din!");
        setIsSendingVipps(null);
        return;
      }

      // Rens nummeret for mellomrom hvis nødvendig
      const cleanPhone = tutorProfile.phone ? tutorProfile.phone.replace(/\D/g, '') : '';

      // Lagre fakturaen i databasen
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            student_name: student.name,
            amount: session.amount,
            due_date: new Date().toISOString().split('T')[0],
            status: 'Sendt',
            method: 'Vipps',
            tutor_id: activeUser.id,
            email: student.parentEmail || null,
            tutor_phone: cleanPhone
          }
        ])
        .select()
        .single();

      if (invoiceError || !invoiceData) {
        console.error('Feil ved lagring av faktura:', invoiceError);
        showToast('Kunne ikke lagre fakturaen i historikken.');
        setIsSendingVipps(null);
        return;
      }

      await trackAnalyticsEvent('invoice_created', { method: 'Vipps', source: 'lesson_payment_request' });

      const response = await fetch('/api/payment/vipps-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceData.id
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Kunne ikke sende Vipps-krav');
      }

      showToast('Vipps-krav sendt og lagret!');
      fetchInvoices();
      fetchPaymentStats();

      // Update session status to 'pending_payment' in database
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ status: 'pending_payment' })
        .eq('id', sessionId);
        
      if (lessonError) {
        console.error('Kunne ikke oppdatere timestatus:', lessonError);
      } else {
        fetchLessons();
      }

    } catch (error) {
      console.error('Error sending Vipps request:', error);
      showToast('Det oppstod en feil ved sending av Vipps-krav.');
    } finally {
      setIsSendingVipps(null);
    }
  };

  const weekdays = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  const getEasterSunday = (year: number) => {
    const f = Math.floor,
      G = year % 19,
      C = f(year / 100),
      H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
      I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
      J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
      L = I - J,
      month = 3 + f((L + 40) / 44),
      day = L + 28 - 31 * f(month / 4);
    return new Date(year, month - 1, day);
  };

  const getNorwegianHolidays = (year: number) => {
    const easter = getEasterSunday(year);
    const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

    const holidays = [
      { date: new Date(year, 0, 1), name: "1. nyttårsdag" },
      { date: new Date(year, 4, 1), name: "1. mai" },
      { date: new Date(year, 4, 17), name: "17. mai" },
      { date: new Date(year, 11, 25), name: "1. juledag" },
      { date: new Date(year, 11, 26), name: "2. juledag" },
      { date: addDays(easter, -3), name: "Skjærtorsdag" },
      { date: addDays(easter, -2), name: "Langfredag" },
      { date: easter, name: "1. påskedag" },
      { date: addDays(easter, 1), name: "2. påskedag" },
      { date: addDays(easter, 39), name: "Kristi Himmelfartsdag" },
      { date: addDays(easter, 49), name: "1. pinsedag" },
      { date: addDays(easter, 50), name: "2. pinsedag" },
    ];

    // Format to YYYY-MM-DD local time correctly
    return holidays.map(h => {
      const offset = h.date.getTimezoneOffset() * 60000;
      return {
        dateString: new Date(h.date.getTime() - offset).toISOString().split('T')[0],
        name: h.name
      };
    });
  };

  const getNorwegianHolidayName = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
    const holidays = getNorwegianHolidays(date.getFullYear());
    const holiday = holidays.find(h => h.dateString === dateString);
    if (holiday) return holiday.name;
    if (date.getDay() === 0) return "Søndag";
    return null;
  };

  const getDaysInMonth = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Juster for mandag-start (0 = søndag, 1 = mandag)
    let startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startPadding; i++) {
      days.push(null); // Tomme celler før første dag i måneden
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth();
    const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    const monthName = monthNames[currentMonthDate.getMonth()];
    const year = currentMonthDate.getFullYear();

    const handlePrevMonth = () => {
      setCurrentMonthDate(new Date(year, currentMonthDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
      setCurrentMonthDate(new Date(year, currentMonthDate.getMonth() + 1, 1));
    };

    return (
      <div className="month-view-container">
        <div className="flex justify-between items-center mb-4 px-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 font-bold">
            &lt; Forrige
          </button>
          <h3 className="text-xl font-bold text-slate-900 capitalize">{monthName} {year}</h3>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 font-bold">
            Neste &gt;
          </button>
        </div>
        <div className="month-grid">
          {/* Ukedager header */}
          {weekdays.map(day => (
            <div key={`header-${day}`} className="month-grid-header text-center font-bold text-xs text-slate-500 uppercase mb-2">
              {day}
            </div>
          ))}
          
          {/* Dager i måneden */}
          {daysInMonth.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="grid-cell empty-cell" />;
            }
            
            const holidayName = getNorwegianHolidayName(date);
            const isRedDay = holidayName !== null;
            const offset = date.getTimezoneOffset() * 60000;
            const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
            const hasVacation = vacationDays.includes(dateString);
            
            const lessonsThisDay = lessons.filter((l: any) => l.lesson_date === dateString);
            const isClickable = hasVacation || lessonsThisDay.length > 0;

            // Get unique students for the day to show correct dots
            const uniqueStudents = Array.from(new Set(lessonsThisDay.map((l: any) => l.student_name)));

            return (
              <div 
                key={dateString} 
                className={`grid-cell ${isRedDay ? 'red-day' : ''} ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                onClick={() => isClickable && setSelectedDayDetails(dateString)}
              >
                <div className="flex items-center gap-2">
                  <span className="mobile-weekday text-sm text-slate-500 w-8 text-left">{weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1].substring(0, 3)}</span>
                  <span>{date.getDate()}</span>
                </div>
                {holidayName && holidayName !== "Søndag" && (
                  <span className="text-[9px] leading-tight text-center mt-1 opacity-80 px-1">{holidayName}</span>
                )}
                <div className="indicators mt-auto mb-1">
                  {hasVacation && <div className="dot-vacation" title={`${vacations.find(v => v.vacation_date === dateString)?.tutor_name} har fri`} />}
                  {uniqueStudents.map((studentName: any, i) => {
                    const color = getStudentColor(studentName);
                    return (
                      <div 
                        key={i} 
                        className="dot-lesson" 
                        style={{ backgroundColor: color.borderHex }}
                        title={`Time med ${studentName}`} 
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getLessonsForDay = (dayIndex: number) => {
    return lessons.filter((l: any) => {
      const d = new Date(l.lesson_date).getDay();
      const adjustedDay = d === 0 ? 6 : d - 1; // Juster fra søndag-start til mandag-start
      return adjustedDay === dayIndex;
    });
  };

  const getStudentColor = (name: string) => {
    const colors = [
      { bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-700', bgHex: '#eff6ff', borderHex: '#3b82f6' },
      { bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', textClass: 'text-emerald-700', bgHex: '#ecfdf5', borderHex: '#10b981' },
      { bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-700', bgHex: '#faf5ff', borderHex: '#a855f7' },
      { bgClass: 'bg-orange-50', borderClass: 'border-orange-200', textClass: 'text-orange-700', bgHex: '#fff7ed', borderHex: '#f97316' },
      { bgClass: 'bg-pink-50', borderClass: 'border-pink-200', textClass: 'text-pink-700', bgHex: '#fdf2f8', borderHex: '#ec4899' },
      { bgClass: 'bg-teal-50', borderClass: 'border-teal-200', textClass: 'text-teal-700', bgHex: '#f0fdfa', borderHex: '#14b8a6' },
      { bgClass: 'bg-rose-50', borderClass: 'border-rose-200', textClass: 'text-rose-700', bgHex: '#fff1f2', borderHex: '#f43f5e' },
      { bgClass: 'bg-indigo-50', borderClass: 'border-indigo-200', textClass: 'text-indigo-700', bgHex: '#eef2ff', borderHex: '#6366f1' }
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSaveFixed = async () => {
    if (!fixedLessonData.name || !fixedLessonData.time) return;
    if (!authUserId) {
      showToast('Du må være logget inn for å lagre.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');

      let selectedStudentName = fixedLessonData.name;
      if (fixedLessonData.studentId) {
        const student = students.find(s => s.id === fixedLessonData.studentId);
        if (student) {
          selectedStudentName = student.full_name;
        }
      }

      const newLessons = [];
      let currentDate = new Date(fixedLessonData.day);
      const duration_minutes = parseInt(fixedLessonData.duration) || 60;
      
      for (let i = 0; i < 4; i++) {
        newLessons.push({
          tutor_id: user.id,
          student_id: fixedLessonData.studentId || null,
          student_name: selectedStudentName,
          lesson_date: currentDate.toISOString().split('T')[0],
          start_time: fixedLessonData.time.length === 5 ? `${fixedLessonData.time}:00` : fixedLessonData.time,
          duration_minutes: duration_minutes,
          is_recurring: false
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }

      const newLessonsThisMonth = newLessons.filter((lesson) => isDateInCurrentMonth(lesson.lesson_date)).length;
      const lessonLimit = getPlanLimit(userPlan, 'maxLessonsPerMonth');
      if (lessonLimit !== null && currentMonthlyLessonCount + newLessonsThisMonth > lessonLimit) {
        await handlePlanLimitReached('lessons', currentMonthlyLessonCount, 'fixed_lessons');
        return;
      }

      const { error } = await supabase
        .from('lessons')
        .insert(newLessons);

      if (error) throw error;
      await trackAnalyticsEvent('lesson_created', { source: 'fixed_lessons' });

      // Notify student of new recurring lessons
      if (fixedLessonData.studentId) {
        try {
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('profile_id')
            .eq('id', fixedLessonData.studentId)
            .single();

          if (student?.profile_id) {
            await createNotification(
              student.profile_id,
              'lesson',
              'Nye faste timer',
              `Du har fått nye faste timer planlagt hver uke`,
              '/calendar'
            );
          }
        } catch (notificationError) {
          console.error('Error sending recurring lesson notification:', notificationError);
        }
      }
      
      showToast('Faste timer lagret for 4 uker!');
      fetchLessons();
      setShowFixedModal(false);
      setFixedLessonData({ name: '', day: '2026-03-23', time: '14:00', studentId: '', duration: '60' });
    } catch (err: any) {
      console.error('Feil ved lagring av faste timer:', err);
      showToast(`Kunne ikke lagre faste timer: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const rapport = generateMonthlyReport(); // Henter tall for inneværende måned
  const showSponsorCard = shouldShowAds(userPlan) && ['profil', 'oversikt', 'ressurser'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans pb-16 md:pb-0 overflow-x-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-20">
        <Logo iconSize="w-6 h-6 text-base" textSize="text-lg" />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setActiveTab('profil')} className={`p-2 ${activeTab === 'profil' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>
            <User className="h-5 w-5" />
          </button>
          <button onClick={() => setActiveTab('support')} className={`p-2 ${activeTab === 'support' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>
            <LifeBuoy className="h-5 w-5" />
          </button>
          <button onClick={onLogout} className="p-2 text-slate-500 hover:text-slate-900">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <Logo iconSize="w-8 h-8 text-lg" textSize="text-xl" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('profil')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profil' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <User className="h-5 w-5" />
            Profil
          </button>
          <button 
            onClick={() => setActiveTab('oversikt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'oversikt' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Users className="h-5 w-5" />
            Elevoversikt
          </button>
          <button 
            onClick={() => setActiveTab('timeplan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'timeplan' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <CalendarIcon className="h-5 w-5" />
            Timeplan
          </button>
          <button 
            onClick={() => setActiveTab('betaling')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'betaling' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <CreditCard className="h-5 w-5" />
            Betalingsstatus
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'drift' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Bell className="h-5 w-5" />
            Drift
          </button>
          {AI_ASSISTANT_ENABLED && planLimits.aiAssistant && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Bot className="h-5 w-5" />
              AI-assistent
            </button>
          )}
          <button 
            onClick={() => setActiveTab('meldinger')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'meldinger' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <MessageCircle className="h-5 w-5" />
            Meldinger
          </button>
          <button 
            onClick={() => setActiveTab('rapporter')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'rapporter' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <MessageSquare className="h-5 w-5" />
            Progresjonsrapporter
          </button>
          <button 
            onClick={() => setActiveTab('ressurser')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'ressurser' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <BookOpen className="h-5 w-5" />
            Ressurser
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'support' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LifeBuoy className="h-5 w-5" />
            Support
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logg ut
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 grid ${AI_ASSISTANT_ENABLED && planLimits.aiAssistant ? 'grid-cols-8' : 'grid-cols-7'} items-center min-h-16 px-1 z-30 pb-safe`}>
        <button 
          onClick={() => setActiveTab('oversikt')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'oversikt' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium">Elever</span>
        </button>
        <button 
          onClick={() => setActiveTab('timeplan')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'timeplan' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CalendarIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Timer</span>
        </button>
        <button 
          onClick={() => setActiveTab('betaling')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'betaling' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Betal</span>
        </button>
        <button
          onClick={() => setActiveTab('drift')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'drift' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Bell className="h-5 w-5" />
          <span className="text-[10px] font-medium">Drift</span>
        </button>
        {AI_ASSISTANT_ENABLED && planLimits.aiAssistant && (
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'ai' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-medium">AI</span>
          </button>
        )}
        <button 
          onClick={() => setActiveTab('meldinger')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'meldinger' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] font-medium">Meld</span>
        </button>
        <button 
          onClick={() => setActiveTab('rapporter')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'rapporter' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium">Rapport</span>
        </button>
        <button 
          onClick={() => setActiveTab('ressurser')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'ressurser' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-[10px] font-medium">Ress.</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0 w-full p-4 sm:p-6 md:p-10 overflow-y-auto overflow-x-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 capitalize">
              {activeTab === 'oversikt' ? 'Dine elever' : activeTab === 'support' ? 'Support' : activeTab === 'ai' ? 'AI-assistent' : activeTab === 'drift' ? 'Drift' : activeTab}
            </h1>
            <p className="text-slate-500 mt-1">Velkommen tilbake, {user?.name?.split(' ')[0] || 'lærer'}! Her er oversikten din for i dag.</p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
              {PLAN_NAMES[userPlan]}-plan
            </div>
            <div className="hidden md:block">
              <NotificationBell />
            </div>
            {activeTab !== 'oversikt' && activeTab !== 'ressurser' && activeTab !== 'profil' && activeTab !== 'betaling' && activeTab !== 'meldinger' && activeTab !== 'support' && activeTab !== 'ai' && activeTab !== 'drift' && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {activeTab === 'timeplan' && (
                  <button 
                    onClick={() => setShowFixedModal(true)}
                    className="inline-flex w-full items-center justify-center px-4 py-2.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors shadow-sm sm:w-auto"
                  >
                  <Plus className="h-4 w-4 mr-2" />
                  Faste tider
                </button>
              )}
              <button 
                onClick={handleAddAction}
                className="inline-flex w-full items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'timeplan' && 'Ny time'}
                {activeTab === 'rapporter' && 'Ny rapport'}
              </button>
            </div>
          )}
        </div>
      </div>

        {planLimitNotice && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{planLimitNotice}</span>
              <button
                onClick={async () => {
                  await trackEvent('upgrade_clicked', { plan: userPlan, source: 'plan_limit_notice', target_plan: 'pro' }, { userId: authUserId });
                  onNavigate('pricing');
                }}
                className="inline-flex items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-800"
              >
                Se pakker
              </button>
            </div>
          </div>
        )}

        {showSponsorCard && (
          <div className="mb-6">
            <FreePlanSponsorCard />
          </div>
        )}

        {/* Tab Content: Elevoversikt */}
        {activeTab === 'oversikt' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                Din faste videolenke (f.eks. Google Meet, Zoom)
              </h3>
              <p className="text-sm text-slate-500 mb-4">Denne lenken vil vises for elevene dine når de logger inn i elevportalen.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input 
                  type="url" 
                  value={meetLinkInput}
                  onChange={(e) => setMeetLinkInput(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="min-w-0 flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={() => saveMeetLink(meetLinkInput)}
                  disabled={isSavingLink}
                  className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 sm:w-auto"
                >
                  {isSavingLink ? 'Lagrer...' : 'Lagre lenke'}
                </button>
              </div>
            </div>

            {/* Notifications Section */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Varsler ({notifications.length})
                </h3>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex flex-col items-start gap-3 p-3 bg-slate-50 rounded-lg sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-slate-900">{notification.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{notification.body || notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(notification.created_at).toLocaleString('no-NO')}
                        </p>
                      </div>
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="w-full shrink-0 px-3 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors sm:w-auto sm:py-1"
                      >
                        Merk som lest
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="order-1">
              <button
                onClick={() => setShowBulkImportHelp(true)}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                disabled={isBulkImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isBulkImporting ? 'Importerer...' : 'Masseimport av elever'}
              </button>
              {showBulkImportHelp && (
                <div className="mt-4 p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-blue-900">Masseimport av elever</h3>
                    <button
                      onClick={() => setShowBulkImportHelp(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4 text-sm text-blue-800">
                    <p>
                      <strong>Oversikt:</strong> Masseimport lar deg legge til flere elever samtidig ved å laste opp en CSV-fil. Dette sparer tid sammenlignet med å legge til elever en etter en.
                    </p>
                    <div>
                      <strong>Steg 1: Forbered CSV-filen</strong>
                      <p>CSV-filen skal ha følgende format:</p>
                      <pre className="bg-white p-2 rounded border text-xs mt-2 overflow-x-auto">
{`Navn,E-post,Fag
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
Per Andersen,per@example.com,Norsk`}
                      </pre>
                      <ul className="list-disc list-inside mt-2">
                        <li><strong>Navn</strong> - Elevens fulle navn - PÅKREVET</li>
                        <li><strong>E-post</strong> - Elevens e-postadresse - PÅKREVET</li>
                        <li><strong>Fag</strong> - Fag/emne - VALGFRITT</li>
                      </ul>
                      <p className="mt-2">Regler:</p>
                      <ul className="list-disc list-inside">
                        <li>Overskriftsraden (første rad) er valgfri og hoppes over automatisk hvis den inneholder "Navn" eller "E-post"</li>
                        <li>E-postadresser må være gyldige (inneholde @) og unike for kontoen din</li>
                        <li>Navn kan inneholde mellomrom og spesialtegn</li>
                        <li>Fag-feltet kan være tomt</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Steg 2: Last ned mal-fil</strong>
                      <p>Last ned en ferdig CSV-mal du kan kopiere og redigere:</p>
                      <a
                        href="/BULK_IMPORT_TEMPLATE.csv"
                        download="bulk_import_template.csv"
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mt-2"
                      >
                        Last ned mal-fil
                      </a>
                    </div>
                    <div>
                      <strong>Steg 3: Last opp filen</strong>
                      <p>Velg din CSV-fil fra datamaskinen:</p>
                      <button
                        onClick={() => document.getElementById('bulk-import-input')?.click()}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mt-2"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Velg CSV-fil
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <input
                id="bulk-import-input"
                type="file"
                accept=".csv"
                onChange={handleBulkImport}
                style={{ display: 'none' }}
              />
            </div>

            <InviteStudent 
              tutorId={user?.id || ''} 
              userPlan={userPlan}
              currentStudentCount={students.length}
              onPlanLimitReached={() => handlePlanLimitReached('students', students.length, 'invite_student')}
              onInviteSuccess={async (email) => {
                fetchStudents();
                await trackAnalyticsEvent('student_created', { source: 'invite_student' });
                showToast(`Invitasjon sendt til ${email}!`);
              }}
            />

            <div className="order-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  Innleveringer <span className="bg-indigo-100 text-indigo-600 text-sm py-1 px-3 rounded-full">{submissions.length}</span>
                </h2>
                <button 
                  onClick={fetchSubmissions}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  Oppdater liste 🔄
                </button>
              </div>

              <div className="grid gap-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                    <div className="flex flex-col justify-between items-start gap-4 sm:flex-row">
                      <div className="flex min-w-0 gap-4">
                        <div className="h-10 w-10 shrink-0 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                          {sub.students?.full_name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900">{sub.students?.full_name || 'Ukjent elev'} - {sub.assignments?.title || sub.reports?.topic || 'Oppgave'}</h3>
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Sendt inn: {new Date(sub.created_at).toLocaleString('no-NB')}</p>
                          {sub.answer_text && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 italic text-slate-600 text-sm mb-3">
                              "{sub.answer_text}"
                            </div>
                          )}
                          <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:flex-wrap">
                            {sub.file_url && (
                              <a 
                                href={sub.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                              >
                                Se bilde
                              </a>
                            )}
                            <button 
                              onClick={() => oppdaterStatus(sub.id, sub.assignment_id, 'approved')}
                              className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              Godkjenn (Grønn)
                            </button>
                            <button 
                              onClick={() => oppdaterStatus(sub.id, sub.assignment_id, 'rejected')}
                              className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              Ikke godkjent (Rød)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {submissions.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 italic">Ingen nye svar fra elever akkurat nå. Godt jobba!</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="order-5 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-4 bg-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Elevliste</h2>
                  <p className="text-sm text-slate-500">{students.length} elever lagt til</p>
                </div>
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Søk etter elev..." 
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p>Du har ingen elever enda.</p>
                    <p className="text-sm mt-1">Bruk skjemaet over for å invitere din første elev!</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p>Ingen elever matcher søket.</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div key={student.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="w-12 h-12 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{student.name}</h3>
                          <p className="text-sm text-slate-500 break-words">{student.subject}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end text-sm text-slate-600 gap-2">
                        <div className="flex flex-col sm:items-end">
                          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400"/> Forelder: {student.parent}</span>
                          <span className="flex items-center gap-2 mt-1"><MessageSquare className="h-4 w-4 text-slate-400"/> {student.phone}</span>
                        </div>
                        <div className="flex flex-col gap-2 mt-2 sm:mt-0 sm:flex-row sm:items-center">
                          <button 
                            onClick={() => handleOpenVippsModal(student)}
                            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors sm:w-auto"
                          >
                            <Smartphone className="w-4 h-4" />
                            Krev via Vipps
                          </button>
                          <button 
                            onClick={() => setTaskModal({ isOpen: true, studentId: student.id.toString(), studentName: student.name })}
                            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors sm:w-auto"
                          >
                            <Send className="w-4 h-4" />
                            Send oppgave
                          </button>
                          <button
                            onClick={() => setStudentDetailModal(student)}
                            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors sm:w-auto"
                          >
                            <FileText className="w-4 h-4" />
                            Notater
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Slett elev"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Timeplan */}
        {activeTab === 'timeplan' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 min-w-0">
                <div className="text-lg font-bold text-slate-900 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2>{viewMode === 'list' ? 'Dagens timer (I dag)' : viewMode === 'week' ? 'Ukeskalender' : 'Månedskalender'}</h2>
                  <div className="flex gap-4 items-center">
                    <div className="flex w-full bg-slate-100 rounded-lg p-1 sm:w-auto">
                      <button 
                        className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors sm:flex-none ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        onClick={() => setViewMode('list')}
                      >
                        Liste
                      </button>
                      <button 
                        className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors sm:flex-none ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        onClick={() => setViewMode('week')}
                      >
                        Uke
                      </button>
                      <button 
                        className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors sm:flex-none ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        onClick={() => setViewMode('month')}
                      >
                        Måned
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {(() => {
                    // Create vacation events for tutor calendar
                    const vacationEvents = vacations.map(v => ({
                      id: `vacation-${v.id}`,
                      vacationId: v.id,
                      type: 'vacation',
                      date: v.vacation_date,
                      title: 'Du har fri',
                      description: v.description
                    }));
                    
                    // Create lesson events for tutor calendar
                    const lessonEvents = lessons.map(lesson => ({
                      id: lesson.id,
                      type: 'lesson',
                      date: lesson.lesson_date,
                      title: lesson.student_name,
                      start_time: lesson.start_time,
                      duration_minutes: lesson.duration_minutes,
                      student_name: lesson.student_name
                    }));
                    
                    console.log('Tutor lessons:', lessonEvents);
                    console.log('Tutor vacations:', vacationEvents);
                    
                    // Merge vacation and lesson events
                    const allEvents: any[] = [...lessonEvents, ...vacationEvents];
                    console.log('Tutor merged event array:', allEvents);
                    
                    return (
                      <>
                        {viewMode === 'list' ? (
                          <div className="calendar-view">
                            <h3>📅 Dagens og kommende timer</h3>
                            
                            {allEvents.length > 0 ? (
                              allEvents.map((event: any) => {
                                if (event.type === 'vacation') {
                                  return (
                                    <div 
                                      key={event.id} 
                                      className="lesson-card bg-yellow-50 border-yellow-200"
                                    >
                                      <div className="lesson-info">
                                        <span className="lesson-student text-yellow-800 font-bold">🌴 {event.title}</span>
                                        <span className="lesson-time">
                                          🗓️ {new Date(event.date).toLocaleDateString('no-NO')}
                                        </span>
                                      </div>
                                       <div className="flex shrink-0 items-center gap-3">
                                        <div className="lesson-tag bg-yellow-100 text-yellow-800 border-yellow-300">
                                          Ferie
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => deleteVacation(event.vacationId)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Slett ferie"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else if (event.type === 'lesson') {
                                  // Lesson event
                                  const lessonEvent = event as any;
                                  const color = getStudentColor(lessonEvent.student_name);
                                  return (
                                    <div 
                                      key={lessonEvent.id} 
                                      className="lesson-card"
                                      style={{ '--card-bg': color.bgHex, '--card-border': color.borderHex } as React.CSSProperties}
                                    >
                                      <div className="lesson-info min-w-0">
                                        <span className="lesson-student">{lessonEvent.student_name}</span>
                                        <span className="lesson-time">
                                          🗓️ {new Date(lessonEvent.date).toLocaleDateString('no-NO')} | ⏰ {lessonEvent.start_time?.substring(0,5)}
                                        </span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-3">
                                        <div 
                                          className="lesson-tag" 
                                          style={{ backgroundColor: color.bgHex, color: color.borderHex, border: `1px solid ${color.borderHex}40` }}
                                        >
                                          {lessonEvent.duration_minutes} min
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleCompleteLesson(lessonEvent)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Marker som fullført og lag faktura"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteLesson(lessonEvent.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Slett time"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              })
                            ) : (
                              <div className="empty-state">
                                <p>Ingen timer planlagt ennå.</p>
                                <small>Trykk på "+ Ny time" for å legge til din første elev.</small>
                              </div>
                            )}
                          </div>
                        ) : viewMode === 'week' ? (
                          <div className="weekly-calendar overflow-x-auto">
                            {(() => {
                              const today = new Date();
                              const dayOfWeek = today.getDay();
                              const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                              
                              return Array.from({ length: 7 }).map((_, index) => {
                                const date = new Date(today);
                                date.setDate(today.getDate() - adjustedDay + index);
                                const offset = date.getTimezoneOffset() * 60000;
                                const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
                                const hasVacation = vacationDays.includes(dateString);
                                const holidayName = getNorwegianHolidayName(date);
                                const isRedDay = holidayName !== null;
                                
                                // Filter events for this specific date
                                const dayEvents = allEvents.filter((e: any) => e.date === dateString);
                                
                                return (
                                  <div key={index} className={`calendar-day min-w-[120px] ${isRedDay ? 'bg-red-50/30' : ''}`}>
                                    <span className={`day-name ${isRedDay ? 'text-red-600' : ''}`}>
                                      {weekdays[index]} {date.getDate()}/{date.getMonth() + 1}
                                    </span>
                                    {holidayName && holidayName !== "Søndag" && (
                                      <div className="text-[10px] text-red-500 text-center font-medium mb-2">{holidayName}</div>
                                    )}
                                    <div className="day-content space-y-2 mt-2">
                                      {dayEvents.map((event: any) => {
                                        if (event.type === 'vacation') {
                                          return (
                                            <div key={event.id} className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 text-center relative group">
                                              <span className="text-xl block mb-1">🌴</span>
                                              <small className="text-yellow-800 font-bold block pr-5">{event.title}</small>
                                              <small className="text-yellow-700 block text-xs mt-1">
                                                {new Date(event.date).toLocaleDateString('no-NO')}
                                              </small>
                                              {event.description && (
                                                <small className="text-yellow-700 block text-xs mt-1">{event.description}</small>
                                              )}
                                              <button
                                                onClick={() => deleteVacation(event.vacationId)}
                                                className="absolute top-1 right-1 p-1 text-yellow-600 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Slett ferie"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        } else {
                                          // Lesson event
                                          const color = getStudentColor(event.student_name);
                                          return (
                                            <div key={event.id} className={`${color.bgClass} p-2 rounded-lg border ${color.borderClass} text-left relative group`}>
                                              <small className={`${color.textClass} font-bold block`}>{event.start_time?.substring(0,5)}</small>
                                              <p className="text-sm text-slate-800 truncate" title={event.student_name}>{event.student_name}</p>
                                              <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => handleCompleteLesson(event)}
                                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                                  title="Marker som fullført og lag faktura"
                                                >
                                                  <CheckCircle2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteLesson(event.id)}
                                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                  title="Slett time"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          renderMonthView()
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              <div className="space-y-6">
                {GOOGLE_CALENDAR_ENABLED && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" />
                      Kommende avtaler
                    </h3>
                  </div>
                  
                  {calendarError && (
                    <div className="mb-4">
                      <button 
                        onClick={handleSyncCalendar}
                        className="w-full text-sm px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Synkroniser med Google Kalender
                      </button>
                    </div>
                  )}
                  
                  {isLoadingCalendar ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : calendarError ? (
                    <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p>Du er ikke koblet til Google Kalender, eller tilgangen har utløpt.</p>
                      <p className="mt-1 text-xs">Klikk på knappen over for å koble til og se dine neste avtaler her.</p>
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">Ingen kommende avtaler funnet i kalenderen din.</p>
                  ) : (
                    <ul className="space-y-3">
                      {calendarEvents.map((event) => {
                        const startDate = new Date(event.start.dateTime || event.start.date || '');
                        const isAllDay = !event.start.dateTime;
                        return (
                          <li key={event.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                            <div className="bg-indigo-50 text-indigo-700 rounded-lg p-2 text-center min-w-[3rem]">
                              <div className="text-xs font-bold uppercase">{startDate.toLocaleDateString('no-NO', { month: 'short' })}</div>
                              <div className="text-lg font-black leading-none">{startDate.getDate()}</div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 text-sm">{event.summary || 'Uten tittel'}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {isAllDay ? 'Hele dagen' : startDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <a 
                              href={event.htmlLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Åpne i Google Kalender"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Hurtighandlinger</h2>
                  <div className="space-y-3">
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/student/portal`;
                      navigator.clipboard.writeText(url);
                      showToast('Lenke til elevportal kopiert til utklippstavlen!');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="min-w-0 font-medium text-slate-700 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 shrink-0 text-indigo-600" />
                      <span className="truncate">Kopier lenke til elevportal</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                  <button 
                    onClick={() => {
                      setCalendarModal({
                        isOpen: true,
                        title: 'Legg inn ferie/fravær',
                        mode: 'ferie'
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="font-medium text-slate-700">Legg inn ferie/fravær</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Tab Content: Betalingsstatus */}
        {activeTab === 'betaling' && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Innbetalt denne måneden</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">kr {stats.earned.toLocaleString('no-NO')}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Venter på betaling</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-600">kr {stats.pending.toLocaleString('no-NO')}</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Andel betalt via Vipps</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-indigo-600">{stats.vippsPercent}%</h3>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900">Betalingsstatus per elev</h2>
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                {paymentStatusByStudent.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Ingen betalingshistorikk enda.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {paymentStatusByStudent.slice(0, 6).map(row => (
                      <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="font-bold text-slate-900">{row.name}</p>
                          {row.drafts > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                              {row.drafts} utkast
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-bold uppercase text-emerald-600">Betalt</p>
                            <p className="font-black text-slate-900">{row.paid.toLocaleString('no-NO')} kr</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-amber-600">Venter</p>
                            <p className="font-black text-slate-900">{row.pending.toLocaleString('no-NO')} kr</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Eksport</h2>
                    <p className="text-sm text-slate-500">CSV for regnskap og skatt.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={exportInvoicesCsv}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Eksporter fakturaer
                  </button>
                  <button
                    onClick={exportMonthlyIncomeCsv}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <FileText className="h-4 w-4" />
                    Månedsrapport CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 items-start lg:grid-cols-[minmax(340px,460px)_minmax(0,1fr)]">
              <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-200 w-full">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Nytt betalingskrav</h2>
                  <p className="text-sm text-slate-500 mt-1">Send betalingskrav på e-post og følg statusen under.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Velg elev - henter info automatisk fra databasen */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hvilken elev?</label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      onChange={(e) => {
                        const student = students.find(s => s.id.toString() === e.target.value);
                        setSelectedStudent(student || null);
                        setVippsRecipientEmail(student ? getStudentEmail(student) : '');
                      }}
                      value={selectedStudent?.id || ''}
                    >
                      <option value="">Velg fra dine elever...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-post til elev/foresatt</label>
                    <input
                      type="email"
                      placeholder="f.eks. elev@epost.no"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={vippsRecipientEmail}
                      onChange={(e) => setVippsRecipientEmail(e.target.value)}
                    />
                  </div>

                  {/* Beløp */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Beløp (kr)</label>
                    <input 
                      type="number" 
                      placeholder="f.eks. 500"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                    />
                  </div>

                  {/* Beskrivelse (Valgfritt) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hva gjelder det? (Valgfritt)</label>
                    <input 
                      type="text" 
                      placeholder="f.eks. Matematikk-time"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vipps-mobilnummer</label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Mangler i lærerprofil"
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-slate-700 outline-none"
                      value={formatVippsPhone(getTeacherVippsPhone())}
                    />
                    <p className={`mt-1 text-xs ${getTeacherVippsPhone() ? 'text-slate-400' : 'text-red-500'}`}>
                      {getTeacherVippsPhone()
                        ? 'Hentes automatisk fra lærerprofilen.'
                        : 'Legg inn mobilnummer på profil-siden før du sender betalingskrav.'}
                    </p>
                  </div>

                  <button 
                    onClick={handleGoToVippsPreparation}
                    className="w-full bg-[#ff5b24] text-white font-bold py-4 rounded-xl mt-4 shadow-sm hover:bg-[#e65220] transition flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send betalingskrav
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 h-full">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Månedsrapport</h3>
                    <p className="text-sm text-slate-500">{rapport.månedNavn.charAt(0).toUpperCase() + rapport.månedNavn.slice(1)} {new Date().getFullYear()}</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <span className="block text-xs font-bold uppercase text-slate-400 mb-1">Fakturert</span>
                    <strong className="text-lg text-slate-900">{rapport.totalRequested.toLocaleString()} kr</strong>
                  </div>
                  
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <span className="block text-xs font-bold uppercase text-emerald-600 mb-1">Innbetalt</span>
                    <strong className="text-lg text-emerald-700">{rapport.totalPaid.toLocaleString()} kr</strong>
                  </div>
                  
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                    <span className="block text-xs font-bold uppercase text-indigo-600 mb-1">Fakturaer</span>
                    <strong className="text-lg text-indigo-700">{rapport.count}</strong>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>Betalt av fakturert</span>
                    <span className="font-bold text-slate-700">
                      {rapport.totalRequested > 0 ? Math.round((rapport.totalPaid / rapport.totalRequested) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${rapport.totalRequested > 0 ? (rapport.totalPaid / rapport.totalRequested) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Nylige fakturaer</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Elev</th>
                      <th className="px-6 py-4">Dato</th>
                      <th className="px-6 py-4">Beløp</th>
                      <th className="px-6 py-4">Metode</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Handling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <CreditCard className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                          <p>Ingen fakturaer å vise enda.</p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{inv.student_name || inv.student}</td>
                          <td className="px-6 py-4 text-slate-500">{inv.due_date || inv.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{inv.amount} kr</td>
                          <td className="px-6 py-4 text-slate-500">{inv.method}</td>
                          <td className="px-6 py-4">
                            {isInvoicePaid(inv) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Betalt
                              </span>
                            ) : isInvoiceDraft(inv) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                <FileText className="h-3.5 w-3.5" /> Utkast
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                <AlertCircle className="h-3.5 w-3.5" /> Venter på betaling
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-3">
                              {!isInvoicePaid(inv) && (
                                <div className="flex justify-end items-center gap-2">
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition"
                                    onClick={() => {
                                      const email = getInvoiceRecipientEmail(inv);
                                      if (!email) {
                                        alert("Kan ikke sende betalingskrav: E-post til elev eller foresatt mangler.");
                                        return;
                                      }
                                      setSelectedVippsInvoice({ ...inv, email, tutor_phone: getTeacherVippsPhone(inv) || null });
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Send e-post
                                  </button>
                                  <button
                                    onClick={() => markerSomBetalt(inv.id)}
                                    className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                                  >
                                    Marker betalt
                                  </button>
                                </div>
                              )}
                              
                              {isInvoicePaid(inv) && (
                                <button 
                                  onClick={() => showToast(`Kvittering lastet ned for ${inv.student_name || inv.student}`)}
                                  className="text-slate-400 hover:text-slate-600 font-medium text-sm"
                                >
                                  Kvittering
                                </button>
                              )}
                              
                              <button 
                                onClick={() => slettFaktura(inv.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Slett faktura"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drift' && (
          <TeacherOperations
            authUserId={authUserId}
            students={students}
            onToast={showToast}
          />
        )}

        {/* Tab Content: Progresjonsrapporter */}
        {activeTab === 'rapporter' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Write Report */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Status på timen</h2>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Velg elev</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      {students.length === 0 ? (
                        <option value="">Ingen elever lagt til enda</option>
                      ) : (
                        <>
                          <option value="">Velg elev...</option>
                          {students.map(student => (
                            <option key={student.id} value={student.id}>{student.name} ({student.subject})</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Emne Felt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emne vi jobbet med</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="F.eks. Algebra, Brøk, Verb..."
                    />
                  </div>

                  {/* Status / Smilefjes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dagens innsats</label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {/* Veldig bra - Grønn */}
                      <button 
                        type="button"
                        onClick={() => setReportStatus('great')}
                        className={`flex min-h-24 flex-col items-center justify-center p-2 sm:p-3 rounded-xl border-2 transition-all ${
                          reportStatus === 'great' 
                          ? 'bg-green-500 text-white border-green-600 scale-105 shadow-sm' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Smile className="h-8 w-8 mb-1" />
                        <span className="text-center text-[11px] sm:text-xs font-bold leading-tight">Veldig bra</span>
                      </button>

                      {/* Bra - Oransje/Varm gul */}
                      <button 
                        type="button"
                        onClick={() => setReportStatus('good')}
                        className={`flex min-h-24 flex-col items-center justify-center p-2 sm:p-3 rounded-xl border-2 transition-all ${
                          reportStatus === 'good' 
                          ? 'bg-orange-500 text-white border-orange-600 scale-105 shadow-sm' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Meh className="h-8 w-8 mb-1" />
                        <span className="text-center text-[11px] sm:text-xs font-bold leading-tight">Bra</span>
                      </button>

                      {/* Trenger fokus - Rød */}
                      <button 
                        type="button"
                        onClick={() => setReportStatus('needs_focus')}
                        className={`flex min-h-24 flex-col items-center justify-center p-2 sm:p-3 rounded-xl border-2 transition-all ${
                          reportStatus === 'needs_focus' 
                          ? 'bg-red-500 text-white border-red-600 scale-105 shadow-sm' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <Frown className="h-8 w-8 mb-1" />
                        <span className="text-center text-[11px] sm:text-xs font-bold leading-tight">Trenger fokus</span>
                      </button>
                    </div>
                  </div>

                  {/* Mestringshjul Input */}
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-sm font-medium text-slate-700">{masteryLevel}% Mestring</label>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" step="5"
                      value={masteryLevel}
                      onChange={(e) => setMasteryLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Lærerens kommentar - NÅ KOBLET TIL STATE */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kommentar</label>
                    <textarea 
                      rows={3}
                      value={reportComment}
                      onChange={(e) => setReportComment(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Hvordan gikk timen?"
                    ></textarea>
                  </div>

                  {/* Lekser - NÅ KOBLET TIL STATE */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lekser</label>
                    <input 
                      type="text"
                      value={homework}
                      onChange={(e) => setHomework(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Hva skal gjøres til neste gang?"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={handleSendReport}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send rapport
                    </button>
                  </div>
                </form>
              </div>

              {/* Preview - NÅ HELT DYNAMISK */}
              <div className="flex flex-col gap-6">
                <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-4 sm:p-6 text-white relative overflow-hidden">
                  <div className="flex justify-between items-start gap-4 mb-6 relative z-10">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold break-words">{topic || 'Emne'}</h3>
                      <p className="text-slate-400 text-sm">{masteryLevel}% Mestring</p>
                    </div>
                    <div className="text-2xl">
                      {reportStatus === 'great' && '😄'}
                      {reportStatus === 'good' && '🙂'}
                      {reportStatus === 'needs_focus' && '😐'}
                    </div>
                  </div>
                  <div className="bg-white text-slate-900 rounded-xl p-4 sm:p-5 relative z-10">
                    <div className="flex items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
                      <div className="min-w-0">
                        <h4 className="font-bold text-lg">
                          {selectedStudentId 
                            ? students.find(s => s.id === selectedStudentId)?.full_name || 'Elevens navn'
                            : 'Elevens navn'}
                        </h4>
                        <p className="text-sm text-slate-500 break-words">{topic} • I dag</p>
                      </div>
                      <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${
                        reportStatus === 'great' ? 'bg-green-100 text-green-600' : 
                        reportStatus === 'good' ? 'bg-orange-100 text-orange-600' : 
                        'bg-red-100 text-red-600'
                      }`}>
                        {reportStatus === 'great' ? <Smile className="h-7 w-7" /> : 
                         reportStatus === 'good' ? <Meh className="h-7 w-7" /> : 
                         <Frown className="h-7 w-7" />}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mestring</p>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${masteryLevel}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 text-right">{masteryLevel}% Mestring</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lærerens kommentar</p>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {reportComment || 'Begynn å skrive for å se forhåndsvisning...'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lekser</p>
                        <p className="text-sm text-slate-700 italic">
                          {homework || 'Ingen lekser denne gangen'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: Ressurser */}
        {activeTab === 'ressurser' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Ditt bibliotek</h3>
                  <span className="text-xs font-medium text-slate-500">{resources.length} filer delt av lærer</span>
                </div>
                
                <ul className="divide-y divide-slate-100">
                  {resources.length === 0 ? (
                    <li className="p-8 text-center text-slate-500">
                      <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>Ingen ressurser lagt til enda.</p>
                      <p className="text-sm mt-1">Bruk skjemaet til høyre for å dele filer eller lenker.</p>
                    </li>
                  ) : (
                    resources.map((res) => {
                      const isFile = res.type === 'file';
                      const isVideo = !isFile && res.url && (res.url.includes('youtube') || res.url.includes('vimeo'));
                      const iconBg = isFile ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500';
                      const btnClass = isFile 
                        ? 'text-red-600 border-red-200 hover:bg-red-50' 
                        : 'text-blue-600 border-blue-200 hover:bg-blue-50';
                      const icon = isFile ? '📄' : (isVideo ? '🎥' : '🔗');
                      const dateStr = new Date(res.created_at).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
                      
                      const assignedStudentIds = res.resource_assignments?.map((ra: any) => ra.student_id) || [];
                      const assignedStudentNames = students
                        .filter(s => assignedStudentIds.includes(s.id))
                        .map(s => s.full_name)
                        .join(', ');
                        
                      const fileUrl = isFile && res.file_path 
                        ? supabase.storage.from('resources').getPublicUrl(res.file_path).data.publicUrl 
                        : res.url;
                        
                      return (
                        <li key={res.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center space-x-4">
                            <div className={`p-2 ${iconBg} rounded-lg text-xl shrink-0`}>
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 break-words">{res.title}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <p className="text-xs text-slate-500">Lagt til: {dateStr}</p>
                                {assignedStudentNames && (
                                  <p className="text-xs text-indigo-600 break-words">Delt med: {assignedStudentNames}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full items-center gap-2 sm:w-auto">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`flex-1 px-4 py-2 text-sm font-medium border rounded-lg transition-colors text-center sm:flex-none ${btnClass}`}>
                              {isVideo ? 'Se video' : 'Åpne'}
                            </a>
                            <button
                              onClick={() => setDeleteResourceConfirmModal({ isOpen: true, resourceId: res.id, resourceTitle: res.title, filePath: res.file_path })}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Slett ressurs"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Legg til ny ressurs</h2>
                <form 
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newResource.title) return;
                    if (resourceSource === 'link' && !newResource.url) return;
                    if (resourceSource === 'file' && !selectedFile) return;
                    if (!authUserId) return;
                    
                    setIsUploadingResource(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error('Ikke logget inn');

                      let filePath = null;
                      
                      if (resourceSource === 'file' && selectedFile) {
                        const fileExt = selectedFile.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        filePath = `${user.id}/${fileName}`;
                        
                        const { error: uploadError } = await supabase.storage
                          .from('resources')
                          .upload(filePath, selectedFile);
                          
                        if (uploadError) throw uploadError;
                      }
                      
                      const { data: resourceData, error: resourceError } = await supabase
                        .from('resources')
                        .insert({
                          tutor_id: user.id,
                          title: newResource.title,
                          type: resourceSource,
                          file_path: filePath ?? null,
                          url: resourceSource === 'link' ? newResource.url : null
                        })
                        .select()
                        .single();
                        
                      console.error('RESOURCE INSERT ERROR:', resourceError);
                        
                      if (resourceError) {
                        throw resourceError;
                      }
                      
                      if (selectedStudentsForResource.length > 0) {
                        const assignments = selectedStudentsForResource.map(studentId => ({
                          resource_id: resourceData.id,
                          student_id: studentId
                        }));
                        
                        const { error: assignError } = await supabase
                          .from('resource_assignments')
                          .insert(assignments);
                          
                        console.error('ASSIGNMENT INSERT ERROR:', assignError);
                          
                        if (assignError) {
                          throw assignError;
                        }
                      }
                      
                      setNewResource({ title: '', url: '', type: 'PDF' });
                      setSelectedFile(null);
                      setSelectedStudentsForResource([]);
                      showToast('Ressurs lagt til!');
                      fetchResources();
                    } catch (error: any) {
                      console.error('Error adding resource:', error);
                      showToast(`Feil ved opplasting: ${error.message}`);
                    } finally {
                      setIsUploadingResource(false);
                    }
                  }}
                >
                  <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sourceType" 
                        checked={resourceSource === 'file'} 
                        onChange={() => setResourceSource('file')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Last opp fil
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="sourceType" 
                        checked={resourceSource === 'link'} 
                        onChange={() => setResourceSource('link')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Nettlenke
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tittel</label>
                    <input 
                      type="text"
                      value={newResource.title || ''}
                      onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={resourceSource === 'file' ? "F.eks. Gitar-skalaer_uke4.pdf" : "F.eks. Øvingsvideo"}
                      required
                    />
                  </div>

                  {resourceSource === 'link' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">URL (Lenke)</label>
                      <input 
                        type="url"
                        value={newResource.url || ''}
                        onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://..."
                        required={resourceSource === 'link'}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Velg fil</label>
                      <input 
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            if (!newResource.title) {
                              setNewResource({...newResource, title: file.name});
                            }
                          } else {
                            setSelectedFile(null);
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        required={resourceSource === 'file'}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tildel til elever (valgfritt)</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                      {students.map(student => (
                        <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudentsForResource.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentsForResource(prev => [...prev, student.id]);
                              } else {
                                setSelectedStudentsForResource(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-700">{student.full_name}</span>
                        </label>
                      ))}
                      {students.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-2">Ingen elever lagt til enda.</p>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUploadingResource}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors mt-2 disabled:opacity-50"
                  >
                    {isUploadingResource ? 'Laster opp...' : 'Legg til ressurs'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profil' && (
          <TeacherProfile user={{ ...user, id: authUserId }} onProfileSaved={handleTeacherProfileSaved} />
        )}

        {AI_ASSISTANT_ENABLED && planLimits.aiAssistant && activeTab === 'ai' && (
          <AIAssistant students={students} teacherName={profile?.name || user?.name || 'Lærer'} />
        )}

        {activeTab === 'meldinger' && (
          <ChatList />
        )}

        {activeTab === 'support' && (
          <SupportFeedback role="tutor" />
        )}

      </main>

      {studentDetailModal && (
        <StudentDetailModal
          student={studentDetailModal}
          lessons={lessons}
          invoices={invoices}
          onClose={() => setStudentDetailModal(null)}
          onToast={showToast}
        />
      )}

      {/* Task Modal */}
      {taskModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Send oppgave til {taskModal.studentName}</h3>
              <button onClick={() => setTaskModal(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tittel på oppgaven</label>
                <input 
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="f.eks. Matteinnlevering uke 12"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivelse / Instruksjoner</label>
                <textarea 
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                  placeholder="Skriv inn instruksjoner her..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frist</label>
                <input 
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vedlegg (valgfritt)</label>
                <input 
                  type="file"
                  onChange={(e) => setTaskAttachment(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setTaskModal(null)}
                  className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={() => sendTaskToStudent(taskModal.studentId)}
                  disabled={!taskTitle.trim() || !taskContent.trim() || !taskDueDate || isSendingTask}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSendingTask ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send oppgave
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Slett elev
              </h3>
              <button 
                onClick={() => setDeleteConfirmModal(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Er du sikker på at du vil slette eleven <strong>{deleteConfirmModal.studentName}</strong>? Denne handlingen kan ikke angres.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={confirmDeleteStudent}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
                >
                  Ja, slett elev
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Resource Confirm Modal */}
      {deleteResourceConfirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Slett ressurs
              </h3>
              <button 
                onClick={() => setDeleteResourceConfirmModal(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Er du sikker på at du vil slette ressursen <strong>{deleteResourceConfirmModal.resourceTitle}</strong>? Denne handlingen kan ikke angres.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteResourceConfirmModal(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={confirmDeleteResource}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
                >
                  Ja, slett ressurs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lesson Confirm Modal */}
      {deleteLessonConfirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Slett time
              </h3>
              <button 
                onClick={() => setDeleteLessonConfirmModal(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Er du sikker på at du vil slette denne timen? Denne handlingen kan ikke angres.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteLessonConfirmModal(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Avbryt
                </button>
                <button 
                  onClick={confirmDeleteLesson}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
                >
                  Ja, slett time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Lessons Modal */}
      {showFixedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-xl font-bold text-slate-900">Sett opp fast avtale</h3>
            <p className="text-slate-500 text-sm">Dette vil legge inn timen for de neste 4 ukene.</p>
            
            <select
              id="fNavn"
              value={fixedLessonData.studentId || ''}
              onChange={(e) => {
                const studentId = e.target.value;
                const student = students.find(s => s.id === studentId);
                setFixedLessonData({
                  ...fixedLessonData,
                  studentId,
                  name: student ? student.full_name : ''
                });
              }}
            >
              <option value="">Velg elev...</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
            <select 
              id="fDag"
              value={fixedLessonData.day}
              onChange={(e) => setFixedLessonData({...fixedLessonData, day: e.target.value})}
            >
              <option value="2026-03-23">Mandag (23. mars)</option>
              <option value="2026-03-24">Tirsdag (24. mars)</option>
              <option value="2026-03-25">Onsdag (25. mars)</option>
              <option value="2026-03-26">Torsdag (26. mars)</option>
              <option value="2026-03-27">Fredag (27. mars)</option>
              <option value="2026-03-28">Lørdag (28. mars)</option>
              <option value="2026-03-29">Søndag (29. mars)</option>
            </select>
            <div className="flex gap-2">
              <input 
                type="time" 
                id="fTid" 
                value={fixedLessonData.time}
                onChange={(e) => setFixedLessonData({...fixedLessonData, time: e.target.value})}
                className="flex-1"
              />
              <input 
                type="number"
                min="15"
                step="15"
                placeholder="Minutter"
                value={fixedLessonData.duration || '60'}
                onChange={(e) => setFixedLessonData({...fixedLessonData, duration: e.target.value})}
                className="w-24"
              />
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                className="btn-cancel flex-1" 
                onClick={() => setShowFixedModal(false)}
                disabled={isSaving}
              >
                Avbryt
              </button>
              <button 
                className="btn-save flex-1" 
                onClick={handleSaveFixed}
                disabled={isSaving}
              >
                {isSaving ? 'Lagrer...' : 'Lagre faste tider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDayDetails(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 capitalize">
                {new Date(selectedDayDetails).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelectedDayDetails(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {vacationDays.includes(selectedDayDetails) && (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 font-medium flex items-center justify-between group relative">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌴</span> 
                    <div>
                      <div className="font-semibold">{vacations.find(v => v.vacation_date === selectedDayDetails)?.tutor_name} har fri</div>
                      {vacations.find(v => v.vacation_date === selectedDayDetails)?.description && (
                        <div className="text-sm text-yellow-700 mt-1">{vacations.find(v => v.vacation_date === selectedDayDetails)?.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        const vacation = vacations.find(v => v.vacation_date === selectedDayDetails);
                        if (vacation) {
                          deleteVacation(vacation.id);
                        }
                      }}
                      className="p-1 text-yellow-600 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Slett ferie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {lessons.filter((l: any) => l.lesson_date === selectedDayDetails).length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Timer denne dagen</h4>
                  <div className="space-y-2">
                    {lessons
                      .filter((l: any) => l.lesson_date === selectedDayDetails)
                      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
                      .map((lesson: any) => {
                        const color = getStudentColor(lesson.student_name);
                        return (
                          <div key={lesson.id} className={`${color.bgClass} p-4 rounded-xl border ${color.borderClass} flex justify-between items-center group relative`}>
                            <div>
                              <p className={`font-bold ${color.textClass}`}>{lesson.student_name}</p>
                              <p className={`text-sm opacity-80 ${color.textClass}`}>{lesson.duration_minutes} min</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`font-bold text-lg ${color.textClass}`}>
                                {lesson.start_time?.substring(0,5)}
                              </div>
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCompleteLesson(lesson)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Marker som fullført og lag faktura"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Slett time"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                !vacationDays.includes(selectedDayDetails) && <p className="text-slate-500 text-center py-4">Ingen hendelser denne dagen.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vipps Modal */}
      {selectedVippsInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="p-6 bg-white rounded-2xl shadow-xl max-w-md mx-auto border border-gray-100 relative w-full">
            <button 
              onClick={() => setSelectedVippsInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 pr-8">
              <h2 className="text-xl font-bold text-gray-900">Send betalingskrav</h2>
              <p className="mt-1 text-sm text-slate-500">
                Vipps-nummeret fra lærerprofilen sendes på e-post. Etterpå står betalingen som venter i historikken.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Betaler</p>
                  <p className="font-semibold text-slate-900">{selectedVippsInvoice.student_name || selectedVippsInvoice.student}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Beløp</p>
                  <p className="font-bold text-slate-900">{selectedVippsInvoice.amount} kr</p>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
                {getInvoiceDescription(selectedVippsInvoice)}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-post til</label>
                <input
                  type="email"
                  value={getInvoiceRecipientEmail(selectedVippsInvoice)}
                  onChange={(e) => setSelectedVippsInvoice({ ...selectedVippsInvoice, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vipps-mobilnummer</label>
                <input
                  type="text"
                  readOnly
                  value={formatVippsPhone(getTeacherVippsPhone(selectedVippsInvoice))}
                  placeholder="Mangler i lærerprofil"
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none"
                />
                <p className={`mt-1 text-xs ${getTeacherVippsPhone(selectedVippsInvoice) ? 'text-slate-400' : 'text-red-500'}`}>
                  {getTeacherVippsPhone(selectedVippsInvoice)
                    ? 'Hentes automatisk fra lærerprofilen.'
                    : 'Legg inn mobilnummer på profil-siden før du sender betalingskrav.'}
                </p>
              </div>

              <button
                onClick={() => handleSendVippsPaymentRequest(selectedVippsInvoice)}
                className="flex items-center justify-center gap-2 w-full bg-[#ff5b24] text-white font-extrabold py-4 rounded-xl shadow-lg hover:bg-[#e65220] transition"
              >
                <Send className="h-5 w-5" />
                SEND BETALINGSKRAV PÅ E-POST
              </button>
            </div>
          </div>
        </div>
      )}

      {vippsModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Send betalingskrav
              </h3>
              <button onClick={() => { setVippsModalOpen(false); setVippsAmount(''); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Elevens navn
                </label>
                <input 
                  type="text" 
                  value={selectedStudent.name}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm focus:outline-none text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-post til elev/foresatt
                </label>
                <input
                  type="email"
                  value={vippsRecipientEmail}
                  onChange={(e) => setVippsRecipientEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="F.eks. elev@epost.no"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Beløp (kr)
                </label>
                <input 
                  type="number" 
                  value={vippsAmount}
                  onChange={(e) => setVippsAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="F.eks. 500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vipps-mobilnummer
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatVippsPhone(getTeacherVippsPhone())}
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-600 focus:outline-none"
                  placeholder="Mangler i lærerprofil"
                />
                <p className={`mt-1 text-xs ${getTeacherVippsPhone() ? 'text-slate-400' : 'text-red-500'}`}>
                  {getTeacherVippsPhone()
                    ? 'Hentes automatisk fra lærerprofilen.'
                    : 'Legg inn mobilnummer på profil-siden før du sender betalingskrav.'}
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => { setVippsModalOpen(false); setVippsAmount(''); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Avbryt
              </button>
              <button 
                onClick={async () => {
                  if (!vippsAmount || isNaN(Number(vippsAmount)) || Number(vippsAmount) <= 0) {
                    alert('Vennligst fyll inn et gyldig beløp');
                    return;
                  }
                  const recipientEmail = vippsRecipientEmail || getStudentEmail(selectedStudent);
                  if (!recipientEmail || !recipientEmail.includes('@')) {
                    alert('Legg inn e-post til elev eller foresatt først.');
                    return;
                  }
                  const sent = await handleSendVippsPaymentRequest({
                    student_id: selectedStudent.id,
                    student_name: selectedStudent.name,
                    amount: Number(vippsAmount),
                    description: selectedStudent.subject || 'Privatundervisning',
                    email: recipientEmail,
                    due_date: new Date().toISOString().split('T')[0],
                    tutor_phone: getTeacherVippsPhone() || null
                  }, true);
                  if (sent) {
                    setVippsModalOpen(false);
                    setVippsAmount('');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors"
              >
                Send e-post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'oversikt' && 'Legg til ny elev'}
                {activeTab === 'timeplan' && 'Legg til ny time'}
                {activeTab === 'betaling' && 'Opprett ny faktura'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {activeTab === 'oversikt' && 'Elevens navn'}
                  {activeTab === 'timeplan' && 'Velg elev'}
                  {activeTab === 'betaling' && 'Elevens navn'}
                </label>
                {activeTab === 'timeplan' ? (
                  <select
                    value={newItemData.studentId || ''}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      const student = students.find(s => s.id === studentId);
                      setNewItemData({
                        ...newItemData, 
                        studentId, 
                        name: student ? student.full_name : ''
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Velg elev...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={newItemData.name || ''}
                    onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="F.eks. Ola Nordmann"
                  />
                )}
              </div>
              <div className={activeTab === 'timeplan' ? "grid grid-cols-2 gap-4" : ""}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {activeTab === 'oversikt' && 'Fag / Emne'}
                    {activeTab === 'timeplan' && 'Tidspunkt'}
                    {activeTab === 'betaling' && 'Beløp (kr)'}
                  </label>
                  <input 
                    type={activeTab === 'timeplan' ? 'time' : 'text'}
                    value={newItemData.detail || ''}
                    onChange={(e) => setNewItemData({...newItemData, detail: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={
                      activeTab === 'oversikt' ? 'F.eks. Matte R1' : 
                      activeTab === 'timeplan' ? 'F.eks. 14:00' : 
                      'F.eks. 500'
                    }
                  />
                </div>
                {activeTab === 'timeplan' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Varighet (minutter)
                    </label>
                    <input 
                      type="number"
                      min="15"
                      step="15"
                      value={newItemData.duration || '60'}
                      onChange={(e) => setNewItemData({...newItemData, duration: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
              {(activeTab === 'timeplan' || activeTab === 'betaling') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {activeTab === 'timeplan' ? 'Dato' : 'Forfallsdato'}
                  </label>
                  <input 
                    type="date" 
                    value={newItemData.date || ''}
                    onChange={(e) => setNewItemData({...newItemData, date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              {activeTab === 'oversikt' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    E-post (for invitasjon)
                  </label>
                  <input 
                    type="email" 
                    value={newItemData.email || ''}
                    onChange={(e) => setNewItemData({...newItemData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="F.eks. ola@eksempel.no"
                  />
                </div>
              )}
              {activeTab === 'betaling' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Elevens/Forelders e-post
                    </label>
                    <input 
                      type="email" 
                      required 
                      value={newItemData.email || ''}
                      onChange={(e) => setNewItemData({...newItemData, email: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="f.eks. forelder@epost.no"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Betalingsmetode
                    </label>
                    <select 
                      value={newItemData.method || 'Faktura'}
                      onChange={(e) => setNewItemData({...newItemData, method: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Faktura">Faktura</option>
                      <option value="Vipps">Vipps</option>
                      <option value="Kort">Kort</option>
                      <option value="Kontant">Kontant</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Avbryt
              </button>
              <button 
                onClick={handleSaveNewItem}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Lagrer...' : 'Lagre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {calendarModal && (
        <CalendarModal
          isOpen={calendarModal.isOpen}
          mode={calendarModal.mode}
          title={calendarModal.title}
          onClose={() => setCalendarModal(null)}
          onSave={async (dates, time) => {
            if (calendarModal.mode === 'faste_tider') {
              try {
                let googleSuccessCount = 0;

                if (GOOGLE_CALENDAR_ENABLED) {
                  const { createGoogleCalendarEvent } = await import('../lib/googleCalendar');
                  for (const date of dates) {
                    try {
                      await createGoogleCalendarEvent('Fast tid (Lærerportalen)', date, time!);
                      googleSuccessCount++;
                    } catch (gErr: any) {
                      if (!gErr.message?.includes('provider_token mangler') && !gErr.message?.includes('aktiv sesjon funnet')) {
                        console.error("Feil ved lagring til Google Kalender for dato", date, gErr);
                      }
                    }
                  }
                }

                if (authUserId) {
                  const { error } = await supabase.from('faste_tider').insert(
                    dates.map(date => ({
                      tutor_id: authUserId,
                      date: date,
                      time: time
                    }))
                  );
                  
                  if (error) {
                    console.error("Kunne ikke lagre til Supabase, bruker lokal state", error);
                    // Fallback: legg til i lokal state hvis tabellen ikke finnes
                    const newFasteTider = dates.map(date => ({
                      id: Date.now() + Math.random(),
                      tutor_id: authUserId,
                      date: date,
                      time: time
                    }));
                    setFasteTider(prev => [...prev, ...newFasteTider]);
                  } else {
                    fetchFasteTider(); // Oppdater fra Supabase
                  }
                }

                const googleCalendarMessage = GOOGLE_CALENDAR_ENABLED ? ` (${googleSuccessCount} i Google Kalender)` : '';
                showToast(`Faste tider lagret for ${dates.length} dager kl ${time}!${googleCalendarMessage}`);
                if (GOOGLE_CALENDAR_ENABLED) fetchCalendar();
              } catch (error: any) {
                showToast(`Feil ved lagring: ${error.message}`);
              }
            } else {
              await saveVacation(dates);
              showToast(`Ferie/fravær registrert for ${dates.length} dager. Elevene får beskjed.`);
            }
            setCalendarModal(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
