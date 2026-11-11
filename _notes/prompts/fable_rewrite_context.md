# Context sent with each Fable rewrite call

`fable_rewrite.md` is the system prompt. Each call's user message is one of the
templates below, with `{...}` filled in. `fable_rewrite_v1.md` is the first
version of the system prompt, replaced by `fable_rewrite.md`.

## How each call was run

Each item gets its own isolated call, from an empty folder, with no tools and no
CLAUDE.md (environment variable `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`):

```bash
claude -p --model claude-fable-5-2 --system-prompt "$SYSTEM" --tools "" --setting-sources "" --strict-mcp-config --disable-slash-commands --no-session-persistence --output-format json
```

The user message goes in on stdin.

## Numbered point or standalone paragraph

`{label}` is `point` or `paragraph`. The neighbours are the adjacent points or
paragraphs in the same section.

```
Page: the cumulative case for the Qur'an's divine origin and the prophethood of Muhammad ﷺ.
Section: {title}
Previous {label}: {previous, or (none)}
Next {label}: {next, or (none)}

<rewrite>
{text}
</rewrite>
```

## Item with its own group as context

Used for the Summary, "Why Read This?", and the Cumulative Case. The other items
in the group are listed in page order, with the placeholder where the item sits.

```
Page: the cumulative case for the Qur'an's divine origin and the prophethood of Muhammad ﷺ.
Section: {group title}
{form note, if any}Rest of this section (context only):
{other lines, with [THE TEXT TO REWRITE SITS HERE] in the item's place}

<rewrite>
{text}
</rewrite>
```

## Form notes

Added for a bullet:

```
This text is one bullet in a parallel list. Keep its bullet marker, keep it a single line, and keep its opening grammatical form so it still fits the list and any sentence leading into it.
```

Added for a continuous run of paragraphs sent as one unit. In the first template
it goes on the line after `Next {label}`:

```
This text is one continuous run of paragraphs. You may restructure across them: merge or split paragraphs and move material between them. Separate paragraphs with one blank line.
```

Added when a run is followed directly by a Qur'anic quotation:

```
A Qur'anic quotation follows immediately after this text, so its last sentence must still lead into it.
```

## Summary prompts

`summary_rework.md` and `summary_revise.md` are system prompts. Their user
message is:

```
<page>
{digest of the page}
</page>

<rewrite>
{current summary}
</rewrite>
```

The digest is the page body up to `## Playlist`, without `<details>` boxes, HTML
comments, blockquotes, attribute lines, tables, Liquid tags, lines containing
Arabic, link URLs, or HTML tags.
