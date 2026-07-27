import{r as f,j as t}from"./motion-BePOjrkR.js";import{c as T,N as z,d as B,O as q,F as G,h as U,Q as v,D as H,z as L,C as w,v as V,s as J,R as X}from"./index-BX6VgVoZ.js";import{g as C,R as Y,_ as K,C as Q,r as P,a as W,S as Z,c as ee}from"./firebase-BSFNVwLe.js";import{S as te}from"./search-BkgyBznu.js";import{C as re}from"./chevron-up-_MCBlDHs.js";import{C as se}from"./chevron-down-Cr7DzA-U.js";import"./charts-BlxBy7Wi.js";/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=T("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=T("Unlock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=T("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie="type.googleapis.com/google.protobuf.Int64Value",oe="type.googleapis.com/google.protobuf.UInt64Value";function $(e,r){const s={};for(const n in e)e.hasOwnProperty(n)&&(s[n]=r(e[n]));return s}function A(e){if(e==null)return null;if(e instanceof Number&&(e=e.valueOf()),typeof e=="number"&&isFinite(e)||e===!0||e===!1||Object.prototype.toString.call(e)==="[object String]")return e;if(e instanceof Date)return e.toISOString();if(Array.isArray(e))return e.map(r=>A(r));if(typeof e=="function"||typeof e=="object")return $(e,r=>A(r));throw new Error("Data cannot be encoded in JSON: "+e)}function k(e){if(e==null)return e;if(e["@type"])switch(e["@type"]){case ie:case oe:{const r=Number(e.value);if(isNaN(r))throw new Error("Data cannot be decoded from JSON: "+e);return r}default:throw new Error("Data cannot be decoded from JSON: "+e)}return Array.isArray(e)?e.map(r=>k(r)):typeof e=="function"||typeof e=="object"?$(e,r=>k(r)):e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const S="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const I={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class b extends Y{constructor(r,s,n){super(`${S}/${r}`,s||""),this.details=n}}function le(e){if(e>=200&&e<300)return"ok";switch(e){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function ce(e,r){let s=le(e),n=s,i;try{const o=r&&r.error;if(o){const l=o.status;if(typeof l=="string"){if(!I[l])return new b("internal","internal");s=I[l],n=l}const c=o.message;typeof c=="string"&&(n=c),i=o.details,i!==void 0&&(i=k(i))}}catch{}return s==="ok"?null:new b(s,n,i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(r,s,n){this.auth=null,this.messaging=null,this.appCheck=null,this.auth=r.getImmediate({optional:!0}),this.messaging=s.getImmediate({optional:!0}),this.auth||r.get().then(i=>this.auth=i,()=>{}),this.messaging||s.get().then(i=>this.messaging=i,()=>{}),this.appCheck||n.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{const r=await this.auth.getToken();return r==null?void 0:r.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(r){if(this.appCheck){const s=r?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return s.error?null:s.token}return null}async getContext(r){const s=await this.getAuthToken(),n=await this.getMessagingToken(),i=await this.getAppCheckToken(r);return{authToken:s,messagingToken:n,appCheckToken:i}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const E="us-central1";function ue(e){let r=null;return{promise:new Promise((s,n)=>{r=setTimeout(()=>{n(new b("deadline-exceeded","deadline-exceeded"))},e)}),cancel:()=>{r&&clearTimeout(r)}}}class me{constructor(r,s,n,i,o=E,l){this.app=r,this.fetchImpl=l,this.emulatorOrigin=null,this.contextProvider=new de(s,n,i),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(o);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=E}catch{this.customDomain=null,this.region=o}}_delete(){return this.deleteService()}_url(r){const s=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${s}/${this.region}/${r}`:this.customDomain!==null?`${this.customDomain}/${r}`:`https://${this.region}-${s}.cloudfunctions.net/${r}`}}function xe(e,r,s){e.emulatorOrigin=`http://${r}:${s}`}function he(e,r,s){return n=>fe(e,r,n,{})}async function pe(e,r,s,n){s["Content-Type"]="application/json";let i;try{i=await n(e,{method:"POST",body:JSON.stringify(r),headers:s})}catch{return{status:0,json:null}}let o=null;try{o=await i.json()}catch{}return{status:i.status,json:o}}function fe(e,r,s,n){const i=e._url(r);return ge(e,i,s,n)}async function ge(e,r,s,n){s=A(s);const i={data:s},o={},l=await e.contextProvider.getContext(n.limitedUseAppCheckTokens);l.authToken&&(o.Authorization="Bearer "+l.authToken),l.messagingToken&&(o["Firebase-Instance-ID-Token"]=l.messagingToken),l.appCheckToken!==null&&(o["X-Firebase-AppCheck"]=l.appCheckToken);const c=n.timeout||7e4,m=ue(c),x=await Promise.race([pe(r,i,o,e.fetchImpl),m.promise,e.cancelAllRequests]);if(m.cancel(),!x)throw new b("cancelled","Firebase Functions instance was deleted.");const h=ce(x.status,x.json);if(h)throw h;if(!x.json)throw new b("internal","Response is not valid JSON object.");let p=x.json.data;if(typeof p>"u"&&(p=x.json.result),typeof p>"u")throw new b("internal","Response is missing data field.");return{data:k(p)}}const D="@firebase/functions",O="0.11.8";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const be="auth-internal",ye="app-check-internal",Ne="messaging-internal";function ve(e,r){const s=(n,{instanceIdentifier:i})=>{const o=n.getProvider("app").getImmediate(),l=n.getProvider(be),c=n.getProvider(Ne),m=n.getProvider(ye);return new me(o,l,c,m,i,e)};K(new Q(S,s,"PUBLIC").setMultipleInstances(!0)),P(D,O,r),P(D,O,"esm2017")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ke(e=ee(),r=E){const n=W(C(e),S).getImmediate({identifier:r}),i=Z("functions");return i&&je(n,...i),n}function je(e,r,s){xe(C(e),r,s)}function we(e,r,s){return he(C(e),r)}ve(fetch.bind(self));const Ae="southamerica-east1",Ee=ke(z,Ae);function Te(e){return we(Ee,e)}async function Ce(e){return(await Te("adminSetUserAccess")(e)).data}const y={premium:{bg:"bg-emerald-100 dark:bg-emerald-900/40",text:"text-emerald-700 dark:text-emerald-400",dot:"bg-emerald-500"},premium_expired:{bg:"bg-orange-100 dark:bg-orange-900/40",text:"text-orange-700 dark:text-orange-400",dot:"bg-orange-400"},trial_active:{bg:"bg-blue-100 dark:bg-blue-900/40",text:"text-blue-700 dark:text-blue-400",dot:"bg-blue-400"},trial_expired:{bg:"bg-gray-100 dark:bg-gray-800",text:"text-gray-500 dark:text-gray-400",dot:"bg-gray-400"},blocked:{bg:"bg-red-100 dark:bg-red-900/40",text:"text-red-700 dark:text-red-400",dot:"bg-red-500"},free:{bg:"bg-gray-100 dark:bg-gray-800",text:"text-gray-500 dark:text-gray-400",dot:"bg-gray-300"}};function R({u:e}){const r=v(e),s=y[r.key];return t.jsxs("span",{className:`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`,children:[t.jsx("span",{className:`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`}),r.label,r.sub&&t.jsxs("span",{className:"opacity-70 font-normal",children:["· ",r.sub]})]})}function Se({u:e,onActivate:r,onRemovePremium:s,onBlock:n,onUnblock:i}){var p;const[o,l]=f.useState(!1),[c,m]=f.useState(1),h=v(e).key==="premium";return t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] items-stretch sm:items-center gap-3 px-4 py-3 border-b border-[--border-subtle] last:border-0 hover:bg-[--bg-hover] transition-colors",children:[t.jsxs("button",{className:"flex min-h-11 w-full items-center gap-2.5 min-w-0 text-left",onClick:()=>l(d=>!d),"aria-expanded":o,children:[t.jsx("div",{className:"w-7 h-7 rounded-lg bg-[--brand-100] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[--brand-600]",children:(e.displayName||e.email||"U")[0].toUpperCase()}),t.jsxs("div",{className:"min-w-0",children:[t.jsx("p",{className:"text-sm font-semibold text-[--text-primary] truncate leading-tight",children:e.displayName||"—"}),t.jsx("p",{className:"text-xs text-[--text-tertiary] truncate leading-tight",children:e.email})]}),o?t.jsx(re,{size:12,className:"text-[--text-tertiary] flex-shrink-0 ml-1"}):t.jsx(se,{size:12,className:"text-[--text-tertiary] flex-shrink-0 ml-1"})]}),t.jsx("div",{className:"hidden sm:block",children:t.jsx(R,{u:e})}),t.jsxs("div",{className:"flex w-full sm:w-auto items-center gap-2 flex-shrink-0",children:[t.jsxs("div",{className:"flex min-w-0 flex-1 sm:flex-none items-center rounded-xl border border-[--border-default] overflow-hidden",children:[t.jsx("select",{value:c,onChange:d=>m(Number(d.target.value)),className:"min-h-11 text-xs px-2 bg-[--bg-elevated] text-[--text-primary] border-0 focus:outline-none","aria-label":`Meses de acesso para ${e.displayName||e.email}`,children:[1,2,3,6].map(d=>t.jsxs("option",{value:d,children:[d,"m"]},d))}),t.jsxs("button",{onClick:()=>r(e.uid,c),className:"min-h-11 flex-1 sm:flex-none px-3 bg-[--brand-600] text-white text-xs font-semibold hover:bg-[--brand-700] transition-colors inline-flex items-center justify-center gap-1","aria-label":`Ativar ${c} ${c===1?"mês":"meses"} para ${e.displayName||e.email}`,children:[t.jsx(V,{size:11})," Ativar"]})]}),h&&t.jsx("button",{onClick:()=>s(e.uid),className:"w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors",title:"Remover Premium","aria-label":`Remover Premium de ${e.displayName||e.email}`,children:t.jsx(J,{size:13})}),e.blocked?t.jsx("button",{onClick:()=>i(e.uid),className:"w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-[--success-icon] hover:border-[--success-border] transition-colors",title:"Desbloquear","aria-label":`Desbloquear ${e.displayName||e.email}`,children:t.jsx(ae,{size:13})}):t.jsx("button",{onClick:()=>n(e.uid),className:"w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-[--danger-text] hover:border-[--danger-border] hover:bg-[--danger-bg] transition-colors",title:"Bloquear","aria-label":`Bloquear ${e.displayName||e.email}`,children:t.jsx(L,{size:13})})]})]}),o&&t.jsxs("div",{className:"px-4 pb-3 bg-[--bg-subtle] border-b border-[--border-subtle]",children:[t.jsx("div",{className:"flex items-center gap-2 mb-2 pt-2 sm:hidden",children:t.jsx(R,{u:e})}),t.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs",children:[{label:"Plano",value:e.plan||"trial"},{label:"Cadastro",value:(p=e.createdAt)!=null&&p.toDate?e.createdAt.toDate().toLocaleDateString("pt-BR"):"—"},{label:"Premium até",value:X(e)},{label:"Status",value:e.blocked?"🔴 Bloqueado":"🟢 Ativo"}].map(d=>t.jsxs("div",{children:[t.jsxs("span",{className:"text-[--text-tertiary]",children:[d.label,": "]}),t.jsx("span",{className:"font-medium text-[--text-primary]",children:d.value})]},d.label))})]})]})}function Le(){const{isAdmin:e}=B(),[r,s]=f.useState([]),[n,i]=f.useState(""),[o,l]=f.useState(""),[c,m]=f.useState("");f.useEffect(()=>{if(!e)return;const a=q(u=>s(u),u=>m("Erro: "+u.message));return()=>{a&&a()}},[e]);const x=a=>{l(a),setTimeout(()=>l(""),3e3)},h=async(a,u)=>{m("");try{await Ce(a),x(u)}catch(g){m((g==null?void 0:g.message)||"Não foi possível concluir a ação administrativa.")}},p=(a,u)=>h({targetUid:a,action:"activate",months:u},`✓ Premium ativado por ${u} mês(es)`),d=a=>h({targetUid:a,action:"remove"},"Premium removido."),F=a=>h({targetUid:a,action:"block"},"Usuário bloqueado."),M=a=>h({targetUid:a,action:"unblock"},"Usuário desbloqueado.");if(!e)return t.jsxs("div",{className:"flex flex-col items-center justify-center min-h-[60vh] text-center gap-3",children:[t.jsx(G,{size:40,className:"text-[--text-tertiary]"}),t.jsx("p",{className:"text-lg font-bold text-[--text-primary]",children:"Acesso restrito"}),t.jsx("p",{className:"text-sm text-[--text-tertiary]",children:"Área exclusiva para administradores."})]});if(c)return t.jsxs("div",{className:"flex flex-col items-center justify-center min-h-[60vh] text-center gap-3",children:[t.jsx(U,{size:40,className:"text-[--danger-icon]"}),t.jsx("p",{className:"text-base font-bold text-[--text-primary]",children:"Erro ao carregar dados"}),t.jsx("p",{className:"text-sm text-[--text-tertiary]",children:c})]});const j=r.filter(a=>{var u,g;return((u=a.email)==null?void 0:u.toLowerCase().includes(n.toLowerCase()))||((g=a.displayName)==null?void 0:g.toLowerCase().includes(n.toLowerCase()))}),N={total:r.length,premium:r.filter(a=>v(a).key==="premium").length,trial:r.filter(a=>v(a).key==="trial_active").length,blocked:r.filter(a=>a.blocked).length};return t.jsxs("div",{className:"space-y-5 pb-24 lg:pb-6",children:[t.jsxs("div",{children:[t.jsx("h1",{className:"text-2xl font-black text-[--text-primary]",children:"Painel Admin"}),t.jsx("p",{className:"text-sm text-[--text-tertiary]",children:"Usuários em tempo real"})]}),o&&t.jsx("div",{className:"p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium",children:o}),t.jsx("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-3",children:[{label:"Total",value:N.total,icon:t.jsx(_,{size:15}),style:y.free},{label:"Premium",value:N.premium,icon:t.jsx(H,{size:15}),style:y.premium},{label:"Trial",value:N.trial,icon:t.jsx(ne,{size:15}),style:y.trial_active},{label:"Bloqueados",value:N.blocked,icon:t.jsx(L,{size:15}),style:y.blocked}].map(a=>t.jsxs(w,{className:"!p-4",children:[t.jsx("div",{className:`inline-flex items-center justify-center w-8 h-8 rounded-xl mb-2 ${a.style.bg}`,children:t.jsx("span",{className:a.style.text,children:a.icon})}),t.jsx("p",{className:"text-2xl font-black text-[--text-primary]",children:a.value}),t.jsx("p",{className:"text-xs text-[--text-tertiary]",children:a.label})]},a.label))}),t.jsx(w,{children:t.jsxs("div",{className:"flex items-start gap-3",children:[t.jsx(U,{size:15,className:"text-[--warning-icon] flex-shrink-0 mt-0.5"}),t.jsxs("div",{className:"text-sm text-[--text-secondary] space-y-0.5",children:[t.jsx("p",{className:"font-semibold text-[--text-primary]",children:"Fluxo Pix"}),t.jsx("p",{children:"1. Usuário paga R$ 19,90 e informa o e-mail na descrição."}),t.jsxs("p",{children:["2. Localize abaixo e clique ",t.jsx("strong",{children:"Ativar"}),"."]})]})]})}),t.jsxs(w,{className:"!p-0 overflow-hidden",children:[t.jsxs("div",{className:"flex items-center justify-between px-4 py-3 border-b border-[--border-subtle]",children:[t.jsxs("h2",{className:"text-sm font-bold text-[--text-primary]",children:["Usuários ",t.jsxs("span",{className:"text-[--text-tertiary] font-normal",children:["(",j.length,")"]})]}),t.jsxs("div",{className:"relative",children:[t.jsx(te,{size:13,className:"absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-tertiary]"}),t.jsx("input",{placeholder:"Buscar...",value:n,onChange:a=>i(a.target.value),className:"text-xs border border-[--border-default] rounded-xl pl-7 pr-3 py-1.5 bg-[--bg-elevated] text-[--text-primary] focus:outline-none focus:border-[--brand-500] w-44"})]})]}),t.jsxs("div",{className:"grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_auto] px-4 py-2 bg-[--bg-subtle] border-b border-[--border-subtle]",children:[t.jsx("span",{className:"text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider",children:"Usuário"}),t.jsx("span",{className:"hidden sm:block text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider",children:"Status"}),t.jsx("span",{className:"text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider text-right",children:"Ações"})]}),j.length===0?t.jsxs("div",{className:"text-center py-12",children:[t.jsx(_,{size:28,className:"text-[--text-tertiary] mx-auto mb-2"}),t.jsx("p",{className:"text-sm text-[--text-tertiary]",children:n?"Nenhum usuário encontrado.":"Nenhum usuário cadastrado."})]}):j.map(a=>t.jsx(Se,{u:a,onActivate:p,onRemovePremium:d,onBlock:F,onUnblock:M},a.uid))]})]})}export{Le as default};
