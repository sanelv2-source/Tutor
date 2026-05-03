import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const TASKS = {
  lesson_plan: {
    label: 'Lag undervisningsplan',
    instruction: [
      'Lag en praktisk undervisningsplan.',
      'Ta med læringsmål, tidsfordeling, startaktivitet, hovedaktivitet, elevaktivitet, vurdering underveis, avslutning og forslag til videre arbeid.',
      'Gjør planen konkret nok til at læreren kan bruke den direkte i timen.',
    ].join(' '),
  },
  exercises: {
    label: 'Lag øvingsoppgaver',
    instruction: [
      'Lag øvingsoppgaver med stigende vanskelighetsgrad.',
      'Ta med korte instruksjoner, oppgaver, fasit eller løsningshint og en ekstra utfordring til slutt.',
      'Tilpass oppgavene til nivået og emnet læreren oppgir.',
    ].join(' '),
  },
  summary: {
    label: 'Skriv timeoppsummering',
    instruction: [
      'Skriv en ryddig timeoppsummering som kan sendes til elev eller foresatt.',
      'Ta med hva dere jobbet med, hva eleven fikk til, hva eleven bør øve mer på, og eventuell lekse eller neste steg.',
      'Hold tonen varm, konkret og profesjonell.',
    ].join(' '),
  },
  message: {
    label: 'Skriv melding til elev',
    instruction: [
      'Skriv en kort, sendbar melding til elev eller foresatt.',
      'Meldingen skal være vennlig, tydelig og konkret.',
      'Ikke skriv lange forklaringer, og ikke lat som meldingen allerede er sendt.',
    ].join(' '),
  },
};

const clipText = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);

const createError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

export function normalizeTeacherAssistantRequest(body = {}) {
  const task = clipText(body.task, 40);

  if (!TASKS[task]) {
    throw createError('Velg en gyldig AI-oppgave.');
  }

  const normalized = {
    task,
    taskLabel: TASKS[task].label,
    taskInstruction: TASKS[task].instruction,
    studentName: clipText(body.studentName || 'Elev', 120) || 'Elev',
    subject: clipText(body.subject, 160),
    level: clipText(body.level, 120),
    duration: clipText(body.duration, 80),
    tone: clipText(body.tone || 'Vennlig og profesjonell', 80),
    details: clipText(body.details, 4000),
    teacherName: clipText(body.teacherName, 120),
  };

  if (!normalized.subject && !normalized.details) {
    throw createError('Skriv inn fag, emne eller litt kontekst først.');
  }

  return normalized;
}

export async function generateTeacherAssistantContent(request) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    throw createError('AI er ikke konfigurert. Legg inn GOOGLE_API_KEY eller GEMINI_API_KEY på serveren.', 500);
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    temperature: 0.35,
    maxOutputTokens: 1800,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      [
        'Du er TutorFlyt sin AI-lærerassistent for privatlærere.',
        'Svar alltid på norsk bokmål.',
        'Vær pedagogisk, konkret og effektiv.',
        'Ikke finn på elevdata, karakterer eller avtaler som ikke er oppgitt.',
        'Ikke inkluder sensitive helseopplysninger eller diagnoser.',
        'Ikke si at du er en AI, og ikke legg inn metakommentarer.',
        '{taskInstruction}',
      ].join(' '),
    ],
    [
      'human',
      [
        'Oppgave: {taskLabel}',
        'Lærer: {teacherName}',
        'Elev: {studentName}',
        'Fag eller emne: {subject}',
        'Nivå eller klassetrinn: {level}',
        'Varighet eller ramme: {duration}',
        'Tone: {tone}',
        'Kontekst fra lærer:',
        '{details}',
        '',
        'Skriv et ferdig utkast som læreren kan bruke direkte. Bruk korte overskrifter og punktlister når det gjør teksten enklere å lese.',
      ].join('\n'),
    ],
  ]);

  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  const content = await chain.invoke({
    ...request,
    teacherName: request.teacherName || 'Lærer',
    subject: request.subject || 'Ikke oppgitt',
    level: request.level || 'Ikke oppgitt',
    duration: request.duration || 'Ikke oppgitt',
    details: request.details || 'Ingen ekstra kontekst oppgitt.',
  });

  return clipText(content, 12000);
}
