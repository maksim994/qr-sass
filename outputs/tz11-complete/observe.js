(() => {
  const nativeFetch = window.fetch.bind(window);
  const send = event => { nativeFetch('/__tz11-log', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ at:Date.now(), path:location.pathname, ...event }), keepalive:true }).catch(()=>{}); };
  const watch = (key, transform) => {
    let value;
    Object.defineProperty(window,key,{configurable:true,get(){return value;},set(next){value=transform(next);}});
  };
  watch('ym', next => typeof next === 'function' ? new Proxy(next,{apply(target,self,args){send({kind:'ym',args}); return Reflect.apply(target,self,args);}}) : next);
  watch('_tmr', next => {
    if(next && typeof next.push === 'function') { const original=next.push; next.push=function(...args){send({kind:'vk',args});return original.apply(this,args);}; }
    return next;
  });
  try { new PerformanceObserver(list => { for(const r of list.getEntries()) if(/mc\.yandex|top-fwz1|webvisor/.test(r.name)) send({kind:'resource',url:r.name,status:r.responseStatus,initiator:r.initiatorType}); }).observe({type:'resource',buffered:true}); } catch {}
  document.addEventListener('load', e => { if(e.target?.tagName==='SCRIPT' && /mail.ru/.test(e.target.src)) send({kind:'vk-sdk-load', array:Array.isArray(window._tmr), length:window._tmr?.length, pageView:typeof window._tmr?.pageView}); }, true);
  document.addEventListener('error', e => { if(e.target?.tagName==='SCRIPT') send({kind:'script-error',url:e.target.src}); }, true);
  document.addEventListener('securitypolicyviolation', e => send({kind:'csp',directive:e.violatedDirective,blocked:e.blockedURI}));
})();
