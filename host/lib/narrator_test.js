function apFillNarratorGapsLogic(seq, clips, params) {
  var log = [];
  var placedCount = 0;
  var pendingMogrts = [];
  var srtCache = {};
  
  var audioIdx = (params.narratorAudioTrack || 1) - 1;
  var videoIdx = (params.narratorVideoTrack || 2) - 1;

  if (audioIdx < 0 || audioIdx >= seq.audioTracks.numTracks) {
    throw new Error("Invalid Narrator Audio Track.");
  }
  if (videoIdx < 0 || videoIdx >= seq.videoTracks.numTracks) {
    throw new Error("Invalid Target Video Track.");
  }

  var aTrack = seq.audioTracks[audioIdx];
  var vTrack = seq.videoTracks[videoIdx];
  var zone = resolveZone(seq, params.zone);
  var rng = makeRng(params.extras.seed || 12345);

  log.push("Scanning track A" + (audioIdx + 1) + " for gaps in work area (" + formatShort(zone.start) + " - " + formatShort(zone.end) + ")...");

  var pool = buildClipMetas(clips, log);
  if (pool.length === 0) throw new Error("No clips with video found in bin.");

  var occupied = [];
  for (var c = 0; c < aTrack.clips.numItems; c++) {
    var clp = aTrack.clips[c];
    occupied.push({ start: timeToSeconds(clp.start), end: timeToSeconds(clp.end) });
  }
  occupied.sort(function(a, b) { return a.start - b.start; });

  var freeSpace = [{ start: zone.start, end: zone.end }];
  for (var i = 0; i < occupied.length; i++) {
    var oStart = occupied[i].start;
    var oEnd = occupied[i].end;
    var newFree = [];
    for (var j = 0; j < freeSpace.length; j++) {
      var fStart = freeSpace[j].start;
      var fEnd = freeSpace[j].end;
      if (oEnd <= fStart || oStart >= fEnd) {
        newFree.push(freeSpace[j]);
      } else {
        if (oStart > fStart) newFree.push({ start: fStart, end: oStart });
        if (oEnd < fEnd) newFree.push({ start: oEnd, end: fEnd });
      }
    }
    freeSpace = newFree;
  }

  log.push("Found " + freeSpace.length + " gap(s).");

  var minSec = 1.0;
  if (params.cut && params.cut.minSec > 0) minSec = params.cut.minSec;

  var lastItem = null;
  for (var g = 0; g < freeSpace.length; g++) {
    var gapStart = freeSpace[g].start;
    var gapEnd = freeSpace[g].end;
    
    if (gapEnd - gapStart < minSec) continue;
    
    while (gapStart < gapEnd - 0.01) {
      var attempts = 0;
      var meta = null;
      while (attempts < 50) {
        meta = pick(rng, pool);
        if (params.extras.avoidRepeat && pool.length > 1 && meta.item === lastItem) {
          attempts++;
          continue;
        }
        break;
      }
      lastItem = meta.item;

      var pieceDur = Math.min(gapEnd - gapStart, meta.duration);
      if (pieceDur < minSec) {
        break;
      }
      
      var offset = pickOffset(rng, meta.duration - pieceDur, false, 0);
      
      try {
        meta.item.setInPoint(offset, MEDIA_TYPE_ALL);
        meta.item.setOutPoint(offset + pieceDur, MEDIA_TYPE_ALL);
      } catch (eInOut) {
        log.push("Error setting In/Out: " + errorMessage(eInOut));
        break;
      }
      
      try {
        if (params.extras.scaleMode === "fitFrame") {
          try { meta.item.setScaleToFrameSize(); } catch(sE){}
        }

        vTrack.overwriteClip(meta.item, gapStart);
        clearGhosts(seq, meta, gapStart, videoIdx, -1);
        
        aTrack.overwriteClip(meta.item, gapStart);
        clearGhosts(seq, meta, gapStart, videoIdx, audioIdx);
        
        var placedClip = findClipAtStart(vTrack, gapStart, 0.05);
        if (placedClip) {
          if (params.extras.scaleMode === "fitWidth" || params.extras.scaleMode === "fitHeight") {
            applyScalingMode(seq, placedClip, meta.item, params.extras.scaleMode);
          }
          

          
          gapStart = timeToSeconds(placedClip.end);
        } else {
          gapStart += pieceDur;
        }
        
        placedCount++;
      } catch (ePlace) {
        log.push("Error placing clip: " + errorMessage(ePlace));
        break;
      }
    }
  }

  for (var p = 0; p < pool.length; p++) {
    try {
      pool[p].item.clearInPoint(MEDIA_TYPE_ALL);
      pool[p].item.clearOutPoint(MEDIA_TYPE_ALL);
    } catch (eC) {}
  }

  return {
    log: log,
    summary: {
      placed: placedCount,
      videoTracksUsed: 1,
      audioTracksUsed: 1,
      zoneFillPercent: freeSpace.length > 0 ? 100 : 0
    },
    pendingMogrts: pendingMogrts
  };
}
