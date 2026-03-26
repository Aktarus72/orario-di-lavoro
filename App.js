import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Trash2, FileText, Plus } from 'lucide-react';

const WorkCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workData, setWorkData] = useState({}); // Chiave: YYYY-MM-DD
  const [selectedDay, setSelectedDay] = useState(null);
  const [monthNotes, setMonthNotes] = useState("");
  
  // Opzioni Turni Predefiniti
  const shiftTypes = ["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"];

  // Funzioni di utilità per il calendario
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Normalizza Lunedì come 0
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDay(workData[dateStr] || { date: dateStr, type: "", hours: 0, notes: "" });
  };

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const saveDay = () => {
    setWorkData({ ...workData, [selectedDay.date]: selectedDay });
    setSelectedDay(null);
  };

  const resetMonth = () => {
    if(confirm("Vuoi davvero azzerare tutto il mese corrente?")) {
      const newData = { ...workData };
      const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      Object.keys(newData).forEach(key => {
        if(key.startsWith(prefix)) delete newData[key];
      });
      setWorkData(newData);
    }
  };

  // Calcolo Ore Totali (Esempio: 8h per giorno lavorativo meno i permessi)
  const calculateTotalHours = () => {
    let total = 0;
    const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    Object.keys(workData).forEach(key => {
      if(key.startsWith(prefix)) {
        const d = workData[key];
        if(d.type === "Lavoro" || d.type === "Smart Working") total += 8;
        total -= (parseFloat(d.hours) || 0);
      }
    });
    return total;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDate(year, month, d);
      const data = workData[dateStr];
      days.push(
        <div key={d} onClick={() => handleDayClick(d)} className="h-24 border border-gray-200 p-1 cursor-pointer hover:bg-blue-50 transition-colors overflow-hidden">
          <span className="font-bold text-gray-700">{d}</span>
          {data && (
            <div className="text-[10px] mt-1">
              <div className="bg-blue-100 text-blue-800 rounded px-1 truncate font-semibold">
                {data.type} {data.hours > 0 && `-${data.hours}h`}
              </div>
              {data.notes && <div className="italic text-gray-500 truncate">{data.notes}</div>}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-gray-100 min-h-screen font-sans">
      {/* HEADER */}
      <header className="bg-white p-6 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
          <h1 className="text-2xl font-bold capitalize">
            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
          </h1>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
        </div>
        <div className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xl font-bold shadow">
          Ore Totali: {calculateTotalHours()}h
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* CORPO: CALENDARIO */}
        <div className="flex-grow bg-white p-4 rounded-xl shadow-md">
          <div className="grid grid-cols-7 text-center font-bold text-gray-500 mb-2">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {renderCalendar()}
          </div>
        </div>

        {/* SIDEBAR / COMANDI MOBILE SOTTO */}
        <aside className="lg:w-80 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="font-bold mb-4 flex items-center gap-2"><FileText size={18}/> Note del Mese</h3>
            <textarea 
              className="w-full border p-2 rounded-md h-32 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Inserisci note per questo mese..."
              value={monthNotes}
              onChange={(e) => setMonthNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={resetMonth} className="flex items-center justify-center gap-2 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition shadow">
              <Trash2 size={18}/> Azzera Mese
            </button>
            <button className="flex items-center justify-center gap-2 bg-emerald-500 text-white p-3 rounded-lg hover:bg-emerald-600 transition shadow">
              <FileText size={18}/> Riepilogo Mese
            </button>
          </div>
        </aside>
      </div>

      {/* MODALE GESTIONE GIORNO */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Gestisci Giorno: {selectedDay.date}</h2>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {shiftTypes.map(type => (
                <button 
                  key={type}
                  onClick={() => setSelectedDay({...selectedDay, type})}
                  className={`p-2 rounded-md border text-sm transition ${selectedDay.type === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                >
                  {type}
                </button>
              ))}
              <button className="p-2 rounded-md border border-dashed border-gray-400 text-sm flex items-center justify-center gap-1">
                <Plus size={14}/> Altro
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Ore Permesso:</label>
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="p-2 bg-gray-200 rounded">-</button>
                <span className="text-lg font-bold w-12 text-center">{selectedDay.hours}h</span>
                <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="p-2 bg-gray-200 rounded">+</button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-1">Note del giorno:</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded-md" 
                value={selectedDay.notes}
                onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={saveDay} className="flex-grow bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={18}/> SALVA
              </button>
              <button onClick={() => setSelectedDay(null)} className="px-6 py-3 bg-gray-200 rounded-xl font-bold">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
