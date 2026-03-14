import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

// Norske helligdager 2026
const holidays: Record<string, string> = {
  "2026-01-01": "Første nyttårsdag",
  "2026-03-29": "Palmesøndag",
  "2026-04-02": "Skjærtorsdag",
  "2026-04-03": "Langfredag",
  "2026-04-05": "1. påskedag",
  "2026-04-06": "2. påskedag",
  "2026-05-01": "Arbeidernes dag",
  "2026-05-14": "Kristi Himmelfartsdag",
  "2026-05-17": "Grunnlovsdag",
  "2026-05-24": "1. pinsedag",
  "2026-05-25": "2. pinsedag",
  "2026-12-25": "Første juledag",
  "2026-12-26": "Andre juledag"
};

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dates: string[], time?: string) => void;
  title: string;
  mode: 'faste_tider' | 'ferie';
}

export default function CalendarModal({ isOpen, onClose, onSave, title, mode }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // Start in March 2026
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [time, setTime] = useState('14:00');

  if (!isOpen) return null;

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Make Monday 0, Sunday 6
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleSave = () => {
    onSave(selectedDates, mode === 'faste_tider' ? time : undefined);
    setSelectedDates([]);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = selectedDates.includes(dateStr);
    const holidayName = holidays[dateStr];
    const isSunday = new Date(year, month, d).getDay() === 0;
    const isRedDay = holidayName || isSunday;

    days.push(
      <button
        key={d}
        onClick={() => toggleDate(dateStr)}
        title={holidayName || ''}
        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors relative
          ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100'}
          ${!isSelected && isRedDay ? 'text-red-600' : ''}
          ${!isSelected && !isRedDay ? 'text-slate-700' : ''}
        `}
      >
        {d}
        {holidayName && !isSelected && (
          <span className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full"></span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h4 className="font-bold text-slate-900 text-lg">
              {monthNames[month]} {year}
            </h4>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(day => (
              <div key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {days}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Norsk rød dag / Helligdag
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Valgt dato
            </div>
          </div>

          {mode === 'faste_tider' && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Klokkeslett for valgte dager
              </label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button 
            onClick={handleSave}
            disabled={selectedDates.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Lagre ({selectedDates.length} dager)
          </button>
        </div>
      </div>
    </div>
  );
}
