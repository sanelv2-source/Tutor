import React, { useState, useMemo } from 'react';
import Holidays from 'date-holidays';
import { Download, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';

const hd = new Holidays('NO');

export interface CalendarEvent {
  date: string;
  type: 'deadline' | 'booking';
  title: string;
}

interface MyCalendarProps {
  events: CalendarEvent[];
}

const daysOfWeek = ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"];

const MyCalendar: React.FC<MyCalendarProps> = ({ events }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<any>(null);

  const monthYear = currentDate.toLocaleDateString('no-NO', {
    month: 'long',
    year: 'numeric'
  });

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days: any[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toDateString();

      const dayEvents = events.filter(
        e => new Date(e.date).toDateString() === dateStr
      );

      const holidayInfo = hd.isHoliday(date);

      const holidayArray = Array.isArray(holidayInfo)
        ? holidayInfo
        : holidayInfo
        ? [holidayInfo]
        : [];

      const isHoliday =
        holidayArray.some(h => h.type === 'public') || date.getDay() === 0;

      days.push({
        date: i,
        fullDate: date,
        isHoliday,
        holidayName: holidayArray[0]?.name || null,
        events: dayEvents,
        hasLesson: dayEvents.some(e => e.type === 'booking'),
        hasDeadline: dayEvents.some(e => e.type === 'deadline')
      });
    }

    return days;
  }, [currentDate, events]);

  const changeMonth = (offset: number) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)
    );
  };

  const downloadICS = () => {
    if (events.length === 0) return;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TutorFlyt//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:TutorFlyt Timeplan',
      'X-WR-TIMEZONE:Europe/Oslo'
    ];
    
    events.forEach(event => {
      const date = new Date(event.date);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const start = `${y}${m}${d}`;
      
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      const ey = nextDay.getFullYear();
      const em = String(nextDay.getMonth() + 1).padStart(2, '0');
      const ed = String(nextDay.getDate()).padStart(2, '0');
      const end = `${ey}${em}${ed}`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${event.title.replace(/[^\w]/g, '')}-${start}-${Math.random().toString(36).substr(2, 5)}@tutorflyt.no`);
      icsContent.push(`DTSTAMP:${timestamp}`);
      icsContent.push(`DTSTART;VALUE=DATE:${start}`);
      icsContent.push(`DTEND;VALUE=DATE:${end}`);
      icsContent.push(`SUMMARY:${event.title}`);
      icsContent.push(`DESCRIPTION:${event.type === 'deadline' ? 'Frist for innlevering' : 'Planlagt undervisning'} i TutorFlyt`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('TRANSP:TRANSPARENT');
      icsContent.push('END:VEVENT');
    });
    
    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'tutorflyt_timeplan.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const today = new Date();

  return (
    <div className="calendar-view">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📅</span> Timeplan og frister
          </h2>
          <p className="text-slate-500 text-sm mt-1">Oversikt over dine bookede timer og viktige frister.</p>
        </div>

        <button 
          onClick={downloadICS}
          disabled={events.length === 0}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Last ned (.ics)
        </button>
      </div>

      {/* CALENDAR */}
      <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100">

        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => changeMonth(-1)} 
            className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100 text-slate-600 transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-xl font-bold text-slate-900 capitalize tracking-tight">{monthYear}</h3>

          <button 
            onClick={() => changeMonth(1)} 
            className="p-2.5 hover:bg-slate-50 rounded-xl border border-slate-100 text-slate-600 transition-all active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* WEEKDAYS */}
        <div className="grid grid-cols-7 text-[10px] sm:text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">
          {daysOfWeek.map(d => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        {/* GRID */}
        <div className="month-view-container">
          <div className="month-grid">
            {daysInMonth.map((day, i) => {
              if (!day)
                return <div key={i} className="grid-cell bg-slate-50/30" />;

              const isToday =
                day.fullDate.toDateString() === today.toDateString();

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`grid-cell cursor-pointer group transition-all duration-200 ${day.isHoliday ? 'red-day' : ''} ${isToday ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`text-sm font-bold transition-all ${isToday ? 'bg-indigo-600 text-white px-2 py-0.5 rounded-lg shadow-sm shadow-indigo-200' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                      {day.date}
                    </span>
                    {day.holidayName && (
                      <span className="hidden lg:block text-[8px] text-red-400 font-bold uppercase truncate max-w-[50px]">
                        {day.holidayName}
                      </span>
                    )}
                  </div>

                  <div className="indicators mt-auto">
                    {day.hasLesson && <span className="dot-lesson shadow-sm shadow-indigo-200" />}
                    {day.hasDeadline && <span className="dot-deadline shadow-sm shadow-yellow-100" />}
                    {day.isHoliday && <span className="dot-vacation shadow-sm shadow-red-100" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LEGEND */}
        <div className="calendar-legend mt-8 pt-8 border-t border-slate-50 flex flex-wrap gap-x-8 gap-y-4">
          <div className="legend-item flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm shadow-indigo-100"></span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Booket time</span>
          </div>

          <div className="legend-item flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm shadow-yellow-100"></span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Deadline</span>
          </div>

          <div className="legend-item flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-100"></span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Helligdag</span>
          </div>
        </div>

      </div>

      {/* MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
            
            <div className="bg-indigo-600 p-8 text-white relative">
              <button 
                onClick={() => setSelectedDay(null)} 
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <p className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em] mb-2">
                {selectedDay.fullDate.getFullYear()}
              </p>
              <h3 className="text-2xl font-black capitalize">
                {selectedDay.fullDate.toLocaleDateString('no-NO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </h3>
            </div>

            <div className="p-8 space-y-6">
              {selectedDay.holidayName && (
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <span className="text-xl">🇳🇴</span>
                  <div>
                    <p className="text-red-800 font-bold text-sm">{selectedDay.holidayName}</p>
                    <p className="text-red-600/60 text-[10px] font-bold uppercase tracking-wider">Offentlig helligdag</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {selectedDay.events.length > 0 ? (
                  selectedDay.events.map((e: CalendarEvent, i: number) => (
                    <div key={i} className={`group p-5 rounded-2xl border transition-all hover:shadow-md ${e.type === 'deadline' ? 'bg-yellow-50/50 border-yellow-100 hover:border-yellow-200' : 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-200'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight">
                            {e.title}
                          </p>
                          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wider">
                            {e.type === 'deadline' ? '⚠️ Frist for innlevering' : '📘 Planlagt undervisning'}
                          </p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${e.type === 'deadline' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CalendarIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm italic tracking-wide">Ingen planer denne dagen.</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedDay(null)} 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
              >
                Lukk vindu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCalendar;
