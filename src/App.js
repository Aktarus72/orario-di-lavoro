import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Trash2, FileText, Plus, X } from 'lucide-react';

const WorkCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workData, setWorkData] = useState({}); 
  const [selectedDay, setSelectedDay] = useState(null);
  const [monthNotes, setMonthNotes] = useState("");
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [shiftTypes, setShiftTypes] = useState(["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"]);

  // Mappa dei colori per tipo di turno (Tailwind Classes)
  const shiftColors = {
    "Lavoro": "bg-blue-100 text-blue-800 border-l-4 border-blue-600",
    "Ferie": "bg-emerald-100 text-emerald-900 border-l-4 border-emerald-600",
    "Malattia": "bg-red-100 text-red-900 border-l-4 border-red-600",
    "Riposo": "bg-orange-100 text-orange-900 border-l-4 border-orange-500",
    "Festivo": "bg-orange-100 text-orange-900 border-l-4 border-orange-500",
    "Smart Working": "bg-purple-100 text-purple-900 border-l-4 border-purple-600",
    "Permesso": "bg-amber-100 text-amber-900 border-l-4 border-amber-500",
    "default": "bg-gray-100 text-gray-800 border-l-4 border-gray-400"
  };

  const italianHolidays = (year) => ({
    [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione",
    [`${year}-05-01`]: "Festa del Lavoro", [`${year}-06-02`]: "Festa della Repubblica", [`${year}-08-15`]: "Ferragosto",
    [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", [`${year}-12-26`]: "S. Stefano",
  });

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Dom, 6 = Sab
    const holidays = italianHolidays(date.getFullYear());

    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (dayOfWeek === 0) return { type: "Festivo", hours: 0, label: "Domenica" };
    if (dayOfWeek === 6) return { type: "Riposo", hours: 8, label: "Sabato" }; // Sabato Riposo ma 8h per default
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const getShiftStyle = (type) => shiftColors[type] || shiftColors["default"];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    const existingData = workData[dateStr] || getDefaultShift(dateStr);
    setSelectedDay({ ...existingData, date: dateStr });
  };

  const handleShiftTypeSelect = (type) => {
    let hours = 0;
    if (["Lavoro", "Ferie", "Malattia", "Riposo", "Smart Working"].includes(type)) {
      hours = 8;
    } else if (type === "Permesso") {
      hours = 1; // Permesso parte da 1 ora
    }
    setSelectedDay({...selectedDay, type, hours});
  };

  const saveDay = () => {
    setWorkData({ ...workData, [selectedDay.date]: selectedDay });
    setSelectedDay(null);
  };

  const addCustomShiftType = () => {
    if (newTypeName && !shiftTypes.includes(newTypeName)) {
      setShiftTypes([...shiftTypes, newTypeName]);
      setNewTypeName("");
      setShowAddType(false);
    }
  };

  // Calcolo Riepilogo
  const getSummary = () => {
    let summary = { lavoro: 0, ferie: 0, malattia: 0, permessiOre: 0, smart: 0, riposo: 0 };
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
      if (data.type === "Riposo") summary.riposo++;
      if (data.type === "Permesso") summary.permessiOre += parseFloat(data.hours || 0);
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

    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50 border border-gray-100"></div>);

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDate(year, month, d);
      const data = workData[dateStr] || getDefaultShift(dateStr);
      const style = getShiftStyle(data.type);
      const isWeekend = data.type === "Festivo" || data.type === "Riposo";

      days.push(
        <div key={d} onClick={() => handleDayClick(d)} 
             className={`h-28 border border-gray-200 p-1 cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden bg-white`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`font-bold ${isWeekend ? 'text-orange-600' : 'text-gray-700'}`}>{d}</span>
            {data.label && <span className="text-[8px] uppercase font-bold text-orange-400 bg-orange-100 px-1 rounded">{data.label}</span>}
          </div>
          <div className={`text-[11px] rounded p-1 h-[65px] flex flex-col justify-between ${style}`}>
            <div className="font-bold truncate">
              {data.type}
            </div>
            <div className="flex justify-between items-end">
                <span className="font-black text-xs">{data.hours > 0 ? `${data.hours}h` : ''}</span>
                {data.notes && <FileText size={12} className="opacity-60"/>}
            </div>
          </div>
        </div>
      );
    }
    return days;
  };

  const summary = getSummary();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-900">
      <header className="bg-white p-5 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100">
        <div className="flex items-center gap-5">
          <button onClick={() => changeMonth(-1)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"><ChevronLeft size={20}/></button>
          <h1 className="text-2xl font-extrabold capitalize w-56 text-center tracking-tight text-gray-950">
            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
          </h1>
          <button onClick={() => changeMonth(1)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"><ChevronRight size={20}/></button>
        </div>
        <div className="flex gap-3 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <div className="bg-white px-4 py-2 rounded-lg text-center shadow-sm">
                <p className="text-xs uppercase font-bold text-gray-400">Giorni Lavoro</p>
                <p className="text-2xl font-black text-blue-600">{summary.lavoro + summary.smart}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg text-center shadow-sm">
                <p className="text-xs uppercase font-bold text-gray-400">Ore Permesso</p>
                <p className="text-2xl font-black text-amber-500">{summary.permessiOre}h</p>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-3 uppercase text-xs tracking-widest p-1">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-100 rounded-sm overflow-hidden">
            {renderCalendar()}
          </div>
        </div>

        <aside className="lg:w-80 flex flex-col gap-5">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-950"><FileText size={18} className="text-blue-600"/> Note del Mese</h3>
            <textarea 
              className="w-full border border-gray-200 p-3 rounded-xl h-36 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none text-sm transition"
              placeholder="Appunti speciali per questo mese..."
              value={monthNotes}
              onChange={(e) => setMonthNotes(e.target.value)}
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 text-gray-950">Riepilogo Assenze</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className={`${shiftColors["Ferie"]} p-2 rounded-lg`}>Ferie: <strong>{summary.ferie} gg</strong></div>
                <div className={`${shiftColors["Malattia"]} p-2 rounded-lg`}>Malattia: <strong>{summary.malattia} gg</strong></div>
                <div className={`${shiftColors["Smart Working"]} p-2 rounded-lg`}>Smart: <strong>{summary.smart} gg</strong></div>
                <div className={`${shiftColors["Riposo"]} p-2 rounded-lg`}>Riposo: <strong>{summary.riposo} gg</strong></div>
            </div>
            <button className="w-full mt-5 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md active:scale-95">
              Vedi Riepilogo Completo
            </button>
            <button onClick={() => setWorkData({})} className="w-full mt-3 text-red-500 text-xs py-2 hover:underline opacity-70">
              Azzera modifiche manuali
            </button>
          </div>
        </aside>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-7 w-full max-w-2xl shadow-2xl border border-gray-100 transform transition-all animate-popIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-extrabold text-gray-950">Modifica {new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
            </div>
            
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Tipo di Turno</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
                {shiftTypes.map(type => {
                    const isActive = selectedDay.type === type;
                    const style = getShiftStyle(type);
                    return (
                    <button 
                        key={type}
                        onClick={() => handleShiftTypeSelect(type)}
                        className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-start gap-1 ${isActive ? `${style} shadow-lg scale-105 border-current` : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'}`}
                    >
                        {type}
                        {isActive && <span className="text-xs opacity-70">{selectedDay.hours}h</span>}
                    </button>
                    );
                })}
                {showAddType ? (
                    <div className="col-span-2 md:col-span-2 flex gap-2 items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <input type="text" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nome turno..." className="flex-grow p-2 rounded-lg border text-sm outline-none focus:border-blue-400"/>
                        <button onClick={addCustomShiftType} className="bg-blue-600 text-white p-2 rounded-lg"><Save size={16}/></button>
                        <button onClick={() => setShowAddType(false)} className="bg-gray-200 text-gray-600 p-2 rounded-lg"><X size={16}/></button>
                    </div>
                ) : (
                    <button onClick={() => setShowAddType(true)} className="p-3 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 transition">
                        <Plus size={16}/> Aggiungi Tipo
                    </button>
                )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-5 mb-8">
                <div className="bg-gray-50 p-5 rounded-2xl flex-1 border border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Regola Ore ({selectedDay.type})</label>
                <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm text-2xl font-bold text-gray-600 hover:bg-gray-100 active:scale-90 transition">-</button>
                    <span className="text-5xl font-black text-blue-600 tracking-tighter w-24 text-center">{selectedDay.hours}<span className="text-3xl font-bold text-blue-400">h</span></span>
                    <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-12 h-12 bg-white border border-gray-200 rounded-full shadow-sm text-2xl font-bold text-gray-600 hover:bg-gray-100 active:scale-90 transition">+</button>
                </div>
                </div>

                <div className="flex-1">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Note del giorno</label>
                <textarea 
                    className="w-full border border-gray-200 p-4 rounded-2xl h-[120px] focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-sm" 
                    placeholder="Esempio: Consegna progetto o motivo permesso..."
                    value={selectedDay.notes || ""}
                    onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}
                />
                </div>
            </div>

            <div className="flex gap-4">
              <button onClick={saveDay} className="flex-grow bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-lg">
                <Save size={22}/> CONFERMA E SALVA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
