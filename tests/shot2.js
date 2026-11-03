const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const OUT='/tmp/claude-0/-home-claude/4a0b0a2c-75e0-56c3-8650-556c75370853/scratchpad/redesign'; const URL='file://'+path.resolve(__dirname,'../www/index.html');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage();
 await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload();
 await p.fill('#p2name','Aaron Sandler'); await p.fill('#p1name','Alexander'); await p.screenshot({path:OUT+'/x_setup_noutr.png'});
 await p.click('#btn-start'); await p.waitForTimeout(300); await p.click('#sf-p1'); await p.waitForTimeout(300); await p.click('#sv-in'); await p.waitForTimeout(400);
 await p.screenshot({path:OUT+'/x_who_noutr.png'});
 const d=await p.evaluate(async()=>{ const c=await reportImage(); return c.toDataURL('image/png'); }); fs.writeFileSync(OUT+'/x_report.png',Buffer.from(d.split(',')[1],'base64'));
 await b.close(); })();
