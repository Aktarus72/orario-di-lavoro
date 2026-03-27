import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, FileText, Plus, X, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const WorkCalendar = () => {
  const [workData, setWorkData] = useState(() => JSON.parse(localStorage.getItem('workData')) || {});
  const [shiftTypes, setShiftTypes] = useState(() => JSON.parse(localStorage.getItem('shiftTypes')) || ["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"]);
  const [monthNotes, setMonthNotes] = useState(() => JSON.parse(localStorage.getItem('monthNotes')) || {});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  useEffect(() => { localStorage.setItem('workData', JSON.stringify(workData)); }, [workData]);
  useEffect(() => { localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes)); }, [shiftTypes]);
  useEffect(() => { localStorage.setItem('monthNotes', JSON.stringify(monthNotes)); }, [monthNotes]);

  const getHolidays = (year) => {
    const f = Math.floor, G = year % 19, C = f(year / 100), H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
          I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)), J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
          L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
    const pasqua = formatDate(year, month - 1, day);
    const pasquettaDate = new Date(year, month - 1, day + 1);
    const pasquetta = formatDate(pasquettaDate.getFullYear(), pasquettaDate.getMonth(), pasquettaDate.getDate());
    return {
      [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione",
      [`${year}-05-01`]: "Festa del Lavoro", [`${year}-06-02`]: "Festa della Repubblica", [`${year}-08-15`]: "Ferragosto",
      [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", [`${year}-12-26`]: "S. Stefano",
      [pasqua]: "Pasqua", [pasquetta]: "Pasquetta"
    };
  };

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const holidays = getHolidays(date.getFullYear());
    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (date.getDay() === 0) return { type: "Festivo", hours: 0, label: "Domenica" };
    if (date.getDay() === 6) return { type: "Riposo", hours: 0, label: "Sabato" };
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthLabel = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
    doc.setFontSize(18); doc.text(`Prospetto Ore Lavoro - ${monthLabel}`, 14, 20);
    
    const s = getSummary();
    doc.setFontSize(10);
    doc.text(`Riepilogo Busta Paga:`, 14, 30);
    doc.text(`LAVORO: ${s.oreLavoro}h (${(s.oreLavoro/8).toFixed(1)}gg) | FERIE: ${s.oreFerie}h (${(s.oreFerie/8).toFixed(1)}gg) | MALATTIA: ${s.oreMalattia}h | PERMESSI: ${s.orePermessi}h`, 14, 36);

    const rows = [];
    const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d);
      const data = workData[dStr] || getDefaultShift(dStr);
      rows.push([`${d} ${new Date(dStr).toLocaleDateString('it-IT', {weekday:'short'})}`, data.type, `${data.hours}h`, data.notes || ""]);
    }

    doc.autoTable({ head: [['Giorno', 'Voce', 'Quantità', 'Note']], body: rows, startY: 42, theme: 'grid', headStyles: {fillColor:[37,99,235]} });
    
    // Forza apertura in nuova scheda su iPad
    const pdfOutput = doc.output('bloburl');
    window.open(pdfOutput, '_blank');
  };

  const getSummary = () => {
    let s = { oreLavoro: 0, oreFerie: 0, oreMalattia: 0, orePermessi: 0, oreSmart: 0 };
    const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d);
      const data = workData[dStr] || getDefaultShift(dStr);
      const h = parseFloat(data.hours || 0);
      if (data.type === "Lavoro") s.oreLavoro += h;
      else if (data.type === "Smart Working") s.oreSmart += h;
      else if (data.type === "Ferie") s.oreFerie += h;
      else if (data.type === "Malattia") s.oreMalattia += h;
      else if (data.type === "Permesso") s.orePermessi += h;
    }
    return s;
  };

  const summary = getSummary();

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

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-100 min-h-screen font-sans text-gray-900 pb-20">
      <header className="bg-white p-5 rounded-2xl shadow-md mb-4 sticky top-0 z-30 border-b-4 border-blue-600">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full active:bg-gray-300"><ChevronLeft /></button>
            <h1 className="text-xl font-black capitalize w-48 text-center">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full active:bg-gray-300"><ChevronRight /></button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-center shadow">
              <p className="text-[9px] uppercase font-bold">Ore Lav.</p>
              <p className="text-lg font-black">{summary.oreLavoro + summary.oreSmart}h</p>
            </div>
            <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-center shadow">
              <p className="text-[9px] uppercase font-bold">Ferie</p>
              <p className="text-lg font-black">{summary.oreFerie}h</p>
            </div>
            <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-center shadow">
              <p className="text-[9px] uppercase font-bold">Permessi</p>
              <p className="text-lg font-black">{summary.orePermessi}h</p>
            </div>
            <button onClick={generatePDF} className="bg-gray-900 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold active:scale-95 transition-transform">
              <Download size={20}/> GENERA PDF
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white p-2 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-2 uppercase text-[10px] tracking-tighter">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-100">
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-24 bg-gray-50 border-r border-b border-gray-100"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || getDefaultShift(dStr);
                days.push(
                  <div key={d} onClick={() => { const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d); setSelectedDay({ ...(workData[dateStr] || getDefaultShift(dateStr)), date: dateStr }); }} 
                       className="h-24 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-blue-50 bg-white transition-colors">
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-bold ${data.type === "Festivo" ? 'text-red-500' : 'text-gray-400'}`}>{d}</span>
                      {data.label && <span className="text-[7px] uppercase font-bold text-red-400 leading-none truncate w-12 text-right">{data.label}</span>}
                    </div>
                    <div className={`text-[9px] rounded p-1 h-[55px] mt-1 flex flex-col justify-between ${shiftColors[data.type] || shiftColors.default}`}>
                      <div className="font-bold truncate leading-tight uppercase">{data.type}</div>
                      <div className="flex justify-between items-end font-black text-xs">
                          <span>{data.hours > 0 ? `${data.hours}h` : ''}</span>
                          {data.notes && <FileText size={10} className="opacity-50"/>}
                      </div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-2 text-xs uppercase text-gray-400 tracking-widest">Appunti Mese</h3>
            <textarea 
              className="w-full border border-gray-100 p-3 rounded-xl h-24 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 shadow-inner"
              value={monthNotes[currentMonthKey] || ""}
              onChange={(e) => setMonthNotes({...monthNotes, [currentMonthKey]: e.target.value})}
              placeholder="Esempio: Trasferte, Bonus..."
            />
          </div>
          <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg">
             <h4 className="text-[10px] uppercase font-bold mb-2 opacity-70 tracking-widest">Totali in Giorni (8h)</h4>
             <p className="text-sm font-medium">Lavoro: <b>{(summary.oreLavoro / 8).toFixed(1)} gg</b></p>
             <p className="text-sm font-medium">Ferie: <b>{(summary.oreFerie / 8).toFixed(1)} gg</b></p>
             <p className="text-sm font-medium border-t border-white/20 mt-2 pt-2 italic text-xs opacity-80 underline cursor-pointer" onClick={() => setWorkData({})}>Azzera calendario</p>
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-lg shadow-2xl border-4 border-blue-600">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black capitalize text-blue-900">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2>
                <button onClick={() => setSelectedDay(null)} className="p-3 bg-gray-100 rounded-full text-gray-400 active:scale-90"><X size={24}/></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-6">
                {shiftTypes.map(t => (
                    <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: 8})} 
                            className={`p-3 rounded-2xl border-2 text-[10px] font-black transition-all uppercase ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                ))}
                {showAddType ? (
                    <div className="col-span-2 flex gap-1"><input autoFocus className="border p-2 rounded-lg text-xs w-full bg-blue-50" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}/><button onClick={() => {if(newTypeName){setShiftTypes([...shiftTypes, newTypeName]); setNewTypeName(""); setShowAddType(false);}}} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={16}/></button></div>
                ) : (
                    <button onClick={() => setShowAddType(true)} className="p-3 rounded-2xl border-2 border-dashed border-gray-300 text-[10px] font-black text-gray-400">+ VOCE</button>
                )}
            </div>
            <div className="bg-blue-50 p-5 rounded-3xl mb-6 flex items-center justify-between border-2 border-blue-100">
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Regola Ore</span>
                <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-14 h-14 bg-white border-2 border-blue-200 rounded-full font-black text-3xl text-blue-600 shadow-md active:bg-blue-100">-</button>
                    <span className="text-5xl font-black text-blue-800 w-16 text-center">{selectedDay.hours}</span>
                    <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-14 h-14 bg-white border-2 border-blue-200 rounded-full font-black text-3xl text-blue-600 shadow-md active:bg-blue-100">+</button>
                </div>
            </div>
            <textarea className="w-full border-2 border-gray-100 p-4 rounded-3xl h-24 mb-6 text-sm outline-none focus:border-blue-300 transition-colors shadow-inner bg-gray-50" placeholder="Note per questo giorno..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => {setWorkData({...workData, [selectedDay.date]: selectedDay}); setSelectedDay(null);}} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">Salva Modifiche</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
