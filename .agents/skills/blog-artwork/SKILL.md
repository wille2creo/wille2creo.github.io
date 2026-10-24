---
name: blog-artwork
description: >-
  Select, generate, adapt, and integrate editorial artwork for this personal
  blog's essays and home previews. Use for article-specific imagery and its
  relationship to the page; not for general site redesign or unrelated posters.
---

# Blog Artwork

## Read the work and the page

Read [ARTWORK.md](../../../ARTWORK.md) at the repository root before choosing
a direction. It is the maintained source of aesthetic principles, technique
references, asset conventions, and current examples. Update principles there
when the user changes them; keep this skill focused on the working method.
Follow the user's current brief over defaults and examples in either file.

Read the essay, inspect the supplied photographs or existing artwork, and
identify the intended placement: article, home preview, or both. Read the
translated essay when relevant. Look at the actual page when judging scale,
empty space, and the relationship to typography. Do not infer the subject
from the title alone.

## Choose a visual relationship

Form a concise brief: what the work contributes to the reading, what receives
first attention, what remains recognizable, and what can be omitted or
reinterpreted. For source-based work, distinguish documentary evidence from
artistic invention. Preserve important spatial relationships when the brief
depends on them; reinterpret more freely when the user wants an independent
image or metaphor.

Choose the treatment from that brief. An original photograph, a drawn motif,
a partly photographic composition, an abstract field, or no new artwork can
all be appropriate. Treat the references in ARTWORK.md as optional techniques.
Do not inherit a reference's fixed format, palette, torn edge, text, swatches,
or layout unless they serve this work or the user requests that format.
If the essay is stronger without new artwork, explain that choice briefly;
do not generate an image merely to complete the workflow.

State the chosen direction briefly before production. Use alternatives only
when they resolve a meaningful uncertainty; do not require a style-selection
interview or several generated candidates for every essay. Carry out the
authorized task without adding an approval gate.

## Produce and integrate

Use the available image-generation capability for raster creation or edits,
following its image-handling instructions. Inspect reference images first.
Use code-native SVG or CSS when the work is better expressed that way.
Installation of the referenced third-party skills is not required.

Make the generation brief concrete about composition, source fidelity,
material behavior, and intentionally empty areas. Choose transparent gaps or
a complete image field to suit the page. When transparency is intended,
request genuine alpha rather than painted page-colored space. Keep page
titles and editorial labels in HTML; include text within an artwork only
when the brief calls for it.

Preserve original assets. Store web editions and record their source,
interpretive changes, and any meaningful fidelity limits using ARTWORK.md's
conventions. Verify intrinsic dimensions, alpha when used, and web file size.
A generative adaptation is not a lossless export, even if its encoding is.

Inspect the current includes and front matter before integrating. Reuse
`_includes/artwork-image.html` and `_includes/artwork.html` where suitable;
read `_includes/journal-feature.html` for home previews. Keep documentary
article images distinct from a generated home interpretation. Preserve the
chronological home behavior documented in ARTWORK.md.

## Review in context

Judge the image both on its own and in the rendered placement. Check the
desktop and mobile composition, light and dark themes, meaningful alt text
in each language, loading dimensions, and the interaction with nearby text.
Inspect pale washes, broken edges, halos, unintended rectangles, crops, and
any generated text closely. A transparent asset still needs to work on both
page backgrounds; a separate dark edition is a decision, not a requirement.

When a visible problem remains, make a targeted correction and review the
affected placement again. Do not equate a successful build with visual
acceptance. Run the repository checks appropriate to the changes, and report
the result with a rendered preview and any remaining limitation. Record new
examples in ARTWORK.md as examples, without making their medium or layout a
rule for future essays.
