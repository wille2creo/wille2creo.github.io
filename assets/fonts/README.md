# Local fonts

Branding and interface fonts are self-hosted. Font files retain their
copyright and license metadata. Body text and search text keep the theme's
existing font stack. All faces use `font-display: swap`: a fallback may
appear while loading or if a font fails to load.

## Branding

The masthead and home heading share one wordmark face per language:

- `blog-brand-en.woff2`: Cormorant Garamond, weight 500, containing
  `Übersicht`. Internal family: Blog Brand EN.
- `AlimamaDaoLiTi-Regular.woff2`: original Alimama DaoLiTi, weight 400,
  used for `震之`. Keep this file intact: its license prohibits splitting,
  conversion and modification. See `brand-zh-LICENSE.txt`.

The homepage uses separate faces for its motto, kicker and seal:

- `blog-motto.woff2`: LXGW WenKai Regular, containing `知其黑守其白`.
  Internal family: Blog Motto. License: `OFL.txt`.
- `blog-kicker.woff2`: Long Cang Regular, containing `以明`.
  Internal family: Blog Kicker. License: `kicker-OFL.txt`.
- `blog-motto-en.woff2`: Source Serif 4 Regular, containing
  `Wo Es was, soll Ich werden`; `blog-motto-en-bold.woff2` contains `Ich`
  at weight 700. Both use optical size 20 and the family Blog Latin Motto.
  License: `motto-en-OFL.txt`.
- `blog-kicker-en.woff2`: La Belle Aurore Regular, containing `amor fati`.
  Internal family: Blog Latin Kicker. Its handwritten slant is intrinsic;
  use normal style, weight 400. License: `kicker-en-OFL.txt`.
- `blog-seal.woff2`: Tiro Devanagari Sanskrit Regular, containing the
  characters in `बोधिसत्त्व`. Internal family: Blog Seal.
  License: `seal-OFL.txt`.

The OFL subsets are generated with fontTools and WOFF2 compression.
Instantiate variable fonts at the weights and optical sizes above before
subsetting. Retain all layout features, glyph names, name and language
records. Rename family name IDs 1, 4 and 16 to the internal family, and
PostScript name ID 6 to a unique name based on that family and style.
Regenerate a subset if its displayed text changes. For the Sanskrit seal,
verify shaping of `बो`, `धि`, `स`, `त्त्व` and the complete word against
the original, including conjuncts and vowel positioning.

## Interface text

Navigation, language switches, pagination, post contents navigation and
language landing-page choices use the theme's system sans-serif stack.
There are no interface font downloads, generated character ranges or
font-generation dependencies. Search text inherits the body font.

## Pinned sources

Google Fonts sources share commit
`9710da1eacb3be272583c3224dcb70f9da6eadbb` in
https://github.com/google/fonts. All are licensed under SIL OFL 1.1:

| Directory under `ofl/` | Original file | License here |
| --- | --- | --- |
| `cormorantgaramond` | `CormorantGaramond[wght].ttf` | `brand-en-OFL.txt` |
| `longcang` | `LongCang-Regular.ttf` | `kicker-OFL.txt` |
| `sourceserif4` | `SourceSerif4[opsz,wght].ttf` | `motto-en-OFL.txt` |
| `labelleaurore` | `LaBelleAurore.ttf` | `kicker-en-OFL.txt` |
| `tirodevanagarisanskrit` | `TiroDevanagariSanskrit-Regular.ttf` | `seal-OFL.txt` |

LXGW WenKai source: https://github.com/lxgw/LxgwWenKai at commit
`8bd6319350fb3ae1904c1cb1a41595ab15d21140`, file
`fonts/TTF/LXGWWenKai-Regular.ttf`.

Alimama DaoLiTi source: https://fonts.alibabagroup.com/
Original file:
https://fonts.alibabadesign.com/AlimamaDaoLiTi/AlimamaDaoLiTi-Regular/AlimamaDaoLiTi-Regular.woff2
This is Alibaba's free-use and embedding license, not OFL. Copyright
belongs to 阿里妈妈; metadata also records Alibaba (China) Co., Ltd.
Official license: https://www.yuque.com/alimama_ai-font/vfse9w/ynqpf9pt8wops4sl
