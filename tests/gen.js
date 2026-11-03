// Seeded synthetic matches covering every format and every event type.
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const SHOTS=['fh','bh','slice_drop','overhead','volley','serve','return'], RALLY=['short','medium','long'], HOW=['winner','forced_error','unforced_error'];
module.exports = function makeMatches(n, E){
  const out=[];
  for(let i=0;i<n;i++){
    const r=rng(1000+i*7919); for(let k=0;k<8;k++) r();
    const config={scoring: r()<.5?'ad':'no_ad', thirdSet: r()<.5?'match_tiebreak_10':'full_set', firstServer: r()<.5?'p1':'p2'};
    const m={id:'t'+i, createdAt:0, p1Name:'A', p2Name:'B', config, events:[]};
    const pAdv = (r()-.5)*.2;
    let guard=0;
    while(guard++<1400){
      const st=E.compute(m); if(st.over) break;
      const x=r();
      if(x<.03){ m.events.push({type:'let'}); continue; }
      if(x<.045){ m.events.push({type:'replay'}); continue; }
      if(x<.06){ m.events.push({type:'note', text:'n'+guard, ts:guard}); continue; }
      if(x<.066 && !st.inTiebreak){ const pts=['0','15','30','40']; m.events.push({type:'fix_score', unsure:r()<.5, games:[Math.floor(r()*6),Math.floor(r()*6)], points:[pts[Math.floor(r()*4)],pts[Math.floor(r()*4)]], server:r()<.5?'p1':'p2'}); continue; }
      if(x<.069){ m.events.push({type:'server_swap'}); continue; }
      if(x<.075 && m.events.length>3){ m.events.splice(Math.floor(r()*m.events.length),1); continue; }
      if(st.awaiting){
        const srv=st.curServer; const pSrv=.6+(srv==='p1'?pAdv:-pAdv);
        const w = r()<pSrv ? srv : (srv==='p1'?'p2':'p1');
        m.events.push({type:'point', winner:w, how:HOW[Math.floor(r()*3)]});
        if(r()<.7) m.events.push({type:'shot', shot:SHOTS[Math.floor(r()*SHOTS.length)]});
        if(r()<.6) m.events.push({type:'rally', rally:RALLY[Math.floor(r()*3)]});
      } else {
        m.events.push({type: r()<(st.serveNum===1?.35:.1) ? 'serve_fault':'serve_in'});
      }
    }
    if(r()<.15) m.ended=true;
    out.push(m);
  }
  return out;
};
