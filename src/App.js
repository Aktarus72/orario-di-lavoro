import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Plus, X, Download, calculator, Gauge } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- CONFIGURAZIONE FIREBASE ---
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

const WorkCalendar = () => {
  const [workData, setWorkData] = useState({});
  const [shiftTypes, setShiftTypes] = useState(["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Ex Fest.", "Malattia", "Riposo"]);
  
  // SALDI INIZIALI (Presi dai tuoi screenshot)
  const [totals, setTotals] = useState({
    ferieResidue: 71.19, // GG
    rolResidui: 214.56,  // ORE
    exFestResidue: 365.22, // ORE (dal tuo screen sembrano ore negative o totali accumulati)
    permesso104Usato: 0 // ORE
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // ASCOLTA FIREBASE
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => {
      if (docSnap.exists()) setWorkData(docSnap.data());
    });
    return () => unsub();
  }, []);

  const saveToCloud = async (newData) => {
    await setDoc(doc(db, "dati", "calendario"), newData);
  };

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // CALCOLO RIEPILOGO MENSILE E SCALCO SALDI
  const getStats = () => {
    let stats = { lavorate: 0, ferie: 0, rol: 0, p104: 0, exFest: 0 };
    Object.values(workData).forEach(day => {
      const h = parseFloat(day.hours || 0);
      if (day.type === "Lavoro") stats.lavorate += h;
      if (day.type === "Ferie Godute") stats.ferie += 1; // Le ferie scalano a giorni
      if (day.type === "Permesso ROL") stats.rol += h;
      if (day.type === "Permesso 104") stats.p104 += h;
      if (day.type === "Ex Fest.") stats.exFest += h;
    });
    return stats;
  };

  const currentStats = getStats();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans">
      {/* HEADER CON SALDI RESIDUI - IL TUO CONTATORE INTERNO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-emerald-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Ferie Residue</p>
          <p className="text-2xl font-black text-emerald-600">{(totals.ferieResidue - currentStats.ferie).toFixed(2)} <span className="text-sm font-normal text-gray-400">gg</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-amber-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase">ROL Residui</p>
          <p className="text-2xl font-black text-amber-600">{(totals.rolResidui - currentStats.rol).toFixed(2)} <span className="text-sm font-normal text-gray-400">h</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-purple-500">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Permessi 104 (Mese)</p>
          <p className="text-2xl font-black text-purple-600">{currentStats.p104} <span className="text-sm font-normal text-gray-400">h</span></p>
        </div>
        <div className="bg-blue-600 p-4 rounded-2xl shadow-lg text-white">
          <p className="text-[10px] font-bold opacity-80 uppercase">Tot. Ore Pagate</p>
          <p className="text-2xl font-black">{(currentStats.lavorate + currentStats.rol + currentStats.p104).toFixed(1)} h</p>
        </div>
      </div>

      <header className="bg-white p-5 rounded-2xl shadow-sm mb-4 flex justify-between items-center border border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-50 rounded-full"><ChevronLeft /></button>
          <h1 className="text-xl font-black capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-50 rounded-full"><ChevronRight /></button>
        </div>
        <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Download size={16}/> STAMPA RIEPILOGO
        </button>
      </header>

      {/* CALENDARIO */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
          ))}
          {(() => {
            const year = currentDate.getFullYear(), month = currentDate.getMonth();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
            const days = [];
            for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-28 bg-gray-50/50"></div>);
            for (let d = 1; d <= totalDays; d++) {
              const dStr = formatDate(year, month, d);
              const data = workData[dStr] || { type: 'Riposo', hours: 0 };
              days.push(
                <div key={d} onClick={() => setSelectedDay({ ...data, date: dStr })} 
                     className="h-28 bg-white p-2 border-t border-l border-gray-50 cursor-pointer hover:bg-blue-50 transition-all">
                  <span className="text-xs font-bold text-gray-300">{d}</span>
                  <div className={`mt-2 p-1.5 rounded-lg text-[9px] font-bold h-16 flex flex-col justify-between border-l-4 
                    ${data.type === 'Lavoro' ? 'bg-blue-50 text-blue-700 border-blue-500' : 
                      data.type === 'Ferie Godute' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' :
                      data.type === 'Permesso 104' ? 'bg-purple-50 text-purple-700 border-purple-500' :
                      data.type === 'Permesso ROL' ? 'bg-amber-50 text-amber-700 border-amber-500' : 'bg-gray-50 text-gray-400 border-gray-300'}`}>
                    <span className="uppercase truncate">{data.type}</span>
                    <span className="text-xs">{data.hours > 0 ? `${data.hours}h` : ''}</span>
                  </div>
                </div>
              );
            }
            return days;
          })()}
        </div>
      </div>

      {/* MODALE SELEZIONE TURNO */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-blue-900 capitalize">
                {new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {shiftTypes.map(t => (
                <button key={t} onClick={() => {
                  let h = 8;
                  if (t === "Permesso 104") h = 2; // Default 2h per la 104
                  if (t === "Riposo") h = 0;
                  setSelectedDay({...selectedDay, type: t, hours: h});
                }} 
                className={`p-4 rounded-2xl border-2 font-bold text-xs uppercase transition-all
                  ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-8 bg-gray-50 p-6 rounded-3xl mb-8">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="text-3xl font-bold text-blue-600">-</button>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Ore</p>
                    <p className="text-4xl font-black text-blue-900">{selectedDay.hours}</p>
                </div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="text-3xl font-bold text-blue-600">+</button>
            </div>

            <button onClick={() => {
              const newData = {...workData, [selectedDay.date]: selectedDay};
              setWorkData(newData);
              saveToCloud(newData);
              setSelectedDay(null);
            }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg uppercase shadow-lg active:scale-95 transition-all">
                Salva e Aggiorna Saldi
            </button>
            <button onClick={() => setSelectedDay(null)} className="w-full mt-4 text-gray-400 font-bold text-sm">Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
