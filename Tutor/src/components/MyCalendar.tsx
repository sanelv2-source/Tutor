import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const MyCalendar = ({ events }: { events: any[] }) => {
  const [date, setDate] = useState(new Date());
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach(event => {
      const dateStr = new Date(event.date).toDateString();
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    });
    return map;
  }, [events]);

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dayEvents = eventsByDate[date.toDateString()] || [];
      return (
        <div className="flex flex-col gap-1 mt-1 w-full overflow-hidden">
          {dayEvents.map((event, index) => (
            <div key={index} className={`text-[8px] p-0.5 rounded shadow-sm text-white truncate ${event.type === 'deadline' ? 'bg-red-500' : 'bg-blue-500'}`}>
              {event.type === 'deadline' ? '⚠️ ' : '⏰ '}{event.title}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <Calendar onChange={setDate as any} value={date} tileContent={tileContent} locale="no-NO" />
    </div>
  );
};

export default MyCalendar;
