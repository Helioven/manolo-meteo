/* MET-INTEGRATION-005G: experimental English presentation from structured safety results.
   Not connected to the UI; does not change the weather evaluator. */
(function(root){
'use strict';
const risks=Object.freeze({
 storm:['Possible thunderstorms','If a storm approaches or you hear thunder, shelter in a substantial building or an enclosed metal-roofed vehicle.'],
 ice:['Possible freezing precipitation','Take extra care on potentially slippery surfaces.'],
 snow:['Possible snow','Check local conditions and avoid unsafe journeys.'],
 heavy:['Possible moderate or heavy rain','Avoid flooded areas and shelter if conditions are dangerous.'],
 wind:['Strong wind indicated','Seek shelter and keep away from objects that could fall.'],
 heat:['High temperatures indicated','Drink water and seek a cool place.'],
 cold:['Low temperatures indicated','Dress warmly and limit exposure to the cold.'],
 fog:['Possible fog','If visibility is poor while driving, slow down and increase your following distance.'],
 rain:['Possible rain or drizzle','Consider waterproof protection and check the latest forecast.'],
 precipitation:['Precipitation is possible','Check the hourly forecast and prepare an alternative.']
});
function stamp(ms,zone){
 if(!Number.isFinite(ms)||typeof zone!=='string')return null;
 try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;}
 catch{return null}
}
function warning(w,zone){
 const [label,precaution]=risks[w?.kind]||['A weather risk was detected','Check the latest forecast and official sources before making plans.'];
 const refs=[];
 for(const p of Array.isArray(w?.periods)?w.periods:[]){if(w?.kind==='precipitation'&&Number.isFinite(p.referenceIntervalStart)&&Number.isFinite(p.referenceIntervalEnd)){const a=stamp(p.referenceIntervalStart,zone),b=stamp(p.referenceIntervalEnd,zone);refs.push(a&&b?`Forecast probability interval: ${a} to ${b}`:'Forecast probability interval unavailable');continue}const a=stamp(p.firstSample,zone),b=stamp(p.lastSample,zone);if(a&&b)refs.push(a===b?`Forecast sample: ${a}`:`Forecast samples: ${a} to ${b}`);else refs.push('Forecast sample time unavailable');}
 for(const t of Array.isArray(w?.currentSamples)?w.currentSamples:[]){const a=stamp(t,zone);refs.push(a?`Current model sample: ${a}`:'Current sample time unavailable');}
 for(const t of Array.isArray(w?.staleCurrentSamples)?w.staleCurrentSamples:[]){const a=stamp(t,zone);refs.push(a?`Stale model sample: ${a}`:'Stale sample time unavailable');}
 if(w?.withoutReliableTime)refs.push('Time is not reliable');
 const probs=(Array.isArray(w?.samples)?w.samples:[]).map(x=>x.probability).filter(x=>Number.isFinite(x)&&x>=0&&x<=100);
 const probability=w?.kind==='precipitation'&&probs.length?` Maximum hourly probability: ${Math.round(Math.max(...probs))}%; this is a possibility, not a certainty.`:'';
 return `${label}${refs.length?' ('+refs.join('; ')+')':''}.${probability} ${precaution}`;
}
function render(result,zone,{view='day'}={}){
 if(!result||typeof result!=='object')return {warnings:[],coverage:'There is not enough reliable information to assess the period; risk cannot be ruled out.',recommendation:'Check the latest forecast before making plans.',details:''};
 const warnings=(Array.isArray(result.warnings)?result.warnings:[]).map(w=>warning(w,zone));
 const coverage=result.coverage==='complete'?'':result.coverage==='partial'?'Some data is missing; known risks remain relevant.':'There is not enough reliable information to assess the period; risk cannot be ruled out.';
 const rec=result.recommendation;const start=stamp(rec?.start,zone),end=stamp(rec?.end,zone);
 const recommendation=view==='six'?'':result.abstentionCode==='significant-risk'?'Forecast risks were identified for the period; no time window is recommended. Check the latest forecast and official warnings.':start&&end?`A relatively more favourable period: ${start} to ${end}. This does not guarantee safety.`:'There is not enough reliable evidence to recommend a time window.';
 const details=start&&end&&[rec.temperatureMin,rec.temperatureMax,rec.probabilityMax,rec.windMax].every(Number.isFinite)?`Period evidence: ${Math.round(rec.temperatureMin)}–${Math.round(rec.temperatureMax)} °C; maximum hourly probability ${Math.round(rec.probabilityMax)}%; maximum wind ${Math.round(rec.windMax)} km/h. This does not guarantee safety.`:'';
 return {warnings,coverage,recommendation,details};
}
const api=Object.freeze({render,warning,stamp,terms:kind=>risks[kind]||['A weather risk was detected','Check the latest forecast and official sources.']});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MeteoEnglishDraft=api;
})(globalThis);
