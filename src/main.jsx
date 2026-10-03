import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Activity,AlertTriangle,Check,Clock3,RefreshCw,Trash2,Wifi,WifiOff} from 'lucide-react';
import './index.css';

const REF={
 MLB:[
  {id:'mlb-1',event:'Milwaukee Brewers vs San Diego Padres',selection:'Milwaukee +1.5 carreras',price:-160,prob:70,kind:'reference'},
  {id:'mlb-2',event:'San Diego Padres vs Milwaukee Brewers · J2',selection:'Ambos equipos anotan 2+ carreras',price:-140,prob:62,kind:'reference'},
  {id:'mlb-3',event:'San Diego Padres vs Milwaukee Brewers',selection:'Más de 6.5 carreras totales',price:-110,prob:57,kind:'reference'}],
 NFL:[
  {id:'nfl-1',event:'Buffalo Bills vs New England Patriots',selection:'Más de 33.5 puntos',price:-115,prob:58,kind:'reference'},
  {id:'nfl-2',event:'Kansas City Chiefs vs Las Vegas Raiders',selection:'Más de 1.5 pases de TD',price:-180,prob:76,kind:'reference'},
  {id:'nfl-3',event:'Kansas City Chiefs vs Las Vegas Raiders',selection:'Doble oportunidad Chiefs',price:-350,prob:88,kind:'reference'}],
 LMX:[
  {id:'lmx-1',event:'Liga MX · próximos partidos',selection:'Más de 7.5 córners',price:-160,prob:72,kind:'reference'},
  {id:'lmx-2',event:'Liga MX · delantero titular',selection:'Más de 0.5 tiros a puerta',price:-200,prob:80,kind:'reference'},
  {id:'lmx-3',event:'Liga MX · mediocampista ofensivo',selection:'Más de 0.5 tiros totales',price:-260,prob:85,kind:'reference'}]
};
const TABS=[['MLB','MLB'],['NFL','NFL'],['LMX','Liga MX · props']];
function americanToDecimal(a){return a>0?1+a/100:1+100/Math.abs(a)}
function implied(a){return 1/americanToDecimal(a)}
function fairAmerican(p){if(p<=0)return 0; if(p<=.5)return 100/p-100; return -(100*p/(1-p))}
function fmtAmerican(a){return a>0?`+${Math.round(a)}`:`${Math.round(a)}`}
function vigFree(prices){const ps=prices.map(implied); const sum=ps.reduce((a,b)=>a+b,0); return ps.map(p=>p/sum)}
function normalizeEvent(event,market,bookmaker){
 const outcomes=market.outcomes||[]; if(!outcomes.length)return [];
 const probs=vigFree(outcomes.map(o=>o.price));
 return outcomes.map((o,i)=>({event:`${event.away_team} vs ${event.home_team}`,selection:`${o.name}${o.point!=null?` ${o.point}`:''}`,price:o.price,prob:Math.round(probs[i]*1000)/10,kind:'live',bookmaker,market:market.key,id:`${event.id}-${market.key}-${i}`,time:event.commence_time}))
}
async function oddsFetch(sport,markets,signal){
 const key=import.meta.env.VITE_ODDS_API_KEY; if(!key) throw new Error('missing-key');
 const url=`https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=us&markets=${encodeURIComponent(markets)}&oddsFormat=american&apiKey=${encodeURIComponent(key)}`;
 const r=await fetch(url,{signal}); if(r.status===429)throw Object.assign(new Error('rate-limit'),{code:429}); if(!r.ok)throw new Error(`api-${r.status}`); return r.json();
}
async function loadLive(tab,signal){
 if(tab==='MLB'){const data=await oddsFetch('baseball_mlb','h2h,totals',signal); return pickBest(data,'MLB')}
 if(tab==='NFL'){const data=await oddsFetch('americanfootball_nfl','h2h,totals',signal); return pickBest(data,'NFL')}
 // Liga MX: try the Odds API soccer key, then fallback if unavailable.
 const data=await oddsFetch('soccer_mexico_ligamx','h2h,totals',signal); return pickBest(data,'LMX');
}
function pickBest(data,tab){
 const rows=[];
 for(const e of data||[]){for(const b of e.bookmakers||[]){for(const m of b.markets||[]){rows.push(...normalizeEvent(e,m,b.title))}}}
 // Keep a compact, diversified top 3; soccer totals can represent goals/corners depending on provider, so label exact market.
 const filtered=rows.filter(x=>x.market==='totals'||x.market==='h2h').sort((a,b)=>b.prob-a.prob);
 const uniq=[]; const seen=new Set(); for(const x of filtered){const k=`${x.event}|${x.selection}`;if(!seen.has(k)){seen.add(k);uniq.push(x)} if(uniq.length>=3)break}
 return uniq;
}
function App(){
 const [tab,setTab]=useState('MLB'); const [live,setLive]=useState({MLB:null,NFL:null,LMX:null}); const [updated,setUpdated]=useState(null); const [seconds,setSeconds]=useState(0); const [loading,setLoading]=useState(false); const [status,setStatus]=useState('reference'); const [error,setError]=useState(''); const [selected,setSelected]=useState([]); const abortRef=useRef(null);
 const current=useMemo(()=>live[tab]?.length?live[tab]:REF[tab],[live,tab]);
 const sorted=useMemo(()=>[...current].sort((a,b)=>b.prob-a.prob),[current]);
 const load=useCallback(async()=>{abortRef.current?.abort();const c=new AbortController();abortRef.current=c;setLoading(true);setError('');try{const data=await loadLive(tab,c.signal);if(data.length){setLive(x=>({...x,[tab]:data}));setStatus('live');setUpdated(Date.now());setSeconds(0)}else{setStatus('reference');setError('Sin mercados disponibles; mostrando referencia.')}}catch(e){if(e.name!=='AbortError'){setStatus('reference');setError(e.code===429?'Límite de API alcanzado; conservando la última data.':'API no disponible; mostrando referencia.')}}finally{setLoading(false)}},[tab]);
 useEffect(()=>{load();return()=>abortRef.current?.abort()},[load]);
 useEffect(()=>{const id=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>{const id=setInterval(load,60000);return()=>clearInterval(id)},[load]);
 const toggle=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const selectedRows=useMemo(()=>TABS.flatMap(([key])=> (live[key]?.length?live[key]:REF[key])).filter(x=>selected.includes(x.id)),[selected,live]);
 const combo=useMemo(()=>{if(!selectedRows.length)return null;const p=selectedRows.reduce((a,x)=>a*x.prob/100,1);return{n:selectedRows.length,p,fair:fairAmerican(p)}},[selectedRows]);
 const clear=()=>setSelected([]);
 return <div className="min-h-screen bg-[#f5f7fb] text-slate-900"><main className="mx-auto w-full max-w-[480px] min-h-screen bg-white shadow-sm safe-bottom">
  <header className="px-5 pt-5 pb-3 border-b border-slate-100 sticky top-0 z-20 bg-white/95 backdrop-blur">
   <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600"/><h1 className="text-xl font-black tracking-tight">Boletín Codere MX</h1></div><p className="mt-1 text-xs text-slate-500">Fin de semana · {new Intl.DateTimeFormat('es-MX',{dateStyle:'full'}).format(new Date())}</p></div>
   <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${status==='live'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{status==='live'?<Wifi size={12}/>:<WifiOff size={12}/>} {status==='live'?'EN VIVO':'REFERENCIA'}</div></div>
   <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span className="flex items-center gap-1"><Clock3 size={13}/>Actualizado hace {seconds}s</span><button onClick={load} disabled={loading} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 active:scale-95"> <RefreshCw size={12} className={loading?'animate-spin':''}/> Actualizar</button></div>
  </header>
  <nav className="grid grid-cols-3 border-b border-slate-100">{TABS.map(([k,label])=><button key={k} onClick={()=>setTab(k)} className={`py-3 text-xs font-bold ${tab===k?'text-blue-700 border-b-2 border-blue-600':'text-slate-500'}`}>{label}</button>)}</nav>
  <section className="px-4 pt-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">Mejores selecciones</h2><span className="text-[10px] font-semibold text-slate-400">3 ordenadas por acierto</span></div>{error&&<div className="mb-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
   <div className="space-y-3">{sorted.map((x,i)=><article key={x.id} className="rounded-2xl border border-slate-200 p-4 shadow-[0_2px_10px_rgba(15,23,42,.04)]"><div className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{i+1}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold text-slate-500">{x.event}</p><p className="mt-1 text-sm font-extrabold leading-snug">{x.selection}</p></div><input aria-label="Agregar al parlay" type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)} className="mt-1 h-5 w-5 accent-blue-600"/></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="tabular rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-black text-white">{fmtAmerican(x.price)}</span><span className={`text-[10px] font-bold ${x.kind==='live'?'text-emerald-600':'text-amber-600'}`}>{x.kind==='live'?'momio en vivo':'momio de referencia'}</span></div><span className="tabular text-sm font-black text-slate-700">{x.prob.toFixed(1)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${Math.min(100,x.prob)}%`}}/></div><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>tasa implícita sin vig</span>{x.time&&<span>{new Date(x.time).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>}</div></div></div></article>)}</div>
  </section>
  </main>
  {combo&&<aside className="fixed bottom-[58px] left-1/2 z-30 w-[min(480px,100%)] -translate-x-1/2 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,.10)] backdrop-blur"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500">Parlay · {combo.n} selección{combo.n===1?'':'es'}</p><p className={`tabular text-xl font-black ${combo.p<.5?'text-red-600':'text-slate-900'}`}>{(combo.p*100).toFixed(1)}% <span className="text-xs font-semibold text-slate-400">prob. combinada</span></p></div><div className="text-right"><p className="text-[10px] text-slate-400">Momio justo</p><p className="tabular text-lg font-black">{fmtAmerican(combo.fair)}</p></div></div>{combo.n>=4&&<p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-red-600"><AlertTriangle size={13}/> 4+ selecciones: el acierto combinado cae rápidamente.</p>}<button onClick={clear} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-700"><Trash2 size={14}/> Limpiar</button></aside>}
  <footer className="fixed bottom-0 left-0 z-20 w-full border-t border-slate-200 bg-slate-950 px-4 py-2 text-center text-[10px] leading-tight text-slate-300">Tasas implícitas de mercado, no garantías. La probabilidad combinada es el producto de cada selección: a más patas, menor acierto real. <b className="text-white">+18 · Juega con responsabilidad.</b></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
