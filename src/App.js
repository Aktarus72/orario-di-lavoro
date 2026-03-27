import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Info, X } from 'lucide-react';

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
  const [monthNotes, setMonthNotes] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [balances, setBalances] = useState({ ferieIniziali: "0", rolIniziali: "0", maturazioneFerie: "2.1", maturazioneRol: "7" });

  useEffect(() => {
    const unsubWork = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => { if (docSnap.exists()) setWorkData(docSnap.data()); });
    const unsubNotes = onSnapshot(doc(db, "dati", "note"), (docSnap) => { if (docSnap.exists()) setMonthNotes(docSnap.data()); });
    const unsubSaldi = onSnapshot(doc(db, "dati", "saldi_v3"), (docSnap) => { if (docSnap.exists()) setBalances(docSnap.data()); });
    return () => { unsubWork(); unsubNotes(); unsubSaldi(); };
  }, []);

  const saveToCloud = async (data, path) => { await setDoc(doc(db, "dati", path), data); };

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getHolidays = (year) => {
    const f = Math.floor, G = year % 19, C = f(year / 100), H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
          I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)), J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
          L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
    const pasqua = formatDate(year, month - 1, day);
    const pasquettaDate = new Date(year, month - 1, day + 1);
    const pasquetta = formatDate(pasquettaDate.getFullYear(), pasquettaDate.getMonth(), pasquettaDate.getDate());
    return {
      [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione",
      [`${year}-05-01`]: "Festa Lavoro", [`${year}-06-02`]: "Repubblica", [`${year}-08-15`]: "Ferragosto",
      [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", [`${year}-12-26`]: "S. Stefano",
      [pasqua]: "Pasqua", [pasquetta]: "Pasquetta"
    };
  };

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const holidays = getHolidays(date.getFullYear());
    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (date.getDay() === 0) return { type: "Riposo", hours: 0, label: "Domenica" };
    if (date.getDay() === 6) return { type: "Riposo", hours: 0, label: "Sabato" };
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const shiftColors = {
    "Lavoro": "bg-green-100 text-green-800 border-l-4 border-green-600",
    "Ferie Godute": "bg-red-100 text-red-800 border-l-4 border-red-600",
    "Malattia": "bg-red-100 text-red-800 border-l-4 border-red-600",
    "Permesso ROL": "bg-blue-100 text-blue-800 border-l-4 border-blue-600",
    "Permesso 104": "bg-blue-100 text-blue-800 border-l-4 border-blue-600",
    "Festivo": "bg-orange-100 text-orange-800 border-l-4 border-orange-500",
    "default": "bg-gray-100 text-gray-400 border-l-4 border-gray-300"
  };

  const mStats = (() => {
    let s = { lavorate: 0, ferie: 0, rol: 0, p104: 0 };
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    Object.keys(workData).forEach(k => {
      const d = new Date(k);
      if (d.getMonth() === m && d.getFullYear() === y) {
        const e = workData[k];
        if (e.type === "Lavoro") s.lavorate += parseFloat(e.hours || 0);
        if (e.type === "Ferie Godute") s.ferie += 1;
        if (e.type === "Permesso ROL") s.rol += parseFloat(e.hours || 0);
        if (e.type === "Permesso 104") s.p104 += parseFloat(e.hours || 0);
      }
    });
    return s;
  })();

  const resFerie = (parseFloat(balances.ferieIniziali) || 0) - mStats.ferie;
  const resRol = (parseFloat(balances.rolIniziali) || 0) - mStats.rol;

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl bg-white border-b-4 ${resFerie < 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Residuo Ferie (GG)</p>
          <p className="text-xl font-black">{resFerie.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-white border-b-4 ${resRol < 0 ? 'border-red-500' : 'border-blue-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Residuo ROL (H)</p>
          <p className="text-xl font-black">{resRol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-b-4 border-indigo-500 flex justify-between items-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Matura: <span className="text-gray-900">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</span></p>
          <button onClick={() => setShowSettings(true)} className="p-1 bg-gray-100 rounded-md"><Settings size={16}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronLeft/></button>
            <h1 className="text-xl font-black capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 border rounded-xl overflow-hidden">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>)}
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-28 bg-gray-50/50"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || getDefaultShift(dStr);
                days.push(
                  <div key={d} onClick={() => setSelectedDay({ ...data, date: dStr })} className="h-28 bg-white p-1.5 cursor-pointer hover:bg-blue-50 transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-black ${data.label ? 'text-red-500' : 'text-gray-300'}`}>{d}</span>
                      {data.label && <span className="text-[7px] bg-red-50 text-red-500 px-1 rounded uppercase font-bold truncate w-14">{data.label}</span>}
                    </div>
                    <div className={`rounded-lg p-1.5 text-[9px] font-bold h-16 flex flex-col justify-between overflow-hidden ${shiftColors[data.type] || shiftColors.default}`}>
                      <div className="uppercase leading-tight">{data.type}</div>
                      <div className="text-[7px] italic opacity-70 truncate">{data.notes}</div>
                      <div className="text-right text-xs font-black">{data.hours > 0 ? `${data.hours}h` : ''}</div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="text-xs font-bold uppercase opacity-50 mb-4 tracking-widest">Riepilogo Mese</h3>
            <div className="space-y-3 font-bold text-sm">
              <div className="flex justify-between"><span>Ore Lavoro</span><span>{mStats.lavorate}h</span></div>
              <div className="flex justify-between text-red-300"><span>Ferie (GG)</span><span>{mStats.ferie}</span></div>
              <div className="flex justify-between text-blue-300"><span>Permessi ROL</span><span>{mStats.rol}h</span></div>
              <div className="flex justify-between text-purple-300"><span>Permessi 104</span><span>{mStats.p104}h</span></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-2 text-[10px] uppercase text-gray-400">Note del Mese</h3>
            <textarea className="w-full border-none p-3 rounded-xl h-40 text-sm bg-gray-50 outline-none" value={monthNotes[`${currentDate.getFullYear()}-${currentDate.getMonth()}`] || ""}
              onChange={(e) => { const n = {...monthNotes, [`${currentDate.getFullYear()}-${currentDate.getMonth()}`]: e.target.value}; setMonthNotes(n); saveToCloud(n, "note"); }} placeholder="Scrivi qui..."/>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm">
            <h2 className="text-xl font-black mb-6">Configurazione Saldi</h2>
            <div className="space-y-4">
              <input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})} placeholder="Saldo Ferie"/>
              <input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})} placeholder="Saldo ROL"/>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" className="bg-blue-50 p-2 rounded-lg font-bold text-xs" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/>
                <input type="text" className="bg-blue-50 p-2 rounded-lg font-bold text-xs" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v3"); setShowSettings(false); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">Salva</button>
            </div>
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md border-4 border-blue-600">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-blue-900 capitalize">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2><button onClick={() => setSelectedDay(null)}><X/></button></div>
            <div className="grid grid-cols-2 gap-2 mb-6">
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Riposo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-3 rounded-xl border-2 font-bold text-[10px] uppercase ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400'}`}>{t}</button>
                ))}
            </div>
            <div className="flex items-center justify-center gap-6 bg-blue-50 p-4 rounded-3xl mb-6 font-black">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, selectedDay.hours - 1)})} className="text-2xl text-blue-600">-</button>
                <span className="text-3xl text-blue-900">{selectedDay.hours}h</span>
                <button onClick={() => setSelectedDay({...selectedDay, hours: selectedDay.hours + 1})} className="text-2xl text-blue-600">+</button>
            </div>
            <textarea className="w-full border-2 border-gray-100 p-4 rounded-2xl h-24 mb-6 text-sm outline-none" placeholder="Note giorno..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl uppercase">Salva</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
