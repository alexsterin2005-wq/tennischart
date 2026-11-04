// Captioned App Store frames from raw screens. Usage: node compose.js <rawdir> <outdir> <W> <H>
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const [RAW,OUT,W,H]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5]]; fs.mkdirSync(OUT,{recursive:true});
const F=n=>'data:font/woff2;base64,'+fs.readFileSync(path.resolve(__dirname,'../www/fonts/'+n)).toString('base64');
const img=n=>'data:image/png;base64,'+fs.readFileSync(RAW+'/'+n).toString('base64');
const ipad=W>1500;
const frames=[
 ['01','live.png','Live win chance','Updates after every point. Green leads, red trails.'],
 ['02','who.png','Three taps a point','Serve in or fault. Who won. How. Big buttons, made for the sideline.'],
 ['03','stats.png','Pro-level stats','First serve %, break points, winners and errors, by set.'],
 ['04','report.png','Text it to the coach','One tap turns the match into a clean stat sheet image.'],
 ['05','setup.png','Free. No account.','Nothing leaves your phone. Add UTRs for odds, or skip them.'],
 ['06','live_sun.png','Sun mode','High-contrast mode for bright courts.'],
];
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:1})).newPage();
 for(const [n,file,head,sub] of frames){ if(ipad && (file==='report.png')) continue;
  const isReport=file==='report.png';
  const html=`<!doctype html><html><head><style>
  @font-face{font-family:D;font-weight:800;src:url(${F('barlow-condensed-latin-800-normal.woff2')})}
  @font-face{font-family:B;font-weight:500;src:url(${F('barlow-latin-500-normal.woff2')})}
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:radial-gradient(120% 60% at 50% 0%,#2a1608 0%,#0D0F12 55%);color:#F5F6F8}
  .t{position:absolute;top:${ipad?110:150}px;left:0;right:0;text-align:center;padding:0 80px}
  h1{font:italic 800 ${ipad?150:150}px/0.95 D;text-transform:uppercase;margin:0;letter-spacing:.01em}
  h1 span{color:#FF6B1A}
  p{font:500 ${ipad?50:54}px/1.25 B;color:#C9CED6;margin:28px auto 0;max-width:${ipad?1500:1080}px}
  .ph{position:absolute;left:50%;transform:translateX(-50%);top:${ipad?520:600}px;width:${ipad?1500:1040}px;border-radius:${ipad?40:64}px;overflow:hidden;box-shadow:0 0 0 3px rgba(255,107,26,.5),0 40px 120px rgba(255,107,26,.25),0 30px 80px rgba(0,0,0,.6);background:#0D0F12}
  .ph img{display:block;width:100%}
  .stripe{position:absolute;left:0;right:0;top:0;height:14px;background:#FF6B1A}
  </style></head><body><div class="stripe"></div><div class="t"><h1>${head.replace(/^(\S+)/,'<span>$1</span>')}</h1><p>${sub}</p></div>
  <div class="ph"${isReport?' style="border-radius:28px"':''}><img src="${img(file)}"></div></body></html>`;
  await p.setContent(html); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({path:`${OUT}/${n}.png`}); }
 await b.close(); })();
