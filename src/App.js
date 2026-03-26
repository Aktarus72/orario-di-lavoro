import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Trash2, FileText, Plus, X, Download } from 'lucide-react';

const WorkCalendar = () => {
  // Caricamento dati iniziali da LocalStorage
  const [workData, setWorkData] = useState(() => {
    const saved = localStorage.getItem('workData');
    return saved ? JSON.parse(saved) : {};
  });

  const [shiftTypes, setShiftTypes] = useState(() => {
    const saved = localStorage.getItem('shiftTypes');
    return saved ? JSON.parse(saved) : ["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"];
  });

  const [monthNotes, setMonthNotes] = useState(() => {
    const saved = localStorage.getItem('monthNotes');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // Persistenza Dati
  useEffect(() => {
    localStorage.setItem('workData', JSON.stringify(workData));
  }, [workData]);

  useEffect(() => {
    localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes));
  }, [shiftTypes]);

  useEffect(() => {
    localStorage.setItem('monthNotes', JSON.stringify(monthNotes));
  }, [monthNotes]);

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
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const holidays = italianHolidays(date.getFullYear());
    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (dayOfWeek === 0) return { type: "Festivo", hours: 0, label: "Domenica" };
    if (dayOfWeek === 6) return { type: "Riposo", hours: 8, label: "Sabato" };
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const handleDayClick = (day) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    const existingData = workData[dateStr] || getDefaultShift(dateStr);
    setSelectedDay({ ...existingData, date: dateStr });
  };

  const handleShiftTypeSelect = (type) => {
    let hours = (["Lavoro", "Ferie", "Malattia", "Riposo", "Smart Working"].includes(type)) ? 8 : (type === "Permesso" ? 1 : 0);
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

  const getSummary = () => {
    let s = { lavoro: 0, ferie: 0, malattia: 0, permessi: 0, smart: 0, riposo: 0 };
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dateStr = formatDate(year, month, d);
      const data = workData[dateStr] || getDefaultShift(dateStr);
      if (data.type === "Lavoro") s.lavoro++;
      else if (data.type === "Smart Working") s.smart++;
      else if (data.type === "Ferie") s.ferie++;
      else if (data.type === "Malattia") s.malattia++;
      else if (data.type === "Riposo") s.riposo++;
      else if (data.type === "Permesso") s.permessi += parseFloat(data.hours || 0);
    }
    return s;
  };

  const summary = getSummary();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-900">
      <header className="bg-white p-5 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100">
        <div className="flex items-center gap-5">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2.5 bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
          <h1 className="text-2xl font-extrabold capitalize w-56 text-center">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2.5 bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
        </div>
        <div className="flex gap-3 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <div className="bg-white px-4 py-2 rounded-lg text-center shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400">Lavoro</p>
                <p className="text-xl font-black text-blue-600">{summary.lavoro + summary.smart}gg</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg text-center shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-400">Permessi</p>
                <p className="text-xl font-black text-amber-500">{summary.permessi}h</p>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-3 uppercase text-[10px] tracking-widest min-w-[600px]">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-100 min-w-[600px]">
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-28 bg-gray-50 border-r border-b border-gray-100"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dateStr = formatDate(year, month, d);
                const data = workData[dateStr] || getDefaultShift(dateStr);
                days.push(
                  <div key={d} onClick={() => handleDayClick(d)} className="h-28 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-gray-50 bg-white">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-bold ${data.type === "Festivo" ? 'text-orange-500' : 'text-gray-400'}`}>{d}</span>
                      {data.label && <span className="text-[7px] uppercase font-bold text-orange-400 px-1">{data.label}</span>}
                    </div>
                    <div className={`text-[10px] rounded p-1.5 h-[70px] flex flex-col justify-between ${shiftColors[data.type] || shiftColors.default}`}>
                      <div className="font-bold leading-tight">{data.type}</div>
                      <div className="flex justify-between items-end">
                          <span className="font-black">{data.hours > 0 ? `${data.hours}h` : ''}</span>
                          {data.notes && <FileText size={10}/>}
                      </div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <aside className="lg:w-80 flex flex-col gap-5">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400"><FileText size={16}/> Note del Mese</h3>
            <textarea 
              className="w-full border border-gray-100 p-3 rounded-xl h-32 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              value={monthNotes[currentMonthKey] || ""}
              onChange={(e) => setMonthNotes({...monthNotes, [currentMonthKey]: e.target.value})}
              placeholder="Note generali..."
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-400">Riepilogo</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-emerald-50 rounded-lg text-emerald-700"><span>Ferie:</span> <strong>{summary.ferie} gg</strong></div>
                <div className="flex justify-between p-2 bg-red-50 rounded-lg text-red-700"><span>Malattia:</span> <strong>{summary.malattia} gg</strong></div>
                <div className="flex justify-between p-2 bg-purple-50 rounded-lg text-purple-700"><span>Smart:</span> <strong>{summary.smart} gg</strong></div>
            </div>
            <button className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition shadow-lg">
              <Download size={18}/> Esporta Dati
            </button>
          </div>
        </aside>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black capitalize">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2>
                <button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-6">
                {shiftTypes.map(t => (
                    <button key={t} onClick={() => handleShiftTypeSelect(t)} className={`p-2 rounded-xl border text-[11px] font-bold transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>{t}</button>
                ))}
                {showAddType ? (
                    <div className="col-span-2 flex gap-1"><input autoFocus className="border p-2 rounded-lg text-xs w-full" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}/><button onClick={addCustomShiftType} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={16}/></button></div>
                ) : (
                    <button onClick={() => setShowAddType(true)} className="p-2 rounded-xl border border-dashed border-gray-300 text-[11px] font-bold text-gray-400">+ Nuovo</button>
                )}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl mb-6 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Ore</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-10 h-10 bg-white border rounded-full font-bold text-xl">-</button>
                    <span className="text-3xl font-black text-blue-600 w-12 text-center">{selectedDay.hours}</span>
                    <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-10 h-10 bg-white border rounded-full font-bold text-xl">+</button>
                </div>
            </div>

            <textarea className="w-full border border-gray-100 p-3 rounded-2xl h-24 mb-6 text-sm outline-none focus:border-blue-300" placeholder="Note del giorno..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            
            <button onClick={saveDay} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all">SALVA GIORNO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
