(function(){
var VERSION='v1.10';
if(document.getElementById('bsra-panel')){document.getElementById('bsra-panel').remove();return;}

var mx=window.location.pathname.match(/\/regattas\/(\d+)/);
var RID=mx?mx[1]:'';
var REGATTA_NAME=(document.title||'').trim();

// ── BSRA schools ──────────────────────────────────────────────────────────────
var SCHOOL_MAP=[
  ["ALL HALLOWS'",'AHS'],['ALL HALLOW','AHS'],['AHS','AHS'],
  ['BRISBANE GIRLS GRAMMAR','BGGS'],['BRISBANE GIRLS GS','BGGS'],['BRISBANE G','BGGS'],['BGGS','BGGS'],
  ['BRISBANE STATE HIGH','BSHS'],['BRISBANE SHS','BSHS'],['BRISBANE S','BSHS'],['BSHS','BSHS'],
  ['LOURDES HILL','LHC'],['LOURDES HI','LHC'],['LHC','LHC'],
  ['SOMERVILLE HOUSE','SOM'],['SOMERVILLE','SOM'],['SOM','SOM'],
  ["ST HILDA'S SCHOOL",'STH'],["ST HILDA'S",'STH'],['ST HILDA','STH'],['STH','STH'],
  ["ST MARGARET'S",'STM'],['ST MARGARE','STM'],['STM','STM'],
  ['ST PETERS LUTHERAN','SPLC'],['ST PETERS','SPLC'],['SPLC','SPLC'],
  ['STUARTHOLME','STU'],['STUARTHOLM','STU'],['STU','STU'],
];
var SCHOOLS=['AHS','BGGS','BSHS','LHC','SOM','STH','STM','SPLC','STU'];
var SCHOOL_FULL={AHS:"All Hallows'",BGGS:'Brisbane Girls GS',BSHS:'Brisbane SHS',LHC:'Lourdes Hill',SOM:'Somerville House',STH:"St Hilda's",STM:"St Margaret's",SPLC:'St Peters Lutheran',STU:'Stuartholme'};

// Enrolment numbers for the Percentage Trophy. These defaults can be edited live in
// the Trophies tab; edits are remembered in this browser (per results site) via localStorage.
var STUDENTS_DEFAULT={AHS:1203,BGGS:1309,BSHS:1448,LHC:926,SOM:698,STH:600,STM:795,SPLC:915,STU:574};
var STUDENTS_KEY='bsra_students_v1';
function loadStudents(){
  var out={};for(var k in STUDENTS_DEFAULT)out[k]=STUDENTS_DEFAULT[k];
  try{var raw=window.localStorage.getItem(STUDENTS_KEY);if(raw){var s=JSON.parse(raw);for(var k2 in s){if(out[k2]!==undefined&&s[k2]>0)out[k2]=s[k2];}}}catch(e){}
  return out;
}
function saveStudents(){try{window.localStorage.setItem(STUDENTS_KEY,JSON.stringify(STUDENTS));}catch(e){}}
var STUDENTS=loadStudents();

function abbrev(raw){
  if(!raw)return null;
  var u=raw.toUpperCase().trim().replace(/\s+\d+$/,'').trim();
  for(var i=0;i<SCHOOL_MAP.length;i++){
    if(u===SCHOOL_MAP[i][0]||u.indexOf(SCHOOL_MAP[i][0])===0)return SCHOOL_MAP[i][1];
  }
  return null;
}
// Entries marked e.g. "St Margaret's [inv]" are invitational crews — they race but never score points.
function isInvitational(raw){return /\[\s*inv\.?\s*\]/i.test(raw||'');}

// ── Points scales (by boat class) ─────────────────────────────────────────────
var PTS_1={1:10,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1};                 // 1x
var PTS_4={1:50,2:45,3:40,4:35,5:30,6:25,7:20,8:15,9:10,10:5};         // 4x+ / 4+
var PTS_8={1:90,2:81,3:72,4:63,5:54,6:45,7:36,8:27,9:18,10:9};         // 8+
var BOAT_COLOR={'1x':'#a78bfa','4x+':'#38bdf8','4+':'#34d399','8+':'#fb923c'};
var MAX_SCORING_DIV=4;  // only divisions D1-D4 score

function classifyCode(code){
  if(!code)return null;
  var u=code.toUpperCase().replace(/\s+/g,'');
  var dm=u.match(/D(\d+)$/);
  var div=dm?parseInt(dm[1],10):null;
  var boat=null,pts=null;
  if(u.indexOf('8+')>=0){boat='8+';pts=PTS_8;}
  else if(u.indexOf('4X+')>=0){boat='4x+';pts=PTS_4;}
  else if(u.indexOf('4+')>=0){boat='4+';pts=PTS_4;}
  else if(u.indexOf('1X')>=0){boat='1x';pts=PTS_1;}
  if(!boat)return null;
  var scores=(div===null||div<=MAX_SCORING_DIV);
  var isFirstEight=(u.indexOf('GO8')>=0);
  var cat;
  if(u.indexOf('GY10')===0)cat='GY10';
  else if(u.indexOf('GY8')===0)cat='GY8';
  else if(u.indexOf('GY9')===0)cat='GY9';
  else cat='Senior';
  return {code:code,boat:boat,pts:pts,div:div,scores:scores,cat:cat,color:BOAT_COLOR[boat],firstEight:isFirstEight};
}
function classifyRace(race){
  var codes=race.codes||[];
  for(var i=0;i<codes.length;i++){var c=classifyCode(codes[i]);if(c)return c;}
  return null;
}
function isScoringOccurrence(race){return race.isFirstOccurrence!==false;}

function eligibleScored(results){
  var eligible=[],ineligible=[];
  (results||[]).forEach(function(r){if(abbrev(r.rawSchool)&&!isInvitational(r.rawSchool))eligible.push(r);else ineligible.push(r);});
  eligible.sort(function(a,b){return a.place-b.place;});
  ineligible.sort(function(a,b){return a.place-b.place;});
  var best={};
  eligible.forEach(function(r){var s=abbrev(r.rawSchool);if(!s)return;if(best[s]===undefined||r.place<best[s].place)best[s]={place:r.place,time:r.time};});
  var scored=Object.keys(best).map(function(s){return{school:s,place:best[s].place,time:best[s].time};}).sort(function(a,b){return a.place-b.place;});
  scored.forEach(function(r,i){r.scoringPlace=i+1;});
  var ineligBest={};
  ineligible.forEach(function(r){
    var inv=isInvitational(r.rawSchool);
    var label=(abbrev(r.rawSchool)||r.rawSchool)+(inv?' [inv]':'');
    var key=label;
    if(ineligBest[key]===undefined||r.place<ineligBest[key].place)ineligBest[key]={place:r.place,school:label,invitational:inv};
  });
  var ineligList=Object.keys(ineligBest).map(function(s){return ineligBest[s];}).sort(function(a,b){return a.place-b.place;});
  return {scored:scored,ineligList:ineligList};
}

// Competition ranking over the 9 schools for a {school:value} map (ties share a rank).
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

var races={};
var currentTab='cup';
var TABS=[
  {id:'cup',     label:'Aggregate Cup'},
  {id:'trophies',label:'Trophies'},
  {id:'races',   label:'Races'},
  {id:'schools', label:'Schools'},
  {id:'export',  label:'Export'},
];

// ── Aggregate computation ─────────────────────────────────────────────────────
var CATS=['GY8','GY9','GY10','Senior'];
function computeAggregate(){
  var totals={},years={},segments=[];
  SCHOOLS.forEach(function(s){totals[s]=0;});
  CATS.forEach(function(c){years[c]={};SCHOOLS.forEach(function(s){years[c][s]=0;});});
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var race=races[id];
    if(!race.results||!race.results.length||!isScoringOccurrence(race))return;
    var cls=classifyRace(race);
    if(!cls||!cls.scores)return;
    var e=eligibleScored(race.results);
    if(!e.scored.length)return;
    segments.push({race:race,cls:cls,scored:e.scored});
    e.scored.forEach(function(r){
      var pts=cls.pts[r.scoringPlace]||0;
      if(totals[r.school]!==undefined){totals[r.school]+=pts;years[cls.cat][r.school]+=pts;}
    });
  });
  var rankOf=rankMap(totals);
  var yearRank={};CATS.forEach(function(c){yearRank[c]=rankMap(years[c]);});
  var cupWinner=SCHOOLS.slice().sort(function(a,b){return totals[b]-totals[a];})[0];
  return {totals:totals,years:years,rankOf:rankOf,yearRank:yearRank,cupWinner:cupWinner,segments:segments};
}
function computeFirstEight(){
  var found=null;
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var r=races[id];
    if(!r.results||!r.results.length||!isScoringOccurrence(r))return;
    var cls=classifyRace(r);
    if(cls&&cls.firstEight)found=r;
  });
  if(!found)return null;
  var e=eligibleScored(found.results);
  var rank={};e.scored.forEach(function(r){rank[r.school]=r.scoringPlace;});
  return {rank:rank,winner:(e.scored[0]||{}).school,scored:e.scored};
}

// ── Panel scaffold ────────────────────────────────────────────────────────────
var panel=document.createElement('div');
panel.id='bsra-panel';
panel.style.cssText='position:fixed;top:12px;right:12px;width:640px;max-height:94vh;overflow-y:auto;background:#0b1519;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.7);z-index:99999;font-family:Segoe UI,system-ui,sans-serif;font-size:12px;color:#e6f0f2;';
var tabBtns=TABS.map(function(t){
  var a=t.id==='cup';
  return '<button id="bsra-tab-'+t.id+'" onclick="bsraTab(\''+t.id+'\')" style="background:'+(a?'#2bb3c0':'#13232b')+';border:'+(a?'none':'1px solid rgba(255,255,255,.1)')+';color:'+(a?'#04141a':'#7d94a0')+';border-radius:6px;padding:4px 10px;font-size:11px;font-weight:'+(a?'700':'400')+';cursor:pointer;">'+t.label+'</button>';
}).join('');
panel.innerHTML=
  '<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:#13232b;border-radius:14px 14px 0 0;position:sticky;top:0;z-index:2;">'
  +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
  +'<div><div style="font-weight:800;font-size:15px;letter-spacing:.3px;">BSRA Points <span style="font-size:10px;color:#2bb3c0;">'+VERSION+'</span></div>'
  +'<div id="bsra-status" style="font-size:11px;color:#7d94a0;margin-top:1px;">'+(RID?'Regatta #'+RID+' · Starting…':'No regatta ID in URL')+'</div></div>'
  +'<button onclick="document.getElementById(\'bsra-panel\').remove()" style="background:none;border:none;color:#7d94a0;font-size:20px;cursor:pointer;padding:0 2px;line-height:1;">&times;</button>'
  +'</div><div style="display:flex;gap:4px;flex-wrap:wrap;">'+tabBtns+'</div>'
  +'<div style="display:flex;align-items:center;gap:10px;margin-top:9px;font-size:11px;color:#7d94a0;">'
  +'<button id="bsra-refresh-btn" onclick="bsraRefreshNow()" style="background:#13232b;border:1px solid rgba(255,255,255,.14);color:#e6f0f2;border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer;">&#8635; Refresh now</button>'
  +'<label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input id="bsra-auto" type="checkbox" checked onchange="bsraToggleAuto(this.checked)" style="cursor:pointer;accent-color:#2bb3c0;">Auto-refresh</label>'
  +'<span id="bsra-checked" style="margin-left:auto;"></span>'
  +'</div></div>'
  +'<div id="bsra-update-banner"></div>'
  +'<div style="height:2px;background:rgba(255,255,255,.05);"><div id="bsra-prog" style="height:100%;background:#2bb3c0;width:0%;transition:width .5s;"></div></div>'
  +'<div id="bsra-content" style="padding:14px 16px;"></div>'
  +'<div style="padding:6px 16px 10px;border-top:1px solid rgba(255,255,255,.06);">'
  +'<div id="bsra-log" style="font-size:10px;font-family:monospace;color:#7d94a0;max-height:48px;overflow-y:auto;line-height:1.6;"></div>'
  +'</div>';
document.body.appendChild(panel);

window.bsraTab=function(tab){
  currentTab=tab;
  TABS.forEach(function(t){
    var b=document.getElementById('bsra-tab-'+t.id);if(!b)return;
    var a=t.id===tab;
    b.style.background=a?'#2bb3c0':'#13232b';b.style.color=a?'#04141a':'#7d94a0';
    b.style.border=a?'none':'1px solid rgba(255,255,255,.1)';b.style.fontWeight=a?'700':'400';
  });
  bsraRender();
};
window.bsraSetStudents=function(school,val){
  var n=parseInt(val,10);
  if(STUDENTS[school]!==undefined&&!isNaN(n)&&n>0){STUDENTS[school]=n;saveStudents();}
  bsraRender();
};
window.bsraResetStudents=function(){
  for(var k in STUDENTS_DEFAULT)STUDENTS[k]=STUDENTS_DEFAULT[k];
  try{window.localStorage.removeItem(STUDENTS_KEY);}catch(e){}
  bsraRender();
};
function bsraLog(msg,col){
  var el=document.getElementById('bsra-log');if(!el)return;
  var t=new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var line=document.createElement('div');line.style.color=col||'#7d94a0';
  line.textContent='['+t+'] '+msg;el.insertBefore(line,el.firstChild);
}
function bsraProg(p){var e=document.getElementById('bsra-prog');if(e)e.style.width=p+'%';}
function bsraStatus(m){var e=document.getElementById('bsra-status');if(e)e.textContent=m;}
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
  var results=[];
  tmp.querySelectorAll('tr').forEach(function(row){
    var placeEl=row.querySelector('.rm_place');if(!placeEl)return;
    var placeText=placeEl.textContent.trim();if(!placeText)return;
    var overallPlace=pmap[placeText.toLowerCase()]||null;if(!overallPlace)return;
    var schoolEl=row.querySelector('div[style*="float:left"]');if(!schoolEl)return;
    var rawSchool=schoolEl.textContent.trim();if(!rawSchool)return;
    var cells=row.querySelectorAll('td');
    var lane=0;if(cells[2]){var lv=parseInt(cells[2].textContent.trim());if(!isNaN(lv)&&lv>0&&lv<=10)lane=lv;}
    var time='';cells.forEach(function(td){if(!time&&/^\d+:\d+\.\d+$/.test(td.textContent.trim()))time=td.textContent.trim();});
    results.push({place:overallPlace,rawSchool:rawSchool,lane:lane,time:time});
  });
  return {results:results,raceType:raceType};
}

// ── Aggregate Cup tab ─────────────────────────────────────────────────────────
var MEDAL=['🥇','🥈','🥉'],MEDALC=['#f5c842','#c8d2da','#d69355'];
function rankColor(r){return (r>=1&&r<=3)?MEDALC[r-1]:'#5fd3df';}
function bsraRender(){
  if(currentTab==='cup')          renderCup();
  else if(currentTab==='trophies')renderTrophies();
  else if(currentTab==='schools') renderSchools();
  else if(currentTab==='export')  renderExport();
  else                            renderRaces();
}
function renderCup(){
  var el=document.getElementById('bsra-content');if(!el)return;
  var a=computeAggregate();
  var cols='104px '+SCHOOLS.map(function(){return'1fr';}).join(' ');
  var h='<div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Aggregate Cup'+(REGATTA_NAME?' · '+REGATTA_NAME:'')+'</div>';
  h+='<div style="display:grid;grid-template-columns:'+cols+';background:#13232b;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">';
  // header
  h+='<div style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1);"></div>';
  SCHOOLS.forEach(function(s){var r=a.rankOf[s];h+='<div style="padding:8px 3px;text-align:center;font-size:11px;font-weight:800;border-bottom:1px solid rgba(255,255,255,.1);color:'+(typeof r==='number'&&r<=3?MEDALC[r-1]:'#e6f0f2')+'">'+(typeof r==='number'&&r<=3?MEDAL[r-1]+'<br>':'')+s+'</div>';});
  // points
  h+='<div style="padding:9px 10px;font-size:12px;font-weight:800;color:#e6f0f2;border-bottom:1px solid rgba(255,255,255,.08);">Points</div>';
  SCHOOLS.forEach(function(s){var r=a.rankOf[s];h+='<div style="padding:9px 3px;text-align:center;font-weight:800;font-size:15px;color:'+rankColor(r)+';border-bottom:1px solid rgba(255,255,255,.08);">'+a.totals[s]+'</div>';});
  // ranking
  h+='<div style="padding:6px 10px;font-size:11px;color:#7d94a0;border-bottom:1px solid rgba(255,255,255,.08);">Ranking</div>';
  SCHOOLS.forEach(function(s){h+='<div style="padding:6px 3px;text-align:center;font-size:12px;font-weight:700;color:#9fb0b8;border-bottom:1px solid rgba(255,255,255,.08);">'+a.rankOf[s]+'</div>';});
  // year rows
  var labels={GY8:'Year 8',GY9:'Year 9',GY10:'Year 10',Senior:'Senior'};
  CATS.forEach(function(c,ci){
    var last=ci===CATS.length-1;
    h+='<div style="padding:6px 10px;font-size:11px;color:#7d94a0;'+(last?'':'border-bottom:1px solid rgba(255,255,255,.05);')+'">'+labels[c]+'</div>';
    SCHOOLS.forEach(function(s){
      var v=a.years[c][s],yr=a.yearRank[c][s];
      h+='<div style="padding:6px 3px;text-align:center;font-size:11px;'+(last?'':'border-bottom:1px solid rgba(255,255,255,.05);')+'color:'+(v>0?'#dbe6ea':'#4a5a63')+';">'+v+' <span style="font-size:9px;color:#6f8590;">['+yr+']</span></div>';
    });
  });
  h+='</div>';
  h+='<div style="margin-top:10px;font-size:10px;color:#6f8590;line-height:1.6;">Column headers ranked by total. Year rows show points with the school\'s rank <span style="color:#8aa0aa;">[in that year group]</span>. Only the first running of each event scores; quad divisions score to Div&nbsp;4.</div>';
  el.innerHTML=h;
}

// ── Trophies tab ──────────────────────────────────────────────────────────────
function renderTrophies(){
  var el=document.getElementById('bsra-content');if(!el)return;
  var a=computeAggregate();
  var fe=computeFirstEight();
  var pct={};SCHOOLS.forEach(function(s){pct[s]=STUDENTS[s]?a.totals[s]/STUDENTS[s]:0;});
  var pctRank=rankMap(pct,a.cupWinner);
  var pctOrder=SCHOOLS.filter(function(s){return s!==a.cupWinner;}).sort(function(x,y){return pct[y]-pct[x];});
  var pctWinner=pctOrder[0];

  function card(title,school,accent){
    return '<div style="flex:1;background:#13232b;border:1px solid rgba(255,255,255,.08);border-top:3px solid '+accent+';border-radius:10px;padding:12px 14px;">'
      +'<div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">'+title+'</div>'
      +'<div style="font-size:15px;font-weight:800;color:'+accent+';line-height:1.25;">'+(school?SCHOOL_FULL[school]:'—')+'</div></div>';
  }
  var h='<div style="display:flex;gap:8px;margin-bottom:14px;">'
    + card('First Eight',(fe?fe.winner:null),'#fb923c')
    + card('Aggregate Cup',a.cupWinner,'#f5c842')
    + card('Percentage Trophy',pctWinner,'#5fd3df')
    +'</div>';

  // Percentage Trophy grid
  var cols='104px '+SCHOOLS.map(function(){return'1fr';}).join(' ');
  h+='<div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Percentage Trophy <span style="text-transform:none;letter-spacing:0;color:#6f8590;">— points ÷ enrolment · Cup winner excluded</span></div>';
  h+='<div style="display:grid;grid-template-columns:'+cols+';background:#13232b;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-bottom:14px;">';
  h+='<div style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1);"></div>';
  SCHOOLS.forEach(function(s){var r=pctRank[s];h+='<div style="padding:8px 3px;text-align:center;font-size:11px;font-weight:800;border-bottom:1px solid rgba(255,255,255,.1);color:'+(r===1?'#5fd3df':'#e6f0f2')+'">'+s+'</div>';});
  var prow=[['Agg. Points',function(s){return a.totals[s];},'#dbe6ea'],
            ['# Students',function(s){return '<input type="number" min="1" value="'+STUDENTS[s]+'" onchange="bsraSetStudents(\''+s+'\',this.value)" onclick="this.select()" title="Edit enrolment for '+s+'" style="width:48px;background:#0b1519;border:1px solid rgba(255,255,255,.16);border-radius:5px;color:#e6f0f2;font-size:11px;text-align:center;padding:2px 0;font-family:inherit;">';},'#9fb0b8'],
            ['% Calc',function(s){return (s===a.cupWinner?'('+pct[s].toFixed(3)+')':pct[s].toFixed(3));},'#dbe6ea'],
            ['Ranking',function(s){return pctRank[s];},'#9fb0b8']];
  prow.forEach(function(rw,ri){
    var last=ri===prow.length-1;
    h+='<div style="padding:7px 10px;font-size:11px;color:#7d94a0;'+(last?'':'border-bottom:1px solid rgba(255,255,255,.06);')+'">'+rw[0]+'</div>';
    SCHOOLS.forEach(function(s){
      var win=(rw[0]==='Ranking'&&pctRank[s]===1);
      h+='<div style="padding:7px 3px;text-align:center;font-size:11px;font-weight:'+(rw[0]==='% Calc'||win?'700':'400')+';color:'+(win?'#5fd3df':rw[2])+';'+(last?'':'border-bottom:1px solid rgba(255,255,255,.06);')+'">'+rw[1](s)+'</div>';
    });
  });
  h+='</div>';
  h+='<div style="margin:-6px 0 14px;font-size:10px;color:#6f8590;line-height:1.6;">Tap any <b style="color:#9fb0b8;">#&nbsp;Students</b> value to edit it &mdash; changes are saved in this browser. <span onclick="bsraResetStudents()" style="color:#5fd3df;cursor:pointer;text-decoration:underline;">Reset to defaults</span></div>';

  // First Eight ranking
  h+='<div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">First Eight <span style="text-transform:none;letter-spacing:0;color:#6f8590;">— Open Eight placing (BSRA Trophy)</span></div>';
  if(fe){
    h+='<div style="display:grid;grid-template-columns:'+cols+';background:#13232b;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">';
    h+='<div style="padding:8px 10px;"></div>';
    SCHOOLS.forEach(function(s){var r=fe.rank[s];h+='<div style="padding:8px 3px;text-align:center;font-size:11px;font-weight:800;color:'+(r===1?'#fb923c':'#e6f0f2')+'">'+s+'</div>';});
    h+='<div style="padding:7px 10px;font-size:11px;color:#7d94a0;">Placing</div>';
    SCHOOLS.forEach(function(s){var r=fe.rank[s];h+='<div style="padding:7px 3px;text-align:center;font-size:13px;font-weight:700;color:'+(r===1?'#fb923c':(r?'#9fb0b8':'#4a5a63'))+';">'+(r||'—')+'</div>';});
    h+='</div>';
  }else{
    h+='<div style="background:#13232b;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;text-align:center;color:#7d94a0;font-size:12px;">Open Eight result not in yet</div>';
  }
  el.innerHTML=h;
}

// ── Schools tab ───────────────────────────────────────────────────────────────
function renderSchools(){
  var el=document.getElementById('bsra-content');if(!el)return;
  var sd={};SCHOOLS.forEach(function(s){sd[s]={total:0,GY8:0,GY9:0,GY10:0,Senior:0,races:[]};});
  Object.keys(races).sort(function(a,b){return+a-+b;}).forEach(function(id){
    var race=races[id];
    if(!race.results||!race.results.length||!isScoringOccurrence(race))return;
    var cls=classifyRace(race);if(!cls||!cls.scores)return;
    var e=eligibleScored(race.results);
    e.scored.forEach(function(r){
      var pts=cls.pts[r.scoringPlace]||0;if(!sd[r.school])return;
      sd[r.school].total+=pts;sd[r.school][cls.cat]+=pts;
      sd[r.school].races.push({code:cls.code,place:r.scoringPlace,pts:pts,color:cls.color});
    });
  });
  var sorted=SCHOOLS.slice().sort(function(a,b){return sd[b].total-sd[a].total;});
  var ptColors=['#f5c842','#c8d2da','#d69355','#5fd3df','#5fd3df','#5fd3df','#5fd3df','#5fd3df','#5fd3df'];
  var pll=['','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
  var h='';
  sorted.forEach(function(school,rank){
    var d=sd[school],color=ptColors[rank];
    h+='<div style="background:#13232b;border-radius:10px;border:1px solid rgba(255,255,255,.08);margin-bottom:10px;overflow:hidden;">';
    h+='<div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;">';
    h+='<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:'+(rank<3?'18':'13')+'px;color:'+(rank<3?'inherit':'#7d94a0')+'">'+(rank<3?MEDAL[rank]:(rank+1)+'.')+'</span>'
      +'<div><div style="font-weight:700;font-size:14px;">'+school+'</div><div style="font-size:11px;color:#7d94a0;">'+SCHOOL_FULL[school]+'</div></div></div>';
    h+='<div style="text-align:right;"><div style="font-size:22px;font-weight:800;color:'+color+';">'+d.total+'</div><div style="font-size:10px;color:#7d94a0;">Total pts</div></div></div>';
    h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid rgba(255,255,255,.08);">';
    [{label:'Year 8',key:'GY8'},{label:'Year 9',key:'GY9'},{label:'Year 10',key:'GY10'},{label:'Senior',key:'Senior'}].forEach(function(b,bi){
      var pts=d[b.key]||0;
      h+='<div style="padding:8px 6px;text-align:center;'+(bi<3?'border-right:1px solid rgba(255,255,255,.06);':'')+'">'
        +'<div style="font-size:10px;color:#7d94a0;font-weight:600;margin-bottom:2px;">'+b.label+'</div>'
        +'<div style="font-size:14px;font-weight:700;color:'+(pts>0?'#e6f0f2':'#3d4b53')+';">'+pts+'</div></div>';
    });
    h+='</div>';
    if(d.races.length){
      h+='<div style="padding:8px 14px;"><div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Scoring races</div><div style="display:flex;flex-wrap:wrap;gap:4px;">';
      d.races.forEach(function(r){
        h+='<div style="background:rgba(255,255,255,.05);border-radius:6px;padding:4px 8px;font-size:11px;border-left:2px solid '+r.color+';">'
          +'<span style="color:'+r.color+';font-weight:600;margin-right:4px;">'+r.code+'</span>'
          +'<span style="color:#7d94a0;">'+(pll[r.place]||r.place+'th')+'</span>'
          +'<span style="color:#3ecf8e;margin-left:4px;">+'+r.pts+'</span></div>';
      });
      h+='</div></div>';
    }
    h+='</div>';
  });
  el.innerHTML=h||'<div style="text-align:center;color:#7d94a0;padding:20px;">No results yet</div>';
}

// ── Races tab ─────────────────────────────────────────────────────────────────
function renderRaces(){
  var el=document.getElementById('bsra-content');if(!el)return;
  var ids=Object.keys(races).sort(function(a,b){return+a-+b;});
  if(!ids.length){el.innerHTML='<div style="color:#7d94a0;text-align:center;padding:24px;">No races loaded</div>';return;}
  var h='';
  ids.forEach(function(id){
    var race=races[id],cls=classifyRace(race);
    var codeStr=race.codes.join(' + ')||'Race #'+id;
    var hasResults=race.results&&race.results.length;
    var repeat=race.isFirstOccurrence===false;
    var scoring=cls&&cls.scores&&!repeat;
    var color=scoring?cls.color:'rgba(255,255,255,.15)';
    var reason='';
    if(cls&&repeat)reason='repeat — not scored';
    else if(cls&&!cls.scores)reason='Div 5+ — not scored';
    else if(!cls)reason='not a scoring event';
    h+='<div style="margin-bottom:6px;background:#13232b;border-radius:8px;border:1px solid rgba(255,255,255,.07);border-left:3px solid '+color+';padding:8px 12px;'+(scoring?'':'opacity:0.55;')+'">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(hasResults?'5px':'0')+';">';
    h+='<div><span style="font-weight:600;font-size:12px;color:'+(scoring?cls.color:'#9fb0b8')+';">'+codeStr+'</span>'
      +(reason?'<span style="font-size:10px;color:#7d94a0;margin-left:8px;">'+reason+'</span>':'')+'</div>';
    h+='<span style="font-size:10px;color:#7d94a0;">#'+id+' · '+(race.time||'')+'</span></div>';
    if(hasResults){
      if(scoring){
        var e=eligibleScored(race.results);var allRows=[];
        e.scored.forEach(function(r){allRows.push({school:r.school,place:r.place,scoringPlace:r.scoringPlace,pts:cls.pts[r.scoringPlace]||0,eligible:true});});
        e.ineligList.forEach(function(r){allRows.push({school:r.school,place:r.place,eligible:false});});
        allRows.sort(function(a,b){return a.place-b.place;});
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px;">';
        allRows.forEach(function(r){
          if(r.eligible){h+='<div style="background:rgba(255,255,255,.05);border-radius:5px;padding:3px 7px;font-size:11px;"><span style="color:#7d94a0;margin-right:2px;">'+r.scoringPlace+'.</span><span style="font-weight:600;">'+r.school+'</span>'+(r.pts>0?'<span style="color:'+cls.color+';margin-left:3px;">+'+r.pts+'</span>':'')+'</div>';}
          else{h+='<div style="background:rgba(255,255,255,.02);border-radius:5px;padding:3px 7px;font-size:11px;opacity:0.4;border:1px solid rgba(255,255,255,.05);"><span style="color:#7d94a0;">'+r.school+'</span></div>';}
        });
        h+='</div>';
      }else{
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px;">';
        (race.results||[]).forEach(function(r){var ab=(abbrev(r.rawSchool)||r.rawSchool)+(isInvitational(r.rawSchool)?' [inv]':'');h+='<div style="background:rgba(255,255,255,.04);border-radius:5px;padding:3px 7px;font-size:11px;color:#7d94a0;">'+r.place+'. '+ab+'</div>';});
        h+='</div>';
      }
    }else if(race.results!==null){h+='<div style="font-size:11px;color:rgba(255,255,255,.2);">No results yet</div>';}
    else{h+='<div style="font-size:11px;color:rgba(255,255,255,.2);">Loading…</div>';}
    h+='</div>';
  });
  el.innerHTML=h;
}

// ── Report export (static HTML matching the printed summary sheet) ────────────
var SCHOOL_COLOR={AHS:'#a2daf1',BGGS:'#b2c4ee',BSHS:'#e9c9be',LHC:'#d4b4eb',SOM:'#95f1b9',STH:'#efdfab',STM:'#ffb25f',SPLC:'#fec0ff',STU:'#fb9ca0'};
var META_KEY='bsra_export_meta_v1';
function loadMeta(){
  var d={title:'BSRA Head of the River',date:'',host:'',venue:'',regatta:REGATTA_NAME||''};
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
  if(changed){saveMeta();if(currentTab==='export')bsraRender();}
}
function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

var ORD_WORD={1:'First',2:'Second',3:'Third',4:'Fourth',5:'Fifth',6:'Sixth'};
function ordNum(n){n=n||1;var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function yearNumOf(cls){return cls.cat==='GY8'?'8':cls.cat==='GY9'?'9':cls.cat==='GY10'?'10':null;}
function crewLabel(cls){
  var yr=yearNumOf(cls);
  if(cls.boat==='1x')return (yr?'Year '+yr+' ':'Senior ')+'Single Scull';
  if(cls.boat==='4x+')return (yr?'Year '+yr:'Senior')+' '+ordNum(cls.div||1)+' Quad';
  if(cls.boat==='4+')return (yr?'Year '+yr+' ':'Senior ')+'Four';
  if(cls.boat==='8+'){
    if(cls.firstEight)return 'Open First Eight';
    var w=ORD_WORD[cls.div]||((cls.div||'')+'th');
    return (yr?'Year '+yr+' ':'Senior ')+w+' Eight';
  }
  return cls.code||'';
}
function crewSortRank(cls){
  var yr=parseInt(yearNumOf(cls)||( (cls.code||'').match(/GY(\d+)/i)||[] )[1]||99,10);
  if(cls.boat==='1x')return 0+yr;
  if(cls.boat==='4x+')return 10000+(yearNumOf(cls)?yr*100:9900)+(100-(cls.div||0));
  if(cls.boat==='4+')return 20000;
  if(cls.boat==='8+')return cls.firstEight?40000:30000+(100-(cls.div||0));
  return 50000;
}
function reportSegments(){
  var a=computeAggregate();
  return a.segments.slice().sort(function(x,y){return crewSortRank(x.cls)-crewSortRank(y.cls);});
}

var TROPHY_LABEL_WIDTH=16; // % — shared across Aggregate Cup / Percentage / BSRA Trophy so school columns line up when stacked
function trophyColGroup(){
  var schoolW=((100-TROPHY_LABEL_WIDTH)/9).toFixed(3);
  var h='<colgroup><col style="width:'+TROPHY_LABEL_WIDTH+'%">';
  SCHOOLS.forEach(function(){h+='<col style="width:'+schoolW+'%">';});
  return h+'</colgroup>';
}
function ltHeaderRow(cols,winner,label){ // light-theme table header row; winner col (if any) gets maroon bg; label fills the corner cell so the title sits in the same row as the school columns
  var h='<tr><th style="padding:6px 8px;border:1px solid #cfcfcf;background:#3a3f45;color:#fff;font-size:12px;text-align:left;white-space:nowrap;">'+(label?escHtml(label):'')+'</th>';
  cols.forEach(function(c){
    var win=winner&&c===winner;
    h+='<th style="padding:6px 3px;border:1px solid #cfcfcf;background:'+(win?'#7a1f27':'#3a3f45')+';color:#fff;font-size:12px;">'+escHtml(c)+'</th>';
  });
  return h+'</tr>';
}
function ltRow(label,cells,bold){
  var h='<tr><td style="padding:5px 8px;border:1px solid #cfcfcf;background:#f4f4f4;font-size:12px;'+(bold?'font-weight:700;':'')+'">'+escHtml(label)+'</td>';
  cells.forEach(function(c){h+='<td style="padding:5px 3px;text-align:center;border:1px solid #d7d7d7;font-size:12px;color:#111;'+(bold?'font-weight:800;font-size:14px;':'')+'">'+c+'</td>';});
  return h+'</tr>';
}
function buildAggregateCupTable(a){
  var medal={};SCHOOLS.forEach(function(s){var r=a.rankOf[s];if(r>=1&&r<=3)medal[s]=MEDAL[r-1];});
  var h='<table style="border-collapse:collapse;width:100%;table-layout:fixed;">'+trophyColGroup();
  h+='<tr><th style="padding:6px 8px;border:1px solid #cfcfcf;background:#3a3f45;color:#fff;font-size:12px;text-align:left;white-space:nowrap;">Aggregate Cup</th>';
  SCHOOLS.forEach(function(s){h+='<th style="padding:6px 3px;border:1px solid #cfcfcf;background:#3a3f45;color:#fff;font-size:12px;">'+s+(medal[s]?' '+medal[s]:'')+'</th>';});
  h+='</tr>';
  h+=ltRow('Points',SCHOOLS.map(function(s){return a.totals[s];}),true);
  h+=ltRow('Ranking',SCHOOLS.map(function(s){return a.rankOf[s];}));
  var labels={GY8:'Year 8',GY9:'Year 9',GY10:'Year 10',Senior:'Senior'};
  CATS.forEach(function(c){
    h+=ltRow(labels[c],SCHOOLS.map(function(s){return a.years[c][s]+' <span style="color:#8a8a8a;font-size:10px;">['+a.yearRank[c][s]+']</span>';}));
  });
  h+='</table>';
  return '<div class="block">'+h+'</div>';
}
function buildPercentageTable(a,pct,pctRank,pctWinner){
  var h='<table style="border-collapse:collapse;width:100%;table-layout:fixed;">'+trophyColGroup()+ltHeaderRow(SCHOOLS,pctWinner,'Percentage Trophy');
  h+=ltRow('Ranking',SCHOOLS.map(function(s){return s===a.cupWinner?'x':pctRank[s];}),true);
  h+=ltRow('Aggregate Points',SCHOOLS.map(function(s){return a.totals[s];}));
  h+=ltRow('# Students',SCHOOLS.map(function(s){return STUDENTS[s];}));
  h+=ltRow('% Calculation',SCHOOLS.map(function(s){return s===a.cupWinner?'('+pct[s].toFixed(3)+')':pct[s].toFixed(3);}));
  h+='</table>';
  return '<div class="block">'+h+'</div>';
}
function buildBsraTrophyTable(fe){
  var h='<table style="border-collapse:collapse;width:100%;table-layout:fixed;">'+trophyColGroup()+ltHeaderRow(SCHOOLS,fe?fe.winner:null,'BSRA Trophy');
  h+=ltRow('First Eight',SCHOOLS.map(function(s){var r=fe&&fe.rank[s];return '<span style="'+((fe&&s===fe.winner)?'font-weight:800;':'')+'">'+(r||'&mdash;')+'</span>';}));
  h+='</table>';
  return '<div class="block">'+h+'</div>';
}
function buildResultsPointsTable(segs){
  var h='<table style="border-collapse:collapse;width:100%;">';
  h+='<colgroup><col>';
  for(var i=0;i<9;i++)h+='<col style="width:32px">';
  h+='<col style="width:14px">';
  for(var i=0;i<9;i++)h+='<col style="width:32px">';
  h+='</colgroup>';
  h+='<tr>'
    +'<th colspan="10" style="padding:7px 12px;background:#3a3f45;color:#fff;font-weight:700;font-size:13px;letter-spacing:.3px;text-align:left;">Racing Results</th>'
    +'<th style="border:none;background:#fff;padding:0;"></th>'
    +'<th colspan="9" style="padding:7px 12px;background:#7a1f27;color:#fff;font-weight:700;font-size:13px;letter-spacing:.3px;text-align:left;">Points Awarded</th>'
    +'</tr>';
  h+='<tr><th style="padding:6px 8px;border:1px solid #cfcfcf;background:#3a3f45;color:#fff;font-size:11px;text-align:left;">Crew</th>';
  for(var p=1;p<=9;p++)h+='<th style="padding:5px 2px;border:1px solid #cfcfcf;background:#3a3f45;color:#fff;font-size:10px;">'+ordNum(p)+'</th>';
  h+='<th style="border:none;background:#fff;"></th>';
  SCHOOLS.forEach(function(s){h+='<th style="padding:5px 2px;border:1px solid #cfcfcf;background:#7a1f27;color:#fff;font-size:10px;">'+s+'</th>';});
  h+='</tr>';
  segs.forEach(function(seg){
    var byS={};seg.scored.forEach(function(r){byS[r.school]=r.scoringPlace;});
    h+='<tr><td style="padding:5px 8px;border:1px solid #d7d7d7;font-size:11px;white-space:nowrap;">'+escHtml(crewLabel(seg.cls))+'</td>';
    for(var i=0;i<9;i++){
      var r=seg.scored[i];
      if(r)h+='<td style="padding:4px 2px;text-align:center;border:1px solid #d7d7d7;font-size:10px;font-weight:700;background:'+SCHOOL_COLOR[r.school]+';color:#20242a;">'+r.school+'</td>';
      else h+='<td style="border:1px solid #e6e6e6;background:#fbfbfb;"></td>';
    }
    h+='<td style="border:none;background:#fff;"></td>';
    SCHOOLS.forEach(function(s){
      var sp=byS[s],pts=sp?(seg.cls.pts[sp]||0):0;
      var top3=sp>=1&&sp<=3;
      var border=top3?('2px solid '+MEDALC[sp-1]):'1px solid #d7d7d7';
      var style='padding:4px 2px;text-align:center;border:'+border+';font-size:10px;';
      style+=pts>0?('color:#20242a;font-weight:'+(top3?'800':'700')+';'):'color:#c2c2c2;font-weight:400;';
      h+='<td style="'+style+'">'+pts+'</td>';
    });
    h+='</tr>';
  });
  h+='</table>';
  return '<div class="block">'+h+'</div><div class="caption">Scoring order (best crew per school, re-ranked among the nine BSRA schools) on the left, points for that placing on the right. Only the first running of each event scores; quads score Divisions&nbsp;1&ndash;4. Single 10&rarr;1 &middot; Quad &amp; Four 50&rarr;5 &middot; Eight 90&rarr;9.</div>';
}
function buildReportHTML(){
  var m=EXPORT_META;
  var a=computeAggregate(),fe=computeFirstEight();
  var pct={};SCHOOLS.forEach(function(s){pct[s]=STUDENTS[s]?a.totals[s]/STUDENTS[s]:0;});
  var pctRank=rankMap(pct,a.cupWinner);
  var pctOrder=SCHOOLS.filter(function(s){return s!==a.cupWinner;}).sort(function(x,y){return pct[y]-pct[x];});
  var pctWinner=pctOrder[0];
  var segs=reportSegments();
  var headerCard='<div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;display:flex;align-items:stretch;background:#fff;">'
    +'<div style="background:#7a1f27;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 20px;min-width:120px;">'
    +'<div style="width:34px;height:34px;transform:rotate(45deg);border:3px solid #fff;border-radius:4px;margin-bottom:8px;"></div>'
    +'<div style="font-weight:900;font-size:20px;letter-spacing:1px;">BSRA</div></div>'
    +'<div style="flex:1;padding:14px 18px;">'
    +'<div style="background:#7a1f27;color:#fff;font-weight:800;font-size:15px;padding:6px 12px;border-radius:4px;margin-bottom:10px;">'+escHtml(m.title)+'</div>'
    +'<table style="width:100%;font-size:12.5px;color:#222;border-collapse:collapse;">'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;width:90px;">Date</td><td>'+escHtml(m.date)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Host</td><td>'+escHtml(m.host)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Venue</td><td>'+escHtml(m.venue)+'</td></tr>'
    +'<tr><td style="font-weight:700;padding:3px 10px 3px 0;">Regatta</td><td>'+escHtml(m.regatta)+'</td></tr>'
    +'</table></div></div>';
  var recip='<div class="block"><div style="background:#7a1f27;color:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:5px 5px 0 0;letter-spacing:.3px;">Trophy Recipients</div>'
    +'<div style="border:1px solid #e0e0e0;border-radius:0 0 6px 6px;padding:14px 16px;background:#fff;">'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span style="font-weight:700;font-size:13px;color:#333;">First Eight</span><span style="font-size:13px;color:#111;">'+(fe?SCHOOL_FULL[fe.winner]+' School':'&mdash;')+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span style="font-weight:700;font-size:13px;color:#333;">Aggregate Cup</span><span style="font-size:13px;color:#111;">'+SCHOOL_FULL[a.cupWinner]+' School</span></div>'
    +'<div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="font-weight:700;font-size:13px;color:#333;">Percentage Trophy</span><span style="font-size:13px;color:#111;">'+SCHOOL_FULL[pctWinner]+' School</span></div>'
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
    +'<div class="item">'+buildAggregateCupTable(a)+'</div>'
    +'<div class="item">'+buildPercentageTable(a,pct,pctRank,pctWinner)+'</div>'
    +'<div class="item">'+buildBsraTrophyTable(fe)+'</div>'
    +'</div><div class="col">'
    +headerCard+recip
    +'</div></div>'
    +'<div class="item" style="margin-top:16px;">'+buildResultsPointsTable(segs)+'</div>'
    +'<div style="text-align:center;color:#9a9a9a;font-size:10px;margin-top:16px;">Generated from official results data &middot; '+escHtml(m.regatta)+'</div>'
    +'</div></body></html>';
  return body;
}
window.bsraSetMeta=function(field,val){EXPORT_META[field]=val;saveMeta();};
window.bsraOpenReport=function(){
  var html=buildReportHTML();
  var blob=new Blob([html],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  window.open(url,'_blank');
  setTimeout(function(){URL.revokeObjectURL(url);},60000);
};
window.bsraDownloadReport=function(){
  var html=buildReportHTML();
  var blob=new Blob([html],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='BSRA-Head-of-the-River-results.html';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},60000);
};
function renderExport(){
  var el=document.getElementById('bsra-content');if(!el)return;
  var segs=reportSegments();
  var scoringRacesLoaded=segs.length;
  var totalScoringExpected='';
  var m=EXPORT_META;
  function field(label,key,ph){
    return '<label style="display:block;margin-bottom:8px;"><div style="font-size:10px;color:#7d94a0;margin-bottom:2px;">'+label+'</div>'
      +'<input type="text" value="'+escHtml(m[key])+'" placeholder="'+ph+'" onchange="bsraSetMeta(\''+key+'\',this.value)" style="width:100%;background:#0b1519;border:1px solid rgba(255,255,255,.16);border-radius:5px;color:#e6f0f2;font-size:12px;padding:5px 8px;font-family:inherit;box-sizing:border-box;"></label>';
  }
  var h='<div style="font-size:10px;color:#7d94a0;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">Export report</div>';
  h+='<div style="background:#13232b;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px 14px;margin-bottom:12px;">';
  h+=field('Report title','title','BSRA Head of the River');
  h+=field('Date','date','DD/MM/YYYY');
  h+=field('Host','host','School & BSRA');
  h+=field('Venue','venue','Queensland State Rowing Centre');
  h+=field('Regatta','regatta','Full regatta name');
  h+='</div>';
  h+='<div style="font-size:11px;color:#9fb0b8;margin-bottom:12px;">'+scoringRacesLoaded+' scoring race'+(scoringRacesLoaded===1?'':'s')+' loaded with results. The report reflects whatever has come in so far &mdash; open it again any time, including once every race is complete.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  h+='<button onclick="bsraOpenReport()" style="background:#2bb3c0;border:none;color:#04141a;border-radius:6px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Open report in new tab</button>';
  h+='<button onclick="bsraDownloadReport()" style="background:#13232b;border:1px solid rgba(255,255,255,.16);color:#e6f0f2;border-radius:6px;padding:8px 14px;font-size:12px;cursor:pointer;">Download .html</button>';
  h+='</div>';
  h+='<div style="margin-top:10px;font-size:10px;color:#6f8590;line-height:1.6;">Matches the printed summary sheet layout &mdash; open it and use your browser\'s Print (Ctrl/Cmd+P) to save as PDF. Crew rows only appear once a race has results.</div>';
  el.innerHTML=h;
}

// ── Fetch (slow, human-paced, keeps refreshing) ───────────────────────────────
var pollTimer=null,polling=false,autoRefresh=true,lastChecked=null;
var REFRESH_BASE_MS=240000;                                  // ~4 min between checks
function refreshInterval(){return REFRESH_BASE_MS+Math.floor(Math.random()*120000);} // 4–6 min

function setChecked(){
  lastChecked=new Date();
  var el=document.getElementById('bsra-checked');
  if(el)el.textContent='checked '+lastChecked.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function needsResults(race){return !race||!race.results||!race.results.length;}

async function fetchJSON(url,retries,delay){
  for(var i=0;i<=retries;i++){
    try{
      var res=await fetch(url,{cache:'no-cache'});
      if(res.status===429||res.status===503){bsraLog('Rate limited — backing off '+(delay*(i+2)/1000)+'s','#fb923c');await sleep(delay*(i+2));continue;}
      if(!res.ok)throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(e){if(i<retries)await sleep(delay*(i+1));else throw e;}
  }
}

// Re-read the race list. Adds newly scheduled races, refreshes codes/times, and
// recomputes "first occurrence" across the whole current schedule. Returns ids in order.
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
  var btn=document.getElementById('bsra-refresh-btn');if(btn)btn.textContent='… checking';
  if(manual)bsraLog('Manual refresh…','#5fd3df');
  var ids;
  try{ids=await refreshStatus();}
  catch(e){bsraLog('Refresh failed: '+e.message,'#e55');polling=false;if(btn)btn.textContent='\u21bb Refresh now';if(autoRefresh)schedulePoll();return;}
  var pending=ids.filter(function(id){return needsResults(races[id]);});
  if(pending.length){
    bsraStatus('Regatta #'+RID+' · checking '+pending.length+' race'+(pending.length>1?'s':'')+' for results…');
    for(var i=0;i<pending.length;i++){
      var id=pending[i];
      try{var n=await loadRace(id,2,8000);if(n){bsraLog('New result · #'+id+' '+races[id].codes.join(','),'#3ecf8e');bsraRender();}}catch(e){}
      await sleep(politeDelay());
    }
  }else if(manual){bsraLog('No new results yet','#7d94a0');}
  setChecked();
  bsraStatus('Regatta #'+RID+' · watching for new results');
  if(btn)btn.textContent='\u21bb Refresh now';
  polling=false;
  if(autoRefresh)schedulePoll();
}
function schedulePoll(){
  if(pollTimer)clearTimeout(pollTimer);
  if(!autoRefresh)return;
  pollTimer=setTimeout(function(){pollCycle(false);},refreshInterval());
}
window.bsraRefreshNow=function(){pollCycle(true);};
window.bsraToggleAuto=function(on){
  autoRefresh=on;
  if(on){bsraLog('Auto-refresh on','#5fd3df');schedulePoll();}
  else{if(pollTimer)clearTimeout(pollTimer);bsraLog('Auto-refresh paused','#7d94a0');}
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
        bsraLog('Live update · race #'+id,'#3ecf8e');setChecked();bsraRender();
      }
    }catch(e){}
  };
}

// ── Update check (fetch-only; can't self-update on sites that block <script> loads) ──
var UPDATE_CHECK_URL='https://raw.githubusercontent.com/camtmsmith/RegattaPointsCalculator/refs/heads/main/bsra-bookmarklet.js';
var updateDismissed=false;
async function checkForUpdate(){
  if(updateDismissed)return;
  var banner=document.getElementById('bsra-update-banner');
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
  var banner=document.getElementById('bsra-update-banner');
  if(!banner||updateDismissed)return;
  banner.innerHTML=
    '<div style="margin:0 14px 10px;background:rgba(43,179,192,.12);border:1px solid rgba(43,179,192,.35);border-radius:8px;padding:10px 30px 10px 12px;font-size:11px;color:#bfe6ea;line-height:1.6;position:relative;">'
    +'<button onclick="bsraDismissUpdate()" title="Dismiss" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#7d94a0;font-size:15px;cursor:pointer;line-height:1;padding:0;">&times;</button>'
    +'<b style="color:#5fd3df;">Update available &mdash; '+remoteVersion+' (you have '+VERSION+')</b><br>'
    +'This bookmark can\u2019t update itself on this site. Open the '
    +'<a href="https://camtmsmith.github.io/RegattaPointsCalculator/" target="_blank" rel="noopener" style="color:#5fd3df;">installer page</a>'
    +', reload it, and drag the button in again to replace this bookmark.'
    +'</div>';
}
window.bsraDismissUpdate=function(){
  updateDismissed=true;
  var banner=document.getElementById('bsra-update-banner');
  if(banner)banner.innerHTML='';
};

async function bsraLoad(){
  if(!RID){bsraLog('No regatta ID in the page URL. Open the live results page for a BSRA regatta.','#e55');bsraStatus('No regatta ID');return;}
  await sleep(400+Math.floor(Math.random()*700));
  bsraLog('Regatta #'+RID+' · Fetching race list…','#5fd3df');
  var ids;
  try{ids=await refreshStatus();}
  catch(e){bsraLog('Race list failed: '+e.message,'#e55');bsraStatus('Error');return;}
  var total=ids.length,failed=[];
  bsraLog('Found '+total+' races · loading slowly to stay polite','#3ecf8e');

  for(var i=0;i<ids.length;i++){
    var id=ids[i];
    bsraProg(Math.round(i/total*80));
    bsraStatus('Regatta #'+RID+' · Loading ('+(i+1)+'/'+total+')… slow mode');
    try{
      var n=await loadRace(id,2,8000);
      if(n){
        var cls=classifyRace(races[id]);
        var scoring=cls&&cls.scores&&isScoringOccurrence(races[id]);
        var cnt=scoring?eligibleScored(races[id].results).scored.length:n;
        bsraLog('#'+id+' '+races[id].codes.join(',')+(scoring?'  '+cnt+' scored':' [not scored]'),'#3ecf8e');
        bsraRender();
      }
    }catch(e){failed.push(id);}
    await sleep(politeDelay());
  }

  if(failed.length){
    bsraLog('Retrying '+failed.length+' slowly…','#fb923c');await sleep(politeDelay()*2);
    for(var i=0;i<failed.length;i++){
      var id=failed[i];bsraStatus('Retrying ('+(i+1)+'/'+failed.length+')…');bsraProg(80+Math.round(i/failed.length*18));
      try{var n=await loadRace(id,3,10000);if(n){bsraLog('#'+id+' retry OK','#3ecf8e');bsraRender();}}catch(e){bsraLog('#'+id+' retry failed','#e55');}
      await sleep(politeDelay()*1.5);
    }
  }

  bsraProg(100);setTimeout(function(){bsraProg(0);},1000);
  setChecked();
  bsraStatus('Regatta #'+RID+' · watching for new results');
  bsraLog('Initial load complete · auto-refresh every ~4–6 min','#3ecf8e');bsraRender();
  hookWebsocket();
  schedulePoll();
}
checkForUpdate();
setInterval(checkForUpdate,20*60*1000); // recheck roughly every 20 min in case a longer session outlasts an update
autofillMeta();
bsraLoad();
})();
