'use client';

import { useState } from 'react';

export default function CalendarioClient() {
  const [view, setView] = useState<'Día' | 'Semana'>('Día');

  // Horas del calendario: 08:00 a 20:00
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  // Added some overlapping events
  const turnos = [
    { id: 1, day: 2, time: '09:00', duration: 0.75, title: 'Juan Pérez', service: 'Corte de pelo', status: 'Confirmado', color: 'border-green-500' },
    { id: 2, day: 2, time: '10:00', duration: 1, title: 'Martín López', service: 'Barba', status: 'Confirmado', color: 'border-green-500' },
    { id: 3, day: 2, time: '10:30', duration: 1, title: 'Sofía García', service: 'Corte + Barba', status: 'Pendiente', color: 'border-yellow-500' },
    { id: 4, day: 2, time: '11:00', duration: 1.25, title: 'Pedro Gómez', service: 'Corte', status: 'Confirmado', color: 'border-green-500' },
    { id: 5, day: 4, time: '14:00', duration: 1, title: 'Lucas Torres', service: 'Perfilado', status: 'Cancelado', color: 'border-red-500' },
  ];

  const daysOfWeek = [
    { name: 'Lun', date: '27' },
    { name: 'Mar', date: '28' },
    { name: 'Mié', date: '29', isToday: true },
    { name: 'Jue', date: '30' },
    { name: 'Vie', date: '01' },
    { name: 'Sáb', date: '02' },
    { name: 'Dom', date: '03' },
  ];

  const calculateEventPositions = (events: typeof turnos) => {
    // Sort by start time, then by duration (longest first)
    const sorted = [...events].sort((a, b) => {
      const aStart = parseTime(a.time);
      const bStart = parseTime(b.time);
      if (aStart === bStart) return b.duration - a.duration;
      return aStart - bStart;
    });

    // Determine overlapping groups
    const columns: (typeof turnos[0])[][] = [];
    
    sorted.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastEvent = columns[i][columns[i].length - 1];
        if (parseTime(lastEvent.time) + lastEvent.duration * 60 <= parseTime(event.time)) {
          columns[i].push(event);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([event]);
    });

    const positionedEvents = [];
    for (let i = 0; i < columns.length; i++) {
      for (const event of columns[i]) {
        positionedEvents.push({
          ...event,
          colIndex: i,
          totalCols: columns.length,
        });
      }
    }
    return positionedEvents;
  };

  const parseTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getStyle = (time: string, duration: number, colIndex: number, totalCols: number) => {
    const startMins = parseTime(time) - 8 * 60; // 08:00 is start
    const top = (startMins / 60) * 100; // 100px per hour
    const height = duration * 100;
    const width = 100 / totalCols;
    const left = colIndex * width;
    
    return { 
      top: `${top}px`, 
      height: `${height - 2}px`, // -2px for visual separation
      left: `${left}%`,
      width: `${width}%`
    }; 
  };

  type PositionedEvent = typeof turnos[0] & { colIndex: number; totalCols: number };

  const renderEvent = (t: PositionedEvent) => {
    const endTotalMinutes = parseTime(t.time) + (t.duration * 60);
    const endH = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
    const endM = (endTotalMinutes % 60).toString().padStart(2, '0');
    const timeRange = `${t.time} - ${endH}:${endM}`;

    return (
      <div 
        key={t.id} 
        className="absolute p-0.5"
        style={getStyle(t.time, t.duration, t.colIndex, t.totalCols)}
      >
        <div className={`w-full h-full rounded-md bg-[#18181A] border border-gray-800/80 border-l-2 ${t.color} p-2 text-xs overflow-hidden shadow-sm hover:bg-[#202023] transition-colors cursor-pointer group`}>
          <div className="font-bold text-gray-100 truncate mb-0.5">{t.title}</div>
          <div className="text-gray-400 truncate text-[11px] mb-1">{t.service}</div>
          <div className="text-gray-500 font-mono text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{timeRange}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-[#1A1A1C] border border-gray-800 text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-800 hover:text-white transition-colors">
            Hoy
          </button>
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1A1A1C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1A1A1C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <span className="text-white font-semibold text-lg">29 de septiembre, 2026</span>
        </div>
        
        <div className="flex items-center bg-[#111113] border border-gray-800 rounded-lg p-1">
          {(['Día', 'Semana'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === v ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      <div className="bg-[#111113] border border-gray-800 rounded-xl flex flex-col shadow-sm">
        
        {/* HEADER */}
        {view === 'Día' ? (
          <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] border-b border-gray-800 bg-[#151517] rounded-t-xl">
            <div className="p-4 border-r border-gray-800"></div>
            <div className="p-4 text-center">
              <span className="text-sm font-semibold text-gray-200">Miércoles 29</span>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden bg-[#151517] border-b border-gray-800 rounded-t-xl">
            <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] min-w-[700px]">
              <div className="p-4 border-r border-gray-800"></div>
              <div className="grid grid-cols-7">
                {daysOfWeek.map((d, i) => (
                  <div key={i} className={`py-3 text-center border-l border-gray-800/50 first:border-l-0 ${d.isToday ? 'bg-white/5' : ''}`}>
                    <div className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-1">{d.name}</div>
                    <div className={`text-xl font-bold ${d.isToday ? 'text-white' : 'text-gray-300'}`}>{d.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="overflow-x-auto relative rounded-b-xl">
          <div className={`grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] relative ${view === 'Semana' ? 'min-w-[700px]' : ''}`}>
            
            {/* Timeline Background (Grid) */}
            <div className="col-start-2 absolute inset-0 pointer-events-none flex flex-col">
              {hours.map(h => (
                <div key={h} className="h-[100px] border-b border-gray-800/40 w-full box-border relative">
                  <div className="absolute top-[50px] w-full border-b border-gray-800/20 border-dashed"></div>
                </div>
              ))}
            </div>

            {/* Time labels */}
            <div className="flex flex-col border-r border-gray-800 z-10 bg-[#111113]">
              {hours.map(h => (
                <div key={h} className="h-[100px] p-2 pr-3 sm:pr-4 text-right text-xs font-mono text-gray-400 relative box-border">
                  <span className="relative -top-2 bg-[#111113] pl-2">{h.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Events Area */}
            {view === 'Día' ? (
              <div className="relative z-10 w-full bg-transparent">
                {calculateEventPositions(turnos.filter(t => t.day === 2)).map(renderEvent)}
              </div>
            ) : (
              <div className="grid grid-cols-7 relative z-10 bg-transparent">
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
                  <div key={dayIndex} className="relative border-l border-gray-800/40 first:border-l-0">
                    {calculateEventPositions(turnos.filter(t => t.day === dayIndex)).map(renderEvent)}
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>
      </div>

    </div>
  );
}
