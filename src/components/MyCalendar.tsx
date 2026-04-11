import React, { useState } from 'react';

const weekdays = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

const getEasterSunday = (year: number) => {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

const getNorwegianHolidays = (year: number) => {
  const easter = getEasterSunday(year);
  const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  const holidays = [
    { date: new Date(year, 0, 1), name: "1. nyttårsdag" },
    { date: new Date(year, 4, 1), name: "1. mai" },
    { date: new Date(year, 4, 17), name: "17. mai" },
    { date: new Date(year, 11, 25), name: "1. juledag" },
    { date: new Date(year, 11, 26), name: "2. juledag" },
    { date: addDays(easter, -3), name: "Skjærtorsdag" },
    { date: addDays(easter, -2), name: "Langfredag" },
    { date: easter, name: "1. påskedag" },
    { date: addDays(easter, 1), name: "2. påskedag" },
    { date: addDays(easter, 39), name: "Kristi Himmelfartsdag" },
    { date: addDays(easter, 49), name: "1. pinsedag" },
    { date: addDays(easter, 50), name: "2. pinsedag" },
  ];

  return holidays.map(h => {
    const offset = h.date.getTimezoneOffset() * 60000;
    return {
      dateString: new Date(h.date.getTime() - offset).toISOString().split('T')[0],
      name: h.name
    };
  });
};

const getNorwegianHolidayName = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
  const holidays = getNorwegianHolidays(date.getFullYear());
  const holiday = holidays.find(h => h.dateString === dateString);
  if (holiday) return holiday.name;
  if (date.getDay() === 0) return "Søndag";
  return null;
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

const calculateEndTime = (startTime: string, durationMinutes: number) => {
  if (!startTime || !durationMinutes) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + durationMinutes, 0, 0);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getStudentColor = (name: string) => {
  const colors = [
    { bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-700', bgHex: '#eff6ff', borderHex: '#3b82f6' },
    { bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200', textClass: 'text-emerald-700', bgHex: '#ecfdf5', borderHex: '#10b981' },
    { bgClass: 'bg-purple-50', borderClass: 'border-purple-200', textClass: 'text-purple-700', bgHex: '#faf5ff', borderHex: '#a855f7' },
    { bgClass: 'bg-orange-50', borderClass: 'border-orange-200', textClass: 'text-orange-700', bgHex: '#fff7ed', borderHex: '#f97316' },
    { bgClass: 'bg-pink-50', borderClass: 'border-pink-200', textClass: 'text-pink-700', bgHex: '#fdf2f8', borderHex: '#ec4899' },
    { bgClass: 'bg-teal-50', borderClass: 'border-teal-200', textClass: 'text-teal-700', bgHex: '#f0fdfa', borderHex: '#14b8a6' },
    { bgClass: 'bg-rose-50', borderClass: 'border-rose-200', textClass: 'text-rose-700', bgHex: '#fff1f2', borderHex: '#f43f5e' },
    { bgClass: 'bg-indigo-50', borderClass: 'border-indigo-200', textClass: 'text-indigo-700', bgHex: '#eef2ff', borderHex: '#6366f1' }
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const MyCalendar = ({ events }: { events: any[] }) => {
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'week'
  );
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayDetails, setSelectedDayDetails] = useState<string | null>(null);

  const getDaysInMonth = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    let startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth();
    const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
    const monthName = monthNames[currentMonthDate.getMonth()];
    const year = currentMonthDate.getFullYear();

    const handlePrevMonth = () => setCurrentMonthDate(new Date(year, currentMonthDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonthDate(new Date(year, currentMonthDate.getMonth() + 1, 1));

    return (
      <div className="month-view-container">
        <div className="flex justify-between items-center mb-4 px-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 font-bold">
            &lt; Forrige
          </button>
          <h3 className="text-xl font-bold text-slate-900 capitalize">{monthName} {year}</h3>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 font-bold">
            Neste &gt;
          </button>
        </div>
        <div className="month-grid">
          {weekdays.map(day => (
            <div key={`header-${day}`} className="month-grid-header text-center font-bold text-xs text-slate-500 uppercase mb-2">
              {day}
            </div>
          ))}
          
          {daysInMonth.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="grid-cell empty-cell" />;
            }
            
            const holidayName = getNorwegianHolidayName(date);
            const isRedDay = holidayName !== null;
            const offset = date.getTimezoneOffset() * 60000;
            const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
            
            const eventsThisDay = events.filter((e: any) => new Date(e.date).toISOString().split('T')[0] === dateString);
            const isClickable = eventsThisDay.length > 0;

            const uniqueTitles = Array.from(new Set(eventsThisDay.map((e: any) => e.title)));

            return (
              <div 
                key={dateString} 
                className={`grid-cell ${isRedDay ? 'red-day' : ''} ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                onClick={() => isClickable && setSelectedDayDetails(dateString)}
              >
                <div className="flex items-center gap-2">
                  <span className="mobile-weekday text-sm text-slate-500 w-8 text-left">{weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1].substring(0, 3)}</span>
                  <span>{date.getDate()}</span>
                </div>
                {holidayName && holidayName !== "Søndag" && (
                  <span className="text-[9px] leading-tight text-center mt-1 opacity-80 px-1">{holidayName}</span>
                )}
                <div className="indicators mt-auto mb-1">
                  {uniqueTitles.map((title: any, i) => {
                    // Check if this is a vacation event
                    const eventsWithTitle = eventsThisDay.filter((e: any) => e.title === title);
                    const isVacation = eventsWithTitle.some((e: any) => e.type === 'vacation');
                    
                    if (isVacation) {
                      return (
                        <div 
                          key={i} 
                          className="dot-vacation" 
                          title={title} 
                        />
                      );
                    } else {
                      const color = getStudentColor(title);
                      return (
                        <div 
                          key={i} 
                          className="dot-lesson" 
                          style={{ backgroundColor: color.borderHex }}
                          title={title} 
                        />
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900">
          {viewMode === 'list' ? 'Dagens oppgaver' : viewMode === 'week' ? 'Ukeskalender' : 'Månedskalender'}
        </h2>
        <div className="flex bg-slate-100 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          <button 
            className={`flex-1 sm:flex-none px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
          <button 
            className={`flex-1 sm:flex-none px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setViewMode('week')}
          >
            Uke
          </button>
          <button 
            className={`flex-1 sm:flex-none px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setViewMode('month')}
          >
            Måned
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {viewMode === 'list' ? (
          <div className="calendar-view">
            <h3>📅 Dagens og kommende</h3>
            
            {events.length > 0 ? (
              events.map((event, idx) => {
                const color = getStudentColor(event.title);
                return (
                  <div 
                    key={idx} 
                    className="lesson-card"
                    style={{ '--card-bg': color.bgHex, '--card-border': color.borderHex } as React.CSSProperties}
                  >
                    <div className="lesson-info">
                      <span className="lesson-student">{event.title}</span>
                      <span className="lesson-time">
                        🗓️ {new Date(event.date).toLocaleDateString('no-NO')}
                        {event.type === 'lesson' && event.start_time && ` kl. ${formatTime(event.start_time)}`}
                        {event.type === 'deadline' && ' ⚠️ Frist'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p>Ingen oppgaver eller timer planlagt ennå.</p>
              </div>
            )}
          </div>
        ) : viewMode === 'week' ? (
          <div className="weekly-calendar overflow-x-auto">
            {(() => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              
              return Array.from({ length: 7 }).map((_, index) => {
                const date = new Date(today);
                date.setDate(today.getDate() - adjustedDay + index);
                const offset = date.getTimezoneOffset() * 60000;
                const dateString = new Date(date.getTime() - offset).toISOString().split('T')[0];
                const holidayName = getNorwegianHolidayName(date);
                const isRedDay = holidayName !== null;
                
                const dayEvents = events.filter((e: any) => new Date(e.date).toISOString().split('T')[0] === dateString);
                
                return (
                  <div key={index} className={`calendar-day md:min-w-[120px] ${isRedDay ? 'bg-red-50/30' : ''}`}>
                    <span className={`day-name ${isRedDay ? 'text-red-600' : ''}`}>
                      {weekdays[index]} {date.getDate()}/{date.getMonth() + 1}
                    </span>
                    {holidayName && holidayName !== "Søndag" && (
                      <div className="text-[10px] text-red-500 text-center font-medium mb-2">{holidayName}</div>
                    )}
                    <div className="day-content space-y-2 mt-2">
                      {dayEvents.map((event: any, idx: number) => {
                        const color = getStudentColor(event.title);
                        return (
                          <div key={idx} className={`${color.bgClass} p-2 rounded-lg border ${color.borderClass} text-left relative group`}>
                            <p className="text-sm text-slate-800 truncate" title={event.title}>{event.title}</p>
                            {event.type === 'deadline' && <small className="text-red-600 font-bold block mt-1">⚠️ Frist</small>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          renderMonthView()
        )}
      </div>

      {selectedDayDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDayDetails(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {new Date(selectedDayDetails).toLocaleDateString('no-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDayDetails(null)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <div className="space-y-3">
              {events.filter((e: any) => new Date(e.date).toISOString().split('T')[0] === selectedDayDetails).map((event: any, idx: number) => {
                const color = getStudentColor(event.title);
                return (
                  <div key={idx} className={`p-4 rounded-xl border ${color.borderClass} ${color.bgClass}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-bold ${color.textClass}`}>{event.title}</p>
                        {event.type === 'deadline' && <p className="text-sm text-red-600 font-medium mt-1">⚠️ Innleveringsfrist</p>}
                        {event.type === 'lesson' && event.duration_minutes && (
                          <p className={`text-sm opacity-80 ${color.textClass}`}>{event.duration_minutes} min</p>
                        )}
                      </div>
                      {event.type === 'lesson' && event.start_time && (
                        <div className={`font-bold text-lg ${color.textClass}`}>
                          {formatTime(event.start_time)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCalendar;
