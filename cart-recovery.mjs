// Optional Google Apps Script receiver. Disabled until an HTTPS /exec URL is configured.
export function createCartRecovery({endpoint, snapshot, fetcher=fetch, clock=Date.now}) {
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint||''))return {touch(){},requested(){},flush(){}};
  let id;try{id=sessionStorage.getItem('crochet-recovery-id')}catch{}
  if(!id)id=crypto.randomUUID();
  const saveId=()=>{try{sessionStorage.setItem('crochet-recovery-id',id)}catch{}};saveId();
  let sequence=clock(),timer,requested=false,lastActivity=clock();
  const send=(state,keepalive=false)=>{
    const draft=snapshot();
    if(!draft)return;
    const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email||'');
    if((!valid||!draft.items?.length)&&state==='active')state='cancelled';
    const body=JSON.stringify({id,sequence:++sequence,state,email:valid?draft.email:'',items:draft.items||[],website:''});
    // Opaque response cannot confirm delivery. Never display a success claim.
    fetcher(endpoint,{method:'POST',mode:'no-cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body,keepalive}).catch(()=>{});
  };
  return {
    touch(){lastActivity=clock();if(requested){requested=false;id=crypto.randomUUID();saveId();sequence=clock()}clearTimeout(timer);timer=setTimeout(()=>send('active'),1200)},
    requested(){clearTimeout(timer);requested=true;send('requested',true)},
    flush(){clearTimeout(timer);send(requested?'requested':'active',true)},
    heartbeat(){if(!requested&&clock()-lastActivity<90000)send('active')},
  };
}
