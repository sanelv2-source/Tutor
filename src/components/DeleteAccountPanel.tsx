import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { clearAccountSession, deleteCurrentAccount } from '../utils/accountDeletion';

interface DeleteAccountPanelProps {
  redirectTo?: string;
}

const DeleteAccountPanel: React.FC<DeleteAccountPanelProps> = ({ redirectTo = '/' }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(null);

  const handleDeleteAccount = async () => {
    if (confirmText.trim().toUpperCase() !== 'SLETT') {
      setMessage({ text: 'Skriv SLETT for å bekrefte permanent sletting.', type: 'error' });
      return;
    }

    setIsDeleting(true);
    setMessage({ text: 'Sletter kontoen...', type: 'info' });

    try {
      await deleteCurrentAccount();
      await clearAccountSession();
      window.location.replace(redirectTo);
    } catch (error: any) {
      setMessage({ text: error.message || 'Kunne ikke slette kontoen.', type: 'error' });
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setIsConfirming(false);
    setConfirmText('');
    setMessage(null);
  };

  return (
    <div className="bg-white border border-red-100 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-red-50 p-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900">Slett konto</h3>
          <p className="mt-1 text-sm text-slate-600">
            Dette sletter brukeren din permanent fra Supabase, inkludert innlogging og tilknyttet kontodata.
          </p>
        </div>
      </div>

      {!isConfirming ? (
        <button
          onClick={() => setIsConfirming(true)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Slett konto
        </button>
      ) : (
        <div className="mt-5 space-y-4 border-t border-red-100 pt-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Skriv SLETT for å bekrefte</label>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={isDeleting}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100"
              placeholder="SLETT"
            />
          </div>

          {message && (
            <div className={`rounded-lg p-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={cancelDelete}
              disabled={isDeleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
            >
              <X className="h-4 w-4" />
              Avbryt
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:bg-slate-400 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Sletter...' : 'Slett permanent'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountPanel;
