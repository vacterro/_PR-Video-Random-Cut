try { var seq = app.project.activeSequence; var t = seq.videoTracks[1].clips[0]; var endT = new Time(); endT.seconds = t.start.seconds + 2; t.end = endT; alert(Success); } catch(e) { alert(e); }
