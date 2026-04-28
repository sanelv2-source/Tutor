import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { readApiJson } from '../utils/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutorId: string;
  onSuccess: () => void;
}

interface StudentRow {
  name: string;
  email: string;
  subject?: string;
}

interface ImportResult {
  success: boolean;
  name: string;
  email: string;
  message: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, tutorId, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): StudentRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const rows: StudentRow[] = [];

    // Skip header row if it contains known column names
    let startIndex = 0;
    if (lines[0] && (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email'))) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1];
        const subject = parts[2] || '';

        // Validate email
        if (name && email && email.includes('@')) {
          rows.push({ name, email, subject });
        }
      }
    }

    return rows;
  };

  const generateToken = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  const inviteStudent = async (studentData: StudentRow): Promise<ImportResult> => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      
      if (!admin) {
        return {
          success: false,
          name: studentData.name,
          email: studentData.email,
          message: 'Ingen lærer logget inn'
        };
      }

      const normalizedEmail = studentData.email.trim().toLowerCase();

      // Check if student already exists
      const { data: existingStudent, error: existingStudentError } = await supabase
        .from('students')
        .select('id')
        .eq('tutor_id', admin.id)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingStudentError) {
        throw existingStudentError;
      }

      let studentId: string;

      if (existingStudent) {
        studentId = existingStudent.id;
      } else {
        // Create new student
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert([{
            email: normalizedEmail,
            full_name: studentData.name,
            tutor_id: admin.id,
            status: 'active',
            subject: studentData.subject || '',
            profile_id: null
          }])
          .select()
          .single();

        if (studentError) {
          throw new Error(`Kunne ikke opprette elev: ${studentError.message}`);
        }

        if (!newStudent) {
          throw new Error('Ingen data returnert ved opprettelse av elev');
        }

        studentId = newStudent.id;
      }

      // Check for existing pending invitation
      const { data: existingInvite, error: existingInviteError } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .maybeSingle();

      let token: string;

      if (existingInvite) {
        token = existingInvite.token;
        
        // Update expires_at to give them another 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await supabase
          .from('student_invitations')
          .update({ expires_at: expiresAt.toISOString() })
          .eq('id', existingInvite.id);
      } else {
        // Create new invitation
        token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: inviteError } = await supabase
          .from('student_invitations')
          .insert({
            student_id: studentId,
            tutor_id: admin.id,
            email: normalizedEmail,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString()
          });

        if (inviteError) {
          throw new Error(`Kunne ikke opprette invitasjon: ${inviteError.message}`);
        }
      }

      // Send email via backend
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData.session?.access_token;

      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          email: normalizedEmail,
          tutorName: admin.user_metadata?.full_name || "Læreren din",
          token
        }),
      });

      await readApiJson(response, "Kunne ikke sende e-post");

      return {
        success: true,
        name: studentData.name,
        email: studentData.email,
        message: 'Elev lagt til og invitasjon sendt'
      };
    } catch (error: any) {
      return {
        success: false,
        name: studentData.name,
        email: studentData.email,
        message: error.message || 'En feil oppstod'
      };
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResults([]);
      setShowResults(false);
    } else {
      alert('Vennligst velg en .csv fil');
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Vennligst velg en fil først');
      return;
    }

    setImporting(true);
    setProgress(0);
    setResults([]);

    try {
      const text = await file.text();
      const students = parseCSV(text);

      if (students.length === 0) {
        alert('Ingen gyldige elever funnet i filen. Sjekk formatet.');
        setImporting(false);
        return;
      }

      const importResults: ImportResult[] = [];

      for (let i = 0; i < students.length; i++) {
        const result = await inviteStudent(students[i]);
        importResults.push(result);
        setResults([...importResults]);
        setProgress(Math.round(((i + 1) / students.length) * 100));
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setShowResults(true);
      onSuccess();
    } catch (error: any) {
      alert('Feil ved lesing av fil: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `Navn,E-post,Fag
Ole Nordmann,ole@example.com,Matematikk
Maria Jensen,maria@example.com,Engelsk
Per Andersen,per@example.com,Norsk`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
    element.setAttribute('download', 'student_template.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Masseimport av elever</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {!showResults ? (
            <>
              {/* Upload Section */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">1. Last opp CSV-fil</h4>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Klikk for å velge fil
                  </button>
                  <p className="text-sm text-slate-500 mt-2">eller dra og slipp en .csv fil her</p>
                  {file && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      ✅ {file.name} valgt
                    </p>
                  )}
                </div>
              </div>

              {/* Template Section */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">2. CSV Format</h4>
                <div className="bg-slate-50 p-4 rounded-lg text-sm font-mono text-slate-700 mb-3">
                  <div>Navn,E-post,Fag</div>
                  <div className="text-slate-500">Ole Nordmann,ole@example.com,Matematikk</div>
                  <div className="text-slate-500">Maria Jensen,maria@example.com,Engelsk</div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-indigo-600 font-semibold text-sm hover:underline"
                >
                  📥 Last ned mal-fil
                </button>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Viktig:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Første rad blir ignorert hvis den inneholder "Navn" eller "E-post"</li>
                    <li>"Fag" er valgfritt</li>
                    <li>E-post må være gyldig og unik per lærer</li>
                    <li>Invitasjoner sendes automatisk til alle elever</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Results Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{results.length}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-600 mb-1">Suksess</p>
                    <p className="text-2xl font-bold text-green-600">{successCount}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-red-600 mb-1">Feil</p>
                    <p className="text-2xl font-bold text-red-600">{failureCount}</p>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900">Detaljer:</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg flex items-start gap-3 ${
                          result.success
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="text-sm flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{result.name}</p>
                          <p className="text-xs text-slate-600">{result.email}</p>
                          <p
                            className={`text-xs mt-1 ${
                              result.success ? 'text-green-700' : 'text-red-700'
                            }`}
                          >
                            {result.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Progress Bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">Importerer...</span>
                </div>
                <span className="text-sm text-slate-600">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          {showResults ? (
            <>
              <button
                onClick={() => {
                  setFile(null);
                  setResults([]);
                  setShowResults(false);
                  setProgress(0);
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Importer flere
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Lukk
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importerer...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Start import
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
