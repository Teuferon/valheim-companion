# Rich text cedulí — rešerše 10. 9. 2026

## Co je doložené

[Valheim Wiki: Sign](https://valheim.fandom.com/wiki/Sign) popisuje barvu, velikost, tučné písmo a kurzívu, úsporu vynecháním koncových značek a zkratku HEX barvy. Wiki používá jak termín „50 characters“, tak „50 bytes in UTF-8“; nejde o spolehlivý podklad pro tvrzení, že každá verze hry omezuje vstup právě na bajty.

[ComfySigns — zdrojový projekt](https://github.com/redseiko/ComfyMods/tree/main/ComfySigns) popisuje změnu limitu z 50 na 999 a možnost ignorovat velikost. Proto je 999 výslovně označeno jako profil pro mod, nikoli vanilla nastavení.

## Engine a kompatibilita

[Unity TextMesh Pro — pravidla rich textu](https://docs.unity3d.com/Packages/com.unity.textmeshpro@4.0/manual/RichText.html) dokládá vnořené značky, volitelné uzavření a hodnoty včetně procent, px, em, RGB/RGBA a alfa kanálu. Formát není HTML; některé jeho principy jsou podobné.

[Úplný přehled značek TMP](https://docs.unity3d.com/Packages/com.unity.textmeshpro@4.0/manual/RichTextSupportedTags.html) je zdrojem katalogu v aplikaci. Dokumentace enginu sama nepotvrzuje, že konkrétní sestavení Valheimu a jeho cedule umožňuje každý efekt. Katalog proto odděluje základ, pokročilé značky k ověření a funkce závislé na herních assetech či konfiguraci. Aliasy allcaps/uppercase a s/strikethrough jsou uvedeny v průvodci.

## Rozhodnutí pro aplikaci

- Výstup se nikdy automaticky neořezává: useknutí může rozbít značku.
- Úspora barev zachovává přesnou hodnotu; #RRGGBB se zkrátí jen při totožných dvojicích číslic.
- Uzavírací značky uprostřed textu se zachovávají.
- Počítají se jednotky UTF-16 a UTF-8 bajty. Nadlimitní text lze zkopírovat, ale doprovází ho upozornění.
- Změna osvětlení se týká jen náhledu. Nevytváří neexistující vanilla příkaz pro svítící ceduli.
- Náhled používá vložené písmo Norse (Regular a Bold); herní TMP atlas a jeho vykreslování se mohou lišit. Procentuální velikost je relativní; absolutní velikost a posuny jsou jen orientační.
- Sprites, fonty, přechody, styly, odkazy a stránky nejsou předstírány jako funkční webové efekty.

Tato rešerše není test přímo ve spuštěné hře. Před rozsáhlým používáním pokročilých značek vyzkoušej jednu ceduli ve své verzi Valheimu.


## Písmo náhledu

Cedule používají asset `Valheim-Norse`; výslovně jej jako výchozí font cedulí uvádí autor ComfySigns v [historii verze 1.4.0](https://thunderstore.io/c/valheim/p/ComfyMods/ComfySigns/v/1.5.0/). Do náhledu jsou vložené nezměněné řezy Norse Regular a Bold z [webu autora Joëla Carrouchého](https://www.joelcarrouche.com/fonts/norse). Přiložená licence dovoluje vložení do aplikací a webových stránek. Písmo se nezapisuje do herního rich textu: jde o vzhled náhledu. Samotná shoda rodiny písma nezaručuje shodu herního atlasu, měřítka či materiálu.


## Měřítko a barva náhledu

Výchozí nápis je černý Norse Regular, tučný řez zapíná tlačítko B. Změna kalibrace neupravuje generované značky velikosti. Jako vizuální reference slouží [moCronikův screenshot REGULAR/BOLD](https://steamcommunity.com/sharedfiles/filedetails/?id=3030696826): běžná písmena zabírají přibližně 45–50 % výšky plochy cedule a delší nápis využívá téměř celou šířku. Jde o odhad z perspektivního obrázku, ne měření herního enginu. [Druhá obrazová reference](https://www.valheimians.com/article/change-sign-size-amp-color/) ukazuje upravené barevné nápisy, proto se nepoužila jako měřítko výchozí velikosti.

Náhled měří skutečně vykreslený rich text v prohlížeči včetně řezů písma, náhradních fontů symbolů, rozestupů a explicitních velikostí. Text automaticky nezalamuje: dlouhý nápis plynule zmenšuje jako celek, bez spodního limitu velikosti. Zachovává ruční nové řádky i značku `<br>` a při změně šířky okna znovu přizpůsobí obsah ploše cedule. Tato úprava náhledu nemění kód kopírovaný do hry. Použitá ilustrace má jiný tvar než herní model, proto zůstává náhled orientační. Výchozí černá nepotřebuje barevnou značku.
