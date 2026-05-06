import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import crypto from "crypto";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

import { createClient } from "@supabase/supabase-js";
import { deleteAccountForUser } from "./netlify/shared/account-delete-core.mjs";
import {
  getBearerToken as getTermsBearerToken,
  sendStudentTermsEmail,
} from "./netlify/shared/student-terms-core.mjs";
import {
  generateTeacherAssistantContent,
  normalizeTeacherAssistantRequest,
} from "./netlify/shared/teacher-ai-core.mjs";
import {
  getAdminAnalyticsSummary,
  getBearerToken as getAdminBearerToken,
  requireAdminUser,
} from "./netlify/shared/admin-analytics-core.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Apple OAuth POST callback
app.use((req, res, next) => {
  if (req.path === "/admin" || req.path.startsWith("/admin/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

// Initialize Supabase Admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
const supabaseAuth = (supabaseUrl && (supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY))
  ? createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY || "")
  : null;

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Automated Invoice Reminders
async function checkOverdueInvoices() {
  if (!supabaseAdmin) {
    console.warn("Supabase Admin client not initialized. Skipping overdue check.");
    return;
  }

  console.log("Checking for overdue invoices...");
  const now = new Date();
  
  try {
    // Fetch overdue invoices first
    const { data: overdueInvoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', now.toISOString());

    if (invoiceError) {
      console.error("Supabase error fetching invoices in checkOverdueInvoices:", invoiceError);
      throw invoiceError;
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log("No overdue invoices found.");
      return;
    }

    console.log(`Found ${overdueInvoices.length} overdue invoices. Fetching student data...`);

    // Fetch all students for these invoices
    const studentIds = [...new Set(overdueInvoices.map(inv => inv.student_id).filter(Boolean))];
    const { data: students, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email, parent_email')
      .in('id', studentIds);

    if (studentError) {
      console.error("Supabase error fetching students in checkOverdueInvoices:", studentError);
      throw studentError;
    }

    const studentMap = new Map(students?.map(s => [s.id, s]));

    for (const invoice of overdueInvoices) {
      const student = studentMap.get(invoice.student_id);
      const recipientEmail = student?.parent_email || student?.email;
      
      if (!recipientEmail) {
        console.warn(`No email found for student ${student?.full_name || invoice.student_id}. Skipping reminder.`);
        continue;
      }

      console.log(`Sending reminder for invoice ${invoice.id} to ${recipientEmail}...`);
      
      if (!resend) {
        console.warn("Resend not initialized. Skipping email.");
        continue;
      }

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "TutorFlyt <noreply@tutorflyt.no>",
        to: [recipientEmail],
        subject: `Betalingspåminnelse: Faktura for ${student?.full_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ef4444;">Betalingspåminnelse</h2>
            <p>Hei,</p>
            <p>Dette er en vennlig påminnelse om at fakturaen for <strong>${student?.full_name}</strong> har forfalt.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Beløp:</strong> ${invoice.amount} kr</p>
              <p style="margin: 5px 0;"><strong>Forfallsdato:</strong> ${new Date(invoice.due_date).toLocaleDateString('no-NO')}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Forfalt</p>
            </div>
            <p>Vennligst gjennomfør betalingen så snart som mulig. Hvis du allerede har betalt, kan du se bort fra denne e-posten.</p>
            <p>Logg inn på din konto for å se detaljer og betale:</p>
            <a href="${process.env.APP_URL || 'https://tutorflyt.no'}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Gå til TutorFlyt</a>
            <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Vennlig hilsen,<br>TutorFlyt-teamet</p>
          </div>
        `,
      });

      if (emailError) {
        console.error(`Failed to send email for invoice ${invoice.id}:`, emailError);
      } else {
        console.log(`Reminder sent for invoice ${invoice.id}. Email ID: ${emailData?.id}`);
      }
    }
  } catch (err: any) {
    console.error("Error in checkOverdueInvoices:", err?.message || err);
    if (err?.details) console.error("Error details:", err.details);
  }
}

// Run overdue check every hour
setInterval(checkOverdueInvoices, 60 * 60 * 1000);

// Also run it on server start after a short delay
setTimeout(checkOverdueInvoices, 10000);

// API Endpoints for Invoices
app.post("/api/invoices/check", async (req, res) => {
  await checkOverdueInvoices();
  res.json({ message: "Overdue check triggered manually." });
});

app.post("/api/invoices/:id/remind", async (req, res) => {
  const { id } = req.params;
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin not initialized" });

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        students (
          full_name,
          parent_email,
          parent_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) return res.status(404).json({ error: "Invoice not found" });

    const student = invoice.students;
    const recipientEmail = student?.parent_email;

    if (!recipientEmail) return res.status(400).json({ error: "No parent email found" });

    if (!resend) return res.status(500).json({ error: "Resend not initialized" });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "TutorFlyt <noreply@tutorflyt.no>",
      to: [recipientEmail],
      subject: `Betalingspåminnelse: Faktura for ${student?.full_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #ef4444;">Betalingspåminnelse</h2>
          <p>Hei ${student?.parent_name || 'foresatt'},</p>
          <p>Dette er en vennlig påminnelse om at fakturaen for <strong>${student?.full_name}</strong> har forfalt.</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Beløp:</strong> ${invoice.amount} kr</p>
            <p style="margin: 5px 0;"><strong>Forfallsdato:</strong> ${new Date(invoice.due_date).toLocaleDateString('no-NO')}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Forfalt</p>
          </div>
          <p>Vennligst gjennomfør betalingen så snart som mulig. Hvis du allerede har betalt, kan du se bort fra denne e-posten.</p>
          <p>Logg inn på din konto for å se detaljer og betale:</p>
          <a href="${process.env.APP_URL || 'https://tutorflyt.no'}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Gå til TutorFlyt</a>
          <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280;">Vennlig hilsen,<br>TutorFlyt-teamet</p>
        </div>
      `,
    });

    if (emailError) throw emailError;

    await supabaseAdmin
      .from('invoices')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ message: "Reminder sent successfully", emailId: emailData?.id });
  } catch (err) {
    console.error("Error sending manual reminder:", err);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

app.get("/api/invoices/:publicToken", async (req, res) => {
  const { publicToken } = req.params;
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin not initialized" });

  try {
    const fetchInvoice = (columns: string) => supabaseAdmin
      .from('invoices')
      .select(columns)
      .eq('public_token', publicToken)
      .maybeSingle();

    let invoice: any = null;
    let invoiceError: any = null;
    const invoiceResult = await fetchInvoice(
      'id, public_token, tutor_id, student_name, amount, due_date, status, method, tutor_phone, payment_link, description, created_at'
    );
    invoice = invoiceResult.data;
    invoiceError = invoiceResult.error;

    if (invoiceError && /schema cache|Could not find .* column|column .* does not exist/i.test(invoiceError.message || '')) {
      const fallbackInvoiceResult = await fetchInvoice(
        'id, public_token, tutor_id, student_name, amount, due_date, status, method, created_at'
      );
      invoice = fallbackInvoiceResult.data;
      invoiceError = fallbackInvoiceResult.error;
    }

    if (invoiceError) throw invoiceError;
    if (!invoice) return res.status(404).json({ error: "Fakturaen finnes ikke" });

    const { data: tutor, error: tutorError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', invoice.tutor_id)
      .maybeSingle();

    if (tutorError) throw tutorError;

    res.json({
      ...invoice,
      profiles: tutor || null,
    });
  } catch (err) {
    console.error("Error fetching public invoice:", err);
    res.status(500).json({ error: "Kunne ikke hente fakturaen" });
  }
});

// Initialize Stripe lazily
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is missing. Please add it in the "Settings" menu (bottom left) to enable payments.');
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clipText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getBearerToken(value: unknown) {
  return String(value ?? "").replace(/^Bearer\s+/i, "").trim();
}

function getAppOrigin(req: any) {
  const configuredUrl = process.env.APP_URL || "";
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const origin = req.get("origin") || "";
  if (origin) return origin.replace(/\/$/, "");

  const host = req.get("host") || "";
  return host ? `${req.protocol}://${host}` : `http://localhost:${PORT}`;
}

function getReportStatusLabel(status: unknown) {
  if (status === "great") return "Veldig bra";
  if (status === "good") return "Bra";
  if (status === "needs_focus") return "Trenger fokus";
  return "Ikke vurdert";
}

async function startServer() {
  // API routes
  app.post("/api/account/delete", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase server config mangler." });
    }

    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å slette kontoen." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const result = await deleteAccountForUser(supabaseAdmin, authData.user);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Account deletion error:", error);
      return res.status(500).json({ error: error.message || "Kunne ikke slette kontoen." });
    }
  });

  app.post("/api/auth/password-reset", async (req, res) => {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: "E-postadresse er påkrevd." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Oppgi en gyldig e-postadresse." });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase server config mangler." });
    }

    if (!resend) {
      return res.status(500).json({ error: "E-posttjenesten er ikke konfigurert." });
    }

    const origin = getAppOrigin(req);
    const resetPageUrl = `${origin}/reset-password`;

    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: resetPageUrl,
        },
      });

      if (error) {
        console.error("Supabase recovery link error:", error);
        if (/not found|user.*not.*found|no user/i.test(error.message || "")) {
          return res.json({ success: true });
        }
        return res.status(502).json({ error: "Kunne ikke lage tilbakestillingslenke." });
      }

      const tokenHash = data?.properties?.hashed_token;
      const resetUrl = tokenHash
        ? `${resetPageUrl}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
        : data?.properties?.action_link;

      if (!resetUrl) {
        return res.status(502).json({ error: "Kunne ikke lage tilbakestillingslenke." });
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";
      const replyTo = process.env.SUPPORT_EMAIL || "info@tutorflyt.no";
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: email,
        replyTo,
        subject: "Tilbakestill passordet ditt i TutorFlyt",
        text: [
          "Hei!",
          "",
          "Vi mottok en forespørsel om å tilbakestille passordet ditt i TutorFlyt.",
          "Åpne lenken under for å lage et nytt passord:",
          resetUrl,
          "",
          "Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten.",
          "",
          "Hilsen TutorFlyt",
        ].join("\n"),
        html: `
          <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;">
            <div style="margin:0 auto;padding:40px 32px;background:#fff;border-radius:12px;max-width:600px;border:1px solid #e2e8f0;text-align:center;color:#0f172a;">
              <h1 style="font-size:24px;margin:0 0 20px;">Tilbakestill passordet ditt</h1>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px;">
                Vi mottok en forespørsel om å lage et nytt passord for TutorFlyt-kontoen din.
              </p>
              <div style="margin:32px 0;text-align:center;">
                <a href="${escapeHtml(resetUrl)}" style="background:#0f766e;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;">
                  Lag nytt passord
                </a>
              </div>
              <p style="color:#64748b;font-size:14px;line-height:22px;margin:0;">
                Hvis du ikke ba om dette, kan du trygt ignorere denne e-posten.
              </p>
            </div>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend password reset error:", emailError);
        return res.status(502).json({ error: "Kunne ikke sende tilbakestillingslenke." });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Kunne ikke sende tilbakestillingslenke." });
    }
  });

  app.post("/api/student/terms/send", async (req, res) => {
    try {
      const result = await sendStudentTermsEmail({
        supabaseAdmin,
        resend,
        authToken: getTermsBearerToken(req.headers.authorization),
        payload: req.body || {},
        fromEmail: process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>",
      });

      return res.status(result.statusCode).json(result.body);
    } catch (error) {
      console.error("Error sending student terms:", error);
      return res.status(500).json({ error: "Kunne ikke sende vilkår." });
    }
  });

  app.post("/api/contact", async (req, res) => {
    const name = clipText(req.body.name, 120);
    const email = normalizeEmail(req.body.email);
    const message = clipText(req.body.message, 4000);
    const pageUrl = clipText(req.body.pageUrl || req.get("origin") || "", 1000);
    const userAgent = clipText(req.get("user-agent") || "", 1000);

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Navn, e-post og melding er påkrevd." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Oppgi en gyldig e-postadresse." });
    }

    if (!resend) {
      return res.status(500).json({ error: "E-posttjenesten er ikke konfigurert." });
    }

    const contactEmail = process.env.CONTACT_EMAIL || process.env.SUPPORT_EMAIL || "info@tutorflyt.no";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";
    const subject = `Ny kontaktmelding fra ${name}`;

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: contactEmail,
        replyTo: email,
        subject,
        text: [
          "Ny kontaktmelding fra tutorflyt.no",
          "",
          `Navn: ${name}`,
          `E-post: ${email}`,
          pageUrl ? `Side: ${pageUrl}` : "",
          "",
          message,
        ].filter(Boolean).join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
            <h2 style="margin-bottom: 8px;">Ny kontaktmelding</h2>
            <p style="margin-top: 0; color: #64748b;">Sendt fra kontaktsiden på tutorflyt.no.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
              <p><strong>Navn:</strong> ${escapeHtml(name)}</p>
              <p><strong>E-post:</strong> ${escapeHtml(email)}</p>
              <p><strong>Side:</strong> ${escapeHtml(pageUrl || "Ikke oppgitt")}</p>
            </div>
            <h3 style="margin-bottom: 8px;">Melding</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">User agent: ${escapeHtml(userAgent || "Ikke oppgitt")}</p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend API returned an error for contact message:", error);
        return res.status(502).json({ error: "Kunne ikke sende meldingen." });
      }

      res.json({ success: true, emailId: data?.id });
    } catch (error) {
      console.error("Error sending contact message:", error);
      res.status(500).json({ error: "Kunne ikke sende meldingen." });
    }
  });

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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

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
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post. Sjekk at e-postadressen er tillatt i Resend." });
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

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
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post." });
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

  app.post("/api/send-report", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å sende rapport." });
    }

    const studentId = clipText(req.body.studentId, 80);
    const studentEmail = normalizeEmail(req.body.studentEmail);
    const studentName = clipText(req.body.studentName || "eleven", 120);
    const topic = clipText(req.body.topic || "Dagens time", 160);
    const reportStatus = clipText(req.body.reportStatus, 40);
    const masteryLevel = Number(req.body.masteryLevel);
    const reportComment = clipText(req.body.reportComment || "Ingen kommentar.", 4000);
    const homework = clipText(req.body.homework || "Ingen lekser denne gangen.", 2000);

    if (!studentId || !studentEmail) {
      return res.status(400).json({ error: "Mangler elev eller e-postadresse." });
    }

    if (!resend) {
      return res.status(500).json({ error: "E-posttjenesten er ikke konfigurert." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const { data: student, error: studentError } = await supabaseAdmin
        .from("students")
        .select("id, tutor_id, email, full_name")
        .eq("id", studentId)
        .maybeSingle();

      if (studentError) {
        console.error("Report student lookup error:", studentError);
        return res.status(500).json({ error: "Kunne ikke hente eleven." });
      }

      if (!student || student.tutor_id !== authData.user.id) {
        return res.status(403).json({ error: "Du kan bare sende rapporter for egne elever." });
      }

      const allowedEmails = [student.email].filter(Boolean).map(normalizeEmail);
      if (!allowedEmails.includes(studentEmail)) {
        return res.status(400).json({ error: "E-postadressen matcher ikke eleven." });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", authData.user.id)
        .maybeSingle();

      const tutorName = clipText(profile?.full_name || authData.user.user_metadata?.full_name || "Læreren din", 120);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";
      const masteryText = Number.isFinite(masteryLevel) ? `${Math.max(0, Math.min(100, masteryLevel))}%` : "Ikke vurdert";

      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: studentEmail,
        subject: `Ny progresjonsrapport fra ${tutorName}`,
        html: `
          <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;color:#0f172a;">
            <div style="margin:0 auto;padding:32px;background:#fff;border-radius:12px;max-width:640px;border:1px solid #e2e8f0;">
              <h1 style="font-size:24px;margin:0 0 12px;">Ny progresjonsrapport</h1>
              <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 24px;">
                Hei ${escapeHtml(student.full_name || studentName)}, her er en oppsummering fra ${escapeHtml(tutorName)}.
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:0 0 24px;">
                <p><strong>Emne:</strong> ${escapeHtml(topic)}</p>
                <p><strong>Dagens innsats:</strong> ${escapeHtml(getReportStatusLabel(reportStatus))}</p>
                <p><strong>Mestring:</strong> ${escapeHtml(masteryText)}</p>
                <p><strong>Kommentar:</strong><br>${escapeHtml(reportComment).replace(/\n/g, "<br>")}</p>
                <p><strong>Lekser:</strong><br>${escapeHtml(homework).replace(/\n/g, "<br>")}</p>
              </div>
              <p style="color:#64748b;font-size:14px;line-height:22px;margin:0;">Vennlig hilsen<br>TutorFlyt</p>
            </div>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend report error:", emailError);
        return res.status(502).json({ error: emailError.message || "Kunne ikke sende e-post via Resend." });
      }

      res.json({ success: true, emailSent: true });
    } catch (error) {
      console.error("Error sending report:", error);
      res.status(500).json({ error: "Kunne ikke sende rapport." });
    }
  });

  app.post("/api/invitations/validate", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const token = clipText(req.body.token, 200);
    if (!token) {
      return res.status(400).json({ error: "Mangler invitasjonstoken." });
    }

    try {
      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("student_invitations")
        .select("id, student_id, tutor_id, email, status, expires_at, accepted_at")
        .eq("token", token)
        .maybeSingle();

      if (invitationError) {
        console.error("Invitation validation lookup error:", invitationError);
        return res.status(500).json({ error: "Kunne ikke hente invitasjonen." });
      }

      if (!invitation) {
        return res.status(404).json({ error: "Fant ikke invitasjonen." });
      }

      if (invitation.status !== "pending") {
        return res.status(410).json({ error: "Invitasjonen er ikke lenger aktiv." });
      }

      if (new Date(invitation.expires_at) <= new Date()) {
        return res.status(410).json({ error: "Invitasjonen er utløpt." });
      }

      const { data: tutor } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", invitation.tutor_id)
        .maybeSingle();

      res.json({
        invitation: {
          id: invitation.id,
          student_id: invitation.student_id,
          email: invitation.email,
          status: invitation.status,
          expires_at: invitation.expires_at,
          tutor: tutor || null,
        },
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ error: "Kunne ikke validere invitasjonen." });
    }
  });

  app.post("/api/students/existing/check", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å sjekke elever." });
    }

    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: "E-postadresse er påkrevd." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("email", email)
        .eq("role", "student")
        .maybeSingle();

      if (profileError) {
        console.error("Existing student profile lookup error:", profileError);
        return res.status(500).json({ error: "Kunne ikke sjekke om eleven finnes." });
      }

      const { data: linkedStudents, error: linkedStudentError } = await supabaseAdmin
        .from("students")
        .select("id, full_name, email, subject, profile_id")
        .eq("tutor_id", authData.user.id)
        .or(`email.eq.${email}${profile?.id ? `,profile_id.eq.${profile.id}` : ""}`)
        .limit(1);

      if (linkedStudentError) {
        console.error("Existing linked student lookup error:", linkedStudentError);
        return res.status(500).json({ error: "Kunne ikke sjekke lærerens elevliste." });
      }

      const linkedStudent = linkedStudents?.[0] || null;

      res.json({
        exists: !!profile,
        alreadyLinked: !!linkedStudent,
        profile: profile
          ? {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
            }
          : null,
        student: linkedStudent || null,
      });
    } catch (error) {
      console.error("Error checking existing student:", error);
      res.status(500).json({ error: "Kunne ikke sjekke om eleven finnes." });
    }
  });

  app.post("/api/students/existing/link", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å invitere eksisterende elev." });
    }

    const email = normalizeEmail(req.body.email);
    const studentName = clipText(req.body.studentName, 120);
    const subject = clipText(req.body.subject, 120);

    if (!email) {
      return res.status(400).json({ error: "E-postadresse er påkrevd." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("email", email)
        .eq("role", "student")
        .maybeSingle();

      if (profileError) {
        console.error("Existing student profile lookup error:", profileError);
        return res.status(500).json({ error: "Kunne ikke hente eksisterende elev." });
      }

      if (!profile) {
        return res.status(404).json({ error: "Fant ingen eksisterende elevbruker med denne e-posten." });
      }

      const { data: existingStudents, error: existingStudentError } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("tutor_id", authData.user.id)
        .or(`email.eq.${email},profile_id.eq.${profile.id}`)
        .limit(1);

      if (existingStudentError) {
        console.error("Existing tutor student lookup error:", existingStudentError);
        return res.status(500).json({ error: "Kunne ikke sjekke om eleven allerede er lagt til." });
      }

      const existingStudent = existingStudents?.[0] || null;

      const payload = {
        email,
        full_name: studentName || profile.full_name || email.split("@")[0],
        subject: subject || "Fag: Ikke oppgitt",
        tutor_id: authData.user.id,
        status: "active",
        profile_id: profile.id,
      };

      let student;

      if (existingStudent) {
        const { data, error } = await supabaseAdmin
          .from("students")
          .update(payload)
          .eq("id", existingStudent.id)
          .select()
          .single();

        if (error) {
          console.error("Existing student update error:", error);
          return res.status(500).json({ error: "Kunne ikke oppdatere eleven." });
        }

        student = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("students")
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error("Existing student link insert error:", error);
          return res.status(500).json({ error: "Kunne ikke legge til eksisterende elev." });
        }

        student = data;
      }

      const { data: tutorProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .maybeSingle();

      const tutorName = tutorProfile?.full_name || authData.user.user_metadata?.full_name || "Læreren din";

      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: profile.id,
          type: "student_linked",
          title: "Du er lagt til hos en lærer",
          body: `${tutorName} har lagt deg til som elev i TutorFlyt.`,
          message: `${tutorName} har lagt deg til som elev i TutorFlyt.`,
          link: "/student/dashboard",
          is_read: false,
        });

      res.json({ success: true, student, profile });
    } catch (error) {
      console.error("Error linking existing student:", error);
      res.status(500).json({ error: "Kunne ikke invitere eksisterende elev." });
    }
  });

  app.post("/api/invitations/send-email", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å sende invitasjon." });
    }

    const email = normalizeEmail(req.body.email);
    const inviteToken = clipText(req.body.token, 200);

    if (!email || !inviteToken) {
      return res.status(400).json({ error: "Mangler e-post eller invitasjonstoken." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("student_invitations")
        .select("id, email, tutor_id, status, expires_at")
        .eq("token", inviteToken)
        .maybeSingle();

      if (invitationError) {
        console.error("Invitation lookup error:", invitationError);
        return res.status(500).json({ error: "Kunne ikke hente invitasjonen." });
      }

      if (!invitation) {
        return res.status(404).json({ error: "Fant ikke invitasjonen." });
      }

      if (invitation.tutor_id !== authData.user.id) {
        return res.status(403).json({ error: "Du kan bare sende egne invitasjoner." });
      }

      if (normalizeEmail(invitation.email) !== email) {
        return res.status(400).json({ error: "E-post matcher ikke invitasjonen." });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitasjonen er ikke lenger aktiv." });
      }

      if (new Date(invitation.expires_at) <= new Date()) {
        return res.status(410).json({ error: "Invitasjonen er utløpt." });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", authData.user.id)
        .maybeSingle();

      const tutorName = clipText(
        profile?.full_name || authData.user.user_metadata?.full_name || req.body.tutorName || "Læreren din",
        120,
      );
      const inviteUrl = `${getAppOrigin(req)}/student/accept-invite?token=${encodeURIComponent(inviteToken)}`;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

      if (resend) {
        const { error: emailError } = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Invitasjon til TutorFlyt",
          html: `
            <div style="background-color:#f8fafc;font-family:Arial,sans-serif;padding:40px 20px;">
              <div style="margin:0 auto;padding:40px 32px;background:#fff;border-radius:12px;max-width:600px;border:1px solid #e2e8f0;text-align:center;">
                <h1 style="color:#0f172a;font-size:24px;margin:0 0 20px;">Du er invitert til TutorFlyt</h1>
                <p style="color:#475569;font-size:16px;line-height:26px;margin:0 0 20px;">
                  <strong>${escapeHtml(tutorName)}</strong> har invitert deg til TutorFlyt.
                </p>
                <div style="margin:32px 0;text-align:center;">
                  <a href="${escapeHtml(inviteUrl)}" style="background:#4f46e5;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;">
                    Aksepter invitasjon
                  </a>
                </div>
                <p style="color:#94a3b8;font-size:14px;line-height:22px;margin:24px 0 0;">
                  Lenken er gyldig i 7 dager.
                </p>
              </div>
            </div>
          `,
        });

        if (emailError) {
          console.error("Resend invitation error:", emailError);
          return res.status(502).json({ error: emailError.message || "Kunne ikke sende invitasjon." });
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating student invitation email:");
        console.log(`To: ${email}`);
        console.log(`Invite Link: ${inviteUrl}`);
        console.log("=========================================");
      }

      res.json({ success: true, emailSent: !!resend });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ error: "Kunne ikke sende invitasjon." });
    }
  });

  app.post("/api/send-invite", async (req, res) => {
    const { email, tutorId } = req.body;

    if (!email || !tutorId) {
      return res.status(400).json({ error: "Mangler e-post eller tutorId" });
    }

    // In a real app, we would look up the tutor's name based on the tutorId
    const tutorName = "Læreren din"; 
    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";
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
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post." });
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

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
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post. Sjekk at e-postadressen er tillatt i Resend (gratisplan krever at du sender til din egen e-post)." });
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
        hasPaid: foundUser.hasPaid || false,
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

    res.json({ user: { name: user.name, email: user.email, hasPaid: user.hasPaid || false, role: user.role || 'tutor' } });
  });

  // Endpoint for completing OAuth login (called by frontend after popup closes)
  app.post("/api/auth/oauth-login", (req, res) => {
    const { email } = req.body;
    const user = users.get(email);
    
    if (!user) {
      return res.status(404).json({ error: "Bruker ikke funnet" });
    }

    res.json({ user: { name: user.name, email: user.email, hasPaid: user.hasPaid || false, role: user.role || 'tutor' } });
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

  app.post("/api/payment/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      const { email } = req.body;
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: "price_1TIpSSCyYLDNgabqNIs1oIbJ", // DIN PRICE ID
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/success`,
        cancel_url: `${appUrl}/cancel`,
        subscription_data: {
          trial_period_days: 14,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke opprette betalingsøkt" });
    }
  });

  // Alias for shorter path as requested by user
  app.post("/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      const { email } = req.body;
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: [
          {
            price: "price_1TIpSSCyYLDNgabqNIs1oIbJ", // DIN PRICE ID
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/success`,
        cancel_url: `${appUrl}/cancel`,
        subscription_data: {
          trial_period_days: 14,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Kunne ikke opprette betalingsøkt" });
    }
  });

  app.post("/api/payment/process", async (req, res) => {
    const { email } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    try {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (fetchError || !profile) {
        return res.status(404).json({ error: "Profil ikke funnet" });
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: "Kunne ikke oppdatere betalingsstatus" });
    }
  });

  app.post("/api/payment/vipps-request", async (req, res) => {
    const { teacherName, amount, phone, parentEmail } = req.body;

    if (!teacherName || !amount || !phone || !parentEmail) {
      return res.status(400).json({ error: "Mangler nødvendig informasjon" });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromEmail,
          to: parentEmail,
          subject: `Vipps-krav fra ${teacherName} - TutorFlyt`,
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #111827;">Betaling for undervisning</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                Lærer <strong>${teacherName}</strong> har fullført timen.
              </p>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; color: #111827;">Vennligst Vipps <strong>${amount} kr</strong> til:</p>
                <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #ff5b24;">${phone}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Takk for at du bruker TutorFlyt!</p>
            </div>
          `,
        });
        
        if (data.error) {
          console.error("Resend API returned an error:", data.error);
          return res.status(400).json({ error: data.error.message || "Kunne ikke sende e-post." });
        }
      } catch (error) {
        console.error("Failed to send email:", error);
        return res.status(500).json({ error: "En feil oppstod ved sending av e-post." });
      }
    } else {
      console.log("=========================================");
      console.log("RESEND_API_KEY not set. Simulating Vipps request email:");
      console.log(`To: ${parentEmail}`);
      console.log(`Message: Lærer ${teacherName} har fullført timen. Vennligst Vipps ${amount} til ${phone}.`);
      console.log("=========================================");
    }

    res.json({ success: true });
  });

  app.post("/api/payment/send-vipps-request", async (req, res) => {
    const authToken = getBearerToken(req.headers.authorization);
    if (!authToken) {
      return res.status(401).json({ error: "Du må være logget inn for å sende betalingskrav." });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const invoiceId = clipText(req.body.invoiceId, 80);
    const studentId = clipText(req.body.studentId, 80);
    const recipientEmail = normalizeEmail(req.body.recipientEmail);
    const paymentPageUrl = clipText(req.body.paymentPageUrl, 1000);

    if (!invoiceId || !recipientEmail) {
      return res.status(400).json({ error: "Mangler faktura eller mottaker." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const fetchInvoiceForEmail = (columns: string) => supabaseAdmin
        .from("invoices")
        .select(columns)
        .eq("id", invoiceId)
        .maybeSingle();

      let invoice: any = null;
      let invoiceError: any = null;
      const invoiceResult = await fetchInvoiceForEmail("id, tutor_id, student_name, amount, due_date, description, public_token");
      invoice = invoiceResult.data;
      invoiceError = invoiceResult.error;

      if (invoiceError && /schema cache|Could not find .* column|column .* does not exist/i.test(invoiceError.message || "")) {
        const fallbackInvoiceResult = await fetchInvoiceForEmail("id, tutor_id, student_name, amount, due_date, public_token");
        invoice = fallbackInvoiceResult.data;
        invoiceError = fallbackInvoiceResult.error;
      }

      if (invoiceError) throw invoiceError;
      if (!invoice) return res.status(404).json({ error: "Fant ikke betalingskravet." });
      if (invoice.tutor_id !== authData.user.id) {
        return res.status(403).json({ error: "Du kan bare sende dine egne betalingskrav." });
      }

      const { data: tutorProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", authData.user.id)
        .maybeSingle();

      const teacherName = tutorProfile?.full_name || authData.user.user_metadata?.full_name || "Læreren din";
      const tutorPhone = clipText(tutorProfile?.phone, 80);
      if (!tutorPhone || /ikke oppgitt|mangler nummer/i.test(tutorPhone)) {
        return res.status(400).json({ error: "Læreren mangler mobilnummer på profilen." });
      }

      const amount = Number(invoice.amount || 0).toLocaleString("no-NO");
      const description = invoice.description || `Undervisning - ${invoice.student_name || "elev"}`;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

      if (resend) {
        const data = await resend.emails.send({
          from: fromEmail,
          to: recipientEmail,
          subject: `Betalingskrav fra ${teacherName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #0f172a; padding: 24px;">
              <h1 style="font-size: 24px; margin: 0 0 12px;">Betaling for undervisning</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #475569;">${escapeHtml(teacherName)} har sendt deg et betalingskrav.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0;">
                <p style="margin: 0 0 8px;"><strong>Elev:</strong> ${escapeHtml(invoice.student_name || "Ikke oppgitt")}</p>
                <p style="margin: 0 0 8px;"><strong>Gjelder:</strong> ${escapeHtml(description)}</p>
                <p style="margin: 0 0 8px;"><strong>Beløp:</strong> ${escapeHtml(amount)} kr</p>
                <p style="margin: 0;"><strong>Vipps til:</strong> <span style="font-size: 20px; font-weight: 800; color: #ff5b24;">${escapeHtml(tutorPhone)}</span></p>
              </div>
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 16px; margin: 22px 0;">
                <p style="margin: 0 0 8px; color: #9a3412; font-weight: 700;">Åpne Vipps og send beløpet til lærerens mobilnummer.</p>
                <p style="margin: 0; color: #9a3412;">Bruk gjerne meldingen: ${escapeHtml(description)}</p>
              </div>
              ${paymentPageUrl ? `<p style="font-size: 14px; line-height: 1.6; color: #64748b;">Du kan også se betalingskravet her: <a href="${escapeHtml(paymentPageUrl)}">${escapeHtml(paymentPageUrl)}</a></p>` : ""}
              <p style="font-size: 12px; color: #94a3b8; margin-top: 28px;">Betalingen skjer direkte i Vipps. Tutorflyt lagrer status og historikk.</p>
            </div>
          `,
        });

        if (data.error) {
          console.error("Resend API returned an error for Vipps link:", data.error);
          return res.status(502).json({ error: data.error.message || "Kunne ikke sende e-post." });
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating Vipps payment request email:");
        console.log(`To: ${recipientEmail}`);
        console.log(`Subject: Betalingskrav fra ${teacherName}`);
        console.log(`Vipps to: ${tutorPhone}`);
        console.log(`Amount: ${amount} kr`);
        console.log("=========================================");
      }

      const updatePayload = {
        status: "request_sent",
        request_sent_at: new Date().toISOString(),
        email: recipientEmail,
        tutor_phone: tutorPhone,
        payment_link: null,
      };

      let { error: updateError } = await supabaseAdmin
        .from("invoices")
        .update(updatePayload)
        .eq("id", invoiceId);

      if (updateError && /schema cache|Could not find .* column|column .* does not exist/i.test(updateError.message || "")) {
        ({ error: updateError } = await supabaseAdmin
          .from("invoices")
          .update({ status: "request_sent", email: recipientEmail, tutor_phone: tutorPhone })
          .eq("id", invoiceId));
      }

      if (updateError && /schema cache|Could not find .* column|column .* does not exist/i.test(updateError.message || "")) {
        ({ error: updateError } = await supabaseAdmin
          .from("invoices")
          .update({ status: "request_sent", email: recipientEmail })
          .eq("id", invoiceId));
      }

      if (updateError) throw updateError;

      try {
        let student: any = null;

        if (studentId) {
          const { data: studentById } = await supabaseAdmin
            .from("students")
            .select("id, profile_id, full_name, email, tutor_id")
            .eq("id", studentId)
            .eq("tutor_id", authData.user.id)
            .maybeSingle();
          student = studentById;
        }

        if (!student) {
          const { data: possibleStudents } = await supabaseAdmin
            .from("students")
            .select("id, profile_id, full_name, email, tutor_id")
            .eq("tutor_id", authData.user.id);

          const normalizedStudentName = String(invoice.student_name || "").trim().toLowerCase();
          student = (possibleStudents || []).find((candidate: any) =>
            normalizeEmail(candidate.email) === recipientEmail ||
            String(candidate.full_name || "").trim().toLowerCase() === normalizedStudentName
          );
        }

        if (student?.profile_id) {
          const notificationBody = `${teacherName} har sendt deg et betalingskrav på ${amount} kr.`;
          const notificationPayload = {
            user_id: student.profile_id,
            type: "payment",
            title: "Nytt betalingskrav",
            body: notificationBody,
            message: notificationBody,
            link: "/student/dashboard?tab=payments",
            is_read: false,
          };

          let { error: notificationError } = await supabaseAdmin
            .from("notifications")
            .insert([notificationPayload]);

          if (notificationError && /message|body|column/i.test(notificationError.message || "")) {
            ({ error: notificationError } = await supabaseAdmin
              .from("notifications")
              .insert([{
                user_id: student.profile_id,
                type: "payment",
                title: "Nytt betalingskrav",
                body: notificationBody,
                link: "/student/dashboard?tab=payments",
                is_read: false,
              }]));
          }

          if (notificationError && /message|body|column/i.test(notificationError.message || "")) {
            ({ error: notificationError } = await supabaseAdmin
              .from("notifications")
              .insert([{
                user_id: student.profile_id,
                type: "payment",
                title: "Nytt betalingskrav",
                message: notificationBody,
                link: "/student/dashboard?tab=payments",
                is_read: false,
              }]));
          }

          if (notificationError) {
            console.warn("Could not create payment notification:", notificationError.message);
          }
        }
      } catch (notificationError) {
        console.warn("Payment notification failed:", notificationError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending Vipps payment request:", error);
      res.status(500).json({ error: "Kunne ikke sende betalingskravet." });
    }
  });

  app.post("/api/support-feedback", async (req, res) => {
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({ error: "Du må være logget inn for å sende supportmelding." });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Admin not initialized" });
    }

    const category = clipText(req.body.category || "other", 80);
    const subject = clipText(req.body.subject, 140);
    const message = clipText(req.body.message, 4000);
    const pageUrl = clipText(req.body.pageUrl, 1000);
    const userAgent = clipText(req.body.userAgent, 1000);
    const requestedRole = clipText(req.body.role, 30);

    if (!subject || !message) {
      return res.status(400).json({ error: "Tittel og beskrivelse er påkrevd." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      const senderName = profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email || "Ukjent bruker";
      const senderEmail = profile?.email || authData.user.email || null;
      const role = profile?.role || requestedRole || "unknown";

      const { data: feedback, error: feedbackError } = await supabaseAdmin
        .from("support_feedback")
        .insert({
          user_id: authData.user.id,
          user_role: role,
          user_name: senderName,
          user_email: senderEmail,
          category,
          subject,
          message,
          page_url: pageUrl || null,
          user_agent: userAgent || null,
          status: "new",
        })
        .select("id")
        .single();

      if (feedbackError) {
        console.error("Support feedback insert error:", feedbackError);
        return res.status(500).json({ error: "Kunne ikke lagre supportmeldingen." });
      }

      const supportEmail = process.env.SUPPORT_EMAIL || "info@tutorflyt.no";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "TutorFlyt <onboarding@resend.dev>";

      if (resend) {
        const data = await resend.emails.send({
          from: fromEmail,
          to: supportEmail,
          subject: `Support: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
              <h2 style="margin-bottom: 8px;">Ny supportmelding</h2>
              <p style="margin-top: 0; color: #64748b;">Sak ID: ${escapeHtml(feedback.id)}</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
                <p><strong>Fra:</strong> ${escapeHtml(senderName)}</p>
                <p><strong>E-post:</strong> ${escapeHtml(senderEmail || "Ikke oppgitt")}</p>
                <p><strong>Rolle:</strong> ${escapeHtml(role)}</p>
                <p><strong>Kategori:</strong> ${escapeHtml(category)}</p>
                <p><strong>Side:</strong> ${escapeHtml(pageUrl || "Ikke oppgitt")}</p>
              </div>
              <h3 style="margin-bottom: 8px;">${escapeHtml(subject)}</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">User agent: ${escapeHtml(userAgent || "Ikke oppgitt")}</p>
            </div>
          `,
        });

        if (data.error) {
          console.error("Resend API returned an error for support feedback:", data.error);
          return res.status(502).json({ error: "Meldingen ble lagret, men e-post til support feilet." });
        }
      } else {
        console.log("=========================================");
        console.log("RESEND_API_KEY not set. Simulating support feedback email:");
        console.log(`To: ${supportEmail}`);
        console.log(`From user: ${senderName} <${senderEmail || "unknown"}>`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        console.log("=========================================");
      }

      res.json({ success: true, id: feedback.id });
    } catch (error) {
      console.error("Error handling support feedback:", error);
      res.status(500).json({ error: "Kunne ikke sende supportmeldingen." });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase server config mangler." });
    }

    const token = getAdminBearerToken(req.headers.authorization);

    try {
      await requireAdminUser(supabaseAdmin, token);
      const summary = await getAdminAnalyticsSummary(supabaseAdmin);
      res.json(summary);
    } catch (error: any) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Admin analytics error:", error);
      }
      res.status(statusCode).json({ error: error?.message || "Kunne ikke hente admin-data." });
    }
  });

  app.post("/api/ai/teacher-assistant", async (req, res) => {
    if (process.env.AI_ASSISTANT_ENABLED !== "true") {
      return res.status(403).json({ error: "AI-assistenten er ikke tilgjengelig på dette abonnementet ennå." });
    }

    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res.status(401).json({ error: "Du må være logget inn for å bruke AI-assistenten." });
    }

    if (!supabaseAuth) {
      return res.status(500).json({ error: "Supabase server config mangler." });
    }

    try {
      const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
      if (authError || !authData.user) {
        return res.status(401).json({ error: "Ugyldig eller utløpt innlogging." });
      }

      const request = normalizeTeacherAssistantRequest({
        ...req.body,
        teacherName: req.body.teacherName || authData.user.user_metadata?.name || authData.user.email?.split("@")[0] || "Lærer",
      });
      const content = await generateTeacherAssistantContent(request);

      res.json({ content });
    } catch (error: any) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Teacher AI error:", error);
      }
      res.status(statusCode).json({ error: error?.message || "Kunne ikke generere AI-utkast." });
    }
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
