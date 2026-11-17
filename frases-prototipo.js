/* Aprobación editorial limitada a este prototipo aislado; no autoriza publicación. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.MeteoPhrasePrototype=Object.freeze({select:api.productionSelect});
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ids=['clear-01','clear-02','clear-03','clear-04','clear-05','clear-07','rain-01','rain-02','rain-03','rain-04','rain-05','rain-07','storm-01'];
  const APPROVED=Object.freeze({es:Object.freeze([...ids]),en:Object.freeze([...ids])});
  const BLOCKED_BY_SAFETY=new Set(['clear-02']);
  function createSelector(approved){
    const recent=new Map();
    return function select({evaluation,cityId,day,dailyCode,language,catalog,period}){
      if(!['es','en'].includes(language)||!Array.isArray(approved[language])||approved[language].length===0)return null;
      if(!evaluation||evaluation.coverage!=='complete'||!Array.isArray(evaluation.warnings)||!Array.isArray(evaluation.risks))return null;
      if(!cityId||evaluation.city?.id!==cityId||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(evaluation.window?.start)||!Number.isFinite(evaluation.window?.end)||evaluation.window.end<=evaluation.window.start)return null;
      if(!Array.isArray(evaluation.samples)||!evaluation.samples.length||!evaluation.samples.every(r=>Number.isFinite(r.start)&&Number.isFinite(r.temperature)&&Number.isFinite(r.wind)&&r.wind>=0&&Number.isFinite(r.probability)&&r.probability>=0&&r.probability<=100))return null;
      // El resumen diario incluye horas pasadas; solo se omite como veto en el resto de hoy verificado.
      let remainingDay=false;
      if(period!==undefined){
        if(!period||period.day!==day||period.timeZone!==evaluation.city.timezone||!Number.isFinite(period.now)||period.start!==evaluation.window.start||period.end!==evaluation.window.end||period.start<period.now)return null;
        try{
          const localDay=ms=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:period.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));const get=k=>parts.find(p=>p.type===k).value;return get('year')+'-'+get('month')+'-'+get('day')};
          const today=localDay(period.now),nextDay=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
          if(localDay(period.start)!==day||localDay(period.end-1)!==day||localDay(period.end)!==nextDay)return null;
          if(period.kind==='remaining-day'){if(day!==today||period.start!==period.now)return null;remainingDay=true}
          else if(period.kind!=='full-day'||day<=today||localDay(period.start-1)===day)return null;
        }catch(_){return null}
      }
      const rainCodes=new Set([51,53,61,80]);
      const clear=evaluation.status==='clear'&&evaluation.warnings.length===0&&evaluation.risks.length===0&&(remainingDay||dailyCode===0)&&evaluation.samples.every(r=>r.code===0);
      const rain=evaluation.status==='risk'&&evaluation.risks.includes('rain')&&evaluation.warnings.some(w=>w.kind==='rain')&&evaluation.risks.every(x=>x==='rain'||x==='precipitation')&&evaluation.warnings.every(w=>w.kind==='rain'||w.kind==='precipitation')&&(remainingDay||rainCodes.has(dailyCode))&&evaluation.samples.every(r=>rainCodes.has(r.code));
      // Uso contextual acotado de clear-07: no afirma ausencia de nubes ni presencia de lluvia.
      const skyGroup=code=>code===0?'sun':code===3?'cloud':[1,2].includes(code)?'partly':null;
      const groups=new Set(evaluation.samples.map(r=>skyGroup(r.code)));
      const benignColdMixed=!!period&&evaluation.status==='clear'&&evaluation.warnings.length===0&&evaluation.risks.length===0&&groups.size>1&&!groups.has(null)&&evaluation.samples.every(r=>r.temperature>0&&r.temperature<=6&&r.probability<30)&&(remainingDay||groups.has(skyGroup(dailyCode)));
      if(!clear&&!rain&&!benignColdMixed)return null;
      if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.messages))return null;
      const choices=catalog.messages.filter(m=>approved[language].includes(m.id)&&!BLOCKED_BY_SAFETY.has(m.id)&&m.active===true&&(!benignColdMixed||m.id==='clear-07')&&m.condition===(rain?'rain':'clear')&&m.risk===(rain?'caution':'normal')&&typeof m.translations?.[language]?.humor==='string'&&m.translations[language].humor.trim()&&!/[{}]/.test(m.translations[language].humor));
      if(!choices.length)return null;
      const scope=cityId+'|'+day+'|'+language;
      const sig=JSON.stringify([evaluation.window.end,evaluation.samples.map(r=>[r.start,r.code,r.temperature,r.wind,r.probability])]);
      const old=recent.get(scope);let chosen;
      if(old?.signature===sig)chosen=choices.find(x=>x.id===old.id);
      if(!chosen){let pool=choices.filter(x=>!old?.history.includes(x.id));if(!pool.length)pool=choices.filter(x=>x.id!==old?.id);if(!pool.length)pool=choices;
        let hash=0;for(const char of sig)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
        chosen=pool[hash%pool.length];recent.set(scope,{signature:sig,id:chosen.id,history:[chosen.id,...(old?.history||[])].slice(0,3)});if(recent.size>50)recent.delete(recent.keys().next().value);
      }
      return {id:chosen.id,text:chosen.translations[language].humor};
    };
  }
  const productionSelect=createSelector(APPROVED);
  return Object.freeze({productionSelect,createSelectorForTests:createSelector});
});
