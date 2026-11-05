const { chromium } = require('playwright'); const path=require('path'); const OUT='/tmp/claude-0/-home-claude/4a0b0a2c-75e0-56c3-8650-556c75370853/scratchpad/mock';
(async()=>{ const b=await chromium.launch(); const errs=[];
 for(const [w,h,n1,n2] of [[402,874,'My Player','Opponent'],[320,568,'Ethan Park','Lucas Moreno'],[375,667,'Ethan Park','Lucas Moreno'],[390,844,'Maximilian Alexander Rodriguez-Hernandez','Christopher Jonathan Montgomery III'],[430,932,'Ava','Jo']]){
 const p=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../www/index.html')); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.evaluate(()=>document.fonts.ready);
 await p.fill('#p2name',n2); await p.fill('#p1name',n1); await p.click('#btn-start'); await p.waitForTimeout(300); await p.click(n1==='My Player'?'#sf-p1':'#sf-p2'); await p.waitForTimeout(300);
 await p.click('#sv-in'); await p.waitForTimeout(400); await p.screenshot({path:`${OUT}/s_${w}.png`}); }
 await b.close(); console.log(errs.length?errs:'no page errors'); })();
