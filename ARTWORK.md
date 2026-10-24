# Artwork System

> The webpage provides the paper; the artwork leaves the mark.

Artwork belongs to the reading experience. Compose it with the page's type,
rhythm, and empty space. A boundary-free mark can feel discovered on the
page; a complete photograph or bounded artwork can also be the right choice.

Leave space around it. Welcome modest asymmetry and the material character
of a drawing, painting, or print. Reflective does not mean melancholy:
fresh greens, clear blues, yellows, and other living colors are welcome.
There is no prescribed accent color.

An artwork need not explain the essay literally. An adjacent relation can
become meaningful after reading. Some essays need no artwork at all.
Usually one visual moment is enough; choose its placement from the reading
rhythm. A pause within the text, an opening image, or a home preview each
creates a different relationship to the writing.

## Editorial judgment

Start with the essay and its particular source material. Decide what an
image contributes: evidence of an encounter, the character of a place,
an emotional counterpoint, a visual metaphor, or simply a pause. Choose
the medium and composition after finding that relationship.

When interpreting a photograph, identify what gives this scene its identity.
Preserve those relationships when recognition matters; merge, omit, or
transform detail that competes with them. An independent illustration may
depart further from the photograph when the brief calls for it. Keep the
distinction between documentary source and interpretation clear.

Consistency comes from editorial care and a considered relationship to the
page. It does not require the same medium, palette, framing, or amount of
empty space across essays. Do not turn the Dakota watercolor or any other
successful example into a mandatory house style.

## Types

- `trace`: a small line, wash, plant form, or color fragment. Transparent SVG
  with theme-aware color is useful when appropriate.
- `plate`: a fuller artwork. Preserve its composition and material edges.
  Transparency can let pigment meet the webpage directly; a complete image
  field can be appropriate when its surface or boundary belongs to the work.
- `photo`: documentary photography. A photographic rectangle is a useful
  starting point; framing can follow the work and the page's composition.
  Avoid imitation paper or film frames used only as decoration.
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

When an artwork should merge into the page, use genuine transparency rather
than baking the site's paper color into the asset. Paper within an artwork
can remain visible when it is part of the composition. If preparing a
transparent edition, do not remove pale pigment or watercolor edges by
simply keying out white. Preserve the original while evaluating edited
editions in both themes.

Avoid defaulting to generic AI illustration, obligatory melancholy,
faux Chinese ink, decorative seals, aged beige paper, collage templates,
or text-poster effects. These are not bans: a specific work may justify
an exception.

## Technique references

These are sources of useful techniques, not installed dependencies or
templates to reproduce. The notes below describe what can inform this
blog's artwork; each source's full workflow has its own purpose.

- [Ink Wash Poster](https://github.com/TwentyfiveBTea/ink-wash-poster/blob/main/SKILL.md):
  extract a central image or relation, use material-specific marks, and let
  edges dissolve into intentional empty space. Choose scale and color from
  the subject. Its poster format and paper field need not carry over.
- [Gathered Scenes Zine](https://github.com/Zeejay0/gathered-scenes-zine-skill/blob/main/skills/scenes-gathered-zine-v1-3/SKILL.md):
  preserve source-specific relationships while compressing detail; let
  extracted shapes connect photography, illustration, and color. Torn
  paper, a vivid added hue, and microtext are optional here.
- [Photo to Zine Postcard](https://github.com/Whiplashzeb/photo-to-zine-postcard/blob/main/SKILL.md):
  select a meaningful, distinctive motif from the source rather than the
  easiest object to isolate. Its fixed front/back layout, metadata, and
  three color swatches belong to that postcard format.

The repository skill at
[blog-artwork](.agents/skills/blog-artwork/SKILL.md) applies these principles
to selection, production, integration, and rendered review. Keep aesthetic
decisions in this document and reusable working guidance in the skill.

## Thunderstorm / 观雷

The supplied original is preserved unchanged at
`assets/art/thunderstorm/plate.png`. Both articles invoke `_includes/artwork.html`
after the first paragraph of The Thunderstorm / 雷雨, once the mountain,
valley, and storm have entered the text. The include receives the shared
assets, their dimensions, and localized alt text.

The artwork uses transparent pigment on the page's own background, with
no rectangular paper field, caption, or filter. It follows the reading
column on desktop and mobile, preserving its complete composition and
soft edges without pushing the artwork offscreen.

`plate.light.png` is a generated background-extraction edit of the supplied
original. `plate.dark.png` is a companion generated paint-value adaptation
for dark paper. They preserve the scene and composition, but generative
editing may change grain, edges, and small details. These editions are
not lossless exports from the original artwork.

The article and home preview share `_includes/artwork-image.html`: one
`picture` with an optional dark `source` and the light `img`.
The existing theme control selects the source for explicit and system
themes. Without site JavaScript, it follows the system preference. Both languages
use the same editions and their own article alt text.

The target is a nearly boundary-free transition into the webpage in both
modes. Evaluate the actual article, including soft outer edges, translucent
washes, lightning, and living green. A layered-source transparent export
would give better control and fidelity if one becomes available.

For future assets, prefer a stable folder such as `assets/art/<essay-slug>/`
and clear names such as `trace.svg`, `plate.light.webp`, and `plate.dark.webp`.
Photos can remain in the normal photo folders. Add implementation only when
a real work needs it.

## Chronological home preview

Each language's home listing follows publication dates, newest first.
Only the newest visible article on the first page can lead with artwork,
and only when it explicitly sets `artwork.home_preview: true`. An older
illustrated post never moves ahead of newer writing. If the latest article
has no enabled artwork, it stays a text entry. Later entries and pagination
continue in date order.

The lead uses `artwork.preview` when provided, otherwise the main artwork.
A preview can have its own `type`, light asset, optional dark edition, and
intrinsic dimensions. Its type defaults to `artwork.type`, then `photo`;
set `plate`, `trace`, or `gathered` explicitly for uncropped artwork.
A photo preview can set `aspect_ratio` (for example, `"16 / 9"`) without
changing the source dimensions. This lets a home artwork differ from the
documentary photographs kept in the article.

```yaml
artwork:
  home_preview: true
  light: /assets/images/dakota/devils-tower-prairie-dogs.jpeg
  width: 1024
  height: 768
  preview:
    type: plate
    light: /assets/art/dakota/prairie-wash.webp
    width: 1774
    height: 887
```

`plate`, `trace`, and `gathered` previews preserve the whole composition
and transparent edges at their natural aspect ratio. They meet the page
canvas directly, without a surface, frame, caption, crop, or image zoom.
Photo previews can use the photographic framing appropriate to the design.
The image sits beside its title on wide screens and above it on mobile.
It is decorative; descriptive alt text stays with the article's primary
artwork. Omit `home_preview` or set it to `false` to disable the lead image.
The leading image loads eagerly and reserves its intrinsic dimensions.

## Dakota / 达科他五日

The original photograph remains unchanged at
`assets/images/dakota/devils-tower-prairie-dogs.jpeg`. The article retains
its documentary photographs. The current home-only `prairie-wash.webp`
is a 1774 × 887 transparent watercolor interpretation generated with the
built-in image tool using that original photograph as its reference. It is
an interpretation, not a lossless rendering of the encounter.

The essay's decade-long wish to see these animals, and the story of a
photograph outliving its maker, guide the intimate encounter. Keep the
magpie on the left, facing left with its tail extending right, and the
taller and shorter prairie dogs side by side on the right at their burrow.
Preserve their relative scale, gathered forepaws, and alert posture.

Broad ochre, gray-violet, olive, and indigo washes replace individual fur
and feather marks. Shared terrain joins the animals' feet and shadows,
then breaks into the page. Loose edges and diluted color simplify the
photograph without rearranging the encounter or opening large gaps inside
the animals. This composition belongs to this essay, not a template.

The selected PNG was encoded as lossless WebP with its RGBA pixels verified
unchanged. The generated source remains preserved separately; the web
edition is 1,483,238 bytes. Genuine transparency exposes the page canvas,
with no baked-in paper field. Rendered review at 1440 × 1000 and 390 × 844
confirmed the same asset works in both themes without a filter or separate
dark edition. Original photographs and the article body remain unchanged.
