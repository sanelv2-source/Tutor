import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const getBearerToken = (value) => String(value ?? '').replace(/^Bearer\s+/i, '').trim();
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const isSchemaCacheColumnError = (error) => /schema cache|Could not find .* column|column .* does not exist/i.test(error?.message || '');

const invoiceSelects = [
  'id, student_id, student_name, amount, due_date, status, method, payment_link, tutor_phone, description, created_at, email, tutor_id',
  'id, student_name, amount, due_date, status, method, payment_link, tutor_phone, description, created_at, email, tutor_id',
  'id, student_name, amount, due_date, status, method, created_at, email, tutor_id',
  'id, student_name, amount, due_date, status, method, created_at, tutor_id',
];

async function runInvoiceQuery(supabaseAdmin, applyFilters) {
  for (const columns of invoiceSelects) {
    const query = applyFilters(supabaseAdmin.from('invoices').select(columns))
      .order('created_at', { ascending: false });
    const { data, error } = await query;

    if (error && isSchemaCacheColumnError(error)) continue;
    if (error) {
      console.error('Student payment request lookup error:', error);
      return [];
    }

    return data || [];
  }

  return [];
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server config mangler.' });
  }

  const authToken = getBearerToken(event.headers.authorization || event.headers.Authorization);
  if (!authToken) {
    return json(401, { error: 'Du må være logget inn for å se betalinger.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !authData.user) {
      return json(401, { error: 'Ugyldig eller utløpt innlogging.' });
    }

    let { data: students, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email, tutor_id, profile_id')
      .eq('profile_id', authData.user.id);

    if (studentError) {
      console.error('Student payment profile lookup error:', studentError);
      return json(500, { error: 'Kunne ikke hente elevprofilen.' });
    }

    if ((!students || students.length === 0) && authData.user.email) {
      const fallbackResult = await supabaseAdmin
        .from('students')
        .select('id, full_name, email, tutor_id, profile_id')
        .eq('email', authData.user.email);
      students = fallbackResult.data || [];
      studentError = fallbackResult.error;

      if (studentError) {
        console.error('Student payment email lookup error:', studentError);
        return json(500, { error: 'Kunne ikke hente elevprofilen.' });
      }
    }

    if (!students || students.length === 0) {
      return json(200, { paymentRequests: [] });
    }

    const invoiceGroups = [];

    for (const student of students) {
      invoiceGroups.push(await runInvoiceQuery(supabaseAdmin, (query) => query.eq('student_id', student.id)));

      if (student.email && student.tutor_id) {
        invoiceGroups.push(await runInvoiceQuery(supabaseAdmin, (query) =>
          query.eq('tutor_id', student.tutor_id).eq('email', normalizeEmail(student.email))
        ));
      }

      if (student.full_name && student.tutor_id) {
        invoiceGroups.push(await runInvoiceQuery(supabaseAdmin, (query) =>
          query.eq('tutor_id', student.tutor_id).eq('student_name', student.full_name)
        ));
      }
    }

    const byId = new Map();
    invoiceGroups.flat().forEach((invoice) => {
      if (invoice?.id) byId.set(invoice.id, invoice);
    });

    const paymentRequests = Array.from(byId.values()).sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );

    const tutorIds = [...new Set(paymentRequests.map((invoice) => invoice.tutor_id).filter(Boolean))];
    if (tutorIds.length > 0) {
      const { data: tutorProfiles, error: tutorProfileError } = await supabaseAdmin
        .from('profiles')
        .select('id, phone')
        .in('id', tutorIds);

      if (!tutorProfileError) {
        const tutorPhoneById = new Map((tutorProfiles || []).map((profile) => [profile.id, profile.phone]));
        paymentRequests.forEach((invoice) => {
          if (!invoice.tutor_phone && invoice.tutor_id) {
            invoice.tutor_phone = tutorPhoneById.get(invoice.tutor_id) || null;
          }
        });
      }
    }

    return json(200, { paymentRequests });
  } catch (error) {
    console.error('Error fetching student payment requests:', error);
    return json(500, { error: 'Kunne ikke hente betalinger.' });
  }
}
