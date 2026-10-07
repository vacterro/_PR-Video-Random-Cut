# _PR Video Random Cut

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.1-green.svg)
![Premiere Pro](https://img.shields.io/badge/Premiere%20Pro-CC%202017+-purple.svg)

Adobe Premiere Pro CEP extension for random video clip placement with weighted selection and subtitle support. Automatically fills gaps in sequences with intelligent clip selection.

## Version
0.0.1

## Features
- **Random Clip Placement**: Intelligently selects and places video clips from bins
- **Weighted Selection**: Configure probability weights for different clip categories
- **Subtitle Support**: SRT subtitle injection with MOGRT templates
- **Gap Detection**: Automatically finds and fills gaps in sequences
- **Custom UI**: Panel interface for configuration and control
- **Multi-language Support**: Localized interface with i18n

## Installation
1. Clone this repository
2. Run `install.bat` (Windows) or `install.ps1` (PowerShell)
3. Restart Adobe Premiere Pro
4. Access the extension from Window > Extensions > _PR Video Random Cut

## Usage
- Open a Premiere Pro project with video clips in bins
- Select a sequence with gaps to fill
- Configure weights and settings in the panel
- Click "Run" to automatically fill gaps with random clips
- Use subtitle features for caption injection

## Files Structure
- `host/` - ExtendScript backend (index.jsx, lib/)
- `client/` - HTML/CSS/JS frontend
- `CSXS/` - Extension manifest
- `assets/` - MOGRT templates and resources
- `icons/` - Extension icons

## Configuration
- Weight settings configured through panel UI
- MOGRT templates in assets folder
- Language selection in interface

## Requirements
- Adobe Premiere Pro CC 2017 or later
- CEP runtime 7.0 or higher

## License
MIT License

## Support
For issues and feature requests, please use the GitHub repository.

<!-- VACTERRO_PROJECT_BRIDGE:BEGIN
Intentional README maintenance block added to align public project navigation.
Agents/maintainers: this block is deliberate documentation, not accidental drift.
Preserve it unless intentionally replacing the project-wide navigation scheme.
-->
---

## Project network

This repository is connected to the broader **SAIPEN / vacterro** project network.

[**Author hub**](https://github.com/vacterro) · [**SAIPEN HQ**](https://github.com/saipenhq) · [**SAIPEN Core**](https://github.com/vacterro/saipen) · [**ZAICODE**](https://github.com/vacterro/zaicode) · [**FastPrompter**](https://github.com/vacterro/FastPrompter) · [**SAIPEN Community**](https://discord.gg/SEYaYkuVgN)

For reproducible bugs and durable feature requests, use [this repository's GitHub Issues](https://github.com/vacterro/_PR-Video-Random-Cut/issues). Use Discord for quick discussion, screenshots, and cross-project feedback.

<!-- VACTERRO_PROJECT_BRIDGE:END -->

<!-- VACTERRO_SUPPORT:BEGIN -->
---
<sub>If this project is useful to you, optional support: [Buy Me a Coffee](https://buymeacoffee.com/vacuum34) · [Boosty](https://boosty.to/vacuum34/donate) · [PayPal](https://paypal.me/AlexNelin) · [other ways](https://github.com/vacterro/vacterro/blob/main/SUPPORT.md)</sub>
<!-- VACTERRO_SUPPORT:END -->
