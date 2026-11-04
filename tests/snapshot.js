// node snapshot.js write|check  — locks engine + stats output for 300 synthetic matches.
const crypto=require('crypto'), fs=require('fs'), path=require('path');
const E=require('./load_engine')(); const make=require('./gen');
const matches=make(300,E);
function view(m){
  const st=E.compute(m);
  const s={sets:st.sets,setIdx:st.setIdx,g:st.g,p:st.p,tb:st.tb,mtb:st.mtb,over:st.over,winner:st.winner,disp:st.disp,cur:st.curServer,score:st.scoreStr,setsWon:st.setsWon,
    points:st.points, games:st.games, markers:st.markers.map(k=>({...k})), undo:E.undoLabel(m), flags:st.flags};
  s.stats=[null,0,1,2].map(f=>E.computeStats(m,st,f));
  return s;
}
const hashes=matches.map(m=>crypto.createHash('sha256').update(JSON.stringify(view(m))).digest('hex'));
const file=path.join(__dirname,'golden.json');
const mode=process.argv[2]||'check';
if(mode==='write'){ fs.writeFileSync(file, JSON.stringify(hashes,null,0)); console.log('wrote',hashes.length,'snapshots'); }
else { const g=JSON.parse(fs.readFileSync(file,'utf8')); const bad=hashes.map((h,i)=>h===g[i]?null:i).filter(x=>x!==null);
  console.log(bad.length? 'FAIL: '+bad.length+' matches changed: '+bad.slice(0,10).join(','): 'PASS: all '+hashes.length+' matches identical'); process.exit(bad.length?1:0); }
const st=matches.map(m=>E.compute(m)); console.log('formats:', JSON.stringify(matches.reduce((a,m)=>{const k=m.config.scoring+'/'+m.config.thirdSet;a[k]=(a[k]||0)+1;return a;},{})), 'finished:', st.filter(s=>s.over).length, 'avg events:', Math.round(matches.reduce((a,m)=>a+m.events.length,0)/matches.length));
