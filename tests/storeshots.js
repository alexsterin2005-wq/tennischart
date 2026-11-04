// Raw App Store screens from the real app with a realistic scripted match. Usage: node storeshots.js <outdir> <w> <h> <dpr>
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const [OUT,W,H,DPR]=[process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5]]; fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:DPR,isMobile:W<700,hasTouch:true})).newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve(__dirname,'../www/index.html')); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.evaluate(()=>document.fonts.ready);
 await p.fill('#p2name','Lucas Moreno'); await p.fill('#p2utr','10.25'); await p.fill('#p1name','Ethan Park'); await p.fill('#p1utr','10.65'); await p.evaluate(()=>document.activeElement.blur());
 await p.screenshot({path:OUT+'/setup.png'});
 await p.click('#btn-start'); await p.waitForTimeout(300); await p.click('#sf-p1'); await p.waitForTimeout(300);
 // scripted match: Ethan wins set 1 6-4, set 2 at 4-4, Lucas serving 30-40 (break point Ethan)
 await p.evaluate(()=>{
  let seed=7; const r=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const SH=['fh','bh','fh','bh','volley','slice_drop','overhead'], RL=['short','short','medium','long'];
  const ev=e=>{ e.id=Math.random().toString(36).slice(2); e.ts=Date.now(); match.events.push(e); };
  const point=(w)=>{ const st=compute(match); const s=st.curServer;
    if(r()<0.38){ ev({type:'serve_fault'}); }
    if(r()<0.06 && w!==s && compute(match).serveNum===2){ ev({type:'serve_fault'}); return; } // double fault
    ev({type:'serve_in'}); const u=r(); const how=u<0.3?'winner':u<0.55?'forced_error':'unforced_error';
    ev({type:'point',winner:w,how});
    const hitter= how==='winner'?w:(w==='p1'?'p2':'p1');
    if(how==='winner' && hitter===s && r()<0.25) { ev({type:'shot',shot:'serve'}); ev({type:'rally',rally:'short'}); return; }
    ev({type:'shot',shot:SH[Math.floor(r()*SH.length)]}); ev({type:'rally',rally:RL[Math.floor(r()*RL.length)]}); };
  const game=(winner,score)=>{ const loser=winner==='p1'?'p2':'p1'; const key=()=>{const t=compute(match); return t.sets.length+':'+t.g.join('-');}; const k0=key(); let lost=0, n=0;
    while(key()===k0 && n++<30){ const t=compute(match); const lp=t.disp; const wi=winner==='p1'?0:1; const lpts=['0','15','30','40','AD']; const wv=lpts.indexOf(lp[wi]), lv=lpts.indexOf(lp[1-wi]);
      const giveLoser = lost<score[1] && !(lv>=2 && wv<=lv) && r()<0.5; if(giveLoser){ lost++; point(loser); } else point(winner); } };
  // set 1: games alternate server starting p1; Ethan breaks once -> 6-4
  const s1=[['p1',[4,1]],['p2',[4,2]],['p1',[4,2]],['p1',[4,2]],['p2',[4,0]],['p1',[4,1]],['p2',[4,2]],['p1',[4,2]],['p2',[4,1]],['p1',[4,2]]];
  for(const [w,sc] of s1){ game(w,sc);  }
  const s2=[['p2',[4,2]],['p1',[4,1]],['p2',[4,0]],['p1',[4,2]],['p1',[4,2]],['p2',[4,2]],['p2',[4,1]],['p1',[4,2]]];
  for(const [w,sc] of s2){ game(w,sc);  }
  // now game 9 of set 2: build 30-40 for returner
  const st=compute(match); const sv=st.curServer, rt=sv==='p1'?'p2':'p1';
  point(sv); point(rt); point(rt); point(sv); point(rt);
  save(); ui.step='serve'; render(); });
 await p.waitForTimeout(900); const st=await p.evaluate(()=>{ const s=compute(match); return [s.sets.map(x=>x.games.join('-')).join(' '), s.g.join('-'), s.disp.join('-'), s.curServer, JSON.stringify(s.flags)]; }); console.log('state',st.join(' | '));
 await p.screenshot({path:OUT+'/live.png'});
 await p.click('#sv-in'); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/who.png'});
 await p.click('#w-p1'); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/how.png'});
 await p.click('#h-back'); await p.waitForTimeout(300);
 await p.click('#btn-end'); await p.waitForTimeout(500); await p.screenshot({path:OUT+'/stats.png'});
 await p.evaluate(()=>document.querySelector('#summary').scrollTo(0,520)); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/stats2.png'});
 const d=await p.evaluate(async()=>(await reportImage()).toDataURL('image/png')); fs.writeFileSync(OUT+'/report.png',Buffer.from(d.split(',')[1],'base64'));
 // sun mode live
 await p.click('#back-live'); await p.waitForTimeout(300); await p.click('#btn-sun'); await p.waitForTimeout(2200); await p.screenshot({path:OUT+'/live_sun.png'}); await p.click('#btn-sun');
 // privacy sheet
 await p.evaluate(()=>{ localStorage.removeItem('mc_match'); }); await p.reload(); await p.waitForTimeout(300); await p.click('#btn-privacy'); await p.waitForTimeout(300); await p.screenshot({path:OUT+'/privacy.png'});
 await b.close(); console.log(errs.length?'ERR '+errs.join(';'):'no page errors'); })();
