// ExtendScript target — ES3-only syntax throughout this file (no let/const/arrow/template literals).

var MEDIA_TYPE_VIDEO = 0;
var MEDIA_TYPE_AUDIO = 1;
// Used for setInPoint/setOutPoint so a clip's video+audio trim window always match.
var MEDIA_TYPE_ALL = 4;

// Park-Miller minimal-standard LCG. Only +, *, % — safe under ExtendScript's
// double-precision math (no Math.imul / true 32-bit wrap needed).
function makeRng(seed) {
  var state = Math.floor(seed) || 1;
  state = state % 2147483647;
  if (state <= 0) state += 2147483646;
  var rng = function () {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  for (var i = 0; i < 20; i++) rng();
  return rng;
}

function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

function pick(rng, arr) {
  return arr[randInt(rng, 0, arr.length - 1)];
}

function shuffle(rng, arr) {
  var copy = arr.slice(0);
  for (var i = copy.length - 1; i > 0; i--) {
    var j = randInt(rng, 0, i);
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// Premiere's DOM returns either a Time object ({seconds:...}) or a raw
// seconds number/string depending on the call — normalize both here so
// call sites never have to guess which shape they got back.
function timeToSeconds(t) {
  if (t === null || t === undefined) return 0;
  if (typeof t === "object" && t.seconds !== undefined) return Number(t.seconds);
  return parseFloat(t);
}

function formatShort(sec) {
  sec = Math.max(0, sec);
  var m = Math.floor(sec / 60);
  var s = sec - m * 60;
  var sStr = s < 10 ? "0" + s.toFixed(1) : s.toFixed(1);
  var mStr = m < 10 ? "0" + m : "" + m;
  return mStr + ":" + sStr;
}

function errorMessage(e) {
  if (!e) return "unknown error";
  var msg = e.message || String(e);
  if (e.line !== undefined) msg += " (line " + e.line + ")";
  return msg;
}
