// Visual screenshots of every main screen, loaded from disk so bundled fonts render.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const OUT=process.argv[2]||'/tmp/claude-0/-home-claude/4a0b0a2c-75e0-56c3-8650-556c75370853/scratchpad/redesign'; fs.mkdirSync(OUT,{recursive:true});
const URL='file://'+path.resolve(__dirname,'../www/index.html');
(async()=>{ const b=await chromium.launch(); const errs=[];
 for(const theme of ['broadcast','sun']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.evaluate(()=>document.fonts.ready);
  if(theme==='sun') await p.click('#btn-sun-setup');
  const C=async s=>{ await p.click(s); await p.waitForTimeout(280); };
  await p.fill('#p2name','Aaron Sandler'); await p.fill('#p2utr','10.25'); await p.fill('#p1name','Alexander'); await p.fill('#p1utr','10.65');
  await p.screenshot({path:`${OUT}/${theme}_1_setup.png`});
  await C('#btn-start'); await p.screenshot({path:`${OUT}/${theme}_2_whoserves.png`}); await C('#sf-p1');
  const pt=async(w,how)=>{ await C('#sv-in'); await C(w); await C(how); for(let k=0;k<2;k++){ const ch=await p.$$('#chips button'); if(ch.length){ await ch[ch.length-1].click(); await p.waitForTimeout(280);} } };
  for(let g=0;g<3;g++) for(let i=0;i<4;i++) await pt('#w-p1','#h-winner');
  await pt('#w-p2','#h-ue'); await pt('#w-p2','#h-ue'); await pt('#w-p2','#h-ue');
  await p.waitForTimeout(1500); await p.screenshot({path:`${OUT}/${theme}_3_live_serve.png`});
  await C('#sv-in'); await p.screenshot({path:`${OUT}/${theme}_4_who.png`});
  await C('#w-p1'); await p.screenshot({path:`${OUT}/${theme}_5_how.png`});
  await C('#h-winner'); await p.screenshot({path:`${OUT}/${theme}_6_shot.png`});
  await C('#btn-end'); await p.waitForTimeout(400); await p.screenshot({path:`${OUT}/${theme}_7_stats.png`,fullPage:false});
  await ctx.close(); }
 await b.close(); console.log(errs.length?'ERRORS '+errs.join('\n'):'no page errors'); })();
