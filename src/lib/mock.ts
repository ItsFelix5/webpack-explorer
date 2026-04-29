import { writable } from "svelte/store";

export let modules = writable({
  aa: ["0xb1526d12"],
} as Record<string, string[]>);

export let code = new Map<string, string>([
  [
    "0xb1526d12",
    '(e,t,n)=>{"use strict";n.d(t,{A:()=>i});var a=n(0xba77ecb9),r=n(0x1bc3b97c1);let i=(0,a.Ay)({},{activeChannels:{}},{storeKey:"huddles",persistenceEnabled:!1}).on(r.mr,(e,{call:t,channelId:n})=>{let a;if(!t||!t.id||!n)return e;a=t.hasEnded?null:e.activeChannels[n]?.callId===t.id?{...e.activeChannels[n],channelId:n}:{channelId:n,callId:t.id};let r={...e.activeChannels,[n]:a};return{...e,activeChannels:r}}).on(r.oz,(e,t)=>{if(!t?.length)return e;let n={...e.activeChannels};return t.forEach(({omit:e,...t})=>{t.callId?n[t.channelId]=t:e?delete n[t.channelId]:n[t.channelId]=null}),{...e,activeChannels:n}}).on(r.Tp,(e,t)=>{if(!t)return e;let n={};return t.forEach(e=>{n[e.channelId]=e}),{...e,activeChannels:n}}).on(r.Jc,(e,t)=>e.optimisticTopic===t?e:{...e,optimisticTopic:t}).on(r.KG,(e,t)=>({...e,triggeredExternalUserWarning:t}))}',
  ],
]);

export async function loadModules() {}
