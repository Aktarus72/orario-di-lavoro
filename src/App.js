import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Info, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  const [payslipData, setPayslipData] = useState({}); // Dati inseriti da busta paga azienda
  const [showSettings, setShowSettings] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [balances, setBalances] = useState({ ferieIniziali: "0", rolIniziali: "0", maturazioneFerie: "2.1", maturazioneRol: "7", dataInizioSaldo: "2024-03" });

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

  const getDefaultShift = (dateStr) => {
    const date = new Date(dateStr);
    const holidays = getHolidays(date.getFullYear());
    if (holidays[dateStr]) return { type: "Festivo", hours: 0, label: holidays[dateStr] };
    if (date.getDay() === 0) return { type: "Riposo", hours: 0, label: "Domenica" };
    if (date.getDay() === 6) return { type: "Riposo", hours: 0, label: "Sabato" };
    return { type: "Lavoro", hours: 8, label: "" };
  };

  const shiftColors = { "Lavoro": "bg-green-100 text-green-800 border-l-4 border-green-600", "Ferie Godute": "bg-red-100 text-red-800 border-l-4 border-red-600", "Malattia": "bg-red-100 text-red-800 border-l-4 border-red-600", "Permesso ROL": "bg-blue-100 text-blue-800 border-l-4 border-blue-600", "Permesso 104": "bg-blue-100 text-blue-800 border-l-4 border-blue-600", "Festivo": "bg-orange-100 text-orange-800 border-l-4 border-orange-500", "default": "bg-gray-100 text-gray-400 border-l-4 border-gray-300" };

  const globalStats = (() => {
    let s = { lavorateMese: 0, ferieMese: 0, rolMese: 0, p104Mese: 0, ferieTotali: 0, rolTotali: 0 };
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    const totalDays = new Date(y, m + 1, 0).getDate();
    const holidays = getHolidays(y);
    for (let d = 1; d <= totalDays; d++) {
        const dStr = formatDate(y, m, d);
        if (workData[dStr]) {
            const e = workData[dStr];
            if (e.type === "Lavoro") s.lavorateMese += parseFloat(e.hours || 0);
            if (e.type === "Ferie Godute") s.ferieMese += 1;
            if (e.type === "Permesso ROL") s.rolMese += parseFloat(e.hours || 0);
            if (e.type === "Permesso 104") s.p104Mese += parseFloat(e.hours || 0);
        } else {
            const isH = !!holidays[dStr], isW = new Date(dStr).getDay() === 0 || new Date(dStr).getDay() === 6;
            if (!isH && !isW) s.lavorateMese += 8;
        }
    }
    Object.keys(workData).forEach(k => {
        const e = workData[k];
        if (e.type === "Ferie Godute") s.ferieTotali += 1;
        if (e.type === "Permesso ROL") s.rolTotali += parseFloat(e.hours || 0);
    });
    return s;
  })();

  const getCalculatedBalances = () => {
    const start = new Date(balances.dataInizioSaldo + "-01");
    const now = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const diffMesi = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const mesiMaturati = Math.max(0, diffMesi);
    return {
        ferie: parseFloat(balances.ferieIniziali || 0) + (mesiMaturati * parseFloat(balances.maturazioneFerie || 0)) - globalStats.ferieTotali,
        rol: parseFloat(balances.rolIniziali || 0) + (mesiMaturati * parseFloat(balances.maturazioneRol || 0)) - globalStats.rolTotali
    };
  };

  const myRes = getCalculatedBalances();
  const currentPayslip = payslipData[currentMonthKey] || { ferie: "", rol: "" };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-slate-50 min-h-screen font-sans pb-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl bg-white border-b-4 shadow-sm ${myRes.ferie < 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Mio Residuo Ferie</p>
          <p className="text-xl font-black">{myRes.ferie.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded-2xl bg-white border-b-4 shadow-sm ${myRes.rol < 0 ? 'border-red-500' : 'border-blue-500'}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Mio Residuo ROL</p>
          <p className="text-xl font-black">{myRes.rol.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-b-4 border-indigo-500 flex justify-between items-center shadow-sm">
          <div><p className="text-[9px] font-bold text-gray-400 uppercase">Maturazione</p><p className="text-xs font-black text-indigo-600">+{balances.maturazioneFerie}F / +{balances.maturazioneRol}R</p></div>
          <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-50 rounded-lg"><Settings size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronLeft/></button>
            <h1 className="text-xl font-black capitalize tracking-tight">{currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}</h1>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full"><ChevronRight/></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 border rounded-2xl overflow-hidden shadow-inner">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="bg-gray-50 p-3 text-center text-[10px] font-black text-gray-400 uppercase">{d}</div>)}
            {(() => {
              const year = currentDate.getFullYear(), month = currentDate.getMonth();
              const totalDays = new Date(year, month + 1, 0).getDate();
              const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
              const days = [];
              for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="h-32 bg-gray-50/30"></div>);
              for (let d = 1; d <= totalDays; d++) {
                const dStr = formatDate(year, month, d);
                const data = workData[dStr] || getDefaultShift(dStr);
                days.push(
                  <div key={d} onClick={() => setSelectedDay({ ...data, date: dStr })} className="h-32 bg-white p-2 cursor-pointer hover:bg-blue-50/50 transition-all border-[0.5px] border-gray-50">
                    <div className="flex justify-between items-start mb-2"><span className={`text-[11px] font-black ${data.label ? 'text-red-500' : 'text-gray-300'}`}>{d}</span>{data.label && <span className="text-[7px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md uppercase font-black truncate max-w-[50px]">{data.label}</span>}</div>
                    <div className={`rounded-xl p-2 text-[10px] font-bold h-20 flex flex-col justify-between overflow-hidden shadow-sm ${shiftColors[data.type] || shiftColors.default}`}><div className="uppercase leading-tight text-[9px]">{data.type}</div><div className="text-[8px] italic opacity-60 truncate font-medium">{data.notes}</div><div className="text-right text-xs font-black">{data.hours > 0 ? `${data.hours}h` : ''}</div></div>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>

        <div className="space-y-4">
          {/* BOX CONFRONTO AZIENDA */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-orange-100">
            <h3 className="text-[10px] font-black uppercase text-orange-500 mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Verifica Busta Paga</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase">Residuo Ferie da Busta</label>
                <div className="flex gap-2">
                    <input type="number" placeholder="es: 70.15" className="w-full bg-gray-50 p-2 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-orange-300" 
                    value={currentPayslip.ferie} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, ferie: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/>
                    <div className={`p-2 rounded-lg flex items-center ${Math.abs(parseFloat(currentPayslip.ferie || 0) - myRes.ferie) < 0.5 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {Math.abs(parseFloat(currentPayslip.ferie || 0) - myRes.ferie) < 0.5 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                    </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase">Residuo ROL da Busta</label>
                <div className="flex gap-2">
                    <input type="number" placeholder="es: -214.5" className="w-full bg-gray-50 p-2 rounded-xl text-sm font-bold border border-gray-100 outline-none focus:border-orange-300" 
                    value={currentPayslip.rol} onChange={(e) => { const n = {...payslipData, [currentMonthKey]: {...currentPayslip, rol: e.target.value}}; setPayslipData(n); saveToCloud(n, "buste_paga"); }}/>
                    <div className={`p-2 rounded-lg flex items-center ${Math.abs(parseFloat(currentPayslip.rol || 0) - myRes.rol) < 1 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        {Math.abs(parseFloat(currentPayslip.rol || 0) - myRes.rol) < 1 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                    </div>
                </div>
              </div>
              {currentPayslip.ferie && (
                  <p className="text-[8px] italic text-gray-400 leading-tight">L'app segnala discrepanze se i valori differiscono dai tuoi calcoli.</p>
              )}
            </div>
          </div>

          <div className="bg-blue-900 text-white p-6 rounded-[2.5rem] shadow-xl">
            <h3 className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-widest">Riepilogo {currentDate.toLocaleString('it-IT', { month: 'short' })}</h3>
            <div className="space-y-3 font-bold text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Ore Lavoro</span><span>{globalStats.lavorateMese}h</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-red-300"><span>Ferie (GG)</span><span>{globalStats.ferieMese}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-blue-300"><span>Permessi ROL</span><span>{globalStats.rolMese}h</span></div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="font-black mb-2 text-[10px] uppercase text-gray-400">Note {currentDate.toLocaleString('it-IT', { month: 'short' })}</h3>
            <textarea className="w-full border-none p-3 rounded-xl h-32 text-sm bg-gray-50 outline-none" value={monthNotes[currentMonthKey] || ""} onChange={(e) => { const n = {...monthNotes, [currentMonthKey]: e.target.value}; setMonthNotes(n); saveToCloud(n, "note"); }} placeholder="Anomalie riscontrate..."/>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl border-t-8 border-indigo-500">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-gray-800">Setup Saldi</h2><button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Mese Busta Paga Riferimento</label><input type="month" className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold" value={balances.dataInizioSaldo} onChange={(e) => setBalances({...balances, dataInizioSaldo: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Saldo Ferie (GG)</label><input type="text" className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold" value={balances.ferieIniziali} onChange={(e) => setBalances({...balances, ferieIniziali: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Saldo ROL (H)</label><input type="text" className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold" value={balances.rolIniziali} onChange={(e) => setBalances({...balances, rolIniziali: e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block">Matura Ferie/Mese</label><input type="text" className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl font-bold text-indigo-700" value={balances.maturazioneFerie} onChange={(e) => setBalances({...balances, maturazioneFerie: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block">Matura ROL/Mese</label><input type="text" className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl font-bold text-indigo-700" value={balances.maturazioneRol} onChange={(e) => setBalances({...balances, maturazioneRol: e.target.value})}/></div>
              </div>
              <button onClick={() => { saveToCloud(balances, "saldi_v4"); setShowSettings(false); }} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase">Salva e Ricalcola</button>
            </div>
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md border-4 border-blue-600 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-blue-900 capitalize">{new Date(selectedDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}</h2><button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X/></button></div>
            <div className="grid grid-cols-2 gap-3 mb-8">
                {["Lavoro", "Ferie Godute", "Permesso ROL", "Permesso 104", "Malattia", "Riposo"].map(t => (
                  <button key={t} onClick={() => setSelectedDay({...selectedDay, type: t, hours: (t === "Lavoro" ? 8 : (t === "Permesso 104" ? 2 : 0))})} 
                  className={`p-4 rounded-[1.5rem] border-2 font-black text-[10px] uppercase transition-all ${selectedDay.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{t}</button>
                ))}
            </div>
            <div className="flex items-center justify-center gap-8 bg-blue-50 p-6 rounded-[2.5rem] mb-8 font-black">
                <button onClick={() => setSelectedDay({...selectedDay, hours: Math.max(0, parseFloat(selectedDay.hours || 0) - 1)})} className="text-4xl text-blue-600">-</button>
                <div className="text-center"><p className="text-[10px] uppercase text-blue-400 mb-1">Ore</p><span className="text-5xl text-blue-900">{selectedDay.hours}</span></div>
                <button onClick={() => setSelectedDay({...selectedDay, hours: parseFloat(selectedDay.hours || 0) + 1})} className="text-4xl text-blue-600">+</button>
            </div>
            <textarea className="w-full border-2 border-gray-100 p-5 rounded-[2rem] h-28 mb-8 text-sm outline-none" placeholder="Nota..." value={selectedDay.notes || ""} onChange={e => setSelectedDay({...selectedDay, notes: e.target.value})}/>
            <button onClick={() => { const nd = {...workData, [selectedDay.date]: selectedDay}; setWorkData(nd); saveToCloud(nd, "calendario"); setSelectedDay(null); }} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl uppercase">Salva</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCalendar;
