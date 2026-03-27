import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
    return { [`${year}-01-01`]: "Capodanno", [`${year}-01-06`]: "Epifania", [`${year}-04-25`]: "Liberazione", [`${year}-05-01`]: "Festa Lavoro", [`${year}-06-02`]: "Repubblica", [`${year}-08-15`]: "Ferragosto", [`${year}-11-01`]: "Ognissanti", [`${year}-12-08`]: "Immacolata", [`${year}-12-25`]: "Natale", [`${year}-12-26`]: "S. Stefano", [formatDate(year, month - 1, day)]: "Pasqua", [formatDate(year, month - 1, day + 1)]: "Pasquetta" };
  };

  const calculateResidui = () => {
    let resF = parseFloat(balances.ferieIniziali || 0);
    let resR = parseFloat(balances.rolIniziali || 0);
    const matF = parseFloat(balances.maturazioneFerie || 0);
    const matR = parseFloat(balances.maturazioneRol || 0);

    const start = new Date(balances.dataInizioSaldo + "-01");
    const view = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    let temp = new Date(start);
    while (temp <= view) {
      // Se NON siamo nel mese iniziale, aggiungi maturazione e sottrai goduti
      if (temp.getTime() !== start.getTime()) {
        resF += matF;
        resR += matR;

        const m = temp.getMonth(), y = temp.getFullYear();
        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
          const dStr = formatDate(y, m, d);
          if (workData[dStr]) {
            if (workData[dStr].type === "Ferie Godute") resF -= 1;
            if (workData[dStr].type === "Permesso ROL") resR -= parseFloat(workData[dStr].hours || 0);
          }
        }
      }
      temp.setMonth(temp.getMonth() + 1);
    }
    return { ferie: resF, rol: resR };
  };

  const finalRes = calculateResidui();
  const currentPayslip = payslipData[currentMonthKey] || { ferie: "", rol: "" };

  const monthStats = (() => {
    let s = { lavorate: 0, ferie: 0, rol: 0, p104: 0, malattia: 0 };
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    const totalDays = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dStr = formatDate(y, m, d);
      if (workData[dStr]) {
        const e = workData[dStr];
        if (e.type === "Lavoro") s.lavorate += parseFloat(e.hours || 0);
        if (e.type === "Ferie Godute") s.ferie += 1;
        if (e.type === "Permesso ROL") s.rol += parseFloat(e.hours || 0);
        if (e.type === "Permesso 104") s.p104 += parseFloat(e.hours || 0);
        if (e.type === "Malattia") s.malattia += 1;
      }
    }
    return s;
  })();

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans pb-10 text-slate-900">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-[2rem] bg-white border-b-4 border-green-500 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mio Residuo Ferie</p>
          <p className="text-3xl font-black text-center">{finalRes.ferie.toFixed(2)}</p>
        </div>
        <div className="p-5 rounded-[2rem] bg-white border-b-4 border-blue-500 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mio Residuo ROL</p>
          <p className="text-3xl font-black text-center">{finalRes.rol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-b-4 border-indigo-500 flex justify-between items-center shadow-sm">
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maturazione</p><p className="text-sm font-black text-indigo-600">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</p></div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-50 rounded-2xl"><Settings size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><ChevronLeft/></button>
            <h1 className="text-2xl font-black capitalize tracking-tighter">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100 border rounded-3xl overflow-hidden shadow-inner">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-slate-50 p-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-36 bg-slate-50/20"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || { type: (new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6 || getHolidays(year)[dStr]) ? "Riposo" : "Lavoro", hours: (new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6 || getHolidays(year)[dStr]) ? 0 : 8 };
                days.push(
                  <div key={d} onClick={() => setSelectedDay({...data, date: dStr})} className="h-36 bg-white p-3 cursor-pointer hover:bg-blue-50 transition-all border-[0.5px] border-slate-50 relative">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-black text-slate-300">{d}</span>{getHolidays(year)[dStr] && <span className="text-[7px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-black uppercase">{getHolidays(year)[dStr]}</span>}</div>
                    <div className={`rounded-2xl p-3 text-[10px] font-bold h-24 flex flex-col justify-between shadow-sm ${(data.type === "Lavoro") ? "bg-green-100 text-green-800 border-l-4 border-green-600" : (data.type === "Ferie Godute" || data.type === "Malattia") ? "bg-red-100 text-red-800 border-l-4 border-red-600" : (data.type === "Permesso ROL" || data.type === "Permesso 104") ? "bg-blue-100 text-blue-800 border-l-4 border-blue-600" : "bg-slate-100 text-slate-400 border-l-4 border-slate-300"}`}>
                      <div className="uppercase tracking-tighter truncate">{data.type}</div>
                      <div className="text-[9px] italic opacity-60 truncate leading-tight">{data.notes}</div>
                      <div className="text-right font-black text-xs">{data.hours > 0 ? `${data.hours}h` : ''}</div>
                    </div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-7 rounded-[3rem] shadow-xl border-2 border-orange-100 relative overflow-hidden">
            <h3 className="text-[10px] font-black uppercase text-orange-500 mb-6 flex items-center gap-2"><AlertTriangle size={16}/> Controllo Busta</h3>
            <div className="space-y-4">
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Residuo Ferie Busta</label><input type="number" step="0.01" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none mt-1" value={currentPayslip.ferie} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, ferie: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/></div>
                <div><label className="text-[9px] font-black text-slate-400 uppercase">Residuo ROL Busta</label><input type="number" step="0.01" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none mt-1" value={currentPayslip.rol} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, rol: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/></div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl">
            <h3 className="text-[10px] font-black uppercase opacity-40 mb-8 tracking-widest">Riepilogo Mensile</h3>
            <div className="space-y-5 font-bold text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Ore Lavoro</span><span className="text-lg">{monthStats.lavorate}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-red-300"><span>Ferie (GG)</span><span className="text-lg">{monthStats.ferie}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-blue-300"><span>ROL</span><span className="text-lg">{monthStats.rol}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-purple-300"><span>104</span><span className="text-lg">{monthStats.p104}h</span></div>
              <div className="flex justify-between text-yellow-300"><span>Malattia</span><span className="text-lg">{monthStats.malattia}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl relative">
            <h2 className="text-3xl font-black mb-10 text-slate-900">Setup Saldi</h2>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Mese Finale Busta (es. Agosto)</label><input type="month" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.dataInizioSaldo} onChange={(e) => setBalances({...balances, dataInizioSaldo: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saldo Ferie Agosto</label><input type="text" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saldo ROL Agosto</label><input type="text" className="w-full bg-slate-50 p-5 rounded-2xl font-bold mt-2" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Matura Ferie</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100 mt-2" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Matura ROL</label><input type="text" className="w-full bg-indigo-50 p-5 rounded-2xl font-bold border-2 border-indigo-100 mt-2" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/></div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v4"); setShowSettings(false); }} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">Salva Parametri</button>
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
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Festivo", "Riposo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-4 rounded-[1.5rem] border-2 font-black text-[10px] uppercase transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>{t}</button>
                ))}
            </div>
            <div className="flex items-center justify-center gap-8 bg-blue-50 p-6 rounded-[2.5rem] mb-8 font-black shadow-inner">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, parseFloat(selectedDay.hours || 0) - 0.5)})} className="text-5xl text-blue-600">-</button>
                <div className="text-center"><p className="text-[10px] uppercase text-blue-400 mb-1">Ore</p><span className="text-6xl text-blue-900 font-mono tracking-tighter">{selectedDay.hours}</span></div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: parseFloat(selectedDay.hours || 0) + 0.5})} className="text-5xl text-blue-600">+</button>
            </div>
            <div className="mb-8"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Nota Giornaliera</label><textarea className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.5rem] h-24 text-sm outline-none focus:border-blue-400 font-medium" value={selectedDay.notes || ""} onChange={(e) => setSelectedDay({...selectedDay, notes: e.target.value})}/></div>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black text-xl uppercase shadow-xl transition-transform active:scale-95">Salva Giorno</button>
            <button onClick={() => setSelectedDay(null)} className="absolute top-8 right-8 p-2 bg-slate-100 rounded-full text-slate-400"><X/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
