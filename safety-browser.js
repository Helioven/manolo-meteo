// Copia experimental de MET-SAFETY-002; no es producción.
(function(root){const core=(function(){
'use strict';
const HOUR=3600000,TTL=30*60000;
const WMO={storm:new Set([95,96,97,99]),ice:new Set([56,57,66,67]),snow:new Set([71,73,75,77,85,86]),heavy:new Set([63,65,82]),fog:new Set([45,48]),rain:new Set([51,53,55,61,80,81]),sky:new Set([0,1,2,3])};
const priority=['storm','ice','snow','heavy','wind','heat','cold','fog','rain','precipitation'];
const formatters=new Map(),localCache=new Map();
function formatter(zone){if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return formatters.get(zone)}
function localParts(ms,zone){const p=Object.fromEntries(formatter(zone).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return {day:`${p.year}-${p.month}-${p.day}`,clock:`${p.hour}:${p.minute}`,hour:Number(p.hour)}}
function validDay(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s}
function resolveLocal(text,zone){const cacheKey=zone+'|'+text;if(localCache.has(cacheKey))return localCache.get(cacheKey);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)||!validDay(text.slice(0,10)))return null;const naive=Date.parse(text+':00Z');if(!Number.isFinite(naive))return null;const found=[];for(let offset=-14*60;offset<=14*60;offset+=15){const ms=naive-offset*60000,p=localParts(ms,zone);if(`${p.day}T${p.clock}`===text)found.push(ms)}const result=found.length===1?found[0]:null;if(localCache.size>=4096)localCache.clear();localCache.set(cacheKey,result);return result}
function dateNext(day){return new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10)}
function normalizeCity(c){if(!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string'||!c.name||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||typeof c.timezone!=='string')throw Error('localidad inválida');formatter(c.timezone).format(new Date(0));return {id:c.id,name:c.name,latitude:c.latitude,longitude:c.longitude,timezone:c.timezone}}
function sameCity(a,b){return !!a&&!!b&&a.id===b.id&&a.latitude===b.latitude&&a.longitude===b.longitude&&a.timezone===b.timezone}
function classifyWmo(code){for(const [name,values] of Object.entries(WMO))if(values.has(code))return name;return null}
function normalize({city,owner,raw,receivedAt,source,now,maxAge=TTL}){
 city=normalizeCity(city);owner=normalizeCity(owner);if(!sameCity(city,owner))throw Error('identidad de localidad incompatible');
 if(!Number.isFinite(now)||!Number.isFinite(receivedAt)||!Number.isFinite(maxAge)||maxAge<=0||maxAge>TTL||receivedAt>now||now-receivedAt>maxAge)throw Error('previsión caducada o fecha inválida');
 if(!['Open-Meteo','synthetic'].includes(source))throw Error('procedencia desconocida');if(raw?.timezone!==city.timezone)throw Error('zona incompatible');const lat=raw?.latitude,lon=raw?.longitude;if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)throw Error('cuadrícula inválida');const rad=Math.PI/180,q=Math.sin((lat-city.latitude)*rad/2)**2+Math.cos(lat*rad)*Math.cos(city.latitude*rad)*Math.sin((lon-city.longitude)*rad/2)**2;if(12742*Math.asin(Math.sqrt(Math.min(1,q)))>100)throw Error('cuadrícula incompatible');
 const u=raw.hourly_units;if(u?.temperature_2m!=='°C'||u?.wind_speed_10m!=='km/h'||u?.precipitation_probability!=='%')throw Error('unidades incompatibles');
 if(!Array.isArray(raw?.hourly?.time))throw Error('horas ausentes');const h=raw.hourly,rows=[],unlocated=[],isoOffsets=new Set();let invalidTimes=0;
 for(let i=0;i<h.time.length;i++){
  const t=h.time[i],ms=typeof t==='number'&&u.time==='unixtime'?t*1000:typeof t==='string'&&u.time==='iso8601'?resolveLocal(t,city.timezone):null;
  const get=(key)=>Array.isArray(h[key])?h[key][i]:null;const code=get('weather_code'),temp=get('temperature_2m'),wind=get('wind_speed_10m'),prob=get('precipitation_probability');
  const row={start:Number.isFinite(ms)?ms:null,code:Number.isInteger(code)&&classifyWmo(code)?code:null,temperature:Number.isFinite(temp)?temp:null,wind:Number.isFinite(wind)&&wind>=0?wind:null,probability:Number.isFinite(prob)&&prob>=0&&prob<=100?prob:null};
  if(row.start===null){invalidTimes++;unlocated.push(row)}else{if(u.time==='iso8601')isoOffsets.add(Date.parse(t+':00Z')-row.start);rows.push(row)}
 }
 const isoDstUncertain=isoOffsets.size>1;if(isoDstUncertain){unlocated.push(...rows);rows.length=0;invalidTimes++}rows.sort((a,b)=>a.start-b.start);const duplicates=rows.some((r,i)=>i&&r.start===rows[i-1].start);
 const c=raw.current;let current=null;if(c&&typeof c==='object'){const ct=c.time,unit=raw.current_units?.time||u.time;const ms=typeof ct==='number'&&unit==='unixtime'?ct*1000:typeof ct==='string'&&unit==='iso8601'?resolveLocal(ct,city.timezone):null;current={start:Number.isFinite(ms)?ms:null,code:Number.isInteger(c.weather_code)&&classifyWmo(c.weather_code)?c.weather_code:null,temperature:raw.current_units?.temperature_2m==='°C'&&Number.isFinite(c.temperature_2m)?c.temperature_2m:null,wind:raw.current_units?.wind_speed_10m==='km/h'&&Number.isFinite(c.wind_speed_10m)&&c.wind_speed_10m>=0?c.wind_speed_10m:null,probability:null}}
 return {city,source,receivedAt,maxAge,expiresAt:receivedAt+maxAge,grid:{latitude:lat,longitude:lon},timeFormat:u.time,probabilitySemantics:'preceding-hour',unit:{temperature:'°C',wind:'km/h',probability:'%'},rows,invalidTimes,duplicates,unlocated,isoDstUncertain,current};
}
function risk(row){const kinds=[],kind=classifyWmo(row.code);if(kind&&kind!=='sky')kinds.push(kind);if(Number.isFinite(row.wind)&&row.wind>=35)kinds.push('wind');if(Number.isFinite(row.temperature)&&row.temperature>=33)kinds.push('heat');if(Number.isFinite(row.temperature)&&row.temperature<=0)kinds.push('cold');if(Number.isFinite(row.probability)&&row.probability>=30)kinds.push('precipitation');return kinds}
function textRisk(k){return {storm:'posible tormenta',ice:'posible precipitación helada',snow:'posible nieve',heavy:'posible lluvia moderada o intensa',wind:'viento que requiere precaución',heat:'temperaturas elevadas',cold:'temperaturas muy bajas',fog:'posible niebla',rain:'posible lluvia o llovizna',precipitation:'posible precipitación'}[k]}
function precaution(k){return {storm:'Si se acerca una tormenta o escuchas truenos, busca refugio en un edificio seguro o un vehículo cerrado con techo metálico.',ice:'Extrema la precaución ante posibles superficies resbaladizas.',snow:'Consulta las condiciones locales y evita trayectos inseguros.',heavy:'Evita zonas inundadas y busca resguardo si las condiciones son peligrosas.',wind:'Busca resguardo y aléjate de objetos que puedan caer.',heat:'Bebe agua y busca un lugar fresco.',cold:'Abrígate y limita la exposición al frío.',fog:'Si conduces con poca visibilidad, reduce la velocidad y aumenta la distancia.',rain:'Considera protección impermeable y revisa la evolución.',precipitation:'Consulta la previsión por horas y prepara una alternativa.'}[k]}
function fmt(ms,zone){return localParts(ms,zone)}
function rangeText(start,end,zone){const a=fmt(start,zone),b=fmt(end,zone);const offset=t=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(new Date(t)).find(x=>x.type==='timeZoneName').value;const oa=offset(start),ob=offset(end),cross=oa!==ob;return `${a.day} ${a.clock}${cross?' '+oa:''}–${a.day!==b.day?b.day+' ':''}${b.clock}${cross?' '+ob:''}`}
function evaluate(snapshot,{view,now,day}){
 if(!snapshot||!Number.isFinite(now)||!Number.isFinite(snapshot.receivedAt)||!Number.isFinite(snapshot.maxAge)||snapshot.maxAge<=0||snapshot.maxAge>TTL||!Array.isArray(snapshot.rows)||!Array.isArray(snapshot.unlocated)||!snapshot.city?.timezone)return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Instantánea inválida.',range:null,risks:[]};
 try{normalizeCity(snapshot.city)}catch{return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Localidad inválida.',range:null,risks:[]}}
 const validRow=(r,needsTime)=>r&&typeof r==='object'&&(!needsTime||Number.isFinite(r.start))&&(r.code===null||Number.isInteger(r.code)&&!!classifyWmo(r.code))&&(r.temperature===null||Number.isFinite(r.temperature))&&(r.wind===null||Number.isFinite(r.wind)&&r.wind>=0)&&(r.probability===null||Number.isFinite(r.probability)&&r.probability>=0&&r.probability<=100);
 if(!['Open-Meteo','synthetic'].includes(snapshot.source)||!Number.isInteger(snapshot.invalidTimes)||typeof snapshot.duplicates!=='boolean'||snapshot.rows.some(r=>!validRow(r,true))||snapshot.unlocated.some(r=>!validRow(r,false))||(snapshot.current&&!validRow(snapshot.current,false)))return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Instantánea inválida.',range:null,risks:[]};
 if(now<snapshot.receivedAt||now-snapshot.receivedAt>snapshot.maxAge)return {status:'stale',coverage:'none',exposureAllowed:false,reason:'Previsión caducada o fecha inválida.',range:null,risks:[]};
 const zone=snapshot.city.timezone,today=localParts(now,zone).day;let start,end;
 if(view==='six'){start=now;end=now+6*HOUR}else if(view==='day'&&validDay(day)&&day>=today){const from=resolveLocal(day+'T00:00',zone),to=resolveLocal(dateNext(day)+'T00:00',zone);if(from===null||to===null)return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Fecha local no resoluble.',range:null,risks:[]};start=day===today?now:from;end=to}else return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Ventana o fecha inválida.',range:null,risks:[]};
 if(start>=end)return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'No quedan horas en el día.',range:null,risks:[]};
 const rows=snapshot.rows.filter(r=>r.start<end&&r.start+HOUR>start),all=new Map(snapshot.rows.map(r=>[r.start,r]));let complete=!!rows.length&&!snapshot.invalidTimes&&!snapshot.duplicates;
 if(rows.length&&(rows[0].start>start||rows.at(-1).start+HOUR<end))complete=false;
 const considered=[];let flags=[];
 for(let i=0;i<rows.length;i++){
  const r=rows[i],next=all.get(r.start+HOUR),prob=next?.probability??null,entry={...r,probability:prob};
  if(i&&r.start!==rows[i-1].start+HOUR)complete=false;
  if(r.code===null||r.temperature===null||r.wind===null||prob===null)complete=false;
  flags.push(...risk(entry));considered.push(entry);
 }
 const windowRisk=new Set(flags);let recentCurrent=false,uncertainCurrent=false,currentRisk=[];
 if(snapshot.current&&(view==='six'||day===today)){const currentFlags=risk(snapshot.current),timestamp=snapshot.current.start,fresh=Number.isFinite(timestamp)&&timestamp<=now&&now-timestamp<=45*60000;currentRisk=currentFlags;if(!fresh||snapshot.current.code===null||snapshot.current.temperature===null||snapshot.current.wind===null)complete=false;if(currentFlags.length){if(fresh){recentCurrent=true;flags.push(...currentFlags)}else{uncertainCurrent=true;flags.push(...currentFlags)}}}
 const unknownTimeRisks=new Set();for(const r of snapshot.unlocated){const found=risk(r);found.forEach(x=>unknownTimeRisks.add(x));flags.push(...found)}
 const unique=[...new Set(flags)].sort((a,b)=>priority.indexOf(a)-priority.indexOf(b));const coverage=complete?'complete':rows.length||snapshot.unlocated.length?'partial':'none';
 if(unique.length)return {status:'risk',coverage,exposureAllowed:false,reason:windowRisk.has(unique[0])?`La previsión señala ${textRisk(unique[0])} en una muestra de referencia.${coverage==='partial'?' Faltan datos para evaluar todo el periodo.':''}`:currentRisk.includes(unique[0])&&recentCurrent?`El dato actual del modelo señala ${textRisk(unique[0])}.${coverage==='partial'?' Faltan datos para evaluar todo el periodo.':''}`:currentRisk.includes(unique[0])&&uncertainCurrent?`Se detectó ${textRisk(unique[0])} en un dato actual desactualizado o sin hora fiable; no se descarta riesgo. Faltan datos para evaluar todo el periodo.`:`Se detectó ${textRisk(unique[0])} en datos sin hora fiable; no se descarta riesgo. Faltan datos para evaluar todo el periodo.`,precaution:precaution(unique[0]),range:null,risks:unique,window:{start,end},samples:considered,unlocatedCount:snapshot.unlocated.length,city:snapshot.city,source:snapshot.source};
 if(!complete)return {status:'unknown',coverage,exposureAllowed:false,reason:'Faltan datos fiables para evaluar todo el periodo; no se descarta riesgo.',precaution:'Comprueba la previsión actualizada antes de decidir.',range:null,risks:[],window:{start,end},samples:considered,city:snapshot.city,source:snapshot.source};
 if(view==='six')return {status:'clear',coverage,exposureAllowed:true,reason:'No se detectan los riesgos definidos en las muestras de esta ventana.',range:null,risks:[],window:{start,end},samples:considered,city:snapshot.city,source:snapshot.source};
 const candidates=considered.filter(r=>r.start>=now&&r.start>=start&&r.start+HOUR<=end&&fmt(r.start,zone).hour>=8&&fmt(r.start,zone).hour<=22&&risk(r).length===0).map(r=>({...r,score:(100-r.probability)+(30-Math.abs(22-r.temperature)*2)-Math.max(r.wind-18,0)}));
 const max=candidates.length?Math.max(...candidates.map(r=>r.score)):null,equivalent=candidates.filter(r=>max-r.score<=3),groups=[];for(const r of equivalent){let g=groups.at(-1);if(!g||r.start!==g.at(-1).start+HOUR){g=[];groups.push(g)}g.push(r)}groups.sort((a,b)=>b.length-a.length);const g=groups[0];let range=null;
 if(g)range={start:g[0].start,end:g.at(-1).start+HOUR,label:rangeText(g[0].start,g.at(-1).start+HOUR,zone),temperatureMin:Math.min(...g.map(r=>r.temperature)),temperatureMax:Math.max(...g.map(r=>r.temperature)),probabilityMax:Math.max(...g.map(r=>r.probability)),windMax:Math.max(...g.map(r=>r.wind)),scoreTolerance:3};
 return {status:'clear',coverage,exposureAllowed:true,reason:range?(g.length>1?'Varias horas equivalentes se comparan con temperatura, probabilidad y viento.':'La hora disponible se compara mediante temperatura, probabilidad y viento.'):'No hay una franja completa disponible para recomendar.',range,risks:[],window:{start,end},samples:considered,city:snapshot.city,source:snapshot.source};
}
function createCityGate({fetchForecast,onState=()=>{}}){let seq=0,controller=null;return {async select(city){const token=++seq;if(controller)controller.abort();controller=new AbortController();try{city=normalizeCity(city)}catch(e){onState({status:'error',city:null,error:'localidad inválida'});return null}onState({status:'loading',city});try{const result=await fetchForecast(city,controller.signal);if(token!==seq)return null;if(!sameCity(city,result?.city))throw Error('identidad de respuesta incompatible');onState({status:'ready',city,snapshot:result});return result}catch(e){if(token!==seq)return null;onState({status:'error',city,error:String(e.message||e)});return null}},cancel(){++seq;if(controller)controller.abort();onState({status:'idle'})}}}
return {HOUR,TTL,WMO,classifyWmo,normalize,evaluate,createCityGate,localParts,resolveLocal,rangeText,risk,precaution,textRisk};

})();root.MeteoSafety=(function(base){
'use strict';
// MET-SAFETY-002: las decisiones diarias por franja son independientes de la advertencia general.
const {HOUR}=base;
const ORDER=['storm','ice','snow','heavy','wind','heat','cold','fog','rain','precipitation'];
function sampleLabel(ms,zone){const p=base.localParts(ms,zone);const ambiguous=base.resolveLocal(p.day+'T'+p.clock,zone)===null;const offset=ambiguous?new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(new Date(ms)).find(x=>x.type==='timeZoneName').value:'';return p.day+' '+p.clock+(offset?' '+offset:'')}
function diagnostic(snapshot,result,view,now,day){
 const byKind=new Map();
 function add(kind,event){if(!byKind.has(kind))byKind.set(kind,[]);byKind.get(kind).push(event)}
 // Probabilidad está alineada por la evaluación base con el intervalo anterior a su marca.
 for(const row of result.samples||[])for(const kind of base.risk(row))add(kind,{source:'forecast',time:row.start,code:row.code,temperature:row.temperature,wind:row.wind,probability:row.probability});
 const today=base.localParts(now,snapshot.city.timezone).day;
 if(snapshot.current&&(view==='six'||day===today))for(const kind of base.risk(snapshot.current)){
  const t=snapshot.current.start,fresh=Number.isFinite(t)&&t<=now&&now-t<=45*60000;
  add(kind,{source:fresh?'current':Number.isFinite(t)?'current_stale':'current_unlocated',time:Number.isFinite(t)?t:null,code:snapshot.current.code,temperature:snapshot.current.temperature,wind:snapshot.current.wind,probability:null});
 }
 for(const row of snapshot.unlocated)for(const kind of base.risk(row))add(kind,{source:'unlocated',time:null,code:row.code,temperature:row.temperature,wind:row.wind,probability:row.probability});
 return [...byKind.entries()].sort((a,b)=>ORDER.indexOf(a[0])-ORDER.indexOf(b[0])).map(([kind,events])=>{
  const hours=[...new Set(events.filter(x=>x.source==='forecast').map(x=>x.time))].sort((a,b)=>a-b),periods=[];
  for(const time of hours){let p=periods.at(-1);if(!p||time!==p.last+HOUR){p={first:time,last:time};periods.push(p)}else p.last=time}
  return {kind,description:base.textRisk(kind),precaution:base.precaution(kind),samples:events,periods:periods.map(p=>({firstSample:p.first,lastSample:p.last,referenceIntervalStart:p.first,referenceIntervalEnd:p.last+HOUR,label:p.first===p.last?`Muestra: ${sampleLabel(p.first,snapshot.city.timezone)}`:`Muestras: ${sampleLabel(p.first,snapshot.city.timezone)}–${sampleLabel(p.last,snapshot.city.timezone)}`,sampleCount:(p.last-p.first)/HOUR+1,interpretation:'Muestras de referencia; el intervalo de cribado no demuestra duración del fenómeno.'})),currentSamples:events.filter(x=>x.source==='current').map(x=>x.time),currentLabels:events.filter(x=>x.source==='current').map(x=>sampleLabel(x.time,snapshot.city.timezone)),staleCurrentSamples:events.filter(x=>x.source==='current_stale').map(x=>x.time),staleCurrentLabels:events.filter(x=>x.source==='current_stale').map(x=>sampleLabel(x.time,snapshot.city.timezone)),withoutReliableTime:events.some(x=>x.source==='unlocated'||x.source==='current_unlocated')};
 });
}
function evaluate(snapshot,context){
 if(!context||typeof context!=='object')return {status:'invalid',coverage:'none',exposureAllowed:false,reason:'Contexto temporal inválido.',range:null,risks:[],warnings:[],recommendation:null};
 const initial=base.evaluate(snapshot,context);
 if(initial.status==='invalid'||initial.status==='stale')return {...initial,warnings:[],recommendation:null};
 const {view,now,day}=context,zone=snapshot.city.timezone,warnings=diagnostic(snapshot,initial,view,now,day);
 // Compatibilidad defensiva: el permiso de toda la ventana no habilita la franja.
 const coverageNotice=initial.coverage==='partial'?'Faltan datos para evaluar todo el periodo; las advertencias conocidas siguen vigentes.':initial.coverage==='none'?'No hay datos suficientes para evaluar el periodo.':null;
 const out={...initial,exposureAllowed:view==='day'?false:initial.exposureAllowed,range:null,warnings,coverageNotice,recommendation:null,policy:{scope:'day',guarantee:false}};
 if(view!=='day')return out;
 if(initial.coverage!=='complete')return {...out,abstention:'Faltan datos fiables para evaluar todo el periodo; no se recomienda ninguna franja.'};
 const significant=new Set(['storm','ice','snow','heavy','wind','heat','cold','fog']);
 if(warnings.some(w=>significant.has(w.kind)))return {...out,abstentionCode:'significant-risk',abstention:'La previsión señala riesgos en el periodo; no se recomienda ninguna franja. Consulta la evolución y los avisos oficiales.'};
 if(snapshot.invalidTimes||snapshot.duplicates||snapshot.unlocated.length)return {...out,abstention:'Hay muestras sin hora fiable o duplicadas; no se pueden ubicar todos los riesgos.'};
 const today=base.localParts(now,zone).day,current=snapshot.current;
 if(current&&day===today){const fresh=Number.isFinite(current.start)&&current.start<=now&&now-current.start<=45*60000;if(!fresh||current.code===null||current.temperature===null||current.wind===null)return {...out,abstention:'El dato actual es incompleto o no tiene una hora fiable.'}}
 const rows=snapshot.rows,byTime=new Map(rows.map(r=>[r.start,r])),window=initial.window;
 if(!window)return {...out,abstention:'No se puede determinar el periodo.'};
 const candidates=[];let missing=0,blocked=0;
 for(const row of rows){const t=row.start,h=base.localParts(t,zone).hour;if(t<now||t<window.start||t+HOUR>window.end||h<8||h>22)continue;
  // La probabilidad de la marca siguiente corresponde a esta hora.
  const next=byTime.get(t+HOUR);
  if(row.code===null||row.temperature===null||row.wind===null||!next||next.probability===null){missing++;continue}
  const candidate={...row,probability:next.probability};
  if(base.risk(candidate).length){blocked++;continue}
  const score=100-candidate.probability+30-Math.abs(22-candidate.temperature)*2-Math.max(candidate.wind-18,0);
  candidates.push({...candidate,score});
 }
 if(!candidates.length)return {...out,abstention:'No hay una franja con datos suficientes libre de las señales evaluadas.',candidateCounts:{eligible:0,missing,blocked}};
 const top=Math.max(...candidates.map(x=>x.score)),equiv=candidates.filter(x=>top-x.score<=3),groups=[];
 for(const row of equiv){let group=groups.at(-1);if(!group||row.start!==group.at(-1).start+HOUR){group=[];groups.push(group)}group.push(row)}groups.sort((a,b)=>b.length-a.length);const group=groups[0],start=group[0].start,end=group.at(-1).start+HOUR;
 return {...out,recommendation:{start,end,label:base.rangeText(start,end,zone),description:'Franja relativamente más favorable según las muestras disponibles; no garantiza seguridad.',temperatureMin:Math.min(...group.map(r=>r.temperature)),temperatureMax:Math.max(...group.map(r=>r.temperature)),probabilityMax:Math.max(...group.map(r=>r.probability)),windMax:Math.max(...group.map(r=>r.wind)),scoreTolerance:3},candidateCounts:{eligible:candidates.length,missing,blocked}};
}
return {...base,evaluate};

})(core)})(globalThis);
