import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [payslipData, setPayslipData] = useState({});
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
    const unsubPayslip = onSnapshot(doc(db, "dati", "buste_paga"), (docSnap) => { if (docSnap.exists()) setPayslipData(docSnap.data()); });
    return () => { unsubWork(); unsubSaldi(); unsubPayslip(); };
  }, []);

  const saveToCloud = async (data, path) => { await setDoc(doc(db, "dati", path), data); };
  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const getHolidays = (year) => {
    const f = Math.floor, G = year % 19, C = f(year / 100), H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
          I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)), J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
          L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
    const pasqua = formatDate(year, month - 1, day);
    const pasquetta = formatDate(year, month - 1, day + 1);
    return { 
      [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione", 
      [`${year}-05-01`]: "Festa Lavoro", [`${year}-06-02`]: "Repubblica", [`${year}-08-15`]: "Ferragosto", 
      [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", 
      [`${year}-12-26`]: "S. Stefano", [pasqua]: "Pasqua", [pasquetta]: "Pasquetta" 
    };
  };

  const calculateResidui = () => {
    const [startYear, startMonthStr] = balances.dataInizioSaldo.split('-').map(Number);
    const startMonth = startMonthStr - 1;
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    let resF = parseFloat(balances.ferieIniziali || 0);
    let resR = parseFloat(balances.rolIniziali || 0);
    const matF = parseFloat(balances.maturazioneFerie || 0);
    const matR = parseFloat(balances.maturazioneRol || 0);
    if (currentYear < startYear || (currentYear === startYear && currentMonth <= startMonth)) return { ferie: resF, rol: resR };
    const diffMesi = (currentYear - startYear) * 12 + (currentMonth - startMonth);
    resF += (matF * diffMesi);
    resR += (matR * diffMesi);
    Object.keys(workData).forEach(dateStr => {
      const parts = dateStr.split('-');
      const dY = parseInt(parts[0]);
      const dM = parseInt(parts[1]) - 1;
      if (new Date(dY, dM) > new Date(startYear, startMonth) && new Date(dY, dM) <= new Date(currentYear, currentMonth)) {
        if (workData[dateStr].type === "Ferie Godute") resF -= 1;
        if (workData[dateStr].type === "Permesso ROL") resR -= parseFloat(workData[dateStr].hours || 0);
      }
    });
    return { ferie: resF, rol: resR };
  };

  const finalRes = calculateResidui();

  // --- LOGICA TOTALI SISTEMATA ---
  const monthStats = (() => {
    let s = { lavorate: 0, ferie: 0, rol: 0, p104: 0, malattia: 0 };
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    const totalDays = new Date(y, m + 1, 0).getDate();
    const holidays = getHolidays(y);

    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(y, m, d);
      const isHoliday = holidays[dStr];
      const isWeekend = new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6;
      
      // Se esiste dato salvato, usa quello. Altrimenti usa il default (8h se feriale, 0h se riposo/festa)
      const data = workData[dStr] || { 
        type: isHoliday ? "Festivo" : (isWeekend ? "Riposo" : "Lavoro"), 
        hours: (isHoliday || isWeekend) ? 0 : 8 
      };

      if (data.type === "Lavoro") s.lavorate += parseFloat(data.hours || 0);
      if (data.type === "Ferie Godute") s.ferie += 1;
      if (data.type === "Permesso ROL") s.rol += parseFloat(data.hours || 0);
      if (data.type === "Permesso 104") s.p104 += parseFloat(data.hours || 0);
      if (data.type === "Malattia") s.malattia += 1;
    }
    return s;
  })();

  const currentPayslip = payslipData[currentMonthKey] || { ferie: "", rol: "" };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans pb-10 text-slate-900 tracking-tight">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-[2rem] bg-white border-b-4 border-green-500 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residuo Ferie</p>
          <p className="text-3xl font-black">{finalRes.ferie.toFixed(2)}</p>
        </div>
        <div className="p-5 rounded-[2rem] bg-white border-b-4 border-blue-500 shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residuo ROL</p>
          <p className="text-3xl font-black">{finalRes.rol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-b-4 border-indigo-500 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maturazione</p>
            <p className="text-2xl font-black text-indigo-600">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-50 rounded-2xl hover:bg-indigo-50"><Settings size={24}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8 px-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-3 bg-slate-100 rounded-full"><ChevronLeft/></button>
            <h1 className="text-2xl font-black capitalize">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-3 bg-slate-100 rounded-full"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100 border rounded-3xl overflow-hidden shadow-inner">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-slate-50 p-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const holidays = getHolidays(year);
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-36 bg-slate-50/10"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const isHoliday = holidays[dStr];
                const isWeekend = new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6;
                const data = workData[dStr] || { type: isHoliday ? "Festivo" : (isWeekend ? "Riposo" : "Lavoro"), hours: (isHoliday || isWeekend) ? 0 : 8 };
                days.push(
                  <div key={d} onClick={() => setSelectedDay({...data, date: dStr})} className="h-36 bg-white p-3 cursor-pointer hover:bg-blue-50 transition-all border-[0.5px] border-slate-50 relative">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-black text-slate-300">{d}</span>{isHoliday && <span className="text-[7px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-black uppercase">{isHoliday}</span>}</div>
                    <div className={`rounded-2xl p-3 text-[10px] font-bold h-24 flex flex-col justify-between shadow-sm ${(data.type === "Lavoro") ? "bg-green-100 text-green-800 border-l-4 border-green-600" : (data.type === "Ferie Godute" || data.type === "Malattia" || data.type === "Festivo") ? "bg-red-100 text-red-800 border-l-4 border-red-600" : (data.type === "Permesso ROL" || data.type === "Permesso 104") ? "bg-blue-100 text-blue-800 border-l-4 border-blue-600" : "bg-slate-100 text-slate-400 border-l-4 border-slate-300"}`}>
                      <div className="uppercase tracking-tighter truncate">{data.type}</div>
                      <div className="text-[9px] italic opacity-60 truncate leading-tight">{data.notes}</div>
                      <div className="text-right font-black">{data.hours > 0 ? `${data.hours}h` : ''}</div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-7 rounded-[3rem] shadow-xl border-2 border-orange-100">
            <h3 className="text-xs font-black uppercase text-orange-500 mb-6 flex items-center gap-2"><AlertTriangle size={20}/> Controllo Busta</h3>
            <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Ferie Busta</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" step="0.01" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xl border-none outline-none mt-1 shadow-inner" value={currentPayslip.ferie} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, ferie: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/>
                    <div className={`p-4 rounded-xl transition-colors ${Math.abs(parseFloat(currentPayslip.ferie || 0) - finalRes.ferie) < 0.1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {Math.abs(parseFloat(currentPayslip.ferie || 0) - finalRes.ferie) < 0.1 ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">ROL Busta</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" step="0.01" className="w-full bg-slate-50 p-5 rounded-2xl font-black text-xl border-none outline-none mt-1 shadow-inner" value={currentPayslip.rol} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, rol: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/>
                    <div className={`p-4 rounded-xl transition-colors ${Math.abs(parseFloat(currentPayslip.rol || 0) - finalRes.rol) < 0.1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {Math.abs(parseFloat(currentPayslip.rol || 0) - finalRes.rol) < 0.1 ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-xs font-black uppercase opacity-40 mb-8 tracking-widest text-center">Riepilogo Mensile</h3>
            <div className="space-y-6 font-black text-base">
              <div className="flex justify-between border-b border-white/10 pb-3"><span>ORE LAVORO</span><span className="text-2xl text-green-400">{monthStats.lavorate}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-3"><span>FERIE (GG)</span><span className="text-2xl text-red-400">{monthStats.ferie}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-3"><span>ROL</span><span className="text-2xl text-blue-400">{monthStats.rol}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-3"><span>LEGGE 104</span><span className="text-2xl text-purple-400">{monthStats.p104}h</span></div>
              <div className="flex justify-between pb-3"><span>MALATTIA</span><span className="text-2xl text-yellow-400">{monthStats.malattia}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl relative">
            <h2 className="text-3xl font-black mb-8">Setup Saldi</h2>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Mese Finale Busta (es. Agosto)</label><input type="month" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.dataInizioSaldo} onChange={(e) => setBalances({...balances, dataInizioSaldo: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saldo Ferie Busta</label><input type="text" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saldo ROL Busta</label><input type="text" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Matura Ferie</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100 mt-2" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Matura ROL</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100 mt-2" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/></div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v4"); setShowSettings(false); }} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase shadow-xl">Salva Parametri</button>
            </div>
            <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full text-slate-400"><X/></button>
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-white rounded-[3.5rem] p-10 w-full max-w-md border-4 border-blue-600 shadow-2xl relative">
            <h2 className="text-3xl font-black text-blue-900 capitalize mb-8">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2>
            <div className="grid grid-cols-2 gap-2 mb-8">
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Riposo", "Festivo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-4 rounded-[1.5rem] border-2 font-black text-[10px] uppercase transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>{t}</button>
                ))}
            </div>
            <div className="flex items-center justify-center gap-8 bg-blue-50 p-6 rounded-[2.5rem] mb-8 font-black shadow-inner">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, parseFloat(selectedDay.hours || 0) - 0.5)})} className="text-5xl text-blue-600 font-black">-</button>
                <div className="text-center"><p className="text-[10px] uppercase text-blue-400 mb-1">Ore</p><span className="text-6xl text-blue-900 font-mono tracking-tighter font-black">{selectedDay.hours}</span></div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: parseFloat(selectedDay.hours || 0) + 0.5})} className="text-5xl text-blue-600 font-black">+</button>
            </div>
            <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nota</label>
                <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.5rem] h-24 text-sm outline-none focus:border-blue-400 font-medium" value={selectedDay.notes || ""} onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            </div>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black text-xl uppercase shadow-xl">Salva</button>
            <button onClick={() => setSelectedDay(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full text-slate-400"><X/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
