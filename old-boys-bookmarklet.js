(function(){
var VERSION='v13';
if(document.getElementById('obc-panel')){document.getElementById('obc-panel').remove();return;}

var mx=window.location.pathname.match(/\/regattas\/(\d+)/);
var RID=mx?mx[1]:'';
var REGATTA_NAME=(document.title||'').trim();

// ── GPS boys' schools ─────────────────────────────────────────────────────────
var SCHOOL_MAP=[
  ['BRISBANE BOYS COLLEGE','BBC'],['BRISBANE BOYS','BBC'],['BBC','BBC'],
  ['BRISBANE GRAMMAR SCHOOL','BGS'],['BRISBANE GRAMMAR','BGS'],['BGS','BGS'],
  ['ACGS','ACGS'],['ANGLICAN CHURCH GRAMMAR','ACGS'],['CHURCHIE','ACGS'],
  ['BRISBANE STATE HIGH SCHOOL','BSHS'],['BRISBANE STATE HIGH','BSHS'],['BRISBANE SHS','BSHS'],['BSHS','BSHS'],
  ['GREGORY TERRACE','GT'],['TERRACE','GT'],['GT','GT'],
  ['NUDGEE COLLEGE','NC'],['NUDGEE','NC'],["SAINT JOSEPH'S COLLEGE",'NC'],['NC','NC'],
  ['THE SOUTHPORT SCHOOL','TSS'],['SOUTHPORT','TSS'],['TSS','TSS'],
];
var SCHOOLS=['TSS','BGS','GT','ACGS','NC','BBC','BSHS'];
var SCHOOL_FULL={TSS:'The Southport School',BGS:'Brisbane Grammar',GT:'Gregory Terrace',ACGS:'ACGS',NC:'Nudgee College',BBC:"Brisbane Boys' College",BSHS:'Brisbane SHS'};
var SCHOOL_COLOR={TSS:'#a2daf1',BGS:'#b2c4ee',GT:'#e9c9be',ACGS:'#d4b4eb',NC:'#95f1b9',BBC:'#ffb25f',BSHS:'#fb9ca0'};

function abbrev(raw){
  if(!raw)return null;
  var u=raw.toUpperCase().trim().replace(/\s+\d+$/,'').trim();
  for(var i=0;i<SCHOOL_MAP.length;i++){
    if(u===SCHOOL_MAP[i][0]||u.indexOf(SCHOOL_MAP[i][0])===0)return SCHOOL_MAP[i][1];
  }
  return null;
}

// ── Points scales (by boat class) — only the Old Boys' Cup (BY10/BY11/BO8) counts
// toward the Cup total; BY9 is grade ranking only. ──────────────────────────────
var PTS_104={1:7,2:6,3:5,4:4,5:3,6:2,7:1};
var PTS_8  ={1:14,2:12,3:10,4:8,5:6,6:4,7:2};
var PTS_94 ={1:7,2:6,3:5,4:4,5:3,6:2,7:1};

var RACE_TYPES=[
  {pat:'BY104x+',type:'by10',divs:['D1','D2','D3','D4','D5','D6'],pts:PTS_104,cup:true, color:'#7b95ff'},
  {pat:'BY118+', type:'by11',divs:['D1','D2','D3'],               pts:PTS_8,  cup:true, color:'#a78bfa'},
  {pat:'BO8+',   type:'bo8', divs:['D1','D2','D3'],               pts:PTS_8,  cup:true, color:'#f5834a'},
  {pat:'BY94x+', type:'by9', divs:['D1','D2','D3','D4','D5','D6'],pts:PTS_94, cup:false,color:'#94a3b8'},
];
var TYPE_LABEL={by10:'Year 10 Quad',by11:'Year 11 Eight',bo8:'Open Eight',by9:'Year 9 Quad'};

var TABS=[
  {id:'cup',    label:'Cup'},
  {id:'by10',   label:'BY10'},
  {id:'by11',   label:'BY11'},
  {id:'bo8',    label:'BO8'},
  {id:'by9',    label:'BY9'},
  {id:'races',  label:'Races'},
  {id:'schools',label:'Schools'},
  {id:'export', label:'Export'},
];

var races={};
var RACES_KEY=RID?('obc_races_'+RID+'_v1'):null;
function loadRaces(){
  if(!RACES_KEY)return;
  try{
    var raw=window.localStorage.getItem(RACES_KEY);
    if(raw){var saved=JSON.parse(raw);for(var id in saved)races[id]=saved[id];}
  }catch(e){}
}
function saveRaces(){
  if(!RACES_KEY)return;
  try{window.localStorage.setItem(RACES_KEY,JSON.stringify(races));}catch(e){}
}
loadRaces();
var currentTab='cup';

function divMatches(code,div){return code.toUpperCase().endsWith(div.toUpperCase());}

// Only the first occurrence of each event code in the race list scores.
function isScoringFinal(race){return race.isFirstOccurrence!==false;}

// ── Lane gap detection ────────────────────────────────────────────────────────
// Ineligible crews sit in the LOWEST lanes, separated from the main field by a gap.
function isolatedLanes(rows){
  var lanes=[];
  rows.forEach(function(r){if(r.lane&&r.lane>0)lanes.push(r.lane);});
  if(lanes.length<2)return new Set();
  lanes.sort(function(a,b){return a-b;});
  var firstGapIdx=null;
  for(var i=1;i<lanes.length;i++){
    if(lanes[i]-lanes[i-1]>1){firstGapIdx=i;break;}
  }
  if(firstGapIdx===null)return new Set();
  var isolated=lanes.slice(0,firstGapIdx);
  var main=lanes.slice(firstGapIdx);
  if(isolated.length>=main.length)return new Set();
  var s=new Set();
  isolated.forEach(function(l){s.add(l);});
  return s;
}

// Competition ranking over the schools for a {school:value} map (ties share a rank).
function rankMap(vals,exclude){
  var order=SCHOOLS.filter(function(s){return s!==exclude;}).slice().sort(function(a,b){return vals[b]-vals[a];});
  var out={},prev=null,prevRank=0;
  order.forEach(function(s,i){
    if(prev!==null&&vals[s]===vals[prev])out[s]=prevRank;else{out[s]=i+1;prevRank=i+1;}
    prev=s;
  });
  if(exclude)out[exclude]='x';
  return out;
}

// ── Panel ─────────────────────────────────────────────────────────────────────
var panel=document.createElement('div');
panel.id='obc-panel';
panel.style.cssText='position:fixed;top:12px;right:12px;width:640px;max-height:94vh;overflow-y:auto;background:#0f1117;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.7);z-index:99999;font-family:Segoe UI,system-ui,sans-serif;font-size:12px;color:#e8e9f0;';
var tabBtns=TABS.map(function(t){
  var a=t.id==='cup';
  return '<button id="obc-tab-'+t.id+'" onclick="obcTab(\''+t.id+'\')" style="background:'+(a?'#4f6ef7':'#222535')+';border:'+(a?'none':'1px solid rgba(255,255,255,.1)')+';color:'+(a?'#fff':'#7c7f96')+';border-radius:6px;padding:4px 9px;font-size:11px;font-weight:'+(a?'600':'400')+';cursor:pointer;">'+t.label+'</button>';
}).join('');
panel.innerHTML=
  '<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:#1a1d27;border-radius:14px 14px 0 0;position:sticky;top:0;z-index:2;">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
  +'<div><div style="font-weight:700;font-size:15px;">\uD83C\uDFC6 Old Boys\' Cup <span style="font-size:10px;color:#4f6ef7;">'+VERSION+'</span></div>'
  +'<div id="obc-status" style="font-size:11px;color:#7c7f96;margin-top:1px;">'+(RID?'Regatta #'+RID+' · Starting…':'No regatta ID in URL')+'</div></div>'
  +'<button onclick="document.getElementById(\'obc-panel\').remove()" style="background:none;border:none;color:#7c7f96;font-size:20px;cursor:pointer;padding:0 2px;line-height:1;">&times;</button>'
  +'</div><div style="display:flex;gap:4px;flex-wrap:wrap;">'+tabBtns+'</div>'
  +'<div style="display:flex;align-items:center;gap:10px;margin-top:9px;font-size:11px;color:#7c7f96;">'
  +'<button id="obc-refresh-btn" onclick="obcRefreshNow()" style="background:#222535;border:1px solid rgba(255,255,255,.14);color:#e8e9f0;border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer;">&#8635; Refresh now</button>'
  +'<label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input id="obc-auto" type="checkbox" checked onchange="obcToggleAuto(this.checked)" style="cursor:pointer;accent-color:#4f6ef7;">Auto-refresh</label>'
  +'<span id="obc-checked" style="margin-left:auto;"></span>'
  +'</div></div>'
  +'<div id="obc-update-banner"></div>'
  +'<div style="height:2px;background:rgba(255,255,255,.05);"><div id="obc-prog" style="height:100%;background:#4f6ef7;width:0%;transition:width .5s;"></div></div>'
  +'<div id="obc-content" style="padding:14px 16px;"></div>'
  +'<div style="padding:6px 16px 10px;border-top:1px solid rgba(255,255,255,.06);">'
  +'<div id="obc-log" style="font-size:10px;font-family:monospace;color:#7c7f96;max-height:48px;overflow-y:auto;line-height:1.6;"></div>'
  +'</div>';
document.body.appendChild(panel);

window.obcTab=function(tab){
  currentTab=tab;
  TABS.forEach(function(t){
    var b=document.getElementById('obc-tab-'+t.id);if(!b)return;
    var a=t.id===tab;
    b.style.background=a?'#4f6ef7':'#222535';
    b.style.color=a?'#fff':'#7c7f96';
    b.style.border=a?'none':'1px solid rgba(255,255,255,.1)';b.style.fontWeight=a?'600':'400';
  });
  obcRender();
};
function obcLog(msg,col){
  var el=document.getElementById('obc-log');if(!el)return;
  var t=new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var line=document.createElement('div');line.style.color=col||'#7c7f96';
  line.textContent='['+t+'] '+msg;el.insertBefore(line,el.firstChild);
}
function obcProg(p){var e=document.getElementById('obc-prog');if(e)e.style.width=p+'%';}
function obcStatus(m){var e=document.getElementById('obc-status');if(e)e.textContent=m;}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
// Human-paced, jittered delay so requests don't look automated.
function politeDelay(){return 6000+Math.floor(Math.random()*5000);} // 6–11 s

// ── Parser ────────────────────────────────────────────────────────────────────
function parseResultHtml(html){
  if(!html)return{results:[],raceType:null};
  var tmp=document.createElement('div');tmp.innerHTML=html;
  var raceType=null;
  var hdrs=tmp.querySelectorAll('.rm_results_hdr');
  if(hdrs.length)raceType=hdrs[hdrs.length-1].textContent.trim()||null;
  var pmap={'1st':1,'2nd':2,'3rd':3,'4th':4,'5th':5,'6th':6,'7th':7,'8th':8,'9th':9,'10th':10,'11th':11,'12th':12};
  var rawRows=[];
  tmp.querySelectorAll('tr').forEach(function(row){
    var placeEl=row.querySelector('.rm_place');
    if(!placeEl)return;
    var placeText=placeEl.textContent.trim();
    if(!placeText)return; // DNS/SCR/DNF have whitespace only
    var overallPlace=pmap[placeText.toLowerCase()]||null;
    if(!overallPlace)return;
    var schoolEl=row.querySelector('div[style*="float:left"]');
    if(!schoolEl)return;
    var rawSchool=schoolEl.textContent.trim();
    if(!rawSchool)return;
    var cells=row.querySelectorAll('td');
    var lane=0;
    if(cells[2]){var lv=parseInt(cells[2].textContent.trim());if(!isNaN(lv)&&lv>0&&lv<=10)lane=lv;}
    var divCode=null;
    if(cells[1]){var dm=cells[1].innerHTML.match(/(?:\d+(?:st|nd|rd|th))\s+([A-Z0-9+]+D\d+):/i);if(dm)divCode=dm[1].toUpperCase();}
    var time='';
    cells.forEach(function(td){if(!time&&/^\d+:\d+\.\d+$/.test(td.textContent.trim()))time=td.textContent.trim();});
    rawRows.push({overallPlace:overallPlace,rawSchool:rawSchool,lane:lane,divCode:divCode,time:time});
  });
  if(!rawRows.length)return{results:[],raceType:raceType};
  var divCodeSet={};
  rawRows.forEach(function(r){if(r.divCode)divCodeSet[r.divCode]=true;});
  var udc=Object.keys(divCodeSet);
  var results=[];
  if(udc.length>1){
    var groups={};
    rawRows.forEach(function(r){var k=r.divCode||'UNKNOWN';if(!groups[k])groups[k]=[];groups[k].push(r);});
    Object.keys(groups).forEach(function(dc){
      groups[dc].forEach(function(r,idx){results.push({place:idx+1,overallPlace:r.overallPlace,rawSchool:r.rawSchool,lane:r.lane,divCode:dc,time:r.time});});
    });
  }else{
    rawRows.forEach(function(r){results.push({place:r.overallPlace,overallPlace:r.overallPlace,rawSchool:r.rawSchool,lane:r.lane,divCode:r.divCode,time:r.time});});
  }
  return{results:results,raceType:raceType};
}

// ── Classification ────────────────────────────────────────────────────────────
function classifyRace(race){
  var segments=[],seen={};
  (race.codes||[]).forEach(function(code){
    var u=code.toUpperCase();if(seen[u])return;
    for(var i=0;i<RACE_TYPES.length;i++){
      var rt=RACE_TYPES[i];
      if(u.indexOf(rt.pat.toUpperCase())<0)continue;
      for(var di=0;di<rt.divs.length;di++){
        if(divMatches(code,rt.divs[di])){seen[u]=true;segments.push({rt:rt,code:code});break;}
      }
    }
  });
  return segments;
}
function resultsForDiv(results,divCode){
  var hdc=results.some(function(r){return r.divCode;});
  if(hdc)return results.filter(function(r){return r.divCode&&r.divCode.toUpperCase()===divCode.toUpperCase();});
  return results;
}
function eligibleScored(divResults){
  var ineligibleLanes=isolatedLanes(divResults);
  var eligible=divResults.filter(function(r){return !ineligibleLanes.has(r.lane);});
  var ineligible=divResults.filter(function(r){return ineligibleLanes.has(r.lane);});
  eligible.sort(function(a,b){return a.place-b.place;});
  ineligible.sort(function(a,b){return a.place-b.place;});
  var best={};
  eligible.forEach(function(r){
    var s=abbrev(r.rawSchool);if(!s)return;
    if(best[s]===undefined||r.place<best[s].place)best[s]={place:r.place,time:r.time};
  });
  var scored=Object.keys(best).map(function(s){return{school:s,place:best[s].place};}).sort(function(a,b){return a.place-b.place;});
  scored.forEach(function(r,i){r.scoringPlace=i+1;});
  var ineligBest={};
  ineligible.forEach(function(r){
    var s=abbrev(r.rawSchool)||r.rawSchool;
    if(ineligBest[s]===undefined||r.place<ineligBest[s].place)ineligBest[s]={place:r.place,school:s};
  });
  var ineligList=Object.keys(ineligBest).map(function(s){return ineligBest[s];}).sort(function(a,b){return a.place-b.place;});
  return{scored:scored,ineligList:ineligList,ineligibleLanes:ineligibleLanes};
}

// ── Compute totals (per-tab, filtered) ────────────────────────────────────────
function computeTotals(filterFn){
  var totals={},segments=[];
  SCHOOLS.forEach(function(s){totals[s]=0;});
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var race=races[id];
    if(!race.results||!race.results.length)return;
    if(!isScoringFinal(race))return;
    classifyRace(race).forEach(function(seg){
      if(!filterFn(seg))return;
      var divResults=resultsForDiv(race.results,seg.code);
      if(!divResults.length)return;
      var e=eligibleScored(divResults);
      if(!e.scored.length)return;
      segments.push({race:race,seg:seg,scored:e.scored,ineligList:e.ineligList,ineligibleLanes:e.ineligibleLanes});
      e.scored.forEach(function(r){
        var pts=seg.rt.pts[r.scoringPlace]||0;
        if(totals[r.school]!==undefined)totals[r.school]+=pts;
      });
    });
  });
  return{totals:totals,segments:segments};
}
// Single pass across every scoring segment (cup and non-cup) — used by the Export report.
function computeCupSummary(){
  var totals={},bySeg={by10:{},by11:{},bo8:{},by9:{}},segments=[];
  SCHOOLS.forEach(function(s){totals[s]=0;['by10','by11','bo8','by9'].forEach(function(k){bySeg[k][s]=0;});});
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var race=races[id];
    if(!race.results||!race.results.length||!isScoringFinal(race))return;
    classifyRace(race).forEach(function(seg){
      var dr=resultsForDiv(race.results,seg.code);if(!dr.length)return;
      var e=eligibleScored(dr);if(!e.scored.length)return;
      segments.push({race:race,seg:seg,scored:e.scored});
      e.scored.forEach(function(r){
        var pts=seg.rt.pts[r.scoringPlace]||0;
        if(totals[r.school]===undefined)return;
        if(seg.rt.cup)totals[r.school]+=pts;
        bySeg[seg.rt.type][r.school]=(bySeg[seg.rt.type][r.school]||0)+pts;
      });
    });
  });
  var rankOf=rankMap(totals);
  var winner=SCHOOLS.slice().sort(function(a,b){return totals[b]-totals[a];})[0];
  return{totals:totals,bySeg:bySeg,rankOf:rankOf,winner:winner,segments:segments};
}

// ── Grid renderer (used by the Cup / BY10 / BY11 / BO8 / BY9 tabs) ────────────
function renderGrid(segments,totals,schoolOrder,note){
  var medals=['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'],ptColors=['#f5c842','#adb5c9','#cd8b50'];
  var cols='90px '+schoolOrder.map(function(){return'1fr';}).join(' ');
  var h='';
  if(note)h+='<div style="font-size:11px;color:#7b95ff;margin-bottom:10px;padding:7px 11px;background:rgba(79,110,247,.08);border-radius:7px;border:1px solid rgba(79,110,247,.15);">'+note+'</div>';
  h+='<div style="display:grid;grid-template-columns:'+cols+';background:#1a1d27;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-bottom:12px;">';
  h+='<div style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);"></div>';
  schoolOrder.forEach(function(s,i){h+='<div style="padding:8px 4px;text-align:center;font-size:11px;font-weight:700;border-bottom:1px solid rgba(255,255,255,.08);color:'+(i<3?ptColors[i]:'#e8e9f0')+'">'+(i<3?medals[i]+'<br>':'')+s+'</div>';});
  h+='<div style="padding:7px 10px;font-size:11px;font-weight:700;color:#7c7f96;border-bottom:1px solid rgba(255,255,255,.08);">Points</div>';
  schoolOrder.forEach(function(s,i){var pts=totals[s]||0;h+='<div style="padding:7px 4px;text-align:center;font-weight:700;font-size:'+(pts>0?'15px':'12px')+';color:'+(i<3?ptColors[i]:(pts>0?'#7b95ff':'#555'))+';border-bottom:1px solid rgba(255,255,255,.08);">'+pts+'</div>';});
  h+='<div style="padding:6px 10px;font-size:11px;color:#7c7f96;">Rank</div>';
  schoolOrder.forEach(function(s,i){h+='<div style="padding:6px 4px;text-align:center;font-size:11px;color:#7c7f96;">'+(totals[s]>0?i+1:'—')+'</div>';});
  h+='</div>';
  if(!segments.length)return h+'<div style="text-align:center;color:#7c7f96;padding:16px 0;">No results yet</div>';
  h+='<div style="font-size:10px;color:#7c7f96;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Race breakdown</div>';
  h+='<div style="background:#1a1d27;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">';
  h+='<div style="display:grid;grid-template-columns:'+cols+';border-bottom:1px solid rgba(255,255,255,.08);">';
  h+='<div style="padding:7px 10px;font-size:10px;color:#7c7f96;font-weight:700;">Race</div>';
  schoolOrder.forEach(function(s){h+='<div style="padding:7px 4px;text-align:center;font-size:10px;color:#7c7f96;font-weight:700;">'+s+'</div>';});
  h+='</div>';
  segments.forEach(function(item,idx){
    var seg=item.seg,scored=item.scored,color=seg.rt.color;
    var hasInelig=item.ineligibleLanes&&item.ineligibleLanes.size>0;
    var schoolPts={};
    scored.forEach(function(r){schoolPts[r.school]={pts:seg.rt.pts[r.scoringPlace]||0,place:r.scoringPlace};});
    var bg=idx%2===0?'transparent':'rgba(255,255,255,.02)';
    h+='<div style="display:grid;grid-template-columns:'+cols+';background:'+bg+';border-bottom:1px solid rgba(255,255,255,.04);">';
    h+='<div style="padding:6px 10px;font-size:11px;font-weight:600;color:'+color+';white-space:nowrap;">'+seg.code+(hasInelig?' <span style="font-size:9px;color:#555;">\u2298</span>':'')+'</div>';
    schoolOrder.forEach(function(s){
      var info=schoolPts[s];
      if(info&&info.pts>0){h+='<div style="padding:6px 4px;text-align:center;font-size:11px;font-weight:600;color:#e8e9f0;">'+info.pts+'<span style="font-size:9px;color:#7c7f96;margin-left:2px;">['+info.place+']</span></div>';}
      else{h+='<div style="padding:6px 4px;text-align:center;color:rgba(255,255,255,.12);">—</div>';}
    });
    h+='</div>';
  });
  h+='</div>';
  return h;
}

// ── Tab renderers ─────────────────────────────────────────────────────────────
function obcRender(){
  saveRaces();
  if(currentTab==='cup')       renderStandings(function(seg){return seg.rt.cup;},null);
  else if(currentTab==='by10') renderStandings(function(seg){return seg.rt.type==='by10';},'Year 10 Quad — included in Cup total');
  else if(currentTab==='by11') renderStandings(function(seg){return seg.rt.type==='by11';},'Year 11 Eight — included in Cup total');
  else if(currentTab==='bo8')  renderStandings(function(seg){return seg.rt.type==='bo8';},'Open Eight — included in Cup total');
  else if(currentTab==='by9')  renderStandings(function(seg){return seg.rt.type==='by9';},"Year 9 Quad — grade ranking only, not in Cup total");
  else if(currentTab==='schools') renderSchools();
  else if(currentTab==='export')  renderExport();
  else renderRaces();
}
function renderStandings(filterFn,note){
  var el=document.getElementById('obc-content');if(!el)return;
  var r=computeTotals(filterFn);
  var sorted=SCHOOLS.slice().sort(function(a,b){return r.totals[b]-r.totals[a];});
  el.innerHTML=renderGrid(r.segments,r.totals,sorted,note);
}

// ── Schools tab ───────────────────────────────────────────────────────────────
function renderSchools(){
  var el=document.getElementById('obc-content');if(!el)return;
  var sd={};
  SCHOOLS.forEach(function(s){sd[s]={cup:0,by9:0,by10:0,by11:0,bo8:0,races:[]};});
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var race=races[id];
    if(!race.results||!race.results.length||!isScoringFinal(race))return;
    classifyRace(race).forEach(function(seg){
      var dr=resultsForDiv(race.results,seg.code);if(!dr.length)return;
      var e=eligibleScored(dr);
      e.scored.forEach(function(r){
        var pts=seg.rt.pts[r.scoringPlace]||0;
        if(!sd[r.school])return;
        if(seg.rt.cup)sd[r.school].cup+=pts;
        sd[r.school][seg.rt.type]=(sd[r.school][seg.rt.type]||0)+pts;
        sd[r.school].races.push({code:seg.code,place:r.scoringPlace,pts:pts,cup:seg.rt.cup,color:seg.rt.color});
      });
    });
  });
  var sorted=SCHOOLS.slice().sort(function(a,b){return sd[b].cup-sd[a].cup;});
  var medals=['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'],ptColors=['#f5c842','#adb5c9','#cd8b50','#7b95ff','#7b95ff','#7b95ff','#7b95ff'];
  var pll=['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
  var h='';
  sorted.forEach(function(school,rank){
    var d=sd[school],color=ptColors[rank];
    h+='<div style="background:#1a1d27;border-radius:10px;border:1px solid rgba(255,255,255,.08);margin-bottom:10px;overflow:hidden;">';
    h+='<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;">';
    h+='<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:'+(rank<3?'18':'13')+'px;color:'+(rank<3?'inherit':'#7c7f96')+'">'+(rank<3?medals[rank]:(rank+1)+'.')+'</span>'
      +'<div><div style="font-weight:700;font-size:14px;">'+school+'</div><div style="font-size:11px;color:#7c7f96;">'+SCHOOL_FULL[school]+'</div></div></div>';
    h+='<div style="text-align:right;"><div style="font-size:22px;font-weight:700;color:'+color+';">'+d.cup+'</div><div style="font-size:10px;color:#7c7f96;">Cup pts</div></div></div>';
    h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid rgba(255,255,255,.08);">';
    [{label:'BY10',key:'by10',color:'#7b95ff'},{label:'BY11',key:'by11',color:'#a78bfa'},{label:'BO8',key:'bo8',color:'#f5834a'},{label:'BY9',key:'by9',color:'#94a3b8'}]
    .forEach(function(b,bi){
      var pts=d[b.key]||0;
      h+='<div style="padding:8px 6px;text-align:center;'+(bi<3?'border-right:1px solid rgba(255,255,255,.06);':'')+'">'
        +'<div style="font-size:10px;color:'+b.color+';font-weight:600;margin-bottom:2px;">'+b.label+'</div>'
        +'<div style="font-size:14px;font-weight:700;color:'+(pts>0?'#e8e9f0':'#444')+';">'+pts+'</div></div>';
    });
    h+='</div>';
    if(d.races.length){
      h+='<div style="padding:8px 14px;"><div style="font-size:10px;color:#7c7f96;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Race results</div><div style="display:flex;flex-wrap:wrap;gap:4px;">';
      d.races.forEach(function(r){
        h+='<div style="background:rgba(255,255,255,.05);border-radius:6px;padding:4px 8px;font-size:11px;border-left:2px solid '+r.color+';">'
          +'<span style="color:'+r.color+';font-weight:600;margin-right:4px;">'+r.code+'</span>'
          +'<span style="color:#7c7f96;">'+(pll[r.place]||r.place+'th')+'</span>'
          +(r.cup?'<span style="color:#3ecf8e;margin-left:4px;">+'+r.pts+'</span>':'<span style="color:#555;margin-left:4px;font-size:10px;">grade</span>')
          +'</div>';
      });
      h+='</div></div>';
    }
    h+='</div>';
  });
  el.innerHTML=h||'<div style="text-align:center;color:#7c7f96;padding:20px;">No results yet</div>';
}

// ── Races tab ─────────────────────────────────────────────────────────────────
async function obcRefreshRace(id){
  var btn=document.getElementById('obc-refetch-'+id);
  if(btn){btn.disabled=true;btn.textContent='…';}
  try{
    var n=await loadRace(id,2,8000);
    obcLog('Refreshed #'+id+(n?' · '+n+' result rows':' · still no results'),'#3ecf8e');
  }catch(e){obcLog('Refresh failed for #'+id+': '+e.message,'#e55');}
  obcRender();
}
window.obcRefreshRace=obcRefreshRace;
window.obcCopySegment=function(id,segIdx){
  var race=races[id];if(!race||!race.results)return;
  var segs=classifyRace(race);var seg=segs[segIdx];if(!seg)return;
  var dr=resultsForDiv(race.results,seg.code);
  var list;
  if(isScoringFinal(race)){
    list=eligibleScored(dr).scored.map(function(r){return r.school;});
  }else{
    list=dr.slice().sort(function(a,b){return a.place-b.place;}).map(function(r){return abbrev(r.rawSchool)||r.rawSchool;});
  }
  var csv=list.join('\t');
  var flash=function(){
    var btn=document.getElementById('obc-copy-'+id+'-'+segIdx);
    if(btn){var orig=btn.textContent;btn.textContent='Copied!';setTimeout(function(){if(btn)btn.textContent=orig;},1200);}
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(csv).then(flash).catch(function(){obcFallbackCopy(csv);flash();});
  }else{obcFallbackCopy(csv);flash();}
};
function obcFallbackCopy(text){
  var ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);
}
function renderRaces(){
  var el=document.getElementById('obc-content');if(!el)return;
  var ids=Object.keys(races).sort(function(a,b){return+a-+b;});
  if(!ids.length){el.innerHTML='<div style="color:#7c7f96;text-align:center;padding:24px;">No races loaded</div>';return;}
  var h='';
  ids.forEach(function(id){
    var race=races[id],segs=classifyRace(race);
    var codeStr=race.codes.join(' + ')||'Race #'+id;
    var hasResults=race.results&&race.results.length;
    var isScoring=segs.length>0&&isScoringFinal(race);
    var notFinal=segs.length>0&&race.isFirstOccurrence===false;
    var color=isScoring?segs[0].rt.color:'rgba(255,255,255,.15)';
    h+='<div style="margin-bottom:6px;background:#1a1d27;border-radius:8px;border:1px solid rgba(255,255,255,.07);border-left:3px solid '+color+';padding:8px 12px;'+(notFinal?'opacity:0.5;':'')+'">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(hasResults?'5px':'0')+';">';
    h+='<div><span style="font-weight:600;font-size:12px;color:'+color+';">'+codeStr+'</span>'
      +(notFinal?'<span style="font-size:10px;color:#7c7f96;margin-left:8px;">2nd round — not scored</span>':'')+'</div>';
    h+='<div style="display:flex;align-items:center;gap:6px;">'
      +'<button id="obc-refetch-'+id+'" onclick="obcRefreshRace(\''+id+'\')" title="Re-check this race for results" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#7c7f96;border-radius:5px;padding:2px 7px;font-size:9px;cursor:pointer;">&#8635;</button>'
      +'<span style="font-size:10px;color:#7c7f96;">#'+id+' · '+race.time+'</span></div></div>';
    if(hasResults){
      if(isScoring){
        segs.forEach(function(seg,segIdx){
          var dr=resultsForDiv(race.results,seg.code);
          var e=eligibleScored(dr);
          h+='<div style="display:flex;align-items:center;gap:6px;margin:3px 0 2px;">'
            +(segs.length>1?'<span style="font-size:10px;color:'+seg.rt.color+';">'+seg.code+'</span>':'<span></span>')
            +'<button id="obc-copy-'+id+'-'+segIdx+'" onclick="obcCopySegment(\''+id+'\','+segIdx+')" title="Copy placings — pastes across cells in Excel" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#7c7f96;border-radius:5px;padding:1px 7px;font-size:9px;cursor:pointer;margin-left:auto;">Copy</button>'
            +'</div>';
          // Merge eligible and ineligible in finish order
          var allRows=[];
          e.scored.forEach(function(r){allRows.push({school:r.school,place:r.place,scoringPlace:r.scoringPlace,pts:seg.rt.pts[r.scoringPlace]||0,eligible:true,color:seg.rt.color});});
          e.ineligList.forEach(function(r){allRows.push({school:r.school,place:r.place,scoringPlace:null,pts:0,eligible:false});});
          allRows.sort(function(a,b){return a.place-b.place;});
          h+='<div style="display:flex;flex-wrap:wrap;gap:3px;">';
          allRows.forEach(function(r){
            if(r.eligible){
              h+='<div style="background:rgba(255,255,255,.05);border-radius:5px;padding:3px 7px;font-size:11px;">'
                +'<span style="color:#7c7f96;margin-right:2px;">'+r.scoringPlace+'.</span>'
                +'<span style="font-weight:600;">'+r.school+'</span>'
                +(r.pts>0?'<span style="color:'+r.color+';margin-left:3px;">+'+r.pts+'</span>':'')
                +'</div>';
            }else{
              h+='<div style="background:rgba(255,255,255,.02);border-radius:5px;padding:3px 7px;font-size:11px;opacity:0.3;border:1px solid rgba(255,255,255,.05);">'
                +'<span style="color:#7c7f96;">'+r.school+'</span>'
                +'</div>';
            }
          });
          h+='</div>';
        });
      }else{
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px;">';
        (race.results||[]).forEach(function(r){var ab=abbrev(r.rawSchool)||r.rawSchool;h+='<div style="background:rgba(255,255,255,.04);border-radius:5px;padding:3px 7px;font-size:11px;color:#7c7f96;">'+r.place+'. '+ab+'</div>';});
        h+='</div>';
      }
    }else if(race.results!==null){h+='<div style="font-size:11px;color:rgba(255,255,255,.2);">No results yet</div>';}
    else{h+='<div style="font-size:11px;color:rgba(255,255,255,.2);">Loading…</div>';}
    h+='</div>';
  });
  el.innerHTML=h;
}

// ── Report export (static HTML matching the printed summary sheet) ────────────
var META_KEY='obc_export_meta_v1';
function loadMeta(){
  var d={title:"Old Boys' Cup",date:'',host:'',venue:'',regatta:REGATTA_NAME||''};
  try{var raw=window.localStorage.getItem(META_KEY);if(raw){var s=JSON.parse(raw);for(var k in s){if(s[k])d[k]=s[k];}}}catch(e){}
  return d;
}
var EXPORT_META=loadMeta();
function saveMeta(){try{window.localStorage.setItem(META_KEY,JSON.stringify(EXPORT_META));}catch(e){}}

// Pull regatta name / date / venue off the regatta info page so the Export tab isn't
// left blank — checks the current page first, then falls back to fetching the
// regatta's main page (same site) if we're sitting on the live results page instead.
function scrapeMetaFrom(root){
  var out={};
  var h2=root.querySelector('h2');
  if(h2&&h2.textContent.trim())out.regatta=h2.textContent.trim();
  [].slice.call(root.querySelectorAll('tr')).forEach(function(row){
    var tds=row.querySelectorAll('td');if(tds.length<2)return;
    var label=tds[0].textContent.trim().toLowerCase();
    var val=tds[1].textContent.trim();if(!val)return;
    if(label==='date:')out.date=val.split('(')[0].trim();
    if(label==='venue:')out.venue=val.split('(')[0].trim();
  });
  return out;
}
async function autofillMeta(){
  if(!RID)return;
  var found=scrapeMetaFrom(document);
  if(!found.date||!found.venue||!found.regatta){
    try{
      var res=await fetch('/regattas/'+RID,{cache:'no-cache'});
      if(res.ok){
        var tmp=document.createElement('div');
        tmp.innerHTML=await res.text();
        var f2=scrapeMetaFrom(tmp);
        for(var k in f2)if(!found[k])found[k]=f2[k];
      }
    }catch(e){/* fetch may be blocked cross-origin — fields just stay editable manually */}
  }
  var changed=false;
  if(found.date&&!EXPORT_META.date){EXPORT_META.date=found.date;changed=true;}
  if(found.venue&&!EXPORT_META.venue){EXPORT_META.venue=found.venue;changed=true;}
  if(found.regatta&&!EXPORT_META.regatta){EXPORT_META.regatta=found.regatta;changed=true;}
  if(changed){saveMeta();if(currentTab==='export')obcRender();}
}
function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

var MEDAL=['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'],MEDALC=['#f5c842','#c8d2da','#d69355'];
function crewLabel(seg){
  var dm=(seg.code.match(/D(\d+)$/i)||[])[1];
  return (TYPE_LABEL[seg.rt.type]||seg.rt.type)+(dm?' Div '+dm:'');
}
function crewSortRank(seg){
  var order={by10:0,by11:1,bo8:2,by9:3};
  var dm=parseInt((seg.code.match(/D(\d+)$/i)||[])[1]||'99',10);
  return (order[seg.rt.type]!==undefined?order[seg.rt.type]:9)*1000+dm;
}
function reportSegments(){
  return computeCupSummary().segments.slice().sort(function(x,y){return crewSortRank(x.seg)-crewSortRank(y.seg);});
}

var TROPHY_LABEL_WIDTH=18; // % — school columns line up with the Racing Results columns below
function trophyColGroup(){
  var schoolW=((100-TROPHY_LABEL_WIDTH)/SCHOOLS.length).toFixed(3);
  var h='<colgroup><col style="width:'+TROPHY_LABEL_WIDTH+'%">';
  SCHOOLS.forEach(function(){h+='<col style="width:'+schoolW+'%">';});
  return h+'</colgroup>';
}
function ltRow(label,cells,bold,muted){
  var h='<tr><td style="padding:5px 8px;border:1px solid #cfcfcf;background:#f4f4f4;font-size:12px;'+(bold?'font-weight:700;':'')+(muted?'color:#999;font-style:italic;':'')+'">'+escHtml(label)+'</td>';
  cells.forEach(function(c){h+='<td style="padding:5px 3px;text-align:center;border:1px solid #d7d7d7;font-size:12px;color:'+(muted?'#999':'#111')+';'+(bold?'font-weight:800;font-size:14px;':'')+'">'+c+'</td>';});
  return h+'</tr>';
}
function buildCupTable(cup){
  var medal={};SCHOOLS.forEach(function(s){var r=cup.rankOf[s];if(r>=1&&r<=3)medal[s]=MEDAL[r-1];});
  var h='<table style="border-collapse:collapse;width:100%;table-layout:fixed;">'+trophyColGroup();
  h+='<tr><th style="padding:6px 8px;border:1px solid #cfcfcf;background:#232b45;color:#fff;font-size:12px;text-align:left;white-space:nowrap;">Old Boys\' Cup</th>';
  SCHOOLS.forEach(function(s){h+='<th style="padding:6px 3px;border:1px solid #cfcfcf;background:#232b45;color:#fff;font-size:12px;">'+s+(medal[s]?' '+medal[s]:'')+'</th>';});
  h+='</tr>';
  h+=ltRow('Points',SCHOOLS.map(function(s){return cup.totals[s];}),true);
  h+=ltRow('Ranking',SCHOOLS.map(function(s){return cup.rankOf[s];}));
  h+=ltRow('Year 10 Quad',SCHOOLS.map(function(s){return cup.bySeg.by10[s];}));
  h+=ltRow('Year 11 Eight',SCHOOLS.map(function(s){return cup.bySeg.by11[s];}));
  h+=ltRow('Open Eight',SCHOOLS.map(function(s){return cup.bySeg.bo8[s];}));
  h+=ltRow('Year 9 Quad (grade only)',SCHOOLS.map(function(s){return cup.bySeg.by9[s];}),false,true);
  h+='</table>';
  return '<div class="block">'+h+'</div>';
}
function buildResultsPointsTable(segs){
  var cols=SCHOOLS.length;
  var L='<table style="border-collapse:collapse;width:100%;table-layout:fixed;">'+trophyColGroup();
  L+='<tr><th colspan="'+(cols+1)+'" style="padding:7px 12px;border:1px solid #cfcfcf;background:#232b45;color:#fff;font-weight:700;font-size:13px;letter-spacing:.3px;text-align:left;">Racing Results</th></tr>';
  L+='<tr><th style="padding:5px 8px;border:1px solid #cfcfcf;background:#232b45;color:#fff;font-size:10px;text-align:left;">Crew</th>';
  for(var p=1;p<=cols;p++)L+='<th style="padding:5px 2px;border:1px solid #cfcfcf;background:#232b45;color:#fff;font-size:10px;">'+p+(p===1?'st':p===2?'nd':p===3?'rd':'th')+'</th>';
  L+='</tr>';
  segs.forEach(function(item){
    var seg=item.seg;
    L+='<tr><td style="padding:5px 8px;border:1px solid #d7d7d7;font-size:10px;white-space:nowrap;">'+escHtml(crewLabel(seg))+'</td>';
    for(var i=0;i<cols;i++){
      var r=item.scored[i];
      if(r)L+='<td style="padding:5px 2px;text-align:center;border:1px solid #d7d7d7;font-size:10px;font-weight:700;background:'+SCHOOL_COLOR[r.school]+';color:#20242a;">'+r.school+'</td>';
      else L+='<td style="border:1px solid #e6e6e6;background:#fbfbfb;"></td>';
    }
    L+='</tr>';
  });
  L+='</table>';

  var R='<table style="border-collapse:collapse;width:100%;table-layout:fixed;"><colgroup>';
  var schoolW=(100/cols).toFixed(3);
  for(var c=0;c<cols;c++)R+='<col style="width:'+schoolW+'%">';
  R+='</colgroup>';
  R+='<tr><th colspan="'+cols+'" style="padding:7px 12px;border:1px solid #cfcfcf;background:#4f6ef7;color:#fff;font-weight:700;font-size:13px;letter-spacing:.3px;text-align:left;">Points Awarded</th></tr>';
  R+='<tr>';
  SCHOOLS.forEach(function(s){R+='<th style="padding:5px 2px;border:1px solid #cfcfcf;background:#4f6ef7;color:#fff;font-size:10px;">'+s+'</th>';});
  R+='</tr>';
  segs.forEach(function(item){
    var seg=item.seg;
    var byS={};item.scored.forEach(function(r){byS[r.school]=r.scoringPlace;});
    R+='<tr>';
    SCHOOLS.forEach(function(s){
      var sp=byS[s],pts=sp?(seg.rt.pts[sp]||0):0;
      var top3=sp>=1&&sp<=3;
      var bc=top3?MEDALC[sp-1]:'#d7d7d7';
      var style='padding:5px 2px;text-align:center;border:1px solid '+bc+';font-size:10px;';
      style+=pts>0?('color:#20242a;font-weight:'+(top3?'800':'700')+';'):'color:#c2c2c2;font-weight:400;';
      R+='<td style="'+style+'">'+pts+'</td>';
    });
    R+='</tr>';
  });
  R+='</table>';

  return '<div style="display:grid;grid-template-columns:1.42fr 1fr;gap:18px;align-items:start;">'
    +'<div class="block">'+L+'</div>'
    +'<div class="block">'+R+'</div>'
    +'</div><div class="caption">Best crew per school, re-ranked among the '+cols+' GPS schools, on the left; points for that placing on the right. Only the first running of each event scores. Quad 7&rarr;1 &middot; Eight 14&rarr;2. Year 9 Quad results are shown for reference but are grade ranking only and do not count toward the Cup.</div>';
}
function buildReportHTML(){
  var m=EXPORT_META;
  var cup=computeCupSummary();
  var segs=reportSegments();
  var by10Leader=SCHOOLS.slice().sort(function(a,b){return cup.bySeg.by10[b]-cup.bySeg.by10[a];})[0];
  var by11Leader=SCHOOLS.slice().sort(function(a,b){return cup.bySeg.by11[b]-cup.bySeg.by11[a];})[0];
  var bo8Leader=SCHOOLS.slice().sort(function(a,b){return cup.bySeg.bo8[b]-cup.bySeg.bo8[a];})[0];
  var headerCard='<div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;display:flex;align-items:stretch;background:#fff;">'
    +'<div style="background:#232b45;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 20px;min-width:120px;">'
    +'<div style="width:34px;height:34px;transform:rotate(45deg);border:3px solid #fff;border-radius:4px;margin-bottom:8px;"></div>'
    +'<div style="font-weight:900;font-size:18px;letter-spacing:1px;">OBC</div></div>'
    +'<div style="flex:1;padding:14px 18px;">'
    +'<div style="background:#232b45;color:#fff;font-weight:800;font-size:15px;padding:6px 12px;border-radius:4px;margin-bottom:10px;">'+escHtml(m.title)+'</div>'
    +'<table style="width:100%;font-size:12.5px;color:#222;border-collapse:collapse;">'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;width:90px;">Date</td><td>'+escHtml(m.date)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Host</td><td>'+escHtml(m.host)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Venue</td><td>'+escHtml(m.venue)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Regatta</td><td>'+escHtml(m.regatta)+'</td></tr>'
    +'</table></div></div>';
  var recip='<div class="block"><div style="background:#4f6ef7;color:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:5px 5px 0 0;letter-spacing:.3px;">Trophy Recipients</div>'
    +'<div style="border:1px solid #e0e0e0;border-radius:0 0 6px 6px;padding:14px 16px;background:#fff;">'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span style="font-weight:700;font-size:13px;color:#333;">Old Boys\' Cup</span><span style="font-size:13px;color:#111;">'+SCHOOL_FULL[cup.winner]+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span style="font-weight:700;font-size:13px;color:#333;">Year 10 Quad</span><span style="font-size:13px;color:#111;">'+(cup.bySeg.by10[by10Leader]>0?SCHOOL_FULL[by10Leader]:'&mdash;')+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span style="font-weight:700;font-size:13px;color:#333;">Year 11 Eight</span><span style="font-size:13px;color:#111;">'+(cup.bySeg.by11[by11Leader]>0?SCHOOL_FULL[by11Leader]:'&mdash;')+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="font-weight:700;font-size:13px;color:#333;">Open Eight</span><span style="font-size:13px;color:#111;">'+(cup.bySeg.bo8[bo8Leader]>0?SCHOOL_FULL[bo8Leader]:'&mdash;')+'</span></div>'
    +'</div></div>';
  var body='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    +'<meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escHtml(m.title)+' \u2014 Results</title>'
    +'<style>@page{size:A4 landscape;margin:8mm;}body{font-family:\'Segoe UI\',system-ui,Arial,sans-serif;background:#e9ecef;color:#20242a;margin:0;padding:20px;}'
    +'.sheet{max-width:1240px;margin:0 auto;background:#fff;padding:20px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.12);}'
    +'.cols{display:grid;grid-template-columns:1.42fr 1fr;gap:18px;align-items:start;}.col{display:flex;flex-direction:column;gap:16px;}'
    +'.block{border:1px solid #e2e2e2;border-radius:6px;overflow:hidden;}.item{display:flex;flex-direction:column;}'
    +'.caption{font-size:10px;color:#8a8a8a;margin-top:5px;line-height:1.45;}'
    +'@media print{body{background:#fff;padding:0;}.sheet{box-shadow:none;max-width:100%;padding:0;border-radius:0;}.cols{grid-template-columns:1.42fr 1fr!important;}}'
    +'@media screen and (max-width:860px){.cols{grid-template-columns:1fr;}}</style></head><body><div class="sheet"><div class="cols">'
    +'<div class="col">'
    +'<div class="item">'+buildCupTable(cup)+'</div>'
    +'</div><div class="col">'
    +headerCard+recip
    +'</div></div>'
    +'<div class="item" style="margin-top:16px;">'+buildResultsPointsTable(segs)+'</div>'
    +'<div style="text-align:center;color:#9a9a9a;font-size:10px;margin-top:16px;">Generated from official results data &middot; '+escHtml(m.regatta)+'</div>'
    +'</div></body></html>';
  return body;
}
window.obcSetMeta=function(field,val){EXPORT_META[field]=val;saveMeta();};
window.obcOpenReport=function(){
  var html=buildReportHTML();
  var blob=new Blob([html],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  window.open(url,'_blank');
  setTimeout(function(){URL.revokeObjectURL(url);},60000);
};
window.obcDownloadReport=function(){
  var html=buildReportHTML();
  var blob=new Blob([html],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='Old-Boys-Cup-results.html';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},60000);
};
function renderExport(){
  var el=document.getElementById('obc-content');if(!el)return;
  var segs=reportSegments();
  var scoringRacesLoaded=segs.length;
  var m=EXPORT_META;
  function field(label,key,ph){
    return '<label style="display:block;margin-bottom:8px;"><div style="font-size:10px;color:#7c7f96;margin-bottom:2px;">'+label+'</div>'
      +'<input type="text" value="'+escHtml(m[key])+'" placeholder="'+ph+'" onchange="obcSetMeta(\''+key+'\',this.value)" style="width:100%;background:#0f1117;border:1px solid rgba(255,255,255,.16);border-radius:5px;color:#e8e9f0;font-size:12px;padding:5px 8px;font-family:inherit;box-sizing:border-box;"></label>';
  }
  var h='<div style="font-size:10px;color:#7c7f96;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Export report</div>';
  h+='<div style="background:#1a1d27;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px;margin-bottom:12px;">';
  h+=field('Report title','title',"Old Boys' Cup");
  h+=field('Date','date','DD/MM/YYYY');
  h+=field('Host','host','School & GPS');
  h+=field('Venue','venue','Regatta venue');
  h+=field('Regatta','regatta','Full regatta name');
  h+='</div>';
  h+='<div style="font-size:11px;color:#9fb0b8;margin-bottom:12px;">'+scoringRacesLoaded+' scoring race'+(scoringRacesLoaded===1?'':'s')+' loaded with results. The report reflects whatever has come in so far &mdash; open it again any time, including once every race is complete.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  h+='<button onclick="obcOpenReport()" style="background:#4f6ef7;border:none;color:#fff;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Open report in new tab</button>';
  h+='<button onclick="obcDownloadReport()" style="background:#1a1d27;border:1px solid rgba(255,255,255,.16);color:#e8e9f0;border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer;">Download .html</button>';
  h+='</div>';
  h+='<div style="margin-top:10px;font-size:10px;color:#6f7590;line-height:1.6;">Matches the printed summary sheet layout &mdash; open it and use your browser\'s Print (Ctrl/Cmd+P) to save as PDF. Crew rows only appear once a race has results.</div>';
  el.innerHTML=h;
}

// ── Fetch (slow, human-paced, keeps refreshing) ───────────────────────────────
var pollTimer=null,polling=false,autoRefresh=true,lastChecked=null;
var REFRESH_BASE_MS=240000;                                  // ~4 min between checks
function refreshInterval(){return REFRESH_BASE_MS+Math.floor(Math.random()*120000);} // 4–6 min

function setChecked(){
  lastChecked=new Date();
  var el=document.getElementById('obc-checked');
  if(el)el.textContent='checked '+lastChecked.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function needsResults(race){return !race||!race.results||!race.results.length;}

async function fetchJSON(url,retries,delay){
  for(var i=0;i<=retries;i++){
    try{
      var res=await fetch(url,{cache:'no-cache'});
      if(res.status===429||res.status===503){obcLog('Rate limited — backing off '+(delay*(i+2)/1000)+'s','#fb923c');await sleep(delay*(i+2));continue;}
      if(!res.ok)throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(e){if(i<retries)await sleep(delay*(i+1));else throw e;}
  }
}

async function refreshStatus(){
  var sj=await fetchJSON('/regattas/'+RID+'/live/v1/status',3,6000);
  var tmp=document.createElement('div');tmp.innerHTML=sj.race_list||'';
  var firstSeenCode={},present={};
  [].slice.call(tmp.querySelectorAll('tr[id^="tr_"]')).forEach(function(row){
    var id=row.id.replace('tr_','');
    var cells=row.querySelectorAll('td');if(cells.length<4)return;
    var time=cells[1]?cells[1].textContent.trim():'';
    var raceType=cells[3]?cells[3].textContent.trim():null;
    var codes=[].slice.call(row.querySelectorAll('.rm_ec')).map(function(e){return e.textContent.trim();}).filter(Boolean);
    if(!codes.length)return;
    present[id]=true;
    var isFirst=codes.some(function(code){if(!firstSeenCode[code]){firstSeenCode[code]=true;return true;}return false;});
    if(!races[id])races[id]={id:id,codes:codes,time:time,raceType:raceType,isFirstOccurrence:isFirst,results:null};
    else{races[id].codes=codes;races[id].time=time;if(raceType)races[id].raceType=raceType;races[id].isFirstOccurrence=isFirst;}
  });
  return Object.keys(races).filter(function(id){return present[id];}).sort(function(a,b){return+a-+b;});
}

async function loadRace(id,retries,delay){
  var j=await fetchJSON('/regattas/'+RID+'/live/v1/'+id+'/load',retries,delay);
  var parsed=parseResultHtml(j.results_html||'');
  races[id].results=parsed.results;
  if(parsed.raceType)races[id].raceType=parsed.raceType;
  return parsed.results.length;
}

// Repeating background check for results published after the first pass.
async function pollCycle(manual){
  if(polling)return;
  if(!RID)return;
  polling=true;
  var btn=document.getElementById('obc-refresh-btn');if(btn)btn.textContent='… checking';
  if(manual)obcLog('Manual refresh…','#7b95ff');
  var ids;
  try{ids=await refreshStatus();}
  catch(e){obcLog('Refresh failed: '+e.message,'#e55');polling=false;if(btn)btn.textContent='\u21bb Refresh now';if(autoRefresh)schedulePoll();return;}
  var pending=ids.filter(function(id){return needsResults(races[id]);});
  if(pending.length){
    obcStatus('Regatta #'+RID+' · checking '+pending.length+' race'+(pending.length>1?'s':'')+' for results…');
    for(var i=0;i<pending.length;i++){
      var id=pending[i];
      try{var n=await loadRace(id,2,8000);if(n){obcLog('New result · #'+id+' '+races[id].codes.join(','),'#3ecf8e');obcRender();}}catch(e){}
      await sleep(politeDelay());
    }
  }else if(manual){obcLog('No new results yet','#7c7f96');}
  setChecked();
  obcStatus('Regatta #'+RID+' · watching for new results');
  if(btn)btn.textContent='\u21bb Refresh now';
  polling=false;
  if(autoRefresh)schedulePoll();
}
function schedulePoll(){
  if(pollTimer)clearTimeout(pollTimer);
  if(!autoRefresh)return;
  pollTimer=setTimeout(function(){pollCycle(false);},refreshInterval());
}
window.obcRefreshNow=function(){pollCycle(true);};
window.obcToggleAuto=function(on){
  autoRefresh=on;
  if(on){obcLog('Auto-refresh on','#7b95ff');schedulePoll();}
  else{if(pollTimer)clearTimeout(pollTimer);obcLog('Auto-refresh paused','#7c7f96');}
};

// Instant updates when the site pushes a result over its websocket.
function hookWebsocket(){
  var orig=window.ProcessWebsocketMessage;
  window.ProcessWebsocketMessage=function(data){
    if(orig)orig(data);
    try{
      var d=JSON.parse(data);
      if(d.msg==='results'){
        var id=String(d.race);
        if(!races[id])races[id]={id:id,codes:[],time:'',raceType:null,results:null};
        var parsed=parseResultHtml(d.results||'');
        races[id].results=parsed.results;
        if(parsed.raceType)races[id].raceType=parsed.raceType;
        obcLog('Live update · race #'+id,'#3ecf8e');setChecked();obcRender();
      }
    }catch(e){}
  };
}

// ── Update check (fetch-only; can't self-update on sites that block <script> loads) ──
var UPDATE_CHECK_URL='https://raw.githubusercontent.com/camtmsmith/RegattaPointsCalculator/refs/heads/main/old-boys-bookmarklet.js';
var updateDismissed=false;
async function checkForUpdate(){
  if(updateDismissed)return;
  var banner=document.getElementById('obc-update-banner');
  if(!banner)return; // panel closed — nothing to show it in
  try{
    var res=await fetch(UPDATE_CHECK_URL+'?_='+Date.now(),{cache:'no-cache'});
    if(!res.ok)return;
    var text=await res.text();
    var m=text.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
    if(!m)return;
    if(m[1]&&m[1]!==VERSION)showUpdateBanner(m[1]);
  }catch(e){/* likely blocked by the site's own policy — fail silently, it's a nice-to-have */}
}
function showUpdateBanner(remoteVersion){
  var banner=document.getElementById('obc-update-banner');
  if(!banner||updateDismissed)return;
  banner.innerHTML=
    '<div style="margin:0 14px 10px;background:rgba(79,110,247,.12);border:1px solid rgba(79,110,247,.35);border-radius:8px;padding:10px 30px 10px 12px;font-size:11px;color:#c3cdff;line-height:1.6;position:relative;">'
    +'<button onclick="obcDismissUpdate()" title="Dismiss" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#7c7f96;font-size:15px;cursor:pointer;line-height:1;padding:0;">&times;</button>'
    +'<b style="color:#8fa0ff;">Update available &mdash; '+remoteVersion+' (you have '+VERSION+')</b><br>'
    +'This bookmark can\u2019t update itself on this site. Open the '
    +'<a href="https://camtmsmith.github.io/RegattaPointsCalculator/old-boys.html" target="_blank" rel="noopener" style="color:#8fa0ff;">installer page</a>'
    +', reload it, and drag the button in again to replace this bookmark.'
    +'</div>';
}
window.obcDismissUpdate=function(){
  updateDismissed=true;
  var banner=document.getElementById('obc-update-banner');
  if(banner)banner.innerHTML='';
};

async function obcLoad(){
  if(!RID){obcLog('No regatta ID in the page URL. Open the GPS Head of the River live results page.','#e55');obcStatus('No regatta ID');return;}
  await sleep(400+Math.floor(Math.random()*700));
  obcLog('Regatta #'+RID+' · Fetching race list…','#7b95ff');
  var ids;
  try{ids=await refreshStatus();}
  catch(e){obcLog('Race list failed: '+e.message,'#e55');obcStatus('Error');return;}
  var total=ids.length,failed=[];
  var cached=ids.filter(function(id){return!needsResults(races[id]);}).length;
  obcLog('Found '+total+' races'+(cached?' · '+cached+' restored from a previous session':'')+' · loading slowly to stay polite','#3ecf8e');

  for(var i=0;i<ids.length;i++){
    var id=ids[i];
    obcProg(Math.round(i/total*80));
    if(!needsResults(races[id]))continue; // already have this one cached — no need to hit the site again
    obcStatus('Regatta #'+RID+' · Loading ('+(i+1)+'/'+total+')… slow mode');
    try{
      var n=await loadRace(id,2,8000);
      if(n){
        var segs=classifyRace(races[id]);
        var scoring=segs.length>0&&isScoringFinal(races[id]);
        var cnt=scoring?segs.reduce(function(a,seg){return a+eligibleScored(resultsForDiv(races[id].results,seg.code)).scored.length;},0):n;
        obcLog('#'+id+' '+races[id].codes.join(',')+(scoring?'  '+cnt+' scored':' [not scored]'),'#3ecf8e');
        obcRender();
      }
    }catch(e){failed.push(id);}
    await sleep(politeDelay());
  }

  if(failed.length){
    obcLog('Retrying '+failed.length+' slowly…','#f5834a');await sleep(politeDelay()*2);
    for(var i=0;i<failed.length;i++){
      var id=failed[i];obcStatus('Retrying ('+(i+1)+'/'+failed.length+')…');obcProg(80+Math.round(i/failed.length*18));
      try{var n=await loadRace(id,3,10000);if(n){obcLog('#'+id+' retry OK','#3ecf8e');obcRender();}}catch(e){obcLog('#'+id+' retry failed','#e55');}
      await sleep(politeDelay()*1.5);
    }
  }

  obcProg(100);setTimeout(function(){obcProg(0);},1000);
  setChecked();
  obcStatus('Regatta #'+RID+' · watching for new results');
  obcLog('Initial load complete · auto-refresh every ~4–6 min','#3ecf8e');obcRender();
  hookWebsocket();
  schedulePoll();
}
checkForUpdate();
setInterval(checkForUpdate,20*60*1000); // recheck roughly every 20 min in case a longer session outlasts an update
autofillMeta();
obcRender(); // show anything restored from a previous session immediately, before the fetch loop even starts
obcLoad();
})();
