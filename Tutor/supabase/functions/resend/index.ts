import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    // Parse the webhook payload from Supabase
    const payload = await req.json()
    const record = payload.record

    // Sjekk at vi har dataen vi trenger
    if (!record || !record.student_id) {
      return new Response("Ugyldig payload", { status: 400 })
    }

    // Hent student-info (dette forutsetter at du kanskje slår opp e-posten, 
    // eller at den sendes med i payloaden/recorden)
    // For dette eksempelet antar vi at du har e-posten tilgjengelig.
    const targetEmail = record.student_email || "elev@example.com"; 

    // 1. Legg til emoji basert på status
    const emoji = record.status === 'great' ? '😄' : record.status === 'good' ? '🙂' : '😐';

    // 2. Send e-post via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'TutorFlyt <post@tutorflyt.no>',
        to: [targetEmail],
        subject: `Ny rapport fra din lærer ${emoji}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- 3. Sett inn i HTML-en -->
            <h2 style="color: #4f46e5;">Rapport fra TutorFlyt ${emoji}</h2>
            
            <p>Hei!</p>
            <p>Her er en oppsummering fra dagens time:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Emne:</strong> ${record.topic || 'Ikke spesifisert'}</p>
              <p><strong>Mestring:</strong> ${record.mastery_level}%</p>
              <p><strong>Lærerens kommentar:</strong><br/> ${record.comment || 'Ingen kommentar.'}</p>
              <p><strong>Lekser:</strong><br/> ${record.homework || 'Ingen lekser denne gangen.'}</p>
            </div>
            
            <p>Logg inn på portalen for å se mer detaljer.</p>
          </div>
        `
      })
    })

    const data = await res.json()

    if (res.ok) {
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else {
      return new Response(JSON.stringify({ error: data }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
