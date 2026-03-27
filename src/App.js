import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Trash2, FileText, Plus, X, Download, CheckCircle } from 'lucide-react';
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
  const [pdfReady, setPdfReady] = useState(false);

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

  const getSummary = () => {
    let s = { lavoro: 0, ferie: 0, malattia: 0, permessi: 0, smart: 0, riposo: 0 };
    const days = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d);
      const data = workData[dStr] || getDefaultShift(dStr);
      if (data.type === "Lavoro") s.lavoro++;
      else if (data.type === "Smart Working") s.smart++;
      else if (data.type === "Ferie") s.ferie++;
      else if (data.type === "Malattia") s.malattia++;
      else if (data.type === "Riposo") s.riposo++;
      else if (data.type === "Permesso") s.permessi += parseFloat(data.hours || 0);
    }
    return s;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthLabel = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
    doc.setFontSize(18); doc.text(`Riepilogo Presenze - ${monthLabel}`, 14, 20);
    const s = getSummary();
    doc.setFontSize(11);
    doc.text(`Lavoro: ${s.lavoro + s.smart}gg | Ferie: ${s.ferie}gg | Permessi: ${s.permessi}h`, 14, 30);
    const rows = [];
    const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d);
      const data = workData[dStr] || getDefaultShift(dStr);
      rows.push([`${d} ${new Date(dStr).toLocaleDateString('it-IT', {weekday:'short'})}`, data.type, `${data.hours}h`, data.notes || ""]);
    }
    doc.autoTable({ head: [['Giorno', 'Turno', 'Ore', 'Note']], body: rows, startY: 40, theme: 'grid', headStyles: {fillColor:[37,99,235]} });
    doc.save(`Orario_${monthLabel.replace(' ','_')}.pdf`);
    setPdfReady(true); // Mostra il messaggio di successo invece di cambiare pagina
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
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-900 pb-20">
      {/* HEADER DINAMICO */}
      <header className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-gray-100 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronLeft /></button>
            <h1 className="text-xl font-black capitalize w-48 text-center">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronRight /></button>
          </div>
          
          {/* RIEPILOGO RAPIDO IN ALTO */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-center min-w-[80px]">
              <p className="text-[9px] uppercase font-bold opacity-80">Lavoro</p>
              <p className="text-lg font-black">{summary.lavoro + summary.smart}g</p>
            </div>
            <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-center min-w-[80px]">
              <p className="text-[9px] uppercase font-bold opacity-80">Ferie</p>
              <p className="text-lg font-black">{summary.ferie}g</p>
            </div>
            <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-center min-w-[80px]">
              <p className="text-[9px] uppercase font-bold opacity-80">Permessi</p>
              <p className="text-lg font-black">{summary.permessi}h</p>
            </div>
            <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-center min-w-[80px]">
              <p className="text-[9px] uppercase font-bold opacity-80">Malattia</p>
              <p className="text-lg font-black">{summary.malattia}g</p>
            </div>
            <button onClick={generatePDF} className="bg-gray-900 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-black">
              <Download size={18}/> PDF
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-grow bg-white p-2 md:p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-2 uppercase text-[10px] tracking-widest">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-100">
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-24 md:h-28 bg-gray-50 border-r border-b border-gray-100"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || getDefaultShift(dStr);
                days.push(
                  <div key={d} onClick={() => { const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d); const existingData = workData[dateStr] || getDefaultShift(dateStr); setSelectedDay({ ...existingData, date: dateStr }); }} 
                       className="h-24 md:h-28 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-blue-50 bg-white transition-colors">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${data.type === "Festivo" ? 'text-orange-500' : 'text-gray-400'}`}>{d}</span>
                      {data.label && <span className="text-[7px] uppercase font-bold text-orange-400 leading-none text-right">{data.label}</span>}
                    </div>
                    <div className={`text-[9px] md:text-[10px] rounded p-1.5 h-[55px] md:h-[70px] mt-1 flex flex-col justify-between ${shiftColors[data.type] || shiftColors.default}`}>
                      <div className="font-bold leading-tight truncate">{data.type}</div>
                      <div className="flex justify-between items-end font-black uppercase italic opacity-70">
                          <span>{data.hours > 0 ? `${data.hours}h` : ''}</span>
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

        <aside className="lg:w-72 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-2 text-xs uppercase text-gray-400 tracking-widest">Note del Mese</h3>
            <textarea 
              className="w-full border border-gray-100 p-3 rounded-xl h-24 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50"
              value={monthNotes[currentMonthKey] || ""}
              onChange={(e) => setMonthNotes({...monthNotes, [currentMonthKey]: e.target.value})}
              placeholder="Scrivi qui..."
            />
          </div>
          <button onClick={() => {if(confirm("Vuoi azzerare il mese?")) setWorkData({});}} className="w-full text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition">Azzera Modifiche</button>
        </aside>
      </div>

      {/* MESSAGGIO PDF PRONTO (SOSTITUISCE IL TASTO INDIETRO) */}
      {pdfReady && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <CheckCircle size={24} />
            <span className="font-bold">PDF Scaricato con successo!</span>
            <button onClick={() => setPdfReady(false)} className="bg-white/20 p-1 rounded-full"><X size={18}/></button>
          </div>
        </div>
      )}

      {/* MODALE GIORNO */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-lg shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-50">
                <h2 className="text-xl font-black capitalize text-blue-900">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-50 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-6">
                {shiftTypes.map(t => (
                    <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (["Lavoro", "Ferie", "Malattia", "Riposo", "Smart Working"].includes(t)) ? 8 : (t === "Permesso" ? 1 : 0)})} 
                            className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{t}</button>
                ))}
                {showAddType ? (
                    <div className="col-span-2 flex gap-1"><input autoFocus className="border p-2 rounded-lg text-xs w-full bg-blue-50" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}/><button onClick={() => {if(newTypeName){setShiftTypes([...shiftTypes, newTypeName]); setNewTypeName(""); setShowAddType(false);}}} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={16}/></button></div>
                ) : (
                    <button onClick={() => setShowAddType(true)} className="p-3 rounded-xl border border-dashed border-gray-300 text-[10px] font-bold text-gray-400">+ NUOVO</button>
                )}
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex items-center justify-between border border-blue-100">
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest text-center">Ore</span>
                <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-12 h-12 bg-white border border-blue-100 rounded-full font-black text-2xl text-blue-600 shadow-sm">-</button>
                    <span className="text-4xl font-black text-blue-700 w-12 text-center">{selectedDay.hours}</span>
                    <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-12 h-12 bg-white border border-blue-100 rounded-full font-black text-2xl text-blue-600 shadow-sm">+</button>
                </div>
            </div>
            <textarea className="w-full border border-gray-100 p-4 rounded-2xl h-24 mb-6 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Note facoltative..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => {setWorkData({...workData, [selectedDay.date]: selectedDay}); setSelectedDay(null);}} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 active:scale-95 transition-all">SALVA GIORNO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
