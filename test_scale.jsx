var seq = app.project.activeSequence;
var item = seq.videoTracks[0].clips[0];
var motion = item.components[1];
var log = [];
for(var i=0; i<motion.properties.numItems; i++){
  log.push(motion.properties[i].displayName);
}
alert(log.join(", "));
