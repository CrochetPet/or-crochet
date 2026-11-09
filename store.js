const ROOT=new URL('.',import.meta.url).pathname;
const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>Array.from(c.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=p=>ROOT+p.replace(/^\//,'');
const image=p=>p?.startsWith('/')?link(p):'';
let catalog,server=false,cart=[];
try{cart=JSON.parse(localStorage.getItem('crochet-cart')||'[]');if(!Array.isArray(cart))cart=[]}catch{}
let apiRoot=ROOT;
try{const config=await fetch(link('/api-config.json')).then(r=>r.ok?r.json():null);if(config?.apiBase&&/^https:\/\//.test(config.apiBase))apiRoot=config.apiBase.replace(/\/$/,'')+'/'}catch{}
async function api(path,body){const response=await fetch(apiRoot+'api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let result;try{result=await response.json()}catch{throw new Error('אין חיבור לשרת האתר')};if(!response.ok)throw new Error(result.error||'הפעולה לא הושלמה');return result}
try{catalog=await api('public');server=true}catch{catalog=await fetch(link('/data/catalog.json')).then(r=>r.json())}
const settings=catalog.settings,products=catalog.products.filter(p=>p.visible!==false);
cart=cart.filter(i=>products.some(p=>p.id===i.id)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<100);
function persistCart(){try{localStorage.setItem('crochet-cart',JSON.stringify(cart))}catch{}$$('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((n,i)=>n+i.quantity,0)||'')}
function notice(text){$('.ind-notice')?.remove();const e=document.createElement('div');e.className='ind-notice';e.role='status';e.textContent=text;document.body.append(e);setTimeout(()=>e.remove(),4500)}
function add(id,quantity=1){const p=products.find(p=>p.id===id);if(!p||!p.inStock)return notice('המוצר אינו זמין כעת');const old=cart.find(i=>i.id===id),total=(old?.quantity||0)+quantity;if(total>99||(p.stock!==null&&total>p.stock))return notice('הכמות המבוקשת גדולה מהמלאי הזמין');if(old)old.quantity=total;else cart.push({id,quantity});persistCart();notice('המוצר נוסף לעגלה')}
for(const e of $$('[data-content-key]')){const v=catalog.content[e.dataset.contentKey];if(v)e.textContent=v.text}
$('.ind-logo img')?.setAttribute('src',image(settings.logo));$$('.ind-footer strong').forEach(e=>e.textContent=settings.name);
$$('a[href^="tel:"]').forEach(e=>e.href='tel:'+settings.phone);
const addressNode=$('.contact-as-details-container li');if(addressNode&&!$('a',addressNode))addressNode.textContent=settings.address;
$$('.contact-as-details-container a[href^="tel:"]').forEach(a=>{const value=$('[dir="ltr"]',a);if(value)value.textContent=settings.phone});
$$('.global-contact-details-container [dir="ltr"]').forEach(e=>{if(/0[0-9]{8,10}/.test(e.textContent))e.textContent=settings.phone});
$$('a[href^="mailto:"]').forEach(e=>{e.href='mailto:'+settings.email;e.textContent=settings.email});
$$('a[href*="wa.me"]').forEach(e=>e.href='https://wa.me/'+settings.whatsapp);
$('.ind-mobile')?.addEventListener('click',e=>{const menu=$('#main-menu'),b=e.currentTarget;menu.classList.toggle('is-open');b.setAttribute('aria-expanded',menu.classList.contains('is-open'))});
const path=decodeURIComponent(location.pathname).replace(ROOT==='/'?/^$/:new RegExp('^'+ROOT.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'/').replace(/\/$/,'')||'/';
const current=products.find(p=>p.slug===path);
function card(p){return `<article data-product-id="${esc(p.id)}"><a href="${esc(link(p.slug))}"><img loading="lazy" src="${esc(image(p.images[0]))}" alt="${esc(p.name)}"><h4>${esc(p.name)}</h4><div>₪${Number(p.price).toLocaleString('he-IL')}</div></a>${!p.inStock?'<span class="ind-no-stock">אזל מהמלאי</span>':''}<button data-add="${esc(p.id)}" ${!p.inStock?'disabled':''}>הוספה לעגלה</button></article>`}
for(const container of $$('.products-container')){
 const originalCards=$$('.e-p-box',container),ids=originalCards.map(e=>$('.product-data-obj',e)?.dataset.uniqueId).filter(Boolean),template=originalCards[0];
 let list=products;const q=new URLSearchParams(location.search).get('category');const category=q||(path.startsWith('/חנות/')&&!current?path.split('/').slice(2).map(x=>x.replaceAll('-',' ')).join(' / '):null);
 if(category)list=list.filter(p=>p.categories.includes(category));
 const preferred=ids.map(id=>list.find(p=>p.id===id)).filter(Boolean);list=[...preferred,...list.filter(p=>!ids.includes(p.id))];
 if(current)list=list.filter(p=>p.id!==current.id).slice(0,3);
 container.innerHTML='';
 if(template){for(const p of list){const box=template.cloneNode(true),obj=$('.product-data-obj',box);if(obj)obj.dataset.uniqueId=p.id;
 for(const a of $$('a[href]',box))a.href=link(p.slug);
 for(const e of $$('[role="img"],.product-image[data-bg]',box)){const src=image(p.images[e.classList.contains('second-image')&&p.images[1]?1:0]);e.style.backgroundImage='url("'+src+'")';e.setAttribute('aria-label',p.name);e.dataset.bg=src}
 for(const img of $$('img',box)){img.src=image(p.images[0]);img.alt=p.name}
 for(const e of $$('.product-title a',box))e.textContent=p.name;
 const price=$('[data-type="price"]',box);if(price)price.textContent=p.price;
 const ribbon=$('.ribbonsLabels',box);if(ribbon)ribbon.innerHTML=p.inStock?'':'<span class="background-primary-color product-ribbon-banner">אזל מהמלאי</span>';
 container.append(box)}}else{container.classList.add('ind-product-grid');container.innerHTML=list.map(card).join('')}
 if(!list.length)container.innerHTML='<p>אין מוצרים בקטגוריה זו כרגע.</p>';
 if(q){const title=$('h1');if(title)title.textContent=q}
}
for(const c of $$('.e-c-box')){const name=$('h4',c)?.textContent.trim(),count=products.filter(p=>p.categories.includes(name)).length;const label=$('.count-amount',c);if(label)label.textContent=count}
if(current){
 const title=$('h1');if(title)title.textContent=current.name;document.title=current.name+' | '+settings.name;
 const description=$('.product-details .description');if(description)description.textContent=current.description;
 const price=$('#productPrice');if(price)price.textContent='₪'+current.price;
 const gallery=$('#productGaleries');if(gallery){gallery.innerHTML=`<img class="ind-gallery-main" src="${esc(image(current.images[0]))}" alt="${esc(current.name)}"><div class="ind-gallery-thumbs">${current.images.map((s,i)=>`<button type="button" data-gallery-src="${esc(image(s))}" aria-label="תמונה ${i+1} של ${esc(current.name)}"><img src="${esc(image(s))}" alt=""></button>`).join('')}</div>`;$$('[data-gallery-src]',gallery).forEach(b=>b.addEventListener('click',()=>$('.ind-gallery-main',gallery).src=b.dataset.gallerySrc))}
 const buy=$('.orderButtonPopup');if(buy){buy.setAttribute('role','button');buy.setAttribute('tabindex','0');buy.setAttribute('aria-disabled',!current.inStock);buy.textContent=current.inStock?'הוספה לעגלה':'אזל מהמלאי';buy.addEventListener('click',e=>{e.preventDefault();add(current.id,Math.max(1,Math.min(99,Number($('.quantity_container input')?.value)||1)))});buy.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();buy.click()}})}
 for(const b of $$('.quantity-btn'))b.addEventListener('click',()=>{const input=$('.quantity_container input'),n=Number(input.value)||1;input.value=Math.min(99,Math.max(1,n+(b.classList.contains('quantity-minus-btn')?-1:1)))})
 const tab=$('[href="#attributesTab"]');if(tab)tab.addEventListener('click',e=>{e.preventDefault();$('#attributesTab')?.classList.toggle('active')});
}
// Existing related cards stay in the original layout, with current catalog details.
for(const c of $$('.related-products-container .product-data-obj')){const p=products.find(p=>p.id===c.dataset.uniqueId);if(!p){c.closest('.e-p-box')?.remove();continue}const title=$('.product-title a',c);if(title){title.textContent=p.name;title.href=link(p.slug)}const cost=$('[data-type="price"]',c);if(cost)cost.textContent=p.price}
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)add(b.dataset.add)});
for(const carousel of $$('.carousel')){const items=$$('.item',carousel);if(!items.length)continue;let index=0;const show=i=>{index=(i+items.length)%items.length;items.forEach((e,j)=>e.classList.toggle('active',j===index))};show(0);$('.carousel-control.left',carousel)?.addEventListener('click',()=>show(index+1));$('.carousel-control.right',carousel)?.addEventListener('click',()=>show(index-1));if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(()=>show(index+1),10000)}
// There is no payment capture: visitors submit an order request for confirmation by the shop.
const dialog=document.createElement('dialog');dialog.className='ind-dialog';dialog.setAttribute('aria-label','עגלת קניות');document.body.append(dialog);
function renderCart(){let total=0;const rows=cart.map(i=>{const p=products.find(p=>p.id===i.id);if(!p)return'';total+=p.price*i.quantity;return`<div class="ind-cart-row"><img src="${esc(image(p.images[0]))}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><br>₪${p.price} ליחידה</div><input type="number" min="1" max="99" value="${i.quantity}" data-cart-quantity="${esc(p.id)}" aria-label="כמות ${esc(p.name)}"><button data-remove="${esc(p.id)}">הסרה</button></div>`}).join('');dialog.innerHTML=`<div class="ind-dialog-head"><h2>עגלת קניות</h2><button class="ind-close" aria-label="סגירת עגלה">×</button></div><div class="ind-dialog-body">${rows||'<p>העגלה שלך ריקה.</p>'}${rows?`<div class="ind-total">סה״כ: ₪${total.toLocaleString('he-IL')}</div><p>בקשת הזמנה. המחיר וזמינות המוצרים יאושרו על ידי החנות לפני תשלום.</p><form class="ind-checkout"><label>שם מלא<input name="name" required autocomplete="name" maxlength="200"></label><label>טלפון<input name="phone" type="tel" required pattern="[-+()0-9\\s]{7,25}" autocomplete="tel"></label><label>דואר אלקטרוני<input name="email" type="email" autocomplete="email"></label><label>כתובת למשלוח<input name="address" autocomplete="street-address"></label><label>הערות להזמנה<textarea name="note" rows="2"></textarea></label><button class="ind-submit">${server?'שליחת בקשת הזמנה':'הכנת בקשת הזמנה בוואטסאפ'}</button><div role="status" class="ind-form-status"></div></form>`:''}</div>`;
 $('.ind-close',dialog).onclick=()=>dialog.close();$$('[data-remove]',dialog).forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.id!==b.dataset.remove);persistCart();renderCart()});$$('[data-cart-quantity]',dialog).forEach(input=>input.onchange=()=>{const p=products.find(p=>p.id===input.dataset.cartQuantity);const n=Math.max(1,Math.min(99,Math.floor(Number(input.value)||1),p.stock??99));cart.find(i=>i.id===p.id).quantity=n;persistCart();renderCart()});const form=$('form',dialog);if(form)form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));data.items=cart.map(i=>({...i}));const button=$('button',form),status=$('[role="status"]',form);button.disabled=true;try{if(!server){const text=`בקשת הזמנה מאת ${data.name}\nטלפון: ${data.phone}\n${cart.map(i=>{const p=products.find(p=>p.id===i.id);return`${p.name} × ${i.quantity} — ₪${p.price*i.quantity}`}).join('\n')}\nסה״כ מוצרים: ₪${total}\nכתובת: ${data.address}\nהערות: ${data.note}`;showPrepared(status,text,'הבקשה מוכנה. יש ללחוץ על הקישור ולשלוח בוואטסאפ.');}else{const result=await api('orders',data);cart=[];persistCart();dialog.innerHTML=`<div class="ind-dialog-head"><h2>הבקשה התקבלה</h2><button class="ind-close" aria-label="סגירה">×</button></div><div class="ind-dialog-body"><p>מספר בקשה: ${esc(result.id)}</p><p>ניצור איתך קשר לאישור ההזמנה והתשלום.</p></div>`;$('.ind-close',dialog).onclick=()=>dialog.close()}}catch(err){status.textContent=err.message}finally{button.disabled=false}}}
function showPrepared(node,text,message){node.innerHTML=`<p>${esc(message)}</p><a class="ind-static-action" target="_blank" rel="noopener" href="https://wa.me/${esc(settings.whatsapp)}?text=${encodeURIComponent(text)}">פתיחת וואטסאפ לשליחה</a>`}
$$('[data-open-cart]').forEach(b=>b.addEventListener('click',()=>{renderCart();dialog.showModal()}));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
for(const form of $$('form:not(.ind-checkout)')){
 const inputs=$$('input:not([type=hidden]),textarea',form).filter(e=>e.type!=='submit'&&e.type!=='checkbox');inputs.forEach((e,i)=>{const keys=['name','email','phone','message'];const hint=(e.getAttribute('placeholder')||e.getAttribute('aria-label')||e.name||'')+' '+e.type;let key=/שם/.test(hint)?'name':/טלפון|tel|number/.test(hint)?'phone':/mail|אימייל|אלקטרוני/.test(hint)?'email':e.tagName==='TEXTAREA'?'message':keys[i]||'message';e.name=key;if(key!=='email')e.required=true;if(key==='phone')e.type='tel'});
 const honey=document.createElement('input');honey.name='website';honey.className='ind-honey';honey.tabIndex=-1;honey.autocomplete='off';honey.setAttribute('aria-hidden','true');form.append(honey);
 const status=document.createElement('div');status.role='status';status.className='ind-form-status';form.append(status);
 form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form));data.kind=form.classList.contains('customForm')?'הזמנה בעיצוב אישי':'צור קשר';const button=$('button[type=submit],button',form);if(button)button.disabled=true;try{if(server){const result=await api('contact',data);status.textContent='הפנייה התקבלה. מספר פנייה: '+result.id;form.reset()}else{showPrepared(status,`${data.kind}\nשם: ${data.name}\nטלפון: ${data.phone}\nאימייל: ${data.email||''}\n${data.message}`,'הפנייה מוכנה. יש לשלוח אותה דרך וואטסאפ להשלמת הפנייה.')}}catch(err){status.textContent=err.message}finally{if(button)button.disabled=false}})
}
// Add access to categories introduced in the administrator catalog.
const known=new Set($$('.e-c-box h4').map(e=>e.textContent.trim()));const extra=[...new Set(products.flatMap(p=>p.categories))].filter(x=>!known.has(x)&&!x.includes(' / '));const categoryWrap=$('.e-c-box')?.parentElement;if(categoryWrap&&path==='/'){for(const name of extra){const a=document.createElement('a');a.className='ind-static-action';a.href=link('/חנות')+'?category='+encodeURIComponent(name);a.textContent=name;categoryWrap.append(a)}}
persistCart();

import('./live.js');

// Header navigation and restored original hero photograph.
const adminAnchor=document.createElement('a');adminAnchor.href=link('/admin/');adminAnchor.className='ind-admin-link';adminAnchor.textContent='ניהול';adminAnchor.setAttribute('aria-label','כניסה לפאנל הניהול');
const cartButton=document.querySelector('.ind-actions [data-open-cart]');if(cartButton&&!document.querySelector('.ind-admin-link'))cartButton.after(adminAnchor);
const hero=document.querySelector('#section-169');if(hero){const original='https://files.cdn-files-a.com/uploads/9824204/2000_670d10aff21f6.jpg';hero.style.backgroundImage='url("'+original+'")';hero.style.backgroundSize='cover';hero.style.backgroundPosition='center';for(const image of hero.querySelectorAll('.headers-image')){image.style.backgroundImage='url("'+original+'")';image.dataset.bg=original}const subtitle=hero.querySelector('h2');if(subtitle)subtitle.textContent='אומנות בסריגה - בובות בבגדים מחמדים'}
const adminStyle=document.createElement('style');adminStyle.textContent='.ind-actions .ind-admin-link{font-size:16px;font-weight:700;white-space:nowrap;text-decoration:none}.ind-admin-link:hover{text-decoration:underline}.ind-header nav{gap:clamp(10px,1.4vw,25px)}@media(max-width:1180px) and (min-width:851px){.ind-header{padding-inline:16px;gap:16px}.ind-header nav a{font-size:15px}.ind-actions{gap:8px}}';document.head.append(adminStyle);
