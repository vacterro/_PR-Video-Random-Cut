# PR Video Random Cut

Adobe Premiere Pro CEP laiendus juhusliku videoklipi paigutamiseks kaalutud valikuga ja subtiitrite toega. Täidab automaatselt tühikud jadades intelligentse klipivalikuga.

## Versioon
0.0.1

## Funktsioonid
- **Juhuslik klipipaigutus**: intelligentselt valib ja paigutab videoklippe kaustadest
- **Kaalutud valik**: seadistage tõenäosuse kaalud erinevatele klipikategooriatele
- **Subtiitrite toetus**: SRT subtiitrite sisestus MOGRT mallidega
- **Tühikute tuvastus**: leiab automaatselt ja täidab tühikud jadades
- **Kohandatav UI**: paneel konfiguratsiooniks ja juhtimiseks
- **Mitmekeelne tugi**: lokaliseeritud liides i18n-ga

## Installimine
1. Kloonige see repopositoorium
2. Käivitage `install.bat` (Windows) või `install.ps1` (PowerShell)
3. Taaskäivitage Adobe Premiere Pro
4. Juurdepääs laiendusele Window > Extensions > machine_asylum YT Tool

## Kasutamine
- Avage Premiere Pro projekt videoklipidega kaustades
- Valige jada tühikutega täitmiseks
- Seadistage kaalud ja parameetrid paneelis
- Klõpsake "Run" tühikute automaatseks täitmiseks juhuslike klipidega
- Kasutage subtiitrite funktsioone pealkirjade sisestamiseks

## Failide struktuur
- `host/` - ExtendScript tagumine (index.jsx, lib/)
- `client/` - HTML/CSS/JS esiosa
- `CSXS/` - laienduse manifest
- `assets/` - MOGRT mallid ja ressursid
- `icons/` - laienduse ikoonid

## Konfiguratsioon
- Kaalude seaded paneeli liidese kaudu
- MOGRT mallid assets kaustas
- Keele valik liideses

## Nõuded
- Adobe Premiere Pro CC 2017 või uuem
- CEP runtime 7.0 või kõrgem

## Litsents
MIT License

## Tugi
Probleemide ja funktsioonitaotluste jaoks kasutage GitHubi repopositooriumi.
