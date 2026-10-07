<div align="center">

# _PR Video Random Cut

**Adobe Premiere Pro CEP panel for filling timeline gaps from source bins with weighted random clip selection and optional subtitle workflows.**

[![Version](https://img.shields.io/badge/version-0.0.1-D4B86A?style=flat-square)](CSXS/manifest.xml)
![Premiere Pro](https://img.shields.io/badge/Premiere%20Pro-CC%202017%2B-9999FF?style=flat-square&logo=adobepremierepro&logoColor=white)
![CEP](https://img.shields.io/badge/runtime-CEP%207%2B-332E22?style=flat-square)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

## What it does

_PR Video Random Cut automates a specific editing chore: find gaps in a Premiere Pro sequence and populate them from organized source clips without manually dragging every candidate onto the timeline.

The panel keeps selection controls in the HTML/JS client and executes Premiere operations through ExtendScript.

## Highlights

- random source-clip placement;
- configurable weights for clip groups/categories;
- automatic gap detection;
- SRT/subtitle workflows with MOGRT assets;
- dedicated CEP panel UI;
- localized interface assets;
- Windows install helpers included in the repository.

## Install

```powershell
git clone https://github.com/vacterro/_PR-Video-Random-Cut.git
cd _PR-Video-Random-Cut
.\install.ps1
```

You can also run `install.bat`.

Restart Premiere Pro after installation, then open:

**Window → Extensions → _PR Video Random Cut**

### Requirements

- Adobe Premiere Pro **CC 2017 or newer**;
- CEP / CSXS runtime **7.0+**;
- Windows for the supplied install scripts.

The manifest currently targets Premiere host versions `[11.0, 99.9]`.

## Workflow

1. Open a Premiere project containing source clips organized in bins.
2. Select the target sequence.
3. Configure source groups and weights in the panel.
4. Run the tool to identify and fill eligible gaps.
5. Use the subtitle controls when the edit requires SRT/MOGRT insertion.

## Repository layout

| Path | Purpose |
|---|---|
| `client/` | panel HTML/CSS/JavaScript |
| `host/` | ExtendScript/Premiere automation backend |
| `CSXS/manifest.xml` | CEP extension manifest |
| `assets/` | MOGRT and supporting resources |
| `icons/` | panel icons |
| `install.ps1` / `install.bat` | Windows installation helpers |

## Languages

[English](README.md) · [Русский](README.ru.md) · [Eesti](README.et.md)

## License

[MIT](LICENSE)


## Project network

Part of the broader **SAIPEN / vacterro** project ecosystem.

[**Author hub**](https://github.com/vacterro) · [**SAIPEN HQ**](https://github.com/saipenhq) · [**SAIPEN Core**](https://github.com/vacterro/saipen) · [**ZAICODE**](https://github.com/vacterro/zaicode) · [**FastPrompter**](https://github.com/vacterro/FastPrompter) · [**SAIPEN Community**](https://discord.gg/SEYaYkuVgN)

For reproducible bugs and durable feature requests, use [GitHub Issues](https://github.com/vacterro/_PR-Video-Random-Cut/issues).

<!-- VACTERRO_SUPPORT:BEGIN -->
---
<sub>If _PR Video Random Cut is useful to you, optional support: [Buy Me a Coffee](https://buymeacoffee.com/vacuum34) · [Boosty](https://boosty.to/vacuum34/donate) · [PayPal](https://paypal.me/AlexNelin) · [other ways](https://github.com/vacterro/vacterro/blob/main/SUPPORT.md)</sub>
<!-- VACTERRO_SUPPORT:END -->
