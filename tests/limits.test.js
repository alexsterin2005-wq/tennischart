// Checks name and UTR field limits on the setup screen.
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); let fails=0;
 await p.goto('file://'+path.resolve(__dirname,'../www/index.html')); await p.evaluate(()=>localStorage.clear()); await p.reload();
 const t=async(sel,typed,want)=>{ await p.fill(sel,''); await p.type(sel,typed); const v=await p.inputValue(sel); const ok=v===want; if(!ok) fails++; console.log((ok?'PASS':'FAIL')+`  ${sel} "${typed}" -> "${v}" (want "${want}")`); };
 await t('#p1utr','10.6578','10.65'); await t('#p1utr','abc12.3.4','12.34'); await t('#p1utr','17','16.5'); await t('#p1utr','9,5','9.5'); await t('#p1utr','123','12');
 await t('#p1name','A'.repeat(60),'A'.repeat(50));
 await p.fill('#p1name','Alex'); await p.fill('#p2name','Bo'); await p.fill('#p1utr','10.65'); await p.fill('#p2utr','10.25'); await p.click('#btn-start'); await p.click('#sf-p1'); await p.waitForTimeout(300);
 const st=await p.evaluate(()=>[match.p1Utr,match.p2Utr]); const ok=st[0]===10.65&&st[1]===10.25; if(!ok) fails++; console.log((ok?'PASS':'FAIL')+'  saved UTRs '+st.join(', '));
 await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0); })();
