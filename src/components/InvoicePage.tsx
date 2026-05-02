import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import Logo from './Logo';

export const InvoicePage = () => {
  const { publicToken } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!publicToken) return;
      
      try {
        const res = await fetch(`/api/invoices/${publicToken}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Fant ikke fakturaen');
        }

        setInvoice(data);
        if (data.profiles) {
          setTutor(data.profiles);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [publicToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Ugyldig lenke</h2>
          <p className="text-slate-600">{error || 'Fakturaen finnes ikke lenger.'}</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status?.toLowerCase() === 'betalt' || invoice.status?.toLowerCase() === 'paid';
  const vippsLink = invoice.payment_link || '';
  const paymentMessage = invoice.description || `Undervisning - ${invoice.student_name}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Logo iconSize="w-8 h-8 text-base" textSize="text-2xl" />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Faktura for undervisning</h1>
          <p className="text-slate-500 mt-2">Fra {tutor?.full_name || 'TutorFlyt'}</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Elev</span>
            <span className="font-medium text-slate-900">{invoice.student_name}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Forfallsdato</span>
            <span className="font-medium text-slate-900">
              {new Date(invoice.due_date).toLocaleDateString('no-NB')}
            </span>
          </div>
          <div className="flex justify-between gap-4 py-3 border-b border-slate-100">
            <span className="text-slate-500">Gjelder</span>
            <span className="font-medium text-slate-900 text-right">{paymentMessage}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-slate-100">
            <span className="text-slate-500">Status</span>
            <span className={`font-medium ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isPaid ? 'Betalt' : 'Venter på betaling'}
            </span>
          </div>
          <div className="flex justify-between py-4 bg-slate-50 px-4 rounded-lg mt-4">
            <span className="text-slate-700 font-medium">Å betale</span>
            <span className="text-2xl font-bold text-slate-900">{invoice.amount} kr</span>
          </div>
        </div>

        {isPaid ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Fakturaen er betalt
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                if (vippsLink) {
                  window.location.href = vippsLink;
                }
              }}
              disabled={!vippsLink}
              className="w-full bg-[#ff5b24] hover:bg-[#e04d1c] text-white font-bold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone className="h-5 w-5" />
              Betal med Vipps
            </button>
            {!vippsLink && (
              <p className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-500">
                Betalingslenken mangler. Be læreren sende betalingskravet på nytt.
              </p>
            )}
          </div>
        )}
      </div>
      
      <p className="text-slate-400 text-sm mt-8 text-center max-w-sm">
        Betalingen skjer direkte via Vipps-lenken fra læreren. Tutorflyt viser status og historikk.
      </p>
    </div>
  );
};
