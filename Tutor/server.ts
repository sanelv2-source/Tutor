import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import crypto from "crypto";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jshciiidthsxjhwlxmbh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_iaTt8xzIHCGGoy_m2HrV2A_o2rMES6D'; // Fallback to anon key if service key is missing
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Apple OAuth POST callback

// Initialize Stripe lazily
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any });
  }
  return stripeClient;
}

// File-based store for prototype to survive restarts
const USERS_FILE = path.join(process.cwd(), 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.error("Failed to load users:", err);
  }
  return new Map();
}

function saveUsers(usersMap: Map<string, any>) {
  try {
    const obj = Object.fromEntries(usersMap);
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error("Failed to save users:", err);
  }
}

const users = loadUsers(); // email -> { name, email, password, verified, hasPaid, token }

async function startServer() {
  // Initialize Resend with API key if available
  let resend: Resend | null = null;
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  // API routes
  app.post("/api/auth/magic-link", async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "E-post er påkrevd" });
    }

    // Create user if they don't exist
    if (!users.has(email)) {
      users.set(email, { name: email.split('@')[0], email, password: '', verified: false, hasPaid: false, token: null });
      saveUsers(users);
    }

    const user = users.get(email);
    const token = crypto.randomBytes(32).toString("hex");
    user.token = token;
    users.set(email, user);
    saveUsers(users);

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const magicLink = `${appUrl}/?verify=${token}`;
    const fromEmail = "TutorFlyt <post@tutorflyt.no>";

    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Innlogging til TutorFlyt",
          html: `
            <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
              <div style="margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0; text-align: center;">
                <div style="margin: 0 auto 32px; display: flex; justify-content: center; align-items: center;">
                  <span style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: -0.025em;">
                    <span style="color: #4f46e5; margin-right: 8px;">✦</span>
                    TutorFlyt
                  </span>
                </div>
                <h1 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 24px;">Logg inn på TutorFlyt</h1>
                <p style="color: #475569; font-size: 16px; line-height: 26px; margin: 0 0 20px; text-align: center;">Hei!</p>
                <p style="color: #475569; font-size: 16px; line-height: 26px; margin: 0 0 20px; text-align: center;">
                  Klikk på knappen under for å logge inn på din TutorFlyt-konto. Denne lenken er gyldig i 24 timer for din sikkerhet.
                </p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${magicLink}" style="background-color: #4f46e5; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px;">
                    Logg inn
                  </a>
                </div>
                <hr style="border-color: #e2e8f0; border-style: solid; border-width: 1px 0 0 0; margin: 32px 0 24px;" />
                <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center;">
                  Hvis du ikke ba om denne e-posten, kan du trygt ignorere den.
                </p>
              </div>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          let errorMessage = data.error.message || "Kunne ikke sende e-post.";
          if (data.error.name === 'validation_error') {
            errorMessage = "Valideringsfeil fra Resend. Sjekk at e-postadressen er gyldig. Hvis du bruker gratisversjonen av Resend, kan du kun sende til din egen bekreftede e-postadresse.";
          }
          return res.status(400).json({ error: errorMessage });
        }
      } catch (error) {
        console.error("Failed to send email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating magic link email:");
      console.log(`To: ${email}`);
      console.log(`Magic Link: ${magicLink}`);
      console.log("=========================================");
    }

    res.json({ message: "Magisk lenke sendt", token });
  });

  app.post("/api/portal/reschedule", async (req, res) => {
    const { portalId, lessonId } = req.body;

    if (!portalId || !lessonId) {
      return res.status(400).json({ error: "Mangler portalId eller lessonId" });
    }

    // In a real app, we would look up the tutor's email based on the portalId/lessonId
    const tutorEmail = "tutor@example.com"; 
    const fromEmail = "TutorFlyt <post@tutorflyt.no>";

    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromEmail,
          to: tutorEmail,
          subject: "Forespørsel om endring av time",
          html: `
            <h1>Endring av time</h1>
            <p>En elev (Portal ID: ${portalId}) har bedt om å endre tidspunktet for timen med ID: ${lessonId}.</p>
            <p>Vennligst ta kontakt med eleven for å avtale nytt tidspunkt.</p>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          let errorMessage = data.error.message || "Kunne ikke sende e-post.";
          if (data.error.name === 'validation_error') {
            errorMessage = "Valideringsfeil fra Resend. Sjekk at e-postadressen er gyldig. Hvis du bruker gratisversjonen av Resend, kan du kun sende til din egen bekreftede e-postadresse.";
          }
          return res.status(400).json({ error: errorMessage });
        }
      } catch (error) {
        console.error("Failed to send reschedule email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating reschedule email:");
      console.log(`To: ${tutorEmail}`);
      console.log(`Subject: Forespørsel om endring av time`);
      console.log(`Body: Elev (Portal ID: ${portalId}) vil endre time ${lessonId}`);
      console.log("=========================================");
    }

    res.json({ message: "Forespørsel sendt" });
  });

  app.post("/api/invitations/send-email", async (req, res) => {
    const { email, tutorName, token } = req.body;
    const authHeader = req.headers.authorization;

    if (!email || !token) {
      return res.status(400).json({ error: "Mangler påkrevde felt" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Uautorisert" });
    }

    try {
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const inviteUrl = `${appUrl}/student/accept-invite?token=${token}`;
      const fromEmail = "TutorFlyt <post@tutorflyt.no>";

      if (resend) {
        const data = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Invitasjon til TutorFlyt",
          html: `
            <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
              <div style="margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0; text-align: center;">
                <h1 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 24px;">Velkommen til TutorFlyt!</h1>
                <p style="color: #475569; font-size: 16px; line-height: 26px; margin: 0 0 20px; text-align: center;">
                  <strong>${tutorName || "Læreren din"}</strong> har invitert deg til å opprette en elevkonto på TutorFlyt.
                </p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${inviteUrl}" style="background-color: #4f46e5; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px;">
                    Aksepter invitasjon og opprett konto
                  </a>
                </div>
                <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center;">
                  Denne lenken utløper om 7 dager.
                </p>
              </div>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating invite email:");
        console.log(`To: ${email}`);
        console.log(`Invite Link: ${inviteUrl}`);
        console.log("=========================================");
      }

      res.json({ success: true, message: "E-post sendt" });
    } catch (error: any) {
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "En feil oppstod ved sending av e-post" });
    }
  });

  app.post("/api/invitations/cancel", async (req, res) => {
    const { studentId, tutorId } = req.body;
    const authHeader = req.headers.authorization;

    if (!studentId || !tutorId) {
      return res.status(400).json({ error: "Mangler påkrevde felt" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Uautorisert" });
    }

    try {
      const tokenStr = authHeader.replace('Bearer ', '');
      
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: {
          headers: {
            Authorization: `Bearer ${tokenStr}`
          }
        }
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user || user.id !== tutorId) {
        return res.status(401).json({ error: "Uautorisert" });
      }

      await supabaseClient
        .from('student_invitations')
        .update({ status: 'cancelled' })
        .eq('student_id', studentId)
        .eq('tutor_id', tutorId)
        .eq('status', 'pending');

      res.json({ success: true, message: "Invitasjon kansellert" });
    } catch (error: any) {
      console.error("Failed to cancel invitation:", error);
      res.status(500).json({ error: "En feil oppstod" });
    }
  });

  app.post("/api/invitations/validate", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Mangler token" });

    try {
      const { data: invitation, error } = await supabaseAdmin
        .from('student_invitations')
        .select('*, tutor:profiles!tutor_id(full_name)')
        .eq('token', token)
        .single();

      if (error || !invitation) {
        return res.status(404).json({ error: "Ugyldig invitasjon" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitasjonen er ${invitation.status === 'accepted' ? 'allerede akseptert' : 'utløpt eller kansellert'}` });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: "Invitasjonen har utløpt" });
      }

      res.json({ valid: true, invitation });
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({ error: "En feil oppstod ved validering" });
    }
  });

  app.post("/api/invitations/accept", async (req, res) => {
    const { token, userId } = req.body;
    if (!token || !userId) return res.status(400).json({ error: "Mangler token eller userId" });

    try {
      const { error } = await supabaseAdmin.rpc('accept_student_invitation', {
        invitation_token: token,
        new_user_id: userId
      });

      if (error) {
        console.error("RPC error:", error);
        return res.status(400).json({ error: "Ugyldig eller utløpt invitasjon" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Accept error:", error);
      res.status(500).json({ error: "En feil oppstod ved akseptering" });
    }
  });

  app.post("/api/send-invite", async (req, res) => {
    const { email, tutorId } = req.body;

    if (!email || !tutorId) {
      return res.status(400).json({ error: "Mangler e-post eller tutorId" });
    }

    // In a real app, we would look up the tutor's name based on the tutorId
    const tutorName = "Læreren din"; 
    const fromEmail = "TutorFlyt <post@tutorflyt.no>";
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const loginUrl = `${appUrl}/login`;

    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Velkommen til din nye læringsportal!",
          html: `
            <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
              <div style="margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0; text-align: center;">
                <div style="margin: 0 auto 32px; display: flex; justify-content: center; align-items: center;">
                  <span style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: -0.025em;">
                    <span style="color: #4f46e5; margin-right: 8px;">✦</span>
                    TutorFlyt
                  </span>
                </div>
                <h1 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 24px;">Velkommen til din nye læringsportal!</h1>
                <p style="color: #475569; font-size: 16px; line-height: 26px; margin: 0 0 20px; text-align: center;">
                  <strong>${tutorName}</strong> har invitert deg til TutorFlyt. Her vil du få full oversikt over dine timer, læringsressurser og fremgang.
                </p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${loginUrl}" style="background-color: #4f46e5; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px;">
                    Logg inn på din portal
                  </a>
                </div>
                <hr style="border-color: #e2e8f0; border-style: solid; border-width: 1px 0 0 0; margin: 32px 0 24px;" />
                <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center;">
                  TutorFlyt brukes av profesjonelle lærere for å sikre en trygg og effektiv læringsopplevelse.
                </p>
              </div>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          let errorMessage = data.error.message || "Kunne ikke sende e-post.";
          if (data.error.name === 'validation_error') {
            errorMessage = "Valideringsfeil fra Resend. Sjekk at e-postadressen er gyldig. Hvis du bruker gratisversjonen av Resend, kan du kun sende til din egen bekreftede e-postadresse.";
          }
          return res.status(400).json({ error: errorMessage });
        }
      } catch (error) {
        console.error("Failed to send invite email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating invite email:");
      console.log(`To: ${email}`);
      console.log(`Subject: Velkommen til din nye læringsportal!`);
      console.log(`Body: ${tutorName} har invitert deg til TutorFlyt.`);
      console.log("=========================================");
    }

    res.json({ message: "Invitasjon sendt" });
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (users.has(email)) {
      return res.status(400).json({ error: "En bruker med denne e-posten finnes allerede" });
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Store user data
    users.set(email, { name, email, password, verified: false, hasPaid: false, token });
    saveUsers(users);

    // Construct the verification URL
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const verificationUrl = `${appUrl}/?verify=${token}`;
    const fromEmail = "TutorFlyt <post@tutorflyt.no>";

    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Velkommen til TutorFlyt! 🎉",
          html: `
            <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
              <div style="margin: 0 auto; padding: 40px 32px; background-color: #ffffff; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0; text-align: center;">
                <div style="margin: 0 auto 32px; display: flex; justify-content: center; align-items: center;">
                  <span style="font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: -0.025em;">
                    <span style="color: #4f46e5; margin-right: 8px;">✦</span>
                    TutorFlyt
                  </span>
                </div>
                <h1 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0 0 24px;">Gratulerer! 🎉</h1>
                <p style="color: #475569; font-size: 16px; line-height: 26px; margin: 0 0 20px; text-align: center;">
                  Du er nå i gang med TutorFlyt. Nå kan du invitere din første elev og profesjonalisere hverdagen din.
                </p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${verificationUrl}" style="background-color: #4f46e5; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 32px;">
                    Gå til dashbordet
                  </a>
                </div>
                <hr style="border-color: #e2e8f0; border-style: solid; border-width: 1px 0 0 0; margin: 32px 0 24px;" />
                <p style="color: #94a3b8; font-size: 14px; line-height: 22px; text-align: center;">
                  Trenger du hjelp? Vi er her for deg. Bare svar på denne e-posten, så hjelper vi deg i gang.
                </p>
              </div>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          let errorMessage = data.error.message || "Kunne ikke sende e-post.";
          if (data.error.name === 'validation_error') {
            errorMessage = "Valideringsfeil fra Resend. Sjekk at e-postadressen er gyldig. Hvis du bruker gratisversjonen av Resend, kan du kun sende til din egen bekreftede e-postadresse.";
          }
          return res.status(400).json({ error: errorMessage });
        }
        
        console.log("Verification email sent to:", email);
      } catch (error) {
        console.error("Failed to send email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      // Fallback for local development without API key
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating email:");
      console.log(`To: ${email}`);
      console.log(`Verification Link: ${verificationUrl}`);
      console.log("=========================================");
    }

    res.json({ message: "Verification email sent", token }); // Sending token back just for demo purposes if needed
  });

  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body;
    
    let foundUser = null;
    for (const [email, user] of users.entries()) {
      if (user.token === token) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(400).json({ error: "Ugyldig eller utløpt lenke" });
    }

    foundUser.verified = true;
    foundUser.token = null; // consume token
    users.set(foundUser.email, foundUser);
    saveUsers(users);

    res.json({ 
      message: "Email verified successfully", 
      user: { 
        name: foundUser.name, 
        email: foundUser.email,
        hasPaid: foundUser.hasPaid || true,
        role: foundUser.role || 'tutor'
      } 
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    const user = users.get(email);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Feil e-post eller passord" });
    }
    
    if (!user.verified) {
      return res.status(403).json({ error: "Vennligst bekreft e-postadressen din først" });
    }

    res.json({ user: { name: user.name, email: user.email, hasPaid: user.hasPaid || true, role: user.role || 'tutor' } });
  });

  // Endpoint for completing OAuth login (called by frontend after popup closes)
  app.post("/api/auth/oauth-login", (req, res) => {
    const { email } = req.body;
    const user = users.get(email);
    
    if (!user) {
      return res.status(404).json({ error: "Bruker ikke funnet" });
    }

    res.json({ user: { name: user.name, email: user.email, hasPaid: user.hasPaid || true, role: user.role || 'tutor' } });
  });

  // --- GOOGLE OAUTH ---
  app.get("/api/auth/google/url", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    try {
      // Exchange code for token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || 'Failed to get token');
      }

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userResponse.json();

      const email = userData.email;
      const name = userData.name;

      // Store user (auto-verified since it's Google)
      if (!users.has(email)) {
        users.set(email, { name, email, password: '', verified: true, hasPaid: false, token: null });
        saveUsers(users);
      } else {
        const u = users.get(email);
        u.verified = true;
        users.set(email, u);
        saveUsers(users);
      }

      // Send success message to popup opener
      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', email: '${email}' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>Logger inn...</p></body></html>
      `);
    } catch (error) {
      console.error("Google OAuth Error:", error);
      res.send(`<html><body><p>Innlogging med Google feilet. Sjekk at API-nøklene er riktige.</p></body></html>`);
    }
  });

  // --- APPLE OAUTH ---
  app.get("/api/auth/apple/url", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/apple/callback`;
    const params = new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      scope: 'name email',
      response_mode: 'form_post'
    });
    res.json({ url: `https://appleid.apple.com/auth/authorize?${params.toString()}` });
  });

  app.post("/api/auth/apple/callback", async (req, res) => {
    const { id_token, user } = req.body;
    
    try {
      if (!id_token) throw new Error("No id_token provided");

      // Decode JWT payload (middle part of the token)
      const payloadBase64 = id_token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      const email = payload.email;
      
      let name = 'Apple Bruker';
      if (user) {
        try {
          const userData = JSON.parse(user);
          name = `${userData.name.firstName} ${userData.name.lastName}`.trim();
        } catch (e) {
          console.error("Failed to parse Apple user data", e);
        }
      }

      if (!users.has(email)) {
        users.set(email, { name, email, password: '', verified: true, hasPaid: false, token: null });
        saveUsers(users);
      } else {
        const u = users.get(email);
        u.verified = true;
        users.set(email, u);
        saveUsers(users);
      }

      res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', email: '${email}' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script><p>Logger inn...</p></body></html>
      `);
    } catch (error) {
      console.error("Apple OAuth Error:", error);
      res.send(`<html><body><p>Innlogging med Apple feilet.</p></body></html>`);
    }
  });

  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const stripe = getStripe();
      
      // Create a PaymentIntent with the order amount and currency
      // For a 14-day trial, we might set up a SetupIntent or a Subscription instead,
      // but for this prototype, we'll authorize a small amount or just create a standard intent.
      // Here we create an intent for 0 NOK (or a minimum amount if required by Stripe)
      // to verify the card, but since Stripe requires >0 for PaymentIntents, 
      // we'll simulate the "0 kr today, 149 kr later" by creating a SetupIntent.
      
      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'],
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke starte betaling" });
    }
  });

  app.post("/api/payment/process", (req, res) => {
    const { email } = req.body;
    const user = users.get(email);
    
    if (!user) {
      return res.status(404).json({ error: "Bruker ikke funnet" });
    }
    
    user.hasPaid = true;
    users.set(email, user);
    saveUsers(users);
    
    res.json({ success: true });
  });

  app.post("/api/payment/vipps-request", async (req, res) => {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: "Mangler invoiceId" });
    }

    try {
      // Fetch invoice from Supabase using admin client to ensure we get the public_token
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('*, profiles!tutor_id(full_name)')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).json({ error: "Faktura ikke funnet" });
      }

      if (!invoice.email) {
        return res.status(400).json({ error: "Faktura mangler e-postadresse" });
      }

      const fromEmail = "TutorFlyt <post@tutorflyt.no>";
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const invoiceUrl = `${appUrl}/invoice/${invoice.public_token}`;
      const teacherName = invoice.profiles?.full_name || 'TutorFlyt';

      if (resend) {
        const data = await resend.emails.send({
          from: fromEmail,
          to: invoice.email,
          subject: `Vipps-krav fra ${teacherName} - TutorFlyt`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #111827;">Betaling for undervisning</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                Lærer <strong>${teacherName}</strong> har fullført timen.
              </p>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; color: #111827;">Vennligst betal <strong>${invoice.amount} kr</strong></p>
              </div>
              <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
                <a href="${invoiceUrl}" style="background-color: #ff5b24; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Gå til betaling</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Takk for at du bruker TutorFlyt!</p>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post." });
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating Vipps request email:");
        console.log(`To: ${invoice.email}`);
        console.log(`Message: Lærer ${teacherName} har fullført timen. Vennligst betal ${invoice.amount} kr.`);
        console.log(`Link: ${invoiceUrl}`);
        console.log("=========================================");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
    }
  });

  app.post("/api/payment/send-invoice", async (req, res) => {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: "Mangler invoiceId" });
    }

    try {
      // Fetch invoice from Supabase using admin client
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('*, profiles!tutor_id(full_name)')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).json({ error: "Faktura ikke funnet" });
      }

      if (!invoice.email) {
        return res.status(400).json({ error: "Faktura mangler e-postadresse" });
      }

      const fromEmail = "TutorFlyt <post@tutorflyt.no>";
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const invoiceUrl = `${appUrl}/invoice/${invoice.public_token}`;
      const teacherName = invoice.profiles?.full_name || 'TutorFlyt';

      if (resend) {
        const data = await resend.emails.send({
          from: fromEmail,
          to: invoice.email,
          subject: "Ny faktura fra din Tutor",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Faktura fra TutorFlyt</h1>
              </div>
              
              <div style="padding: 30px; color: #333; line-height: 1.6;">
                <p style="font-size: 18px;">Hei!</p>
                <p>Du har mottatt en ny faktura for undervisning med <strong>${invoice.student_name}</strong>.</p>
                
                <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 25px 0; border-left: 4px solid #2563eb;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 5px 0; color: #64748b;">Beløp å betale:</td>
                      <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 18px;">${invoice.amount} kr</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #64748b;">Elev:</td>
                      <td style="padding: 5px 0; text-align: right;">${invoice.student_name}</td>
                    </tr>
                  </table>
                </div>

                <p style="margin-top: 25px;"><strong>Slik betaler du:</strong></p>
                <p>Klikk på knappen under for å gå til betalingssiden.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${invoiceUrl}" style="background-color: #ff5b24; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Gå til betaling</a>
                </div>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Dette er en automatisk utsendelse fra TutorFlyt.<br>Takk for at du benytter våre tjenester!</p>
              </div>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post." });
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating invoice email:");
        console.log(`To: ${invoice.email}`);
        console.log(`Subject: Ny faktura fra din Tutor`);
        console.log(`Amount: ${invoice.amount} kr`);
        console.log(`Link: ${invoiceUrl}`);
        console.log("=========================================");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
    }
  });

  app.get("/api/invoices/:publicToken", async (req, res) => {
    const { publicToken } = req.params;

    try {
      const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .select('*, profiles!tutor_id(full_name, phone)')
        .eq('public_token', publicToken)
        .single();

      if (error || !invoice) {
        return res.status(404).json({ error: "Faktura ikke funnet" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "En feil oppstod ved henting av faktura" });
    }
  });

  app.post("/api/payments/:publicToken/create-vipps-payment", async (req, res) => {
    const { publicToken } = req.params;

    try {
      // 1. Fetch invoice using admin client
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('*, profiles!tutor_id(full_name, phone)')
        .eq('public_token', publicToken)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).json({ error: "Faktura ikke funnet" });
      }

      // 2. Simulate Vipps payment creation
      const simulatedVippsUrl = `https://qr.vipps.no/28/2/01/010/${(invoice.tutor_phone || invoice.profiles?.phone || '').replace(/\D/g, '')}?amount=${invoice.amount}00`;
      
      // 3. Save the payment attempt in our database using admin client
      const { error: paymentError } = await supabaseAdmin
        .from('invoice_payments')
        .insert([
          {
            invoice_id: invoice.id,
            payment_provider: 'vipps',
            provider_order_id: `vipps_${Date.now()}_${invoice.id}`,
            status: 'initiated',
            provider_redirect_url: simulatedVippsUrl
          }
        ]);

      if (paymentError) {
        console.error("Error saving payment:", paymentError);
        return res.status(500).json({ error: "Kunne ikke lagre betalingsforsøk" });
      }

      // 4. Return the URL to redirect the user to
      res.json({ redirectUrl: simulatedVippsUrl });
    } catch (error) {
      console.error("Payment creation error:", error);
      res.status(500).json({ error: "En feil oppstod ved opprettelse av betaling" });
    }
  });

  app.post("/api/payments/vipps-webhook", async (req, res) => {
    // In a real scenario, this would be called by Vipps when a payment is completed.
    // We would verify the signature and update the database.
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: "Missing orderId or status" });
    }

    try {
      // 1. Update invoice_payments status
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('invoice_payments')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('provider_order_id', orderId)
        .select()
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // 2. If payment is successful, update invoice status
      if (status === 'captured' || status === 'RESERVE' || status === 'SALE') {
        await supabaseAdmin
          .from('invoices')
          .update({ 
            status: 'Betalt', 
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.invoice_id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/payments/:publicToken/status", async (req, res) => {
    const { publicToken } = req.params;

    try {
      // First get the invoice ID
      const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('public_token', publicToken)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).json({ error: "Faktura ikke funnet" });
      }

      // Then get the latest payment status
      const { data: payment, error } = await supabaseAdmin
        .from('invoice_payments')
        .select('status')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !payment) {
        return res.status(404).json({ error: "Betaling ikke funnet" });
      }

      res.json({ status: payment.status });
    } catch (error) {
      console.error("Payment status error:", error);
      res.status(500).json({ error: "En feil oppstod ved henting av betalingsstatus" });
    }
  });

  app.post("/api/send-report", async (req, res) => {
    const { studentEmail, studentName, topic, reportStatus, masteryLevel, reportComment, homework } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ error: "Mangler mottakerens e-postadresse" });
    }

    const emoji = reportStatus === 'great' ? '😄' : reportStatus === 'good' ? '🙂' : '😐';
    const fromEmail = "TutorFlyt <post@tutorflyt.no>";

    if (resend) {
      try {
        const payload = {
          from: fromEmail,
          to: studentEmail,
          subject: `Ny rapport fra din lærer ${emoji}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4f46e5;">Rapport fra TutorFlyt ${emoji}</h2>
              
              <p>Hei ${studentName || ''}!</p>
              <p>Her er en oppsummering fra dagens time:</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Emne:</strong> ${topic || 'Ikke spesifisert'}</p>
                <p><strong>Mestring:</strong> ${masteryLevel}%</p>
                <p><strong>Lærerens kommentar:</strong><br/> ${reportComment || 'Ingen kommentar.'}</p>
                <p><strong>Lekser:</strong><br/> ${homework || 'Ingen lekser denne gangen.'}</p>
              </div>
              
              <p>Logg inn på portalen for å se mer detaljer.</p>
            </div>
          `
        };
        const data = await resend.emails.send(payload);
        
        if (data.error) {
          console.error("Resend API returned an error:", JSON.stringify(data.error, null, 2));
          console.error("Payload was:", JSON.stringify({ ...payload, html: '[HTML CONTENT]' }, null, 2));
          
          let errorMessage = data.error.message || "Kunne ikke sende e-post.";
          if (data.error.name === 'validation_error') {
            errorMessage = "Valideringsfeil fra Resend. Sjekk at e-postadressen er gyldig. Hvis du bruker gratisversjonen av Resend, kan du kun sende til din egen bekreftede e-postadresse.";
          }
          
          return res.status(400).json({ error: errorMessage });
        }
      } catch (error) {
        console.error("Failed to send email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating report email:");
      console.log(`To: ${studentEmail}`);
      console.log(`Subject: Ny rapport fra din lærer ${emoji}`);
      console.log(`Topic: ${topic}, Mastery: ${masteryLevel}%`);
      console.log("=========================================");
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
