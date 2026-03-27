import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  const [payslipData, setPayslipData] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [balances, setBalances] = useState({ 
    ferieIniziali: "69", 
    rolIniziali: "0", 
    maturazioneFerie: "2.1", 
    maturazioneRol: "7", 
    dataInizioSaldo: "2025-08" 
  });

  useEffect(() => {
    const unsubWork = onSnapshot(doc(db, "dati", "calendario"), (docSnap) => { if (docSnap.exists()) setWorkData(docSnap.data()); });
    const unsubNotes = onSnapshot(doc(db, "dati", "note"), (docSnap) => { if (docSnap.exists()) setMonthNotes(docSnap.data()); });
    const unsubSaldi = onSnapshot(doc(db, "dati", "saldi_v4"), (docSnap) => { if (docSnap.exists()) setBalances(docSnap.data()); });
    const unsubPayslip = onSnapshot(doc(db, "dati", "buste_paga"), (docSnap) => { if (docSnap.exists()) setPayslipData(docSnap.data()); });
    return () => { unsubWork(); unsubNotes(); unsubSaldi(); unsubPayslip(); };
  }, []);

  const saveToCloud = async (data, path) => { await setDoc(doc(db, "dati", path), data); };
  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const getHolidays = (year) => {
    const f = Math.floor, G = year % 19, C = f(year / 100), H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
          I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)), J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
          L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
    return { [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione", [`${year}-05-01`]: "Festa Lavoro", [`${year}-06-02`]: "Repubblica", [`${year}-08-15`]: "Ferragosto", [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", [`${year}-12-26`]: "S. Stefano", [formatDate(year, month - 1, day)]: "Pasqua", [formatDate(year, month - 1, day + 1)]: "Pasquetta" };
  };

  // --- RIEPILOGO MESE VISUALIZZATO ---
  const monthStats = (() => {
    let s = { lavorate: 0, ferie: 0, rol: 0, p104: 0, malattia: 0, festivo: 0 };
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    const holidays = getHolidays(y);
    const totalDays = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(y, m, d);
      const e = workData[dStr];
      if (e) {
        if (e.type === "Lavoro") s.lavorate += parseFloat(e.hours || 0);
        if (e.type === "Ferie Godute") s.ferie += 1;
        if (e.type === "Permesso ROL") s.rol += parseFloat(e.hours || 0);
        if (e.type === "Permesso 104") s.p104 += parseFloat(e.hours || 0);
        if (e.type === "Malattia") s.malattia += 1;
        if (e.type === "Festivo") s.festivo += 1;
      } else {
        const dateObj = new Date(dStr);
        if (!holidays[dStr] && dateObj.getDay() !== 0 && dateObj.getDay() !== 6) s.lavorate += 8;
      }
    }
    return s;
  })();

  // --- CALCOLO RESIDUI (SOLO FERIE/ROL SPECIFICI) ---
  const calculateResidui = () => {
    let runningFerie = parseFloat(balances.ferieIniziali || 0);
    let runningRol = parseFloat(balances.rolIniziali || 0);
    const matF = parseFloat(balances.maturazioneFerie || 0);
    const matR = parseFloat(balances.maturazioneRol || 0);

    const startDate = new Date(balances.dataInizioSaldo + "-01");
    const viewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    let tempDate = new Date(startDate);
    while (tempDate <= viewDate) {
      runningFerie += matF;
      runningRol += matR;

      const m = tempDate.getMonth(), y = tempDate.getFullYear();
      const lastDay = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const dStr = formatDate(y, m, d);
        if (workData[dStr]) {
          // SOTTRAI SOLO SE IL TIPO MATCHA ESATTAMENTE
          if (workData[dStr].type === "Ferie Godute") runningFerie -= 1;
          if (workData[dStr].type === "Permesso ROL") runningRol -= parseFloat(workData[dStr].hours || 0);
        }
      }
      tempDate.setMonth(tempDate.getMonth() + 1);
    }
    return { ferie: runningFerie, rol: runningRol };
  };

  const finalRes = calculateResidui();
  const currentPayslip = payslipData[currentMonthKey] || { ferie: "", rol: "" };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans pb-10">
      {/* HEADER RESIDUI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-5 rounded-[2rem] bg-white border-b-4 shadow-sm ${finalRes.ferie < 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mio Residuo Ferie</p>
          <p className="text-2xl font-black">{finalRes.ferie.toFixed(2)} <span className="text-[10px] text-gray-300">GG</span></p>
        </div>
        <div className={`p-5 rounded-[2rem] bg-white border-b-4 shadow-sm ${finalRes.rol < 0 ? 'border-red-500' : 'border-blue-500'}`}>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mio Residuo ROL</p>
          <p className="text-2xl font-black">{finalRes.rol.toFixed(2)} <span className="text-[10px] text-gray-300">H</span></p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-b-4 border-indigo-500 flex justify-between items-center shadow-sm">
          <div><p className="text-[9px] font-black text-gray-400 uppercase">Maturazione</p><p className="text-sm font-black text-indigo-600">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</p></div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-gray-50 rounded-2xl hover:bg-indigo-50"><Settings size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* CALENDARIO */}
        <div className="lg:col-span-3 bg-white p-6 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-3 bg-gray-100 rounded-full"><ChevronLeft/></button>
            <h1 className="text-2xl font-black capitalize tracking-tighter">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-3 bg-gray-100 rounded-full"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 border rounded-3xl overflow-hidden">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-gray-50 p-4 text-center text-[11px] font-black text-gray-400 uppercase">{d}</div>)}
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-36 bg-gray-50/20"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || { type: (new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6 || getHolidays(year)[dStr]) ? "Riposo" : "Lavoro", hours: (new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6 || getHolidays(year)[dStr]) ? 0 : 8 };
                days.push(
                  <div key={d} onClick={() => setSelectedDay({...data, date: dStr})} className="h-36 bg-white p-3 cursor-pointer hover:bg-blue-50 transition-all border-[0.5px] border-gray-50">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-black text-gray-300">{d}</span>{getHolidays(year)[dStr] && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-black uppercase">{getHolidays(year)[dStr]}</span>}</div>
                    <div className={`rounded-2xl p-3 text-[10px] font-bold h-24 flex flex-col justify-between shadow-sm ${(data.type === "Lavoro") ? "bg-green-100 text-green-800 border-l-4 border-green-600" : (data.type === "Ferie Godute" || data.type === "Malattia") ? "bg-red-100 text-red-800 border-l-4 border-red-600" : (data.type === "Permesso ROL" || data.type === "Permesso 104") ? "bg-blue-100 text-blue-800 border-l-4 border-blue-600" : "bg-gray-100 text-gray-400 border-l-4 border-gray-300"}`}>
                      <div className="uppercase tracking-tighter">{data.type}</div>
                      <div className="text-[9px] italic opacity-60 truncate font-medium">{data.notes}</div>
                      <div className="text-right font-black">{data.hours > 0 ? `${data.hours}h` : ''}</div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <div className="bg-white p-7 rounded-[3rem] shadow-xl border-2 border-orange-100">
            <h3 className="text-[10px] font-black uppercase text-orange-500 mb-6 flex items-center gap-2"><AlertTriangle size={16}/> Controllo Busta</h3>
            <div className="space-y-4">
              <div><label className="text-[9px] font-black text-gray-400 uppercase">Residuo Ferie Busta</label><div className="flex gap-2"><input type="number" className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-none outline-none" value={currentPayslip.ferie} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, ferie: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/><div className={`p-4 rounded-2xl ${Math.abs(parseFloat(currentPayslip.ferie || 0) - finalRes.ferie) < 0.5 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{Math.abs(parseFloat(currentPayslip.ferie || 0) - finalRes.ferie) < 0.5 ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}</div></div></div>
              <div><label className="text-[9px] font-black text-gray-400 uppercase">Residuo ROL Busta</label><div className="flex gap-2"><input type="number" className="w-full bg-gray-50 p-4 rounded-2xl text-sm font-bold border-none outline-none" value={currentPayslip.rol} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, rol: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/><div className={`p-4 rounded-2xl ${Math.abs(parseFloat(currentPayslip.rol || 0) - finalRes.rol) < 1 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{Math.abs(parseFloat(currentPayslip.rol || 0) - finalRes.rol) < 1 ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}</div></div></div>
            </div>
          </div>

          <div className="bg-blue-900 text-white p-7 rounded-[3rem] shadow-xl">
            <h3 className="text-[10px] font-black uppercase opacity-40 mb-8 tracking-widest">Riepilogo Mensile</h3>
            <div className="space-y-5 font-bold text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Ore Lavoro</span><span>{monthStats.lavorate}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-red-300"><span>Ferie (GG)</span><span>{monthStats.ferie}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-blue-300"><span>Permessi ROL</span><span>{monthStats.rol}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-purple-300"><span>Permessi 104</span><span>{monthStats.p104}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-yellow-300"><span>Malattia</span><span>{monthStats.malattia}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE SETUP */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-black mb-10">Parametri</h2>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase">Mese Iniziale (Busta Paga)</label><input type="month" className="w-full bg-gray-50 p-5 rounded-2xl font-bold" value={balances.dataInizioSaldo} onChange={(e) => setBalances({...balances, dataInizioSaldo: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase">Saldo Ferie Iniziali</label><input type="text" className="w-full bg-gray-50 p-5 rounded-2xl font-bold" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase">Saldo ROL Iniziali</label><input type="text" className="w-full bg-gray-50 p-5 rounded-2xl font-bold" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-indigo-400 uppercase">Maturazione Ferie</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-indigo-400 uppercase">Maturazione ROL</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/></div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v4"); setShowSettings(false); }} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest">Aggiorna</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE GIORNO CON NOTE */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md border-4 border-blue-600 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-blue-900 capitalize">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2><button onClick={() => setSelectedDay(null)} className="p-3 bg-gray-100 rounded-full text-gray-400"><X/></button></div>
            <div className="grid grid-cols-2 gap-3 mb-8">
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Festivo", "Riposo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-5 rounded-[2rem] border-2 font-black text-[11px] uppercase transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                ))}
            </div>
            <div className="flex items-center justify-center gap-10 bg-blue-50 p-8 rounded-[3rem] mb-8 font-black">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, parseFloat(selectedDay.hours || 0) - 0.5)})} className="text-5xl text-blue-600">-</button>
                <div className="text-center"><p className="text-xs uppercase text-blue-400 mb-2">Ore</p><span className="text-6xl text-blue-900">{selectedDay.hours}</span></div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: parseFloat(selectedDay.hours || 0) + 0.5})} className="text-5xl text-blue-600">+</button>
            </div>
            {/* CAMPO NOTA GIORNALIERA RIPRISTINATO */}
            <div className="mb-8">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Nota del giorno</label>
              <textarea className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-[1.5rem] h-24 text-sm outline-none focus:border-blue-400" placeholder="Aggiungi una nota per questo giorno..." value={selectedDay.notes || ""} onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            </div>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-7 rounded-[2.5rem] font-black text-2xl uppercase transition-all active:scale-95 shadow-xl shadow-blue-100">Salva Giorno</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
