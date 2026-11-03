// Loads the pure engine section straight out of www/index.html so tests run the real shipped code.
const fs = require('fs'), path = require('path');
module.exports = function loadEngine(file) {
  const src = fs.readFileSync(file || path.join(__dirname, '..', 'www', 'index.html'), 'utf8');
  const a = src.indexOf('/* ================= ENGINE'), b = src.indexOf('/* ================= APP STATE');
  if (a < 0 || b < 0) throw new Error('engine markers not found');
  let extra = '';
  const c = src.indexOf('/* ================= WINPROB'), d = src.indexOf('/* ================= END WINPROB');
  if (c >= 0 && d >= 0) extra = src.slice(c, d);
  const body = src.slice(a, b) + '\n' + extra + '\nreturn {compute, undoLabel, computeStats' + (extra ? ', WP, winProb, startingServe, winProbSeries' : '') + '};';
  return new Function(body)();
};
