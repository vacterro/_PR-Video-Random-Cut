var seq = app.project.activeSequence;
var srtPath = "v:\\___VAC\\_PROJ\\_PR\\machine_asylum\\_input\\Where My Dogs At\\Where My Dogs at？ Last Ashton Hero Part 2 Tom Cruise Bruce Willis Kutcher.ru.srt";
app.project.importFiles([srtPath], false, app.project.getInsertionBin(), false);

// find it
var srtItem = null;
for(var i=0; i<app.project.rootItem.children.numItems; i++) {
  var child = app.project.rootItem.children[i];
  if(child.name.indexOf(".srt") !== -1) {
    srtItem = child;
    break;
  }
}

if(srtItem) {
  try {
    seq.videoTracks[0].insertClip(srtItem, 0);
    $$._PPP_.evalScriptLog = "Inserted SRT!";
  } catch(e) {
    $$._PPP_.evalScriptLog = "Failed to insert: " + e.toString();
  }
} else {
  $$._PPP_.evalScriptLog = "SRT not found after import.";
}
