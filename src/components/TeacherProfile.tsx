import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, Mail, ShieldCheck, X } from 'lucide-react';

const TeacherProfile = ({ user }: { user: any }) => {
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({ activeStudents: 0, totalInvoices: 0 });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      // Tell aktive elever
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('tutor_id', user.id);

      // Tell sendte fakturaer
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', user.id);

      setStats({
        activeStudents: studentCount || 0,
        totalInvoices: invoiceCount || 0
      });
    };

    if (user) fetchStats();
  }, [user]);

  useEffect(() => {
    async function getProfile() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Vi prøver å hente data, men bruker .maybeSingle() for å unngå feilmeldinger
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            avatar_url: data.avatar_url || '',
            email: user.email
          });
        }
      } catch (err) {
        console.error("Profil-feil:", err);
      } finally {
        // Uansett hva som skjer, stopper vi lastingen etterpå
        setLoading(false);
      }
    }

    getProfile();
    
    // "Sikkerhetsnett": Hvis den fortsatt laster etter 3 sekunder, tving den til å stoppe
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    console.log("Starter tvungen lagring for:", user?.id);

    // Vi lager en lokal "nød-klient" som garantert bruker riktig adresse
    const { createClient } = await import('@supabase/supabase-js');
    const tempSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL, 
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );

    const { error } = await tempSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        updated_at: new Date().toISOString() // Bruker ISO-streng for sikkerhets skyld med Supabase
      });

    if (error) {
      console.error("Feil:", error);
      alert("Kunne ikke lagre: " + error.message);
      setErrorMessage("Kunne ikke lagre: " + error.message);
    } else {
      alert("SUKSESS! Profilen er lagret i den ekte databasen.");
      setErrorMessage(null);
      setIsEditing(false); // Lukk redigeringsmodus ved suksess
    }
    setSaving(false);
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passordene er ikke like", type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "Passordet må være minst 6 tegn", type: 'error' });
      return;
    }

    setSaving(true);
    setPasswordMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ text: "Passordet ble oppdatert!", type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Feil ved oppdatering av passord:", error);
      setPasswordMessage({ text: "Kunne ikke oppdatere passord: " + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const uploadProfileImage = async (eventOrFile: any) => {
    try {
      const file = eventOrFile?.target?.files?.[0] || eventOrFile;
      if (!file) return;

      // 1. Lag et unikt filnavn (bruker-ID + filending)
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`; // Vi legger den rett i 'avatars' mappen

      // 2. Last opp filen til Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true // Dette gjør at hvis du laster opp nytt bilde, overskrives det gamle
        });

      if (uploadError) throw uploadError;

      // 3. Hent den offentlige lenken til bildet
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Oppdater 'profiles'-tabellen i databasen med den nye bilde-lenken
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Oppdater lokalt state så bildet dukker opp med en gang
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      alert("Profilbilde er lagret!");

    } catch (error: any) {
      console.error("Feil ved opplasting:", error);
      alert("Klarte ikke laste opp bilde: " + error.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-slate-600">Kobler til database...</p>
    </div>
  );

  if (isEditing) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-3xl shadow-sm border border-slate-200 mt-10 relative">
        <button 
          onClick={() => setIsEditing(false)}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-slate-900">Rediger Lærerprofil</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Fullt navn</label>
            <input 
              className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={profile.full_name}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
              placeholder="Navn Navnesen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Vipps-nummer</label>
            <input 
              className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              placeholder="8 siffer"
            />
          </div>

          {errorMessage && (
            <div style={{ color: 'white', backgroundColor: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              <strong>Feil oppdaget:</strong> {errorMessage}
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-400 transition-colors mt-4"
          >
            {saving ? 'Lagrer...' : 'Lagre profilinformasjon'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Endre passord</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nytt passord</label>
            <input 
              type="password"
              className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minst 6 tegn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Bekreft nytt passord</label>
            <input 
              type="password"
              className="w-full p-3 border border-slate-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Gjenta nytt passord"
            />
          </div>

          {passwordMessage && (
            <div className={`p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {passwordMessage.text}
            </div>
          )}

          <button 
            onClick={handlePasswordUpdate}
            disabled={saving || !newPassword || !confirmPassword}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 disabled:bg-slate-400 transition-colors mt-4"
          >
            {saving ? 'Oppdaterer...' : 'Oppdater passord'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Venstre side: Profilkort */}
        <div className="w-full md:w-1/3 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4 group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover border-4 border-indigo-50" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                {profile.full_name?.charAt(0) || 'J'}
              </div>
            )}
            
            {/* Skjult input for å velge bilde */}
            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <span className="text-white text-xs font-bold">Endre bilde</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={uploadProfileImage} 
                className="hidden" 
                id="avatar-upload"
              />
            </label>
          </div>
          
          <h2 className="text-xl font-bold text-gray-800">{profile.full_name || 'Navn ikke satt'}</h2>
          <p className="text-indigo-600 font-medium mb-6">Sertifisert Lærer</p>
          
          <div className="w-full space-y-4 border-t pt-6 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail size={18} className="text-gray-400" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Phone size={18} className="text-gray-400" />
              <span>+47 {profile.phone || 'Mangler nummer'}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsEditing(true)}
            className="mt-8 w-full py-3 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95"
          >
            Rediger Profil
          </button>
        </div>

        {/* Høyre side: Oversikt & Status */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Betalingsinformasjon</h3>
            <div className="bg-indigo-50 p-6 rounded-2xl flex justify-between items-center border border-indigo-100">
              <div>
                <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Aktivt Vipps-nummer</p>
                <p className="text-2xl font-mono font-bold text-indigo-900 mt-1">
                  {profile.phone ? profile.phone.replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3') : 'Ikke registrert'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <ShieldCheck className="text-green-500" size={24} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400 italic">
              * Dette nummeret brukes automatisk for generering av Vipps-lenker i dine fakturaer.
            </p>
          </div>

          {/* Enkel status-oversikt */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-sm">Aktive Elever</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activeStudents}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-sm">Sendte Fakturaer</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalInvoices}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherProfile;
