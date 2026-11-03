// Win-probability tests against the verified reference numbers in docs/WIN_PROBABILITY_SPEC.md
const E=require('./load_engine')();
let fails=0; const near=(name,got,want,tol)=>{ const ok=Math.abs(got-want)<=tol; if(!ok) fails++; console.log((ok?'PASS':'FAIL')+'  '+name+': '+(got*100).toFixed(1)+'% (want '+(want*100).toFixed(1)+'% ±'+(tol*100)+')'); };
const mk=(first,u1,u2,cfg)=>({config:Object.assign({scoring:'ad',thirdSet:'match_tiebreak_10',firstServer:first},cfg||{}),p1Utr:u1,p2Utr:u2,events:[]});
const pt=(m,w)=>{ m.events.push({type:'serve_in'},{type:'point',winner:w,how:'winner'}); };
const hold=(m)=>{ const s=E.compute(m).curServer; for(let i=0;i<4;i++) pt(m,s); };
const wp=(m,blend)=>E.winProb(m,E.compute(m),{blend});

// Step 1-2: starting odds and serve numbers
let m=mk('p1',9.0,8.5); const s0=E.startingServe(m);
near('Start, UTR 9.0 vs 8.5', wp(m,false), 0.640, 0.003);
near('Alex serve-point rate', s0.pa, 0.616, 0.004);
near('Aaron serve-point rate', s0.pb, 0.584, 0.004);
// Step 3 small swings
let a=mk('p1',9.0,8.5); pt(a,'p1'); near('15-0', wp(a,false), 0.653, 0.01);
let b=mk('p1',9.0,8.5); pt(b,'p2'); near('0-15', wp(b,false), 0.619, 0.01);
// 4-4, Aaron serving, break point for Alex (Aaron serves first so he serves game 9)
let c=mk('p2',9.0,8.5); for(let g=0;g<8;g++) hold(c);
pt(c,'p1');pt(c,'p1');pt(c,'p2');pt(c,'p1');pt(c,'p2'); // Alex 3, Aaron 2 -> 30-40 server first
const stc=E.compute(c); console.log('      state:', stc.g.join('-'), stc.scoreStr, 'server', stc.curServer, 'BP', stc.flags.bp);
near('4-4 30-40 break point for Alex', wp(c,false), 0.693, 0.02);
let c1=JSON.parse(JSON.stringify(c)); pt(c1,'p1'); near('Alex converts -> 5-4', wp(c1,false), 0.781, 0.02);
let c2=JSON.parse(JSON.stringify(c)); pt(c2,'p2'); near('Aaron saves -> deuce', wp(c2,false), 0.631, 0.02);
// Step 4 blend: after 40 Alex serve points with 20 won, serve number 57.8%
{ const W=E.WP.priorWeight; near('Blend 40 pts / 20 won', (W*s0.pa+20)/(W+40), 0.578, 0.002); }
// Edge cases
near('No UTRs -> 50/50', wp(mk('p1',null,null),true), 0.5, 0.0001);
near('One UTR -> 50/50', wp(mk('p1',9,null),true), 0.5, 0.0001);
near('Gap 4.0 capped at 2.5', wp(mk('p1',12,8),false), 1/(1+Math.pow(10,-1.25)), 0.003);
for(const cfg of [{scoring:'no_ad'},{thirdSet:'full_set'},{scoring:'no_ad',thirdSet:'full_set'}]){ near('Start target holds for '+JSON.stringify(cfg), wp(mk('p1',9.0,8.5,cfg),false), 0.640, 0.003); }
// Symmetry: swap players -> 1-p
{ const x=mk('p1',9,8.5), y=mk('p2',8.5,9); near('Symmetry', wp(x,false), 1-wp(y,false), 0.002); }
// Monotonic + terminal on 300 synthetic matches
const make=require('./gen'); const ms=make(120,E); let mono=0, term=0, n=0, nan=0;
for(const mm of ms){ mm.p1Utr=8+Math.random()*3; mm.p2Utr=8+Math.random()*3;
  const ser=E.winProbSeries(mm); n+=ser.length; if(ser.some(s=>!isFinite(s.p)||s.p<0||s.p>1)) nan++;
  const st=E.compute(mm); if(st.over){ const f=E.winProb(mm,st); if(!((st.winner==='p1'&&f===1)||(st.winner==='p2'&&f===0))) term++; } }
console.log((nan?'FAIL':'PASS')+'  values always between 0 and 1 ('+n+' points)'); if(nan) fails++;
console.log((term?'FAIL':'PASS')+'  finished matches end at exactly 100% / 0%'); if(term) fails++;
// Speed: full series for a long match
const t0=Date.now(); E.winProbSeries(ms[0]); const dt=Date.now()-t0; console.log((dt<1500?'PASS':'FAIL')+'  series for '+ms[0].events.length+' events in '+dt+' ms'); if(dt>=1500) fails++;
const t1=Date.now(); for(let i=0;i<50;i++) E.winProb(ms[1],E.compute(ms[1])); const d1=(Date.now()-t1)/50; console.log((d1<20?'PASS':'FAIL')+'  one live update '+d1.toFixed(1)+' ms'); if(d1>=20) fails++;
console.log(fails? fails+' FAILED':'ALL PASS'); process.exit(fails?1:0);
