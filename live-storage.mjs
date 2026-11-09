import {validate} from './live-core.mjs';
export const LIVE_DRAFT_KEY='crochet-live-draft-v2';
export function readLiveDraft(storage=localStorage){try{const saved=JSON.parse(storage.getItem(LIVE_DRAFT_KEY)||'null');if(!saved)return null;validate(saved.config);return saved}catch{return null}}
export function writeLiveDraft(config,storage=localStorage){validate(config);const saved={config,updatedAt:new Date().toISOString()};storage.setItem(LIVE_DRAFT_KEY,JSON.stringify(saved));return saved}
export function sameLive(a,b){return JSON.stringify(a)===JSON.stringify(b)}
