// srt.jsx - Parses .srt files into JSON objects

function parseSrt(filePath, log) {
  var file = new File(filePath);
  if (!file.exists) {
    if (log) log.push("SRT file not found: " + filePath);
    return null;
  }
  
  if (!file.open("r")) {
    if (log) log.push("Could not open SRT file: " + filePath);
    return null;
  }

  var content = file.read();
  file.close();

  // Normalize line endings
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var blocks = content.split(/\n\n+/);
  
  var subtitles = [];
  
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (!block || block.replace(/\s/g, "").length === 0) continue;
    
    var lines = block.split("\n");
    if (lines.length >= 3) {
      // Line 0 is index, Line 1 is timestamp, Line 2+ is text
      var timeLine = lines[1];
      var timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatch) {
        var startSec = parseInt(timeMatch[1], 10) * 3600 +
                       parseInt(timeMatch[2], 10) * 60 +
                       parseInt(timeMatch[3], 10) +
                       parseInt(timeMatch[4], 10) / 1000;
                       
        var endSec = parseInt(timeMatch[5], 10) * 3600 +
                     parseInt(timeMatch[6], 10) * 60 +
                     parseInt(timeMatch[7], 10) +
                     parseInt(timeMatch[8], 10) / 1000;
                     
        var textLines = [];
        for (var j = 2; j < lines.length; j++) {
          if (lines[j].replace(/\s/g, "").length > 0) {
            textLines.push(lines[j]);
          }
        }
        
        subtitles.push({
          start: startSec,
          end: endSec,
          text: textLines.join("\n")
        });
      }
    }
  }
  
  if (log) log.push("Parsed " + subtitles.length + " subtitles from " + file.name);
  return subtitles;
}
