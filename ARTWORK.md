# Artwork System

> The webpage provides the paper; the artwork leaves the mark.

Artwork belongs to the reading experience. It should feel discovered on a
page, rather than presented as a conventional blog hero image.

Leave space around it. Welcome modest asymmetry and the material character
of a drawing, painting, or print. Reflective does not mean melancholy:
fresh greens, clear blues, yellows, and other living colors are welcome.
There is no prescribed accent color.

An artwork need not explain the essay literally. An adjacent relation can
become meaningful after reading. Some essays need no artwork at all.
Usually one visual moment is enough; place it at a meaningful pause or turn
in the text, rather than automatically beneath the title.

## Types

- `trace`: a small line, wash, plant form, or color fragment. Transparent SVG
  with theme-aware color is useful when appropriate.
- `plate`: a fuller paper artwork. Preserve its material edges; prefer
  transparency that faithfully retains the work. Let pigment and soft
  edges meet the webpage directly, without a visible paper rectangle.
- `photo`: documentary photography. Keep its photographic rectangle without
  imitation paper, film frames, or decorative treatments.
- `gathered`: one photograph with one restrained drawn or graphic relation.
  Let the specific work determine the intervention, not a collage template.

These are useful descriptions, not requirements to fill a catalogue.

## Page and editions

Chinese and English versions normally share the same artwork: it belongs
to the essay, not its translated title. Provide descriptive alt text in each
language. Keep titles, quotations, and other typography in HTML.

A plate may extend slightly beyond the text column with a modest offset.
On mobile, return it to the content width. Use generous vertical space,
without borders, shadows, rounded cards, or decorative captions by default.

Light and dark modes should each feel natural. Simple traces can follow
CSS theme colors; complex works may need independent light and dark
editions. Never globally invert images or use filters to imitate an edition.
Warm off-white ink and clearer living colors can work well on dark paper.

Do not bake the site's paper color into a new asset. If an existing work
has its own paper background, prepare a transparent edition rather than
treating its rectangle as the finished presentation. Do not remove pale
pigment or watercolor edges by simply keying out white. Preserve the
original while evaluating edited editions in both themes.

Avoid defaulting to generic AI illustration, obligatory melancholy,
faux Chinese ink, decorative seals, aged beige paper, collage templates,
or text-poster effects. These are not bans: a specific work may justify
an exception.

## Thunderstorm / 观雷

The supplied original is preserved unchanged at
`assets/art/thunderstorm/plate.png`. Both articles invoke `_includes/artwork.html`
after the first paragraph of The Thunderstorm / 雷雨, once the mountain,
valley, and storm have entered the text. The include receives the shared
assets, their dimensions, and localized alt text.

The artwork uses transparent pigment on the page's own background, with
no rectangular paper field, caption, or filter. Desktop width is 106% of
the text column, extending left; smaller screens use 100%.

`plate.light.png` is a generated background-extraction edit of the supplied
original. `plate.dark.png` is a companion generated paint-value adaptation
for dark paper. They preserve the scene and composition, but generative
editing may change grain, edges, and small details. These editions are
not lossless exports from the original artwork.

The article and home preview share `_includes/artwork-image.html`: one
`picture` with an optional dark `source` and one light fallback `img`.
The existing theme control selects the source for explicit and system
themes. Without site JavaScript, it follows the system preference; readers
that ignore `picture` sources receive a single light image. Both languages
use the same editions and their own article alt text.

The target is a nearly boundary-free transition into the webpage in both
modes. Evaluate the actual article, including soft outer edges, translucent
washes, lightning, and living green. A layered-source transparent export
would give better control and fidelity if one becomes available.

For future assets, prefer a stable folder such as `assets/art/<essay-slug>/`
and clear names such as `trace.svg`, `plate.light.webp`, and `plate.dark.webp`.
Photos can remain in the normal photo folders. Add implementation only when
a real work needs it.

## Optional home preview

Home lists remain text-only unless a post explicitly sets
`artwork.home_preview: true`. Having artwork alone does not enable a
preview. Archives and the home frontispiece retain their existing layout.

```yaml
artwork:
  home_preview: true
  light: /assets/art/thunderstorm/plate.light.png
  dark: /assets/art/thunderstorm/plate.dark.png
  width: 1672
  height: 941
  preview:
    light: /assets/art/thunderstorm/preview.light.webp
    dark: /assets/art/thunderstorm/preview.dark.webp
    width: 720
    height: 406
```

Previews preserve the whole composition and transparent edges, with no
crop, frame, or caption. They sit beside the text above 768px and below it
on smaller screens. Keep them occasional to preserve the list's rhythm.
The preview is decorative; descriptive alt text stays with the article's
primary artwork. Omit `home_preview` or set it to `false` to disable it.

`light`, `width`, and `height` describe the article asset and its intrinsic
dimensions. `dark` is optional; without it the same image serves both
themes. An optional `preview` object provides smaller home assets with
their own `light`, optional `dark`, and actual `width` and `height`. Omit
the entire object to reuse the article assets and dimensions. Preserve the
composition and keep its theme treatment consistent with the article.
Images load lazily and reserve their actual aspect ratio to avoid shifting
the list as they load.

Thunderstorm uses 720px-wide transparent WebP previews, resized from the
approved editions and encoded losslessly. The full-size article assets
and supplied original remain unchanged. No runtime image processing or
additional build dependency is required.
