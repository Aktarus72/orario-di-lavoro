import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Trash2, FileText, Plus } from 'lucide-react';

const WorkCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workData, setWorkData] = useState({}); 
  const [selectedDay, setSelectedDay] = useState(null);
  const [monthNotes, setMonthNotes] = useState("");

  const shiftTypes = ["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"];

  // Festività Italiane Fisse
  const italianHolidays = (year) => ({
    [`${year}-01-01`]: "Capodanno",
    [`${year}-01-06`]: "Epifania",
    [`${year}-04-25`]: "Liberazione",
    [`${year}-05-01`]: "Festa del Lavoro",
    [`${year}-06-02`]: "Festa della Repubblica",
    [`${year}-08-15`]: "Ferragosto",
    [`${year}-11-01`]: "Ognissanti",
    [`${year}-12-08`]: "Immacolata",
    [`${year}-12-25`]: "Natale",
    [`${year}-12-26`]: "S. Stefano",
  });

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Funzione per determinare il turno predefinito di un giorno
  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Dom, 6 = Sab
    const holidays = italianHolidays(date.getFullYear());

    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (dayOfWeek === 0) return { type: "Festivo", hours: 0, label: "Domenica" };
    if (dayOfWeek === 6) return { type: "Riposo", hours: 0, label: "Sabato" };
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    const existingData = workData[dateStr] || getDefaultShift(dateStr);
    setSelectedDay({ ...existingData, date: dateStr });
  };

  const saveDay = () => {
    setWorkData({ ...workData, [selectedDay.date]: selectedDay });
    setSelectedDay(null);
  };

  // Calcolo Riepilogo
  const getSummary = () => {
    let summary = { lavoro: 0, ferie: 0, malattia: 0, permessiOre: 0, smart: 0 };
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= days; d++) {
      const dateStr = formatDate(year, month, d);
      const data = workData[dateStr] || getDefaultShift(dateStr);
      
      if (data.type === "Lavoro") summary.lavoro++;
      if (data.type === "Smart Working") summary.smart++;
      if (data.type === "Ferie") summary.ferie++;
      if (data.type === "Malattia") summary.malattia++;
      if (data.hours > 0 && data.type !== "Lavoro") summary.permessiOre += parseFloat(data.hours);
      // Se è un giorno di lavoro ma ha ore di permesso segnate:
      if (data.type === "Lavoro" && data.hours < 8 && data.hours > 0) {
          summary.permessiOre += (8 - data.hours);
      }
    }
    return summary;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];

    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDate(year, month, d);
      const data = workData[dateStr] || getDefaultShift(dateStr);
      const isWeekend = data.type === "Festivo" || data.type === "Riposo";

      days.push(
        <div key={d} onClick={() => handleDayClick(d)} 
             className={`h-24 border border-gray-200 p-1 cursor-pointer hover:bg-blue-50 transition-colors overflow-hidden ${isWeekend ? 'bg-orange-50' : 'bg-white'}`}>
          <div className="flex justify-between items-start">
            <span className={`font-bold ${isWeekend ? 'text-orange-600' : 'text-gray-700'}`}>{d}</span>
            {data.label && <span className="text-[8px] uppercase font-bold text-orange-400">{data.label}</span>}
          </div>
          <div className="text-[10px] mt-1">
            <div className={`rounded px-1 truncate font-semibold ${isWeekend ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
              {data.type} {data.hours > 0 && data.type === "Lavoro" ? `${data.hours}h` : ''}
              {data.type === "Permesso" && `${data.hours}h`}
            </div>
            {data.notes && <div className="italic text-gray-500 truncate">{data.notes}</div>}
          </div>
        </div>
      );
    }
    return days;
  };

  const summary = getSummary();

  return (
    <div className="max-w-6xl mx-auto p-4 bg-gray-100 min-h-screen font-sans text-gray-800">
      <header className="bg-white p-6 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t-4 border-blue-600">
        <div className="flex items-center gap-6">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
          <h1 className="text-2xl font-bold capitalize w-48 text-center">
            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
          </h1>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
        </div>
        <div className="flex gap-4">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center shadow">
                <p className="text-xs uppercase opacity-80">Giorni Lavoro</p>
                <p className="text-xl font-bold">{summary.lavoro + summary.smart}</p>
            </div>
            <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-center shadow">
                <p className="text-xs uppercase opacity-80">Ore Permesso</p>
                <p className="text-xl font-bold">{summary.permessiOre}h</p>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow bg-white p-4 rounded-xl shadow-md">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-2 uppercase text-xs tracking-widest">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {renderCalendar()}
          </div>
        </div>

        <aside className="lg:w-80 flex flex-col gap-4">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Note del Mese</h3>
            <textarea 
              className="w-full border border-gray-200 p-2 rounded-md h-32 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Appunti per questo mese..."
              value={monthNotes}
              onChange={(e) => setMonthNotes(e.target.value)}
            />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-emerald-500">
            <h3 className="font-bold mb-2">Riepilogo Rapido</h3>
            <div className="text-sm space-y-1">
                <p>Ferie: <span className="font-bold text-emerald-600">{summary.ferie} gg</span></p>
                <p>Malattia: <span className="font-bold text-red-600">{summary.malattia} gg</span></p>
                <p>Smart Working: <span className="font-bold text-purple-600">{summary.smart} gg</span></p>
            </div>
            <button className="w-full mt-4 bg-emerald-500 text-white py-2 rounded-lg font-bold hover:bg-emerald-600 transition shadow">
              Vedi Riepilogo Completo
            </button>
            <button onClick={() => setWorkData({})} className="w-full mt-2 text-red-500 text-xs py-2 hover:underline">
              Azzera modifiche manuali
            </button>
          </div>
        </aside>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-t-8 border-blue-600">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Modifica {new Date(selectedDay.date).toLocaleDateString('it-IT')}</h2>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              {shiftTypes.map(type => (
                <button 
                  key={type}
                  onClick={() => setSelectedDay({...selectedDay, type, hours: (type === "Lavoro" ? 8 : 0)})}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${selectedDay.type === type ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                {selectedDay.type === "Permesso" ? "Ore di Permesso" : "Ore di Lavoro"}
              </label>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-10 h-10 bg-white border rounded-full shadow-sm text-xl font-bold">-</button>
                <span className="text-3xl font-black text-blue-600">{selectedDay.hours}h</span>
                <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-10 h-10 bg-white border rounded-full shadow-sm text-xl font-bold">+</button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Note del giorno</label>
              <input 
                type="text" 
                className="w-full border-b-2 border-gray-200 p-2 focus:border-blue-600 outline-none transition-colors" 
                placeholder="Esempio: Consegna progetto..."
                value={selectedDay.notes || ""}
                onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={saveDay} className="flex-grow bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                <Save size={20}/> SALVA
              </button>
              <button onClick={() => setSelectedDay(null)} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
