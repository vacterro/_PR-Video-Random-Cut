var AP_I18N = (function () {
  var DICTS = {
    en: {
      "app.title": "_PR Video Random Cut",
      "app.subtitle": "Lore Randomizer",
      "app.versionLine": "_PR Video Random Cut v0.0.1",
      "tabs.main": "Randomizer",
      "tabs.help": "Help",
      "source.noSequence.warning": "No active sequence — open a sequence in Premiere and click Refresh.",
      "run.noCepBridge": "Not connected to Premiere — open this panel via Window > Extensions inside Premiere Pro.",

      "run.button": "Randomize & Place",
      "run.hint": "Cuts random pieces from the source bin and lays them out in the target zone using every setting below. Use as your main 'do it' button.",
      "replace.button": "Replace Selected",
      "replace.hint": "Select clip(s) in the timeline first. Each selected clip is swapped for a different random source piece with EXACTLY the same length and position — the layout stays, only the content rerolls. Use when one specific piece doesn't fit and you don't want to redo the whole zone.",
      "replace.summary": "Replaced {count} clip(s) — same spots, new content.",
      "narrator.button": "Fill Narrator Gaps",
      "narrator.button.hint": "Scans the narrator audio track for silent pauses and fills each pause with B-roll cut to fit it exactly. Use for voiceover videos: your voice stays clear, footage covers the gaps.",
      "narrator.pullSubtitles.label": "Pull subtitles (.srt)",
      "narrator.pullSubtitles.hint": "If an .srt file of the exact same name sits next to the chosen video, extract matching lines and place them as Text (MOGRT) on the track above.",

      "source.title": "1. Source",
      "source.bin.label": "Bin",
      "source.bin.hint": "Where footage is pulled from. Any bin works; one named 'Content' is pre-selected if found. The number is how many clips are inside.",
      "source.refresh.button": "↻",
      "source.refresh.hint": "Re-reads bins, tracks and markers from Premiere. Click after adding footage or changing the timeline.",
      "source.weights.button": "⚖",
      "source.weights.hint": "Adjust individual video frequencies/weights for the selected bin.",
      "weights.title": "Clip Weights & Limits",
      "weights.desc": "Increase a clip's weight to make it appear more often. Weight 2.0 means it is picked twice as often as 1.0. A clip will be ignored when 100% of its footage is used.",
      "weights.reset": "Reset All",
      "weights.close": "Done",
      "source.recursive.label": "Include sub-bins",
      "source.recursive.hint": "Also use clips from folders nested inside the chosen bin. Leave on unless you deliberately keep unwanted footage in subfolders.",
      "source.bin.optionNone": "No bins found",

      "zone.title": "2. Where to place",
      "zone.hint": "Work area: between the timeline's In/Out points — best day-to-day choice. Named markers: between two markers with the name below — good for permanent zones you reuse. Whole sequence: from 00:00 to the last clip — quick but fills everything.",
      "zone.workarea.label": "Work area (In/Out bar)",
      "zone.markers.label": "Between named markers",
      "zone.sequence.label": "Whole sequence",
      "zone.markerName.label": "Marker name",
      "zone.markerName.hint": "Must match the marker's name exactly, including capital letters.",

      "cut.title": "3. How to cut",
      "cut.hint": "Random sub-clip: grabs a random moment from inside each source — THE choice for long episodes/movies. Whole clip: uses clips in full, trimming only if too long — for bins of short pre-cut clips. Mixed: coin-flips between the two per piece.",
      "cut.subclip.label": "Random sub-clip",
      "cut.whole.label": "Whole clip (trim if long)",
      "cut.mixed.label": "Mixed (random per clip)",
      "cut.minSec.label": "Min (sec)",
      "cut.maxSec.label": "Max (sec)",
      "cut.range.hint": "Every placed piece is between these lengths. 1-3s feels frantic, 3-7s is a comfortable review pace, 10s+ is calm.",
      "cut.wholeMode.label": "Trim long clips",
      "cut.wholeMode.integerRange": "Random whole seconds from range",
      "cut.wholeMode.maxOnly": "Exactly max length",
      "cut.wholeMode.floatRange": "Random length from range",
      "cut.wholeMode.hint": "What happens when a clip is longer than Max. Whole seconds: random tidy lengths like 3s, 4s. Exactly max: every long clip becomes exactly Max — uniform rhythm. Random length: any value in range, like 3.4s — most natural.",

      "fill.title": "4. How much to place",
      "fill.hint": "Fill whole zone: pack until nothing else fits — default. Percentage: stop at the coverage you set below — leave breathing room on purpose. Fixed number: exactly N pieces — predictable. One per clip: each source contributes once — quick overview of everything in the bin.",
      "fill.zone.label": "Fill whole zone",
      "fill.percent.label": "Fill zone to a percentage",
      "fill.count.label": "Fixed number of pieces",
      "fill.onepass.label": "One piece per bin clip",
      "fill.percentValue.label": "Target fill",
      "fill.countValue.label": "Piece count",

      "audio.title": "5. Audio of placed clips",
      "audio.hint": "All on/off: one switch for every piece — off is right when footage goes over a narrator. Random chance: some pieces bring their sound, per the % below — lively chaos. Place muted: audio clips are laid down but silenced — unmute individual ones later by hand.",
      "audio.global.label": "All on / all off",
      "audio.randomize.label": "Random chance per piece",
      "audio.mutedlink.label": "Place always, but muted",
      "audio.includeGlobal.label": "Include audio",
      "audio.includeGlobal.hint": "Checked: every piece keeps its sound. Unchecked: video only — nothing lands on audio tracks.",
      "audio.probability.label": "Chance",

      "tracks.title": "6. Tracks",
      "tracks.conflict.title": "If zone has content",
      "tracks.conflict.hint": "Keep: existing clips in the zone are untouched, new pieces squeeze into gaps — safe for topping up. Replace: the zone on target tracks is cleared first and filled fresh — use to redo a layout from scratch.",
      "tracks.conflict.keep.label": "Keep it — use empty space only",
      "tracks.conflict.replace.label": "Replace it — clear and refill",
      "tracks.playbackOverlap.title": "Filling strategy",
      "tracks.playbackOverlap.hint": "One at a time: across ALL chosen tracks only one piece plays at any moment — nothing hides behind anything; tracks are just visual variety. Every track 100%: each track is packed independently, clips stack and upper tracks cover lower ones — the dense multi-track collage look.",
      "tracks.playbackOverlap.none.label": "One clip at a time (no overlap)",
      "tracks.playbackOverlap.stack.label": "Every track filled to 100%",
      "tracks.packing.title": "Spacing",
      "tracks.packing.hint": "Scattered: pieces land at random spots with natural gaps between them. Packed: pieces chain edge-to-edge with zero dead air — continuous wall of footage.",
      "tracks.packing.scattered.label": "Scattered — random gaps",
      "tracks.packing.packed.label": "Packed — back-to-back",
      "tracks.video.title": "Video tracks",
      "tracks.audio.title": "Audio tracks",
      "tracks.autoCount.label": "Use",
      "tracks.ignore.label": "Skip",
      "tracks.videoCount.hint": "Use: how many video tracks to place onto (missing ones are created). Skip: track numbers to never touch, e.g. '1' protects V1 where your main content lives.",
      "tracks.audioCount.hint": "Same as video: how many audio tracks to use, and which numbers to never touch — e.g. '1' protects A1 with your narrator's voice.",

      "extras.title": "7. Extras",
      "extras.seed.label": "Seed",
      "extras.seed.hint": "The randomness number. Same seed + same settings = identical layout, so you can reproduce a result you liked. Any change to it gives a new layout.",
      "extras.reroll.button": "Reroll All",
      "extras.reroll.hint": "New seed + clears the zone + places a fresh layout in one click. Use when the whole result should be redone. (For redoing just one clip, select it and use 'Replace Selected' at the top.)",
      "extras.autoSeed.label": "New seed on every run",
      "extras.autoSeed.hint": "Each run rolls a fresh seed automatically — every run looks different. Turn OFF if you're tweaking settings and want the layout to stay comparable between runs.",
      "extras.avoidRepeat.label": "Cooldown: N clips before repeating source",
      "extras.avoidRepeat.hint": "How many other clips must play before the same source file can be picked again. Set to '1' to just prevent back-to-back repeats. Set higher (e.g. 5) to spread out footage from the same file so it doesn't feel repetitive. (0 = off)",
      "extras.avoidDuplicateSegments.label": "Never reuse the exact same moments",
      "extras.avoidDuplicateSegments.hint": "The engine remembers exactly which seconds of a source file it has already used, and will slice fresh, unseen moments for you instead of showing the same joke/scene twice.",
      "extras.segmentPadding.label": "Padding between uses (sec)",
      "extras.segmentPadding.hint": "When pulling a new clip from a previously used file, this forces the engine to jump at least X seconds away from the old part. E.g. '5' ensures the new clip doesn't look like an accidental continuation of the old one.",
      "extras.addMarkers.label": "Marker with source name per piece",
      "extras.addMarkers.hint": "Drops a timeline marker at each piece's start named after its source clip — handy for finding where footage came from while reviewing.",
      "extras.minGap.label": "Min gap (sec)",
      "extras.minGap.hint": "Guaranteed empty space between neighbouring pieces (Scattered mode). 0 = pieces may touch. Ignored in Packed mode, which is gapless by definition.",
      "extras.scaleMode.label": "Scaling",
      "extras.scaleMode.hint": "How each placed piece is sized to your sequence. Fit to frame: same as Premiere's 'Scale to Frame Size' — right when sources have mixed resolutions. Fit height/width: fills that dimension, may crop the other. No scaling: pixels placed 1:1.",
      "extras.scaleMode.fitFrame": "Fit to frame (default)",
      "extras.scaleMode.fitHeight": "Fit to height",
      "extras.scaleMode.fitWidth": "Fit to width",
      "extras.scaleMode.none": "No scaling (100%)",

      "narrator.title": "8. Narrator Gaps",
      "narrator.desc": "Fills the silent pauses on a chosen audio track with B-roll cut to fit each pause exactly. Run it with the teal button at the top.",
      "narrator.audioTrack.label": "Voice on A#",
      "narrator.videoTrack.label": "B-roll to V#",
      "narrator.tracks.hint": "Voice on A#: the audio track with the narrator — its silences become the slots to fill. B-roll to V#: the video track that receives the filler footage.",
      "narrator.source.label": "Fill from",
      "narrator.source.all": "All bin clips (random)",
      "narrator.source.hint": "Which footage fills the gaps. 'All bin clips' picks randomly across the whole bin. Pick one specific video to fill every gap from just that clip — e.g. one long episode chopped to fit the pauses.",

      "run.running": "Working…",
      "run.summary": "Placed {count} pieces — {video} video / {audio} audio tracks used, zone {pct}% filled",
      "run.error.prefix": "Error: ",
      "run.validate.noTrack": "Pick at least one track to use.",
      "run.validate.minMax": "Min length can't be greater than max length.",

      "help.title": "How this works",
      "help.intro": "Pick a bin of footage, mark a zone on your timeline, hit Randomize. The tool cuts random pieces from the bin and scatters them across your chosen tracks.",
      "help.step1": "Put your footage in a bin (e.g. \"Content\") in this project, then pick it in Source.",
      "help.step2": "Set a work area (In/Out) on the sequence you want to fill.",
      "help.step3": "Hover any \"?\" — every control explains what it does and when to use it.",
      "help.step4": "Click Refresh after adding clips, tracks, or markers so the panel sees them.",
      "help.step5": "Click \"Randomize & Place\". Don't like it? \"Reroll All\" redoes everything.",
      "help.step6": "One piece bothers you? Select it in the timeline and click \"Replace Selected\" — same spot, same length, new content.",
      "help.step7": "Voiceover workflow: set your voice track in section 8, then \"Fill Narrator Gaps\" covers only the silent pauses.",
      "help.step8": "Click a section title to collapse it once configured — settings still apply.",
      "help.undoTitle": "Undo",
      "help.undo": "Every run is one undo step — Ctrl+Z reverts the whole thing like any other edit.",
      "help.troubleTitle": "If something goes red",
      "help.trackFail": "If track auto-create fails on your Premiere version, add the tracks manually in the timeline and run again."
    },
    ru: {
      "app.title": "_PR Video Random Cut",
      "app.subtitle": "Рандомайзер отснятого",
      "app.versionLine": "_PR Video Random Cut v0.0.1",
      "tabs.main": "Рандомайзер",
      "tabs.help": "Справка",
      "source.noSequence.warning": "Нет активной секвенции — откройте секвенцию в Premiere и нажмите «Обновить».",
      "run.noCepBridge": "Нет связи с Premiere — откройте панель через Window > Extensions внутри Premiere Pro.",

      "run.button": "Рандомизировать и разместить",
      "run.hint": "Режет случайные куски из бина-источника и раскладывает их в целевой зоне по всем настройкам ниже. Это основная кнопка «сделай».",
      "replace.button": "Заменить выделенное",
      "replace.hint": "Сначала выделите клип(ы) на таймлайне. Каждый выделенный клип заменяется другим случайным куском ТОЧНО той же длины на том же месте — раскладка не меняется, меняется только содержимое. Используйте, когда не нравится один конкретный кусок и не хочется переделывать всю зону.",
      "replace.summary": "Заменено клипов: {count} — те же места, новое содержимое.",
      "narrator.button": "Заполнить паузы диктора",
      "narrator.button.hint": "Сканирует дорожку с голосом диктора, находит паузы и закрывает каждую B-roll'ом, нарезанным точно по размеру паузы. Для роликов с закадровым голосом: голос остаётся чистым, футаж закрывает тишину.",
      "narrator.pullSubtitles.label": "Подтягивать субтитры (.srt)",
      "narrator.pullSubtitles.hint": "Если рядом с выбранным видео лежит файл .srt с точно таким же именем, плагин вытащит из него подходящие строчки и поставит их красивым текстом (MOGRT) на дорожку выше.",

      "source.title": "1. Источник",
      "source.bin.label": "Бин",
      "source.bin.hint": "Откуда берётся футаж. Подойдёт любой бин; «Content» подставляется сам, если найден. Число — сколько клипов внутри.",
      "source.refresh.button": "↻",
      "source.refresh.hint": "Перечитывает бины, дорожки и маркеры из Premiere. Нажимайте после добавления футажа или изменения таймлайна.",
      "source.weights.button": "⚖",
      "source.weights.hint": "Настроить частоту/вес отдельных видео из выбранного бина.",
      "weights.title": "Веса клипов и лимиты",
      "weights.desc": "Увеличьте вес клипа, чтобы он выпадал чаще. Вес 2.0 значит, что он берётся в два раза чаще, чем 1.0. Клип будет проигнорирован, когда 100% его хронометража будет использовано.",
      "weights.reset": "Сбросить всё",
      "weights.close": "Готово",
      "source.recursive.label": "Включая вложенные бины",
      "source.recursive.hint": "Брать клипы и из папок внутри выбранного бина. Держите включённым, если только не храните там лишний футаж специально.",
      "source.bin.optionNone": "Бины не найдены",

      "zone.title": "2. Куда размещать",
      "zone.hint": "Рабочая область: между точками In/Out таймлайна — лучший повседневный вариант. Маркеры: между двумя маркерами с именем ниже — удобно для постоянных зон. Вся секвенция: от 00:00 до последнего клипа — быстро, но заполняет всё.",
      "zone.workarea.label": "Рабочая область (In/Out)",
      "zone.markers.label": "Между именованными маркерами",
      "zone.sequence.label": "Вся секвенция",
      "zone.markerName.label": "Имя маркера",
      "zone.markerName.hint": "Должно точно совпадать с именем маркера, включая заглавные буквы.",

      "cut.title": "3. Как резать",
      "cut.hint": "Случайный саб-клип: берёт случайный момент изнутри источника — ГЛАВНЫЙ выбор для длинных серий/фильмов. Весь клип: использует клипы целиком, обрезая только слишком длинные — для бинов с короткими готовыми нарезками. Смешанный: случайно чередует оба варианта.",
      "cut.subclip.label": "Случайный саб-клип",
      "cut.whole.label": "Весь клип (обрезать длинные)",
      "cut.mixed.label": "Смешанный (случайно для каждого)",
      "cut.minSec.label": "Мин (сек)",
      "cut.maxSec.label": "Макс (сек)",
      "cut.range.hint": "Каждый кусок будет между этими длинами. 1-3с — дёргано, 3-7с — комфортный темп просмотра, 10с+ — спокойно.",
      "cut.wholeMode.label": "Обрезка длинных",
      "cut.wholeMode.integerRange": "Случайные целые секунды из диапазона",
      "cut.wholeMode.maxOnly": "Ровно максимальная длина",
      "cut.wholeMode.floatRange": "Случайная длина из диапазона",
      "cut.wholeMode.hint": "Что делать, когда клип длиннее Макс. Целые секунды: аккуратные длины вроде 3с, 4с. Ровно макс: каждый длинный клип становится ровно Макс — равномерный ритм. Случайная длина: любое значение, например 3.4с — самый естественный вид.",

      "fill.title": "4. Сколько размещать",
      "fill.hint": "Заполнить всю зону: набивать, пока влезает — по умолчанию. Процент: остановиться на заданном покрытии — оставить воздух специально. Фиксированное число: ровно N кусков — предсказуемо. Один на клип: каждый источник по разу — быстрый обзор всего бина.",
      "fill.zone.label": "Заполнить всю зону",
      "fill.percent.label": "Заполнить зону на процент",
      "fill.count.label": "Фиксированное число кусков",
      "fill.onepass.label": "Один кусок на клип бина",
      "fill.percentValue.label": "Целевое заполнение",
      "fill.countValue.label": "Количество кусков",

      "audio.title": "5. Звук размещаемых клипов",
      "audio.hint": "Все вкл/выкл: один выключатель на всё — «выкл» правильно, когда футаж идёт поверх диктора. Случайный шанс: часть кусков со звуком, по проценту ниже — живой хаос. Ставить приглушённо: аудио кладётся, но замьючено — потом можно вручную включить отдельные.",
      "audio.global.label": "Все вкл / все выкл",
      "audio.randomize.label": "Случайный шанс на кусок",
      "audio.mutedlink.label": "Ставить всегда, но приглушённо",
      "audio.includeGlobal.label": "Включить звук",
      "audio.includeGlobal.hint": "Включено: каждый кусок со звуком. Выключено: только видео — на аудио-дорожки ничего не кладётся.",
      "audio.probability.label": "Шанс",

      "tracks.title": "6. Дорожки",
      "tracks.conflict.title": "Если в зоне есть контент",
      "tracks.conflict.hint": "Сохранить: существующие клипы не трогаются, новые куски встают в свободные места — безопасно для дозаполнения. Заменить: зона на целевых дорожках сначала очищается и заполняется заново — для переделки раскладки с нуля.",
      "tracks.conflict.keep.label": "Сохранить — только в пустые места",
      "tracks.conflict.replace.label": "Заменить — очистить и заполнить заново",
      "tracks.playbackOverlap.title": "Стратегия заполнения",
      "tracks.playbackOverlap.hint": "По одному: на ВСЕХ выбранных дорожках в каждый момент играет только один кусок — ничего ни за чем не прячется; дорожки — просто визуальное разнообразие. Каждая на 100%: каждая дорожка набивается независимо, клипы наслаиваются, верхние перекрывают нижние — плотный многодорожечный коллаж.",
      "tracks.playbackOverlap.none.label": "По одному клипу за раз (без наложения)",
      "tracks.playbackOverlap.stack.label": "Каждая дорожка на 100%",
      "tracks.packing.title": "Промежутки",
      "tracks.packing.hint": "Вразброс: куски встают в случайные места с естественными промежутками. Впритык: куски идут стык в стык без пауз — сплошная стена футажа.",
      "tracks.packing.scattered.label": "Вразброс — случайные промежутки",
      "tracks.packing.packed.label": "Впритык — стык в стык",
      "tracks.video.title": "Видео дорожки",
      "tracks.audio.title": "Аудио дорожки",
      "tracks.autoCount.label": "Использовать",
      "tracks.ignore.label": "Пропустить",
      "tracks.videoCount.hint": "Использовать: на сколько видео-дорожек класть (недостающие создаются). Пропустить: номера дорожек, которые не трогать — например «1» защищает V1 с основным контентом.",
      "tracks.audioCount.hint": "Как с видео: сколько аудио-дорожек использовать и какие номера не трогать — например «1» защищает A1 с голосом диктора.",

      "extras.title": "7. Дополнительно",
      "extras.seed.label": "Сид",
      "extras.seed.hint": "Число случайности. Тот же сид + те же настройки = идентичная раскладка, можно воспроизвести понравившийся результат. Любое изменение даёт новую раскладку.",
      "extras.reroll.button": "Пересобрать всё",
      "extras.reroll.hint": "Новый сид + очистка зоны + свежая раскладка одним нажатием. Когда нужно переделать весь результат. (Для замены одного клипа — выделите его и нажмите «Заменить выделенное» сверху.)",
      "extras.autoSeed.label": "Новый сид при каждом запуске",
      "extras.autoSeed.hint": "Каждый запуск сам берёт свежий сид — результат всегда разный. Выключите, если подкручиваете настройки и хотите сравнивать раскладку между запусками.",
      "extras.avoidRepeat.label": "Перерыв: не повторять источник N кусков",
      "extras.avoidRepeat.hint": "Сколько чужих кусков должно пройти, прежде чем этот же исходник снова попадёт на таймлайн. '1' = просто не ставить два подряд. '5' = сильно размазать кадры из одного файла, чтобы не приедались. (0 = выключено)",
      "extras.avoidDuplicateSegments.label": "Никогда не брать один и тот же момент дважды",
      "extras.avoidDuplicateSegments.hint": "Движок запоминает, какие именно секунды видео он уже вырезал. В следующий раз он найдет свежий, ни разу не показанный кусок, чтобы зритель не смотрел одно и то же.",
      "extras.segmentPadding.label": "Отступ от старых кусков (сек)",
      "extras.segmentPadding.hint": "Вырезая новый кусок из старого файла, движок отступит от уже использованных мест минимум на столько секунд. Например '5' гарантирует, что новый кусок не будет выглядеть как случайное продолжение старого.",
      "extras.addMarkers.label": "Маркер с именем источника на кусок",
      "extras.addMarkers.hint": "Ставит маркер на таймлайне в начале каждого куска с именем его источника — удобно при просмотре понять, откуда футаж.",
      "extras.minGap.label": "Мин. промежуток (сек)",
      "extras.minGap.hint": "Гарантированное пустое место между соседними кусками (режим «Вразброс»). 0 = куски могут касаться. В режиме «Впритык» игнорируется — он без промежутков по определению.",
      "extras.scaleMode.label": "Масштаб",
      "extras.scaleMode.hint": "Как подгонять кусок под кадр секвенции. Под кадр: как «Scale to Frame Size» в Premiere — правильно при разных разрешениях источников. По высоте/ширине: заполняет это измерение, другое может обрезаться. Без масштаба: пиксель в пиксель.",
      "extras.scaleMode.fitFrame": "Под кадр (по умолчанию)",
      "extras.scaleMode.fitHeight": "По высоте",
      "extras.scaleMode.fitWidth": "По ширине",
      "extras.scaleMode.none": "Без масштабирования (100%)",

      "narrator.title": "8. Паузы диктора",
      "narrator.desc": "Закрывает паузы на выбранной аудио-дорожке B-roll'ом, нарезанным точно по размеру каждой паузы. Запускается бирюзовой кнопкой сверху.",
      "narrator.audioTrack.label": "Голос на A#",
      "narrator.videoTrack.label": "B-roll на V#",
      "narrator.tracks.hint": "Голос на A#: аудио-дорожка с диктором — её паузы станут слотами для заполнения. B-roll на V#: видео-дорожка, куда кладётся футаж-заполнитель.",
      "narrator.source.label": "Заполнять из",
      "narrator.source.all": "Всех клипов бина (случайно)",
      "narrator.source.hint": "Каким футажем закрывать паузы. «Все клипы бина» — случайно из всего бина. Выбери одно конкретное видео, чтобы закрывать все паузы только им — например, одной длинной серией, нарезанной под паузы.",

      "run.running": "Работаю…",
      "run.summary": "Размещено кусков: {count} — дорожек видео: {video}, аудио: {audio}, зона заполнена на {pct}%",
      "run.error.prefix": "Ошибка: ",
      "run.validate.noTrack": "Выберите хотя бы одну дорожку.",
      "run.validate.minMax": "Мин. длина не может быть больше максимальной.",

      "help.title": "Как это работает",
      "help.intro": "Выберите бин с футажем, отметьте зону на таймлайне, нажмите «Рандомизировать». Инструмент нарежет случайные куски из бина и раскидает их по выбранным дорожкам.",
      "help.step1": "Поместите футаж в бин (например, «Content») в этом проекте и выберите его в «Источнике».",
      "help.step2": "Установите рабочую область (In/Out) на секвенции, которую хотите заполнить.",
      "help.step3": "Наведите на любой «?» — каждый элемент объясняет, что делает и когда его использовать.",
      "help.step4": "Нажимайте «Обновить» после добавления клипов, дорожек или маркеров.",
      "help.step5": "Нажмите «Рандомизировать и разместить». Не понравилось? «Пересобрать всё» переделает целиком.",
      "help.step6": "Мешает один кусок? Выделите его на таймлайне и нажмите «Заменить выделенное» — то же место, та же длина, новое содержимое.",
      "help.step7": "Работа с закадровым голосом: укажите дорожку голоса в разделе 8 и нажмите «Заполнить паузы диктора» — закроются только паузы.",
      "help.step8": "Кликните по заголовку раздела, чтобы свернуть его — настройки продолжают действовать.",
      "help.undoTitle": "Отмена",
      "help.undo": "Каждый запуск — один шаг отмены: Ctrl+Z откатывает всё целиком, как обычную правку.",
      "help.troubleTitle": "Если что-то покраснело",
      "help.trackFail": "Если автосоздание дорожек не сработало на вашей версии Premiere — добавьте дорожки вручную на таймлайне и запустите снова."
    }
  };

  var current = "en";

  function apply(lang) {
    if (!DICTS[lang]) lang = "en";
    current = lang;
    var dict = DICTS[lang];

    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (dict[key] != null) els[i].textContent = dict[key];
    }

    var titled = document.querySelectorAll("[data-i18n-title]");
    for (var j = 0; j < titled.length; j++) {
      var tkey = titled[j].getAttribute("data-i18n-title");
      if (dict[tkey] != null) titled[j].title = dict[tkey];
    }

    document.documentElement.lang = lang;
    document.getElementById("langEn").classList.toggle("active", lang === "en");
    document.getElementById("langRu").classList.toggle("active", lang === "ru");

    try { window.localStorage.setItem("ap_lang", lang); } catch (e) {}
  }

  function t(key) {
    var dict = DICTS[current] || DICTS.en;
    return dict[key] != null ? dict[key] : key;
  }

  function initial() {
    var saved = "en";
    try { saved = window.localStorage.getItem("ap_lang") || "en"; } catch (e) {}
    return DICTS[saved] ? saved : "en";
  }

  return { apply: apply, t: t, initial: initial };
})();
