const recovered={
  "/assets/bd0630fa6d8474253323.png": "https://files.cdn-files-a.com/uploads/9824204/800_670d54f89ae3b.png",
  "/assets/d02dc9f8f458bd8d9fc3.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_gi-671a5b302802c.jpg",
  "/assets/d3a834c5098c9759d0dc.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a3557da46c2_filter_67a370315f21c.jpg",
  "/assets/d9824a4971c0e96c32ae.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a354e13cb08_filter_67a3706aa33f7.jpg",
  "/assets/d48f563ad4b4eeecbf34.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a354684fe63_filter_67a37ccb5b585.jpg",
  "/assets/cc9fc2ee154cc3b5c1dd.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a35438be05b_filter_67a37e08814de.jpg",
  "/assets/afa00cd78be8f0322810.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a353922c336_filter_67a37eabd7024.jpg",
  "/assets/ffb0793eafb11838107b.jpg": "https://files.cdn-files-a.com/uploads/9824204/2000_gi-671a5e3177b7d.jpg",
  "/assets/dc9d8fc4c918148acbf6.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_gi-67a356ae3e691.jpg",
  "/assets/ce1fd08ed9cf054377c6.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_gi-67a3571204a4d.jpg",
  "/assets/bd934dd2529afa0aea0a.jpg": "https://files.cdn-files-a.com/uploads/9824204/400_670d10b5f2842.jpg",
  "/assets/b9ff675c53886ed05ed7.svg": "https://images.cdn-files-a.com/ready_uploads/svg/quote-left.svg?v=3",
  "/assets/e85480eebeec9d011958.jpg": "https://files.cdn-files-a.com/uploads/9824204/400_670d10b6c7869.jpg",
  "/assets/be29c346c331602fe315.svg": "https://images.cdn-files-a.com/ready_uploads/svg/clock-o.svg?v=3",
  "/assets/eedfb3bab95d4439d523.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_gi-671a5907d8e8d.jpg",
  "/assets/d45e8975b5470e9cc159.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_670e9122d82b7.jpg",
  "/assets/c51d8399e0542cdcd1ed.woff2": "https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzaGW5Kb8VZA.woff2",
  "/assets/c1d97ae063f5ddf85764.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a354e13cb08_filter_67a3706aa33f7.jpg",
  "/assets/f04c07628d3a955ec40e.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a354684fe63_filter_67a37ccb5b585.jpg",
  "/assets/f83f48a25ae0c215030b.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_670e9122d82b7.jpg",
  "/assets/db73bc2bc39cc5436e57.jpg": "https://files.cdn-files-a.com/uploads/9824204/normal_67a3548b12232_filter_67a37ca7cf397.jpg",
  "/assets/e1a9e8006eaf90fd8024.svg": "https://images.cdn-files-a.com/ready_uploads/svg/minus.svg?v=3",
  "/assets/ecf9ad631351905d4960.jpg": "https://files.cdn-files-a.com/uploads/9824204/normal_67a355790c0bb_filter_67a36fbe84f1f.jpg",
  "/assets/da4dbe079dadecdd415d.jpg": "https://files.cdn-files-a.com/uploads/9824204/800_67a1ad1598a6d.jpg"
};
export const originalOrder=["67a35580eb0df", "67a354e5758d6", "67a354b37f728", "67a3548f8066a", "67a3546d24f3b", "67a3543c3a0c5", "67a354234ed1a", "67a353f23280c", "67a353ddc1196", "67a353a06c062"];
export function resolveAsset(value){if(typeof value!=='string')return value;const i=value.indexOf('/assets/');return i>=0?(recovered[value.slice(i)]||value):value}
export function publicAsset(value,root){if(typeof value==='string'&&value.length<=1000000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;const fixed=resolveAsset(value);return fixed!==value?fixed:root+String(value||'').replace(/^\//,'')}
export function repairAssets(scope=document){for(const node of scope.querySelectorAll('[src],[href],[data-bg],[style],style')){for(const attr of ['src','href','data-bg','data-src','poster']){const old=node.getAttribute(attr);if(old){const next=resolveAsset(old);if(next!==old)node.setAttribute(attr,next)}}if(node.hasAttribute('style'))node.setAttribute('style',node.getAttribute('style').replace(/url\((['"]?)(.*?)\1\)/g,(all,q,url)=>'url('+q+resolveAsset(url)+q+')'));if(node.tagName==='STYLE')node.textContent=node.textContent.replace(/(?:\/or-crochet)?\/assets\/[a-z0-9_.-]+/g,s=>resolveAsset(s))}}
