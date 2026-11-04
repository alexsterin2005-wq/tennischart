// Renders the setup screen in candidate display fonts (preview only, not part of the app).
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const SP='/tmp/claude-0/-home-claude/4a0b0a2c-75e0-56c3-8650-556c75370853/scratchpad'; const FD=SP+'/fonts/node_modules/@fontsource/'; const OUT=SP+'/fontpick';
const L=[['0 Barlow Condensed (now)',null],['1 Bebas Neue','bebas-neue',400],['2 Anton','anton',400],['3 Oswald','oswald',700],['4 Teko','teko',600],['5 Saira Condensed','saira-condensed',800],['6 Big Shoulders','big-shoulders-display',800],['7 Chakra Petch','chakra-petch',700],['8 Russo One','russo-one',400],['9 Kanit','kanit',800],['10 Unbounded','unbounded',800]];
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}); const p=await ctx.newPage();
 await p.goto('file://'+path.resolve(__dirname,'../www/index.html')); await p.evaluate(()=>localStorage.clear()); 
 for(const [lab,pkg,w] of L){ await p.reload(); await p.fill('#p2name','Aaron Sandler'); await p.fill('#p2utr','10.25'); await p.fill('#p1name','Alexander'); await p.fill('#p1utr','10.65'); await p.evaluate(()=>document.activeElement.blur());
  if(pkg){ const f=FD+pkg+'/files/'+pkg+'-latin-'+w+'-normal.woff2'; const b64=fs.readFileSync(f).toString('base64');
   await p.addStyleTag({content:`@font-face{font-family:"Pick";font-weight:100 900;src:url(data:font/woff2;base64,${b64}) format("woff2")} :root{--display:"Pick",Impact,sans-serif}`}); }
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(250);
  await p.screenshot({path:`${OUT}/${lab.split(' ')[0].padStart(2,'0')}.png`}); }
 await b.close(); })();
