// Simulates the iPhone keyboard (short viewport) and checks the tapped box stays on screen.
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage(); let fails=0;
 await p.goto('file://'+path.resolve(__dirname,'../www/index.html')); await p.evaluate(()=>localStorage.clear()); await p.reload();
 for(const id of ['p2name','p2utr','p1name','p1utr']){ await p.setViewportSize({width:390,height:844}); await p.evaluate(()=>window.scrollTo(0,0)); await p.tap('#'+id); await p.setViewportSize({width:390,height:450}); await p.waitForTimeout(900);
  const r=await p.evaluate(i=>{ const e=document.getElementById(i).getBoundingClientRect(); return [Math.round(e.top),Math.round(e.bottom),innerHeight]; },id);
  const ok=r[0]>=0&&r[1]<=r[2]; if(!ok) fails++; console.log((ok?'PASS':'FAIL')+`  ${id} visible with keyboard: top ${r[0]} bottom ${r[1]} of ${r[2]}`); await p.evaluate(()=>document.activeElement.blur()); }
 await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0); })();
