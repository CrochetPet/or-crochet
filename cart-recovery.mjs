// Optional Google Apps Script receiver. Disabled until an HTTPS /exec URL is configured.
export function createCartRecovery({endpoint, snapshot, fetcher=fetch, clock=Date.now}) {
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint||''))return {touch(){},requested(){},flush(){}};
  let id;try{id=sessionStorage.getItem('crochet-recovery-id')}catch{}
  if(!id)id=crypto.randomUUID();
  const saveId=()=>{try{sessionStorage.setItem('crochet-recovery-id',id)}catch{}};saveId();
  let sequence=clock(),timer,requested=false,lastActivity=clock(),registered=false;
  const send=(state,keepalive=false)=>{
    const draft=snapshot();
    if(!draft)return;
    const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email||'')?draft.email:'';const name=String(draft.name||'').trim();const phone=String(draft.phone||'').replace(/[\s()\-]/g,'');const valid=!!name&&!!(email||/^(?:05[0-9]{8}|0[23489][0-9]{7})$/.test(phone));
    if((!valid||!draft.items?.length)&&state==='active')state='cancelled';
    const body=JSON.stringify({id,sequence:++sequence,state,name:valid?name:'',phone:valid&&/^(?:05[0-9]{8}|0[23489][0-9]{7})$/.test(phone)?phone:'',email,items:draft.items||[],website:''});
    if(state==='active')registered=true;
    // Opaque response cannot confirm delivery. Never display a success claim.
    fetcher(endpoint,{method:'POST',mode:'no-cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body,keepalive}).catch(()=>{});
  };
  return {
    touch(){lastActivity=clock();if(requested){requested=false;id=crypto.randomUUID();saveId();sequence=clock();registered=false}clearTimeout(timer);const d=snapshot();if(!registered&&d?.name?.trim()&&( /^(?:05[0-9]{8}|0[23489][0-9]{7})$/.test(String(d.phone||'').replace(/[\s()\-]/g,''))||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email||''))&&d.items?.length)send('active',true);timer=setTimeout(()=>send('active'),1200)},
    requested(){clearTimeout(timer);requested=true;send('requested',true)},
    flush(){clearTimeout(timer);send(requested?'requested':'active',true)},
    heartbeat(){if(!requested&&clock()-lastActivity<90000)send('active')},
  };
}
