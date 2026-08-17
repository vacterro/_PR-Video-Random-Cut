# PR Video Random Cut

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
4. Access the extension from Window > Extensions > machine_asylum YT Tool

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
