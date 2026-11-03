// Click-through of the real app in a headless iPhone-sized browser. Fails on any page error.
const { chromium } = require('playwright'); const fs=require('fs');
const OUT=process.argv[2]||'/tmp/claude-0/-home-claude/4a0b0a2c-75e0-56c3-8650-556c75370853/scratchpad/odds';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const html=fs.readFileSync(__dirname+'/../www/index.html','utf8').replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/,'');
  const browser=await chromium.launch(); const errors=[];
  for(const theme of ['broadcast','sun']){
    const ctx=await browser.newContext({viewport:{width:375,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true,colorScheme:'dark'});
    const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(theme+': '+e.message));
    await page.setContent(html,{waitUntil:'load'});
    if(theme==='sun') await page.click('#btn-sun-setup');
    const C=async s=>{ await page.click(s); await page.waitForTimeout(270); };
    await page.fill('#p2name','Aaron'); await page.fill('#p2utr','8.5'); await page.fill('#p1name','Alexander'); await page.fill('#p1utr','9.0');
    await page.screenshot({path:`${OUT}/${theme}_1_setup.png`});
    await C('#btn-start'); await C('#sf-p1');
    const odds=async()=>[await page.textContent('#b-o1'), await page.textContent('#b-o2')];
    await page.waitForTimeout(500); const start=await odds();
    const pt=async(w,how)=>{ await C('#sv-in'); await C(w); await C(how); let ch=await page.$$('#chips button'); if(ch.length){ await ch[ch.length-1].click(); await page.waitForTimeout(270);} ch=await page.$$('#chips button'); if(ch.length){ await ch[ch.length-1].click(); await page.waitForTimeout(270);} };
    for(let g=0;g<4;g++){ for(let i=0;i<4;i++) await pt(g%2?'#w-p2':'#w-p1','#h-winner'); }
    await pt('#w-p2','#h-ue'); await pt('#w-p2','#h-ue'); await pt('#w-p2','#h-ue');
    await page.waitForTimeout(600);
    const mid=await odds(); const cls=[await page.getAttribute('#b-o1','class'), await page.getAttribute('#b-o2','class')];
    await page.screenshot({path:`${OUT}/${theme}_2_live.png`});
    // undo restores odds
    await C('#btn-undo'); await page.waitForTimeout(600); const afterUndo=await odds();
    console.log(theme, 'start', start.join(' / '), '| 2-2 0-40', mid.join(' / '), cls.join(','), '| after undo', afterUndo.join(' / '));
    // turn odds off mid-match via stats -> back is not needed; check off pref on new context
    await ctx.close();
  }
  // odds off: pills hidden
  { const ctx=await browser.newContext({viewport:{width:375,height:740}}); const page=await ctx.newPage(); page.on('pageerror',e=>errors.push('off: '+e.message));
    await page.setContent(html,{waitUntil:'load'}); await page.click('#f-oddsoff'); await page.fill('#p1name','A'); await page.fill('#p2name','B'); await page.click('#btn-start'); await page.click('#sf-p1');
    console.log('odds off -> hidden:', await page.isHidden('#b-o1'), await page.isHidden('#b-o2')); await ctx.close(); }
  // no UTR: 50/50
  { const ctx=await browser.newContext({viewport:{width:375,height:740}}); const page=await ctx.newPage();
    await page.setContent(html,{waitUntil:'load'}); await page.fill('#p1name','A'); await page.fill('#p2name','B'); await page.click('#btn-start'); await page.click('#sf-p2');
    console.log('no UTR start:', await page.textContent('#b-o1'), await page.textContent('#b-o2')); await ctx.close(); }
  await browser.close();
  console.log(errors.length? 'PAGE ERRORS:\n'+errors.join('\n') : 'no page errors'); process.exit(errors.length?1:0);
})();
