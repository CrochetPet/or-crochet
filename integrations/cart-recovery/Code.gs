// Standalone Google Apps Script. No customer data or credentials belong in GitHub.
const RECOVERY = {recipient:'orcrochetil@gmail.com',catalog:'https://crochetpet.github.io/or-crochet/data/catalog.json',delayMs:30*60*1000,maxDrafts:100,retentionMs:7*86400000};
function setupRecovery() {
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('SHEET_ID')) {
    const book=SpreadsheetApp.create('אומנות בסריגה — עגלות פרטיות');
    book.getSheets()[0].setName('Carts').appendRow(['id','updatedAt','sequence','state','email','items','total','notifiedAt','name','phone']);
    props.setProperty('SHEET_ID',book.getId());
  }
  recoverySheet_().getRange(1,9,1,2).setValues([['name','phone']]);
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='notifyAbandonedCarts'))ScriptApp.newTrigger('notifyAbandonedCarts').timeBased().everyMinutes(5).create();
  console.log('Private sheet: https://docs.google.com/spreadsheets/d/'+props.getProperty('SHEET_ID'));
}
function recoverySheet_(){return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheetByName('Carts')}
function recoveryResponse_(ok){return ContentService.createTextOutput(JSON.stringify({ok})).setMimeType(ContentService.MimeType.JSON)}
function recoveryCatalog_(){
  const cache=CacheService.getScriptCache();let raw=cache.get('recovery-catalog');
  if(!raw){const response=UrlFetchApp.fetch(RECOVERY.catalog);if(response.getResponseCode()!==200)throw Error('Catalog unavailable');raw=response.getContentText();if(raw.length<90000)cache.put('recovery-catalog',raw,300)}
  return JSON.parse(raw).products;
}
function recoveryInput_(b,products){
  if(!b||b.website||!/^[-a-f0-9]{36}$/.test(b.id)||!Number.isSafeInteger(b.sequence)||b.sequence<1||!['active','requested','cancelled'].includes(b.state))throw Error('Invalid request');
  if(b.state!=='active')return {id:b.id,sequence:b.sequence,state:b.state,name:'',phone:'',email:'',items:[],total:0};
  const name=typeof b.name==='string'?b.name.trim():'';const phone=typeof b.phone==='string'?b.phone.replace(/[\s()\-]/g,''):'';const validPhone=/^(?:05[0-9]{8}|0[23489][0-9]{7})$/.test(phone);const email=typeof b.email==='string'&&b.email.length<=254&&/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[^\s@]+\.[^\s@]+$/.test(b.email)?b.email:'';
  if(!name||name.length>200||(!validPhone&&!email)||!Array.isArray(b.items)||!b.items.length||b.items.length>50)throw Error('Invalid cart');
  const seen={};const items=b.items.map(i=>{const p=products.find(p=>p.id===i.id&&p.visible!==false);if(!p||seen[i.id]||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99||!Number.isFinite(p.price)||p.price<0)throw Error('Invalid item');seen[i.id]=true;return {name:String(p.name).slice(0,200),quantity:i.quantity,price:p.price}});
  return {id:b.id,sequence:b.sequence,state:b.state,name,phone:validPhone?phone:'',email,items,total:Math.round(items.reduce((n,i)=>n+i.quantity*i.price,0)*100)/100};
}
function doPost(e){
  const lock=LockService.getScriptLock();
  try {
    if(!e.postData||e.postData.contents.length>16000)return recoveryResponse_(false);
    const raw=JSON.parse(e.postData.contents),b=recoveryInput_(raw,raw.state==='active'?recoveryCatalog_():[]);
    if(!lock.tryLock(5000))return recoveryResponse_(false);
    const sheet=recoverySheet_(),rows=sheet.getDataRange().getValues(),index=rows.findIndex((r,i)=>i>0&&r[0]===b.id),now=Date.now();
    if(index>0){const old=rows[index];if(Number(old[2])>=b.sequence||old[3]==='requested'||old[3]==='notified')return recoveryResponse_(true)}
    if(index<0&&b.state!=='active')return recoveryResponse_(true);
    if(index<0){const props=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),'Asia/Jerusalem','yyyy-MM-dd'),count=props.getProperty('DRAFT_DAY')===day?Number(props.getProperty('DRAFT_COUNT')||0):0;if(count>=RECOVERY.maxDrafts)return recoveryResponse_(false);props.setProperties({DRAFT_DAY:day,DRAFT_COUNT:String(count+1)})}
    // JSON string cell avoids spreadsheet formulas from customer input.
    const row=[b.id,now,b.sequence,b.state,JSON.stringify(b.email),JSON.stringify(b.items),b.total,'',JSON.stringify(b.name||''),JSON.stringify(b.phone||'')];
    sheet.getRange(index>0?index+1:sheet.getLastRow()+1,1,1,10).setValues([row]);
    return recoveryResponse_(true);
  }catch(err){console.error('Cart recovery request failed');return recoveryResponse_(false)}finally{if(lock.hasLock())lock.releaseLock()}
}
function notifyAbandonedCarts(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(5000))return;
  try {
    const sheet=recoverySheet_(),rows=sheet.getDataRange().getValues(),now=Date.now();
    const pending=rows.map((r,i)=>({r,i})).filter(({r,i})=>i>0&&r[3]==='active'&&!r[7]&&now-Number(r[1])>=RECOVERY.delayMs&&now-Number(r[1])<RECOVERY.retentionMs).slice(0,30);
    if(pending.length&&MailApp.getRemainingDailyQuota()>0){
      const text=pending.map(({r})=>`שם: ${r[8]?JSON.parse(r[8]):'לא נמסר'}\nטלפון: ${r[9]?JSON.parse(r[9]):'לא נמסר'}\nאימייל: ${JSON.parse(r[4])||'לא נמסר'}\n${JSON.parse(r[5]).map(i=>`${i.name} × ${i.quantity} — ₪${i.price*i.quantity}`).join('\n')}\nסה״כ משוער: ₪${r[6]}\nפעילות אחרונה: ${Utilities.formatDate(new Date(Number(r[1])),'Asia/Jerusalem','dd.MM.yyyy HH:mm')}\nמזהה עגלה: ${r[0]}`).join('\n\n----------------\n\n');
      // Reserve before sending: a retry must not send duplicate notifications.
      pending.forEach(({i})=>{sheet.getRange(i+1,4).setValue('notified');sheet.getRange(i+1,8).setValue(now)});
      SpreadsheetApp.flush();
      try{MailApp.sendEmail(RECOVERY.recipient,'עגלות ללא פעילות — אומנות בסריגה','לא נרשמה פעילות במשך 30 דקות לפחות. ייתכן שהלקוח רק הפסיק לגלוש; זו אינה הוכחה לביטול הזמנה.\nפתיחת וואטסאפ להזמנה מסומנת בנפרד ואינה אישור תשלום.\n\n'+text)}catch(err){pending.forEach(({i})=>{sheet.getRange(i+1,4).setValue('active');sheet.getRange(i+1,8).setValue('')});throw err}
    }
    for(let i=rows.length-1;i>0;i--)if(now-Number(rows[i][1])>=RECOVERY.retentionMs)sheet.deleteRow(i+1);
  }finally{lock.releaseLock()}
}
