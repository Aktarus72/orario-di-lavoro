import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Info } from 'lucide-react';

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

  // SALDI E MATURAZIONE
  const [balances, setBalances] = useState({
    ferieIniziali: "0",
    rolIniziali: "0",
    maturazioneFerie: "2.1",
    maturazioneRol: "7"
  });

  useEffect(() => {
    const unsubWork = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => { if (docSnap.exists()) setWorkData(docSnap.data()); });
    const unsubNotes = onSnapshot(doc(db, "dati", "note"), (docSnap) => { if (docSnap.exists()) setMonthNotes(docSnap.data()); });
    const unsubSaldi = onSnapshot(doc(db, "dati", "saldi_v2"), (docSnap) => { if (docSnap.exists()) setBalances(docSnap.data()); });
    return () => { unsubWork(); unsubNotes(); unsubSaldi(); };
  }, []);

  const saveToCloud = async (data, path) => { await setDoc(doc(db, "dati", path), data); };

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getHolidays = (year) => {
      // (Logica festività identica a prima per Pasqua/Pasquetta...)
      return { [`${year}-01-01`]: "Capodanno", [`${year}-04-25`]: "Liberazione", [`${year}-05-01`]: "Festa Lavoro" }; 
  };

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const holidays = getHolidays(date.getFullYear());
    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (date.getDay() === 0 || date.getDay() === 6) return { type: "Riposo", hours: 0, label: date.getDay() === 0 ? "Domenica" : "Sabato" };
    return { type: "Lavoro", hours: 8 };
  };

  // CALCOLO STATISTICHE MENSILI
  const getMonthStats = () => {
    let stats = { lavorate: 0, ferie: 0, rol: 0, p104: 0, malattia: 0 };
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    Object.keys(workData).forEach(key => {
      const d = new Date(key);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const entry = workData[key];
        if (entry.type === "Lavoro") stats.lavorate += parseFloat(entry.hours || 0);
        if (entry.type === "Ferie Godute") stats.ferie += 1;
        if (entry.type === "Permesso ROL") stats.rol += parseFloat(entry.hours || 0);
        if (entry.type === "Permesso 104") stats.p104 += parseFloat(entry.hours || 0);
        if (entry.type === "Malattia") stats.malattia += 1;
      }
    });
    return stats;
  };

  const mStats = getMonthStats();

  // CALCOLO RESIDUI TOTALI (Semplificato per ora)
  const residuoFerie = parseFloat(balances.ferieIniziali) - mStats.ferie;
  const residuoRol = parseFloat(balances.rolIniziali) - mStats.rol;

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans">
      
      {/* DASHBOARD RESIDUI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl shadow-sm border-b-4 bg-white ${residuoFerie < 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Residuo Ferie (GG)</p>
          <p className={`text-2xl font-black ${residuoFerie < 0 ? 'text-red-600' : 'text-green-600'}`}>{residuoFerie.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm border-b-4 bg-white ${residuoRol < 0 ? 'border-red-500' : 'border-blue-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Residuo ROL (H)</p>
          <p className={`text-2xl font-black ${residuoRol < 0 ? 'text-red-600' : 'text-blue-600'}`}>{residuoRol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-purple-500 flex justify-between items-center">
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Maturazione</p>
                <p className="text-xs font-bold text-gray-600">+{balances.maturazioneFerie} ferie / +{balances.maturazioneRol} ROL</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-100 rounded-lg"><Settings size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CALENDARIO */}
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
           {/* ... (Header e griglia calendario identica a prima) ... */}
           <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronLeft/></button>
              <h1 className="text-xl font-black capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronRight/></button>
           </div>
           <div className="grid grid-cols-7 gap-px bg-gray-100 border rounded-xl overflow-hidden">
             {/* Giorni e celle (usa logica getDefaultShift e shiftColors di prima) */}
             {/* Inserisci qui la logica di rendering dei giorni che abbiamo creato nel post precedente */}
           </div>
        </div>

        {/* SIDEBAR DESTRA: NOTE E CONTATORE MESE */}
        <div className="space-y-4">
          <div className="bg-blue-900 text-white p-6 rounded-[2rem] shadow-xl">
             <h3 className="text-xs font-bold uppercase opacity-60 mb-4 tracking-widest">Contatore {currentDate.toLocaleString('it-IT', { month: 'short' })}</h3>
             <div className="space-y-3">
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-sm">Ore Lavorate</span>
                    <span className="font-black text-lg">{mStats.lavorate}h</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-sm">Ferie Prese</span>
                    <span className="font-black text-lg text-red-300">{mStats.ferie} gg</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-sm">Permessi ROL</span>
                    <span className="font-black text-lg text-blue-300">{mStats.rol}h</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm">Permessi 104</span>
                    <span className="font-black text-lg text-purple-300">{mStats.p104}h</span>
                </div>
             </div>
             <div className="mt-6 pt-4 border-t border-white/20 flex items-center gap-2">
                <Info size={14} className="text-blue-300"/>
                <p className="text-[9px] italic opacity-70">Questi dati vengono confrontati con il cedolino di fine mese.</p>
             </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold mb-2 text-[10px] uppercase text-gray-400">Note {currentDate.toLocaleString('it-IT', { month: 'long' })}</h3>
            <textarea 
              className="w-full border-none p-3 rounded-xl h-48 text-sm bg-gray-50 outline-none"
              value={monthNotes[`${currentDate.getFullYear()}-${currentDate.getMonth()}`] || ""}
              onChange={(e) => {
                const newNotes = {...monthNotes, [`${currentDate.getFullYear()}-${currentDate.getMonth()}`]: e.target.value};
                setMonthNotes(newNotes);
                saveToCloud(newNotes, "note");
              }}
              placeholder="Segna qui errori o discrepanze della busta paga..."
            />
          </div>
        </div>
      </div>

      {/* MODALE IMPOSTAZIONI AVANZATE */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black mb-6">Configurazione Saldi</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Saldo Iniziale Ferie (GG)</label>
                <input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Saldo Iniziale ROL (H)</label>
                <input type="text" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase">Matura Ferie/Mese</label>
                    <input type="text" className="w-full bg-blue-50 p-2 rounded-lg font-bold text-xs" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase">Matura ROL/Mese</label>
                    <input type="text" className="w-full bg-blue-50 p-2 rounded-lg font-bold text-xs" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/>
                  </div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v2"); setShowSettings(false); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase">Applica e Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
