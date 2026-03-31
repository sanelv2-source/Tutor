import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import Holidays from 'date-holidays';

const hd = new Holidays('NO'); // Initialiser norske helligdager

interface CalendarEvent {
  date: string;
  type: 'deadline' | 'booking';
  title: string;
}

interface MyCalendarProps {
  events: CalendarEvent[];
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const MyCalendar: React.FC<MyCalendarProps> = ({ events }) => {
  const [date, setDate] = useState<Value>(new Date());

  // Grupperer hendelser per dato for rask ytelse
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const dateStr = new Date(event.date).toDateString();
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    });
    return map;
  }, [events]);

  // Gir CSS-klasse til søndager og helligdager (Røde dager)
  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const isSunday = date.getDay() === 0;
      const holiday = hd.isHoliday(date);
      
      // Sjekker om det er en offentlig helligdag
      const isPublicHoliday = Array.isArray(holiday) 
        ? holiday.some((h: any) => h.type === 'public')
        : holiday && (holiday as any).type === 'public';

      if (isSunday || isPublicHoliday) {
        return 'norsk-rod-dag'; 
      }
    }
    return null;
  };

  // Rendrer innholdet inni hver dato-rute
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateStr = date.toDateString();
      const dayEvents = eventsByDate[dateStr] || [];
      const holidayInfo = hd.isHoliday(date);
      
      let holiday: any = null;
      if (Array.isArray(holidayInfo)) {
        holiday = holidayInfo.find((h: any) => h.type === 'public');
      } else if (holidayInfo && (holidayInfo as any).type === 'public') {
        holiday = holidayInfo;
      }

      return (
        <div className="flex flex-col gap-1 mt-1 w-full overflow-hidden">
          {/* Viser navnet på helligdagen hvis den finnes */}
          {holiday && (
            <span className="text-[7px] text-red-500 font-bold truncate px-1">
              {holiday.name}
            </span>
          )}
          
          {/* Viser lærers hendelser (deadlines/bookinger) */}
          {dayEvents.map((event, index) => (
            <div
              key={index}
              className={`text-[8px] p-0.5 rounded shadow-sm text-white truncate ${
                event.type === 'deadline' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              title={event.title}
            >
              {event.type === 'deadline' ? '⚠️ ' : '⏰ '}
              {event.title}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span>📅</span> Timeplan og frister
      </h2>
      
      <div className="custom-calendar">
        <Calendar 
          onChange={(val) => setDate(val)} 
          value={date} 
          tileContent={tileContent}
          tileClassName={getTileClassName}
          locale="nb-NO"          // Setter språket til norsk bokmål
          calendarType="iso8601"  // Tvinger mandag som ukesstart (norsk standard)
        />
      </div>

      {/* Forklaring (Legend) */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm border-t pt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span>Booket time</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span>Deadline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold text-xs uppercase">Rød tekst</span>
          <span>Helligdag / Søndag</span>
        </div>
      </div>

      <style>{`
        /* Beholder din eksisterende styling og legger til norsk tilpasning */
        .react-calendar {
          width: 100% !important;
          border: none !important;
          font-family: inherit !important;
        }

        /* Gjør dato-nummeret rødt på helligdager og søndager */
        .norsk-rod-dag abbr {
          color: #ef4444 !important; 
          font-weight: 700;
        }

        .react-calendar__tile {
          min-height: 80px !important;
          height: auto !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 8px 4px !important;
          border-radius: 8px;
          transition: background 0.2s;
        }

        @media (min-width: 640px) {
          .react-calendar__tile {
            min-height: 110px !important;
          }
        }

        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
        }

        /* Sikrer at hvit tekst beholdes når en rød dag er valgt (aktiv) */
        .react-calendar__tile--active.norsk-rod-dag abbr {
          color: white !important;
        }

        .react-calendar__tile--now {
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
        }

        .react-calendar__navigation button {
          font-weight: bold;
          text-transform: capitalize;
        }

        .react-calendar__navigation button:enabled:hover {
          background-color: #f3f4f6;
          border-radius: 8px;
        }

        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db !important;
        }

        /* Gjør ukedag-overskriftene (Man, Tir...) nøytrale */
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
          font-weight: 600;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default MyCalendar;
