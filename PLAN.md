- Service worker threads for main actions to avoid locking browser
- UI rewrite
    - Support fetch from URL, default values
    - Wizard with context based fields, one vendor at a time
    - CSV visualization before download, text and table view
    - Logs visible in UI - default to info for obvious activity but controlled via UI toggles
- Typescript types
- Integration tests with real examples
- Better validation on parsing products, ignore and log rather than propagating broken values (i.e. NaN)
- Abstract products rather than vendors, just use vendors to parse/unparse the CSVs

- FIXES:
	- Newlines in descriptions leaking into CSV

- IMPROVEMENTS:
	- Handle/automate trimming in vendor class rather than in logic
	- Add product structure type as code and derive both typescript type and headers from one place