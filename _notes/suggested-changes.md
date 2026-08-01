# Suggested substantive changes — not implemented

These are changes that would alter the **substance** of the arguments, which was declared
off-limits for the automated pass. Nothing here has been applied. Sections are referenced by
heading rather than line number, since line numbers shift.

Compiled 2026-07-31.

---

## `_pages/aisha.md`

### 1. Claims that are asserted without a source, on a page that footnotes everything else

This page carries 15 footnotes and is careful about sourcing, which makes the unsourced
claims stand out more than they would elsewhere. Each of these is stated as fact with no
citation:

| Claim | Section | Note |
|---|---|---|
| The Prophet ﷺ was known as *al-Amin*, and Quraysh left valuables with him | His character | Widely reported, but the page cites everything else — this should carry a footnote too. |
| The Urwa ibn al-Zubayr quotation | Aisha's scholarship | The adjacent footnote covers only the preceding Abu Musa sentence, not this quotation. |
| The slander episode and the revelation of Surah al-Nur | The slander | No verse range is given inline, though 24:11–20 appears in Further reading. See item 2. |
| "drank from the place on the cup where her lips had been" | Inside the marriage | Reported in Ṣaḥīḥ Muslim (~300); currently unsourced here. |
| He annulled marriages imposed on women without consent | Consent | The strongest single point in the consent argument, and the only one with no citation. |

**Recommendation:** add footnotes, or soften the specificity to match what you can source.
The annulment claim is worth sourcing first — it does the most argumentative work.

### 2. Surah al-Nur is argued from but never quoted

24:11–20 is discussed substantively and listed in Further reading, but its text appears
neither in English nor in Arabic. It is the only Qur'anic passage on the page argued from
without being quoted. Either quote it (with the Arabic block, matching the page's pattern)
or drop it from Further reading.

### 3. Section ordering

Evidence sections and rebuttal sections are interleaved rather than grouped:

- *The limits of "it was normal then"* and *The same standard elsewhere* make substantially
  the same move, but sit far apart with unrelated material between them.
- *The word "pedophilia"* re-runs the marriage-pattern evidence already presented in
  *His marriages as a whole*.

**Recommendation:** group the evidence sections first, then the objection/rebuttal sections.
Merge the two "it was normal then" sections. This is a restructure, not a rewrite — the
prose can largely move intact.

### 4. Two sections cover overlapping ground

*Aisha's scholarship* and *What the marriage produced* both argue that she taught for
decades and that senior men studied under her. Tier 3 cut the near-verbatim restatements,
but the underlying overlap remains. Either merge them, or draw a sharper line: scholarship =
what she knew and taught; what the marriage produced = the transmission consequences.

---

## `_pages/wadribuhunna.md`

### 5. The "diversity of scholarly interpretation" section names one scholar

The heading was retitled in Tier 3 to match what the section actually contains, because
adding scholars would have been a substantive change. If you want the original heading back,
the section needs more names — Ibn ʿĀshūr is the only one it cites, and al-Ṭabarī is already
spent earlier in the page.

**Recommendation:** add two or three more classical or modern authorities who read the verse
non-physically or restrictively, then restore the stronger heading. This is the single
highest-value substantive addition available on this page.

### 6. The Arabic hadith are quoted without translation

Several hadith appear in Arabic with an English gloss nearby, but the relationship between
the two is not always explicit, and a reader without Arabic cannot tell which English
sentence corresponds to which Arabic quotation. Consider the English-then-Arabic pattern
used for the Qur'an citations throughout the site.

---

## `_pages/quran.md`

### 7. "Common Questions" contains no answers

The section is a list of questions, each answered only by a link to a video. A reader who
will not watch a 40-minute video gets nothing. This is the weakest section on the page
relative to its prominence.

**Recommendation:** write two or three sentences under each question, keeping the video link
as further reading. Even a short answer changes the section from a bookmark list into
content.

### 8. Bare link sections

*Playlist* is a heading containing one link. *Other useful links* is a heading containing one
link and overlaps *Links*. Consider merging all three into a single *Further reading* section
with brief annotations saying what each resource is and why it's worth the time.

### 9. Claims that would benefit from sourcing

Several strong empirical claims are made without references:

- Statistics on the proportion of non-native-Arabic-speaking memorisers
- The ring-structure / chiastic analysis
- The claim that linguistic analysis shows measurable stylistic separation between the
  Qur'an and the hadith corpus

The last is the most load-bearing and the most checkable — it is also the one a hostile
reader is most likely to challenge. It should cite the specific study.

### 10. The inimitability challenge is made three times

Tier 3 removed the near-verbatim restatements, but the point still appears in both
*Literary Miracle* and *Challenges and Bold Claims*. Those two sections have overlapping
remits. Consider merging them, or making the first about the text's qualities and the second
strictly about the challenge and its historical reception.

### 11. Register

The page keeps its informal voice by your instruction, with the slang removed. Worth knowing:
it now sits between two formal pages that link to it. If the site is aimed at sceptical
readers rather than existing believers, the informality of the overview page may undercut the
carefulness of the other two. Not a defect — a positioning decision.

---

## Cross-cutting

### 12. Nothing states which translation is used, up front

Tier 3 attributed individual quotations. A single line in each page's introduction — "Qur'an
translations are from X unless noted" — would be cleaner than per-quote attribution, if you
would rather reduce the inline noise.

### 13. No dates on the pages

None of the three articles shows a published or updated date. For material making historical
and scholarly claims, a visible "last updated" date is a credibility signal. Minimal Mistakes
supports `last_modified_at` in front matter.

### 14. The unused 2.2 MB image

`assets/images/chatgpt_quran.png` is referenced by nothing and is 2.2 MB — the largest object
in the repository by a wide margin. Kept at your instruction. If it was meant to illustrate a
point on the Qur'an page, it should be placed there with alt text; otherwise it is dead weight
in every clone of the repo.
