import { parse, type ParseResult } from "@babel/parser";
import generate from "@babel/generator";

export let files: Record<string, Record<number, string>> = {
  "client-boot": {
    953938:
      '(e,t,a)=>{"use strict";a.d(t,{M:()=>i});let i={shareChannelCreate:"share_channel_create",channelInviteModal:"channel_invite_modal",scdmFreeStartTrialBanner:"scdm_free_start_trial_banner",messageLimitTrialOfferModal:"message_limit_trial_offer_modal",huddlesTrialEntryPointModal:"huddles_trial_entry_point_modal",slackConnectTrialEntryPointModal:"slack_connect_trial_entry_point_modal",canvasTrialOfferModal:"canvas_trial_offer_modal"}}',
    9917302971:
      '(e,t,a)=>{"use strict";a.d(t,{A:()=>c});var i=a(0xbad225b5),n=a(0x120c268ad),r=a.n(n),s=a(0x181d663bb),o=a(0x1535e80f3);let l=class extends i.Component{render(){let{className:e,primaryContent:t,secondaryContent:a,size:n=o.ny.medium,style:l=o.pI.normal,padding:c=o.FK.normal}=this.props;return i.createElement("div",{className:r()(e,"c-base_list_entity",`c-base_list_entity--${n}`,{"c-base_list_entity--dim":l===o.pI.dim,"c-base_list_entity--highlight-dark":l===o.pI.highlightDark,"c-base_list_entity--highlight-dim":l===o.pI.highlightDim,"c-base_list_entity--highlight-light":l===o.pI.highlightLight,"c-base_list_entity--no-pad":c===o.FK.none}),...(0,s.A)(this.props)},i.createElement("div",{className:"c-base_list_entity__primary_content"},t),a&&i.createElement("div",{className:"c-base_list_entity__secondary_content"},a))}};l.displayName="BaseListEntity";let c=l}',
  },
  "client-boot-apis": {
    4871463522:
      '(a,t,e)=>{e.r(t),e.d(t,{register:()=>register});var n=e(0x1cbdfeceb),o=e(0xe874a88a);function getUserPrefsFromBootApis(a){return a.clientBootData?a.clientBootData.userPrefsData:a.clientInitData?a.clientInitData.prefs:void 0}var i=e(0x1cebc1ca);async function maybeFetchAllOnboardingData({apiData:a,contextualInfo:t}){let e={onboardingData:null,labFeaturesStartupData:null},{featureFlagData:n}=a,o=getUserPrefsFromBootApis(a);if(!o||!n)return e;let r=!!n?.feature_composer_email_classification;return window.location.search.match("skip_onboarding")||!o||o.onboarding_complete||(e.onboardingData=await (0,i.MC)(t),!e.onboardingData?.setup_started&&r&&(e.labFeaturesStartupData=await (0,i.yP)(t))),e}function maybeMergeKnownChannelsData({viewData:a,channelsData:t=[]}){if(!a?.channelData)return t;let e=t.findIndex(t=>t&&t.id===a?.channelData?.id);if(-1!==e){let n={...t[e],...a.channelData};t.splice(e,1,n)}return t}var r=e(0x20c2aafd7),l=e(0x210d04574),s=e(0x62a17882),c=e(0x13bc8447f),d=e(0xd35ac109),u=e(0x12c020c3),h=e(0xc5c8681e);async function maybeRedirectToTermsOfService({clientBootData:a}){let t=a.acceptTosUrl;if(!t)return;let e=a?.teamData?.url;if((0,s.y3)()){let a=`${e}ssb/redirect`,n=(0,u.M6)(t,"redirect",a),o=new l.A("User needs to accept Custom TOS");throw o.type=h.F9.API,o.subType="custom_tos",o.data={error:"user_needs_to_accept_custom_tos",url:n},o}let n=(0,d.VG)(location.search,"force_cold_boot",1),o=`${e}gantry${location.pathname}${n}`,i=(0,u.M6)(t,"redirect",o);return(0,r.pq)("BOOT",`(${a.teamData.id}) User needs to accept the terms of service; redirecting to ${i}`),location.assign(i),(0,c.A)()}var p=e(0x957d11e0),b=e(0x25799808);async function maybeReloadForReAuth({clientBootData:a}){return a?.should_reauth?((0,r.pq)("BOOT","Detected need to reauth; fetching auth and halting current boot."),(0,b.tw)(!1,!1,[],!0),(0,c.A)()):void 0}var f=e(0x15148ebc0),D=e(0x21c55473c),m=e(0x24de9bd60);async function transformInitialApiResponses({apiCalls:a,contextualInfo:t}){let{clientBootData:e,viewData:o,...i}=a,r=a.clientBootData.then(a=>a?(0,f.$)(a):null);r.catch(n.A);let l=a.viewData.then(D.W);return l.catch(n.A),{apiCalls:{clientBootData:r,viewData:l,...i},contextualInfo:t}}async function startOnboardingApis({apiCalls:a,contextualInfo:t}){let{getTracer:e,getTrace:i}=t.getTraceMeta(),r=i(),l=o.S.all([a.clientBootData,a.featureFlagData,a.clientInitData]).then(([a,n,o])=>e().traceFn({name:"fetchOnboardingData",options:{traceId:r.getTraceId(),parentSpanId:r.getRootSpanId()}},maybeFetchAllOnboardingData.bind(null,{apiData:{clientBootData:a,featureFlagData:n,clientInitData:o},contextualInfo:t}))).catch(a=>{throw a.type=h.F9.API,a.subType="allOnboardingData",a});return l.catch(n.A),{apiCalls:{allOnboardingData:l,...a},contextualInfo:t}}async function maybeMergeChannelData({apiCalls:a,contextualInfo:t}){let e=o.S.all([a.clientBootData,a.viewData]).then(([a,t])=>a?{...a,channelsData:maybeMergeKnownChannelsData({viewData:t,channelsData:a.channelsData})}:null);return e.catch(n.A),{apiCalls:{...a,clientBootData:e},contextualInfo:t}}function register(a){a.hooks.apiAfterInitialCalls.tap("Transform initial API responses",transformInitialApiResponses),a.hooks.apiAfterInitialCalls.tap("Handle split boot API errors",async({apiCalls:a,contextualInfo:t})=>(a.clientExtrasData?.catch(n.A),{apiCalls:a,contextualInfo:t})),a.hooks.apiAfterInitialCalls.tap("Maybe reload for a min version bump based on the client.shouldReload response",async({apiCalls:a,contextualInfo:t})=>{let e=a.shouldReloadData.then(a=>((0,p.p)({shouldReload:a.should_reload,recommendedBuildVersion:a.recommended_build_version,buildManifestLastModified:a.build_manifest_last_modified,reason:"boot"}),a));return e.catch(n.A),{apiCalls:{...a,shouldReloadData:e},contextualInfo:t}}),a.hooks.apiAfterInitialCalls.tap("Start onboarding APIs",startOnboardingApis),a.hooks.apiAfterInitialCalls.tap("Merge view data with client.boot channels data",maybeMergeChannelData),a.hooks.apiAfterInitialCalls.tap("Close API Boot Queue",m.u),a.hooks.apiAfterInitialCalls.tap("Maybe re-auth based on the client.boot response",async({apiCalls:a,contextualInfo:t})=>{let e=a.clientBootData.then(async a=>a?(await maybeReloadForReAuth({clientBootData:a}),a):null);return e.catch(n.A),{apiCalls:{...a,clientBootData:e},contextualInfo:t}}),a.hooks.apiAfterInitialCalls.tap("Maybe redirect to the terms of service based on the client.boot response",async({apiCalls:a,contextualInfo:t})=>{let e=a.clientBootData.then(async a=>a?(await maybeRedirectToTermsOfService({clientBootData:a}),a):null);return e.catch(n.A),{apiCalls:{...a,clientBootData:e},contextualInfo:t}})}}',
  },
  frog: {
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
    9: "",
    10: "",
    11: "",
    12: "",
    13: "",
    14: "",
    15: "",
    16: "",
    17: "",
    18: "",
    19: "",
    20: "",
    21: "",
    22: "",
    23: "",
    24: "",
    25: "",
    26: "",
    27: "",
    28: "",
    29: "",
    30: "",
  },
};

export function getCode(id: number) {
  return Object.values(files).find((file) => file[id])?.[id]!;
}

export async function getAST(id: number) {
  const code = getCode(id);
  return parse(/^\s*function\s*\(/.test(code) ? `(${code})` : code);
}

export async function toCode(ast: ParseResult) {
  return ((generate as any).default as typeof generate)(ast, {
    jsescOption: { minimal: true },
  }).code;
}
