import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Plus, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- INIZIO CONFIGURAZIONE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmJ_-P3Fp8uZBZmlS-bctgY0eska_WRqQ",
  authDomain: "i-miei-turni-13fd9.firebaseapp.com",
  projectId: "i-miei-turni-13fd9",
  storageBucket: "i-miei-turni-13fd9.firebasestorage.app",
  messagingSenderId: "1073304983291",
  appId: "1:1073304983291:web:6221fd13d4ceea0010425e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// --- FINE CONFIGURAZIONE FIREBASE ---

const WorkCalendar = () => {
  const [workData, setWorkData] = useState({});
  const [shiftTypes, setShiftTypes] = useState(["Lavoro", "Ferie", "Permesso", "Malattia", "Festivo", "Riposo", "Smart Working"]);
  const [monthNotes, setMonthNotes] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // ASCOLTA I CAMBIAMENTI DAL DATABASE (Sincronizzazione Real-time)
  useEffect(() => {
    const unsubWork = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => {
      if (docSnap.exists()) setWorkData(docSnap.data());
    });
    const unsubTypes = onSnapshot(doc(db, "dati", "configurazione"), (docSnap) => {
      if (docSnap.exists()) setShiftTypes(docSnap.data().types || []);
    });
    const unsubNotes = onSnapshot(doc(db, "dati", "note"), (docSnap) => {
      if (docSnap.exists()) setMonthNotes(docSnap.data());
    });

    return () => { unsubWork(); unsubTypes(); unsubNotes(); };
  }, []);

  // FUNZIONE PER SALVARE SU CLOUD
  const saveToCloud = async (newData, path) => {
    try {
      await setDoc(doc(db, "dati", path), newData);
    } catch (e) {
      console.error("Errore salvataggio Cloud:", e);
    }
  };

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
    const docPdf = new jsPDF();
    const monthLabel = currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
    docPdf.setFontSize(18); docPdf.text(`Prospetto Ore Lavoro - ${monthLabel}`, 14, 20);
    const s = getSummary();
    docPdf.setFontSize(10);
    docPdf.text(`Riepilogo: LAVORO: ${s.oreLavoro}h | FERIE: ${s.oreFerie}h | MALATTIA: ${s.oreMalattia}h`, 14, 30);
    const rows = [];
    const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d);
      const data = workData[dStr] || getDefaultShift(dStr);
      rows.push([`${d} ${new Date(dStr).toLocaleDateString('it-IT', {weekday:'short'})}`, data.type, `${data.hours}h`, data.notes || ""]);
    }
    docPdf.autoTable({ head: [['Giorno', 'Voce', 'Quantità', 'Note']], body: rows, startY: 40, theme: 'grid' });
    window.open(docPdf.output('bloburl'), '_blank');
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
            <button onClick={generatePDF} className="bg-gray-900 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold active:scale-95">
              <Download size={20}/> PDF
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white p-2 rounded-2xl shadow-sm">
          <div className="grid grid-cols-7 text-center font-bold text-gray-400 mb-2 uppercase text-[10px]">
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
                  <div key={d} onClick={() => setSelectedDay({ ...(workData[dStr] || getDefaultShift(dStr)), date: dStr })} 
                       className="h-24 border-r border-b border-gray-100 p-1 cursor-pointer hover:bg-blue-50 bg-white">
                    <div className="flex justify-between">
                      <span className={`text-[10px] font-bold ${data.type === "Festivo" ? 'text-red-500' : 'text-gray-400'}`}>{d}</span>
                    </div>
                    <div className={`text-[9px] rounded p-1 h-[55px] mt-1 flex flex-col justify-between ${shiftColors[data.type] || shiftColors.default}`}>
                      <div className="font-bold truncate uppercase">{data.type}</div>
                      <div className="font-black text-xs">{data.hours > 0 ? `${data.hours}h` : ''}</div>
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
            <h3 className="font-bold mb-2 text-xs uppercase text-gray-400">Appunti Mese</h3>
            <textarea 
              className="w-full border border-gray-100 p-3 rounded-xl h-24 text-sm outline-none bg-gray-50"
              value={monthNotes[currentMonthKey] || ""}
              onChange={(e) => {
                const newNotes = {...monthNotes, [currentMonthKey]: e.target.value};
                setMonthNotes(newNotes);
                saveToCloud(newNotes, "note");
              }}
            />
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-lg border-4 border-blue-600">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-blue-900">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2>
                <button onClick={() => setSelectedDay(null)} className="p-3 bg-gray-100 rounded-full text-gray-400"><X size={24}/></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-6">
                {shiftTypes.map(t => (
                    <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: 8})} 
                            className={`p-3 rounded-2xl border-2 text-[10px] font-black transition-all uppercase ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-400'}`}>{t}</button>
                ))}
                <button onClick={() => setShowAddType(!showAddType)} className="p-3 rounded-2xl border-2 border-dashed border-gray-300 text-[10px] font-black text-gray-400">+ VOCE</button>
            </div>
            <div className="bg-blue-50 p-5 rounded-3xl mb-6 flex items-center justify-between">
                <div className="flex items-center gap-6 mx-auto">
                    <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="w-14 h-14 bg-white border-2 border-blue-200 rounded-full font-black text-3xl text-blue-600">-</button>
                    <span className="text-5xl font-black text-blue-800 w-16 text-center">{selectedDay.hours}</span>
                    <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="w-14 h-14 bg-white border-2 border-blue-200 rounded-full font-black text-3xl text-blue-600">+</button>
                </div>
            </div>
            <textarea className="w-full border-2 border-gray-100 p-4 rounded-3xl h-24 mb-6 text-sm bg-gray-50" placeholder="Note..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => {
              const newData = {...workData, [selectedDay.date]: selectedDay};
              setWorkData(newData);
              saveToCloud(newData, "calendario");
              setSelectedDay(null);
            }} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl uppercase">Salva su Cloud</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
