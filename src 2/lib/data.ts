let webpackChunkwebapp: Record<string, Record<PropertyKey, string>> = {
  "client-boot": {
    953938:
      '(e,t,a)=>{"use strict";a.d(t,{M:()=>i});let i={shareChannelCreate:"share_channel_create",channelInviteModal:"channel_invite_modal",scdmFreeStartTrialBanner:"scdm_free_start_trial_banner",messageLimitTrialOfferModal:"message_limit_trial_offer_modal",huddlesTrialEntryPointModal:"huddles_trial_entry_point_modal",slackConnectTrialEntryPointModal:"slack_connect_trial_entry_point_modal",canvasTrialOfferModal:"canvas_trial_offer_modal"}}',
    9917302971:
      '(e,t,a)=>{"use strict";a.d(t,{A:()=>c});var i=a(0xbad225b5),n=a(0x120c268ad),r=a.n(n),s=a(0x181d663bb),o=a(0x1535e80f3);let l=class extends i.Component{render(){let{className:e,primaryContent:t,secondaryContent:a,size:n=o.ny.medium,style:l=o.pI.normal,padding:c=o.FK.normal}=this.props;return i.createElement("div",{className:r()(e,"c-base_list_entity",`c-base_list_entity--${n}`,{"c-base_list_entity--dim":l===o.pI.dim,"c-base_list_entity--highlight-dark":l===o.pI.highlightDark,"c-base_list_entity--highlight-dim":l===o.pI.highlightDim,"c-base_list_entity--highlight-light":l===o.pI.highlightLight,"c-base_list_entity--no-pad":c===o.FK.none}),...(0,s.A)(this.props)},i.createElement("div",{className:"c-base_list_entity__primary_content"},t),a&&i.createElement("div",{className:"c-base_list_entity__secondary_content"},a))}};l.displayName="BaseListEntity";let c=l}',
  }, // etc
};

/**
 * Provide files to the UI.
 *
 * getFiles() returns an array of objects with shape:
 *   { name: string, original: string }
 *
 * The hosting page can import this module or call it after bundling.
 */
export function getFiles(): { name: string; original: string }[] {
  const out: { name: string; original: string }[] = [];

  for (const chunkName in webpackChunkwebapp) {
    const chunk = webpackChunkwebapp[chunkName];
    for (const key in chunk) {
      // coerce to string to ensure safe serialization
      const code = String((chunk as Record<string, unknown>)[key]);
      // create a stable name that encodes chunk and id
      out.push({ name: `${chunkName}-${String(key)}`, original: code });
    }
  }

  return out;
}
