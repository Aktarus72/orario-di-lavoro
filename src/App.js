import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, AlertTriangle } from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [balances, setBalances] = useState({ 
    ferieIniziali: "68.19", 
    rolIniziali: "-120.56", 
    maturazioneFerie: "2.15", 
    maturazioneRol: "7.33", 
    dataInizioSaldo: "2025-08" 
  });

  useEffect(() => {
    const unsubWork = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => { if (docSnap.exists()) setWorkData(docSnap.data()); });
    const unsubSaldi = onSnapshot(doc(db, "dati", "saldi_v4"), (docSnap) => { if (docSnap.exists()) setBalances(docSnap.data()); });
    return () => { unsubWork(); unsubSaldi(); };
  }, []);

  const saveToCloud = async (data, path) => { await setDoc(doc(db, "dati", path), data); };
  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // --- LOGICA MATEMATICA RICHIESTA ---
  const calculateResidui = () => {
    const startMonth = parseInt(balances.dataInizioSaldo.split('-')[1]) - 1;
    const startYear = parseInt(balances.dataInizioSaldo.split('-')[0]);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let resF = parseFloat(balances.ferieIniziali || 0);
    let resR = parseFloat(balances.rolIniziali || 0);
    const matF = parseFloat(balances.maturazioneFerie || 0);
    const matR = parseFloat(balances.maturazioneRol || 0);

    // Se siamo nel mese di setup (Agosto), mostra il saldo della busta tal quale
    if (currentMonth === startMonth && currentYear === startYear) {
      return { ferie: resF, rol: resR };
    }

    // Se siamo in un mese successivo (es. Settembre)
    if (new Date(currentYear, currentMonth) > new Date(startYear, startMonth)) {
      // Calcola quanti mesi sono passati dal setup (es. da Agosto a Settembre = 1 mese)
      const diffMesi = (currentYear - startYear) * 12 + (currentMonth - startMonth);
      
      // Somma maturazioni
      resF += (matF * diffMesi);
      resR += (matR * diffMesi);

      // Sottrai i goduti solo dei mesi SUCCESSIVI a quello di setup
      Object.keys(workData).forEach(dateStr => {
        const d = new Date(dateStr);
        const dM = d.getMonth();
        const dY = d.getFullYear();
        
        // Sottrai solo se il giorno appartiene a un mese tra quello di setup (escluso) e quello corrente (incluso)
        if (new Date(dY, dM) > new Date(startYear, startMonth) && new Date(dY, dM) <= new Date(currentYear, currentMonth)) {
          if (workData[dateStr].type === "Ferie Godute") resF -= 1;
          if (workData[dateStr].type === "Permesso ROL") resR -= parseFloat(workData[dateStr].hours || 0);
        }
      });
    }
    return { ferie: resF, rol: resR };
  };

  const finalRes = calculateResidui();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen text-slate-900">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-6 rounded-[2rem] bg-white border-b-4 border-green-500 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mio Residuo Ferie</p>
          <p className="text-3xl font-black">{finalRes.ferie.toFixed(2)}</p>
        </div>
        <div className="p-6 rounded-[2rem] bg-white border-b-4 border-blue-500 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mio Residuo ROL</p>
          <p className="text-3xl font-black">{finalRes.rol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-b-4 border-indigo-500 flex justify-between items-center shadow-sm">
          <div className="text-xs font-black text-indigo-600">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</div>
          <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-xl"><Settings size={18}/></button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-slate-100 rounded-full"><ChevronLeft/></button>
          <h1 className="text-2xl font-black capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-slate-100 rounded-full"><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 border rounded-3xl overflow-hidden">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-slate-50 p-4 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
          {(() => {
            const year = currentDate.getFullYear(), month = currentDate.getMonth();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
            const days = [];
            for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-32 bg-slate-50/20"></div>);
            for (let d = 1; d <= totalDays; d++) {
              const dStr = formatDate(year, month, d);
              const data = workData[dStr] || { type: "Lavoro", hours: 8 };
              days.push(
                <div key={d} onClick={() => setSelectedDay({...data, date: dStr})} className="h-32 bg-white p-2 cursor-pointer border-[0.5px] border-slate-50 relative hover:bg-slate-50">
                  <span className="text-[10px] font-black text-slate-300">{d}</span>
                  <div className={`mt-1 rounded-xl p-2 text-[9px] font-bold h-20 flex flex-col justify-between ${(data.type === "Ferie Godute" || data.type === "Malattia") ? "bg-red-50 text-red-700 border-l-2 border-red-500" : "bg-blue-50 text-blue-700 border-l-2 border-blue-500"}`}>
                    <div className="uppercase truncate">{data.type}</div>
                    <div className="italic opacity-70 truncate">{data.notes}</div>
                    <div className="text-right font-black">{data.hours > 0 ? `${data.hours}h` : ''}</div>
                  </div>
                </div>
              );
            }
            return days;
          })()}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Setup Busta Paga</h2>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black uppercase text-slate-400">Mese Busta</label><input type="month" className="w-full bg-slate-50 p-4 rounded-xl mt-1 font-bold" value={balances.dataInizioSaldo} onChange={(e) => setBalances({...balances, dataInizioSaldo: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black uppercase text-slate-400">Ferie in Busta</label><input type="text" className="w-full bg-slate-50 p-4 rounded-xl mt-1 font-bold" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400">ROL in Busta</label><input type="text" className="w-full bg-slate-50 p-4 rounded-xl mt-1 font-bold" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/></div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v4"); setShowSettings(false); }} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase mt-4">Salva</button>
            </div>
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-md border-4 border-blue-500">
            <h2 className="text-2xl font-black mb-6 capitalize">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2>
            <div className="grid grid-cols-2 gap-2 mb-6 text-[10px] font-black uppercase">
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Riposo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-4 rounded-xl border-2 ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                ))}
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex justify-between items-center px-10">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, parseFloat(selectedDay.hours || 0) - 0.5)})} className="text-4xl text-blue-600 font-black">-</button>
                <div className="text-center"><span className="text-4xl font-black text-blue-900">{selectedDay.hours}</span><p className="text-[10px] uppercase text-blue-400">Ore</p></div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: parseFloat(selectedDay.hours || 0) + 0.5})} className="text-4xl text-blue-600 font-black">+</button>
            </div>
            <textarea className="w-full bg-slate-50 p-4 rounded-xl h-20 mb-6 text-sm border-2 border-slate-100 outline-none focus:border-blue-400" placeholder="Nota..." value={selectedDay.notes || ""} onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase">Salva</button>
            <button onClick={() => setSelectedDay(null)} className="w-full mt-4 text-slate-400 font-bold uppercase text-xs">Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
