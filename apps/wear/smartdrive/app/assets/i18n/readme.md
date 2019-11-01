# Configuring translations

## ensuring all translations are in the file

Use the following regexp (preferrably with ripgrep / rg) to get a list
of all the used translations:

```bash
rg --no-filename -U -N -o -e "L\(\s*'[^\)]*\)" app | sed -E 's/(L\()|\s*|\)//g' | sort | awk '!seen[$0]++' -
```
