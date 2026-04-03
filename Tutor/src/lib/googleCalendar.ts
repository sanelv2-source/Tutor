import { supabase } from '../supabaseClient';

// Listen for auth state changes to capture the provider token
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.provider_token) {
    localStorage.setItem('google_provider_token', session.provider_token);
  }
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('google_provider_token');
  }
});

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink: string;
}

export const fetchGoogleCalendarEvents = async (): Promise<GoogleCalendarEvent[]> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (error.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(console.error);
      }
      throw new Error('Ingen aktiv sesjon funnet');
    }
    if (!session) {
      throw new Error('Ingen aktiv sesjon funnet');
    }

    let providerToken = session.provider_token;
    
    if (!providerToken) {
      providerToken = localStorage.getItem('google_provider_token') || undefined;
    }
    
    if (!providerToken) {
      throw new Error('Ingen Google Calendar-tilgang (provider_token mangler). Sørg for at du logget inn med Google.');
    }

    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=5&orderBy=startTime&singleEvents=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('google_provider_token');
        throw new Error('Google Calendar-tilgangen har utløpt. Vennligst synkroniser på nytt.');
      }
      const errorData = await response.json();
      throw new Error(`Klarte ikke å hente kalenderhendelser: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error: any) {
    // Only log actual API errors, not expected missing token errors
    if (!error.message.includes('provider_token mangler') && !error.message.includes('aktiv sesjon funnet')) {
      console.error('Feil ved henting av Google Calendar-hendelser:', error);
    }
    throw error;
  }
};

export const createGoogleCalendarEvent = async (summary: string, date: string, time: string): Promise<any> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (error.message.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(console.error);
      }
      throw new Error('Ingen aktiv sesjon funnet');
    }
    if (!session) {
      throw new Error('Ingen aktiv sesjon funnet');
    }

    let providerToken = session.provider_token;
    
    if (!providerToken) {
      providerToken = localStorage.getItem('google_provider_token') || undefined;
    }
    
    if (!providerToken) {
      throw new Error('Ingen Google Calendar-tilgang (provider_token mangler). Sørg for at du logget inn med Google.');
    }

    // Parse date and time to create start and end Date objects
    // time is expected to be in format "HH:MM"
    const [hours, minutes] = time.split(':').map(Number);
    
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    // Assume 1 hour duration for "faste tider"
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const event = {
      summary: summary,
      description: 'Fast tid satt opp via Lærerportalen',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('google_provider_token');
        throw new Error('Google Calendar-tilgangen har utløpt. Vennligst synkroniser på nytt.');
      }
      const errorData = await response.json();
      throw new Error(`Klarte ikke å opprette kalenderhendelse: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (!error.message.includes('provider_token mangler') && !error.message.includes('aktiv sesjon funnet')) {
      console.error('Feil ved opprettelse av Google Calendar-hendelse:', error);
    }
    throw error;
  }
};
