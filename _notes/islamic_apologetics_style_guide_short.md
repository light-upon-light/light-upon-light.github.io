# House Style: Reverent Analytical Apologetics

Guidance for the prose of the articles on this site — the Qur'an's miraculous
character, the Prophet's ﷺ life, and answers to criticism of Islam.

---

## The voice

You are a careful person who has looked into something closely and is telling an
intelligent stranger what you found. That stranger is sceptical, owes you
nothing, and can stop reading at any point. They are not your friend, your
student, or your opponent, and the prose should treat them as none of the three.

**Do not perform.** No invented scenes, no aphorism standing where a conclusion
belongs, no rhetorical question in place of a statement, no addressing the
reader to manufacture closeness. A sentence written to be admired gets read as a
sentence written to persuade, and the reader discounts it accordingly. This is
the single most common failure in drafts of these articles.

**Write for someone reading once.** Short paragraphs, one idea each, concrete
nouns, and the ordinary English word rather than its formal synonym. Technical
vocabulary stays — *hijāʾ*, *rajaz*, *tawhid*, *exoteric* — and gets glossed on
first use in each section that uses it. What goes is the ordinary word dressed
up: *supplies* for *gives*, *obtains* for *is true*, *evidences* for *shows*.

**Reverence is in what you say about the subject and in refusing to overstate
it, not in the register you say it in.** Formality is not reverence and
stiffness is not respect. The plainest sentence in a section is often the most
reverent one in it.

**Say plainly when something is remarkable.** Reporting an extraordinary fact in
a flat voice is not neutrality; it is a second claim, made silently, that the
fact is ordinary. *Astonishing mathematical structures are embedded in the text*
is the accurate sentence. *The text contains numerical patterns* is not. An
evaluative word is earned when the evidence beside it supports it — and only
then, which is why *astonishing* is available and *undeniable* is not.

**Authority comes from the evidence sitting next to the claim.** Every point
carries its source in a form the reader can check. That is what earns trust, not
formal diction, which reads as distance, and not manufactured warmth, which on
this subject reads as sales.

---

## A bullet that works

The articles carry their evidence as a numbered claim with indented blocks
beneath it. This is the pattern to imitate:

```markdown
1. It **challenged the Arabs** to match it at the height of their command of Arabic. They had the **skill** to answer and every **motive**.
    > The Qur'an was revealed in an era when the **Arabs** had reached the very **summit of Arabic** language eloquence and rhetoric. **Poetry** was not mere entertainment; it was the **lifeblood of their culture**, the **measure of honor**, and even a **weapon in war**—tribes would settle disputes or ignite battles through verses. In this context, where **pride in language** was unrivaled and **mastery of Arabic** expression was their greatest art, the **Qur'an openly challenged** them to produce anything like it. Despite their unmatched command of Arabic and every worldly motive to discredit the Prophet ﷺ, they were unable to respond, and **their failure** itself became a **perpetual testimony** to the **Qur'an's inimitability**.
    {: .gloss }

    > Ibn Rashīq, *al-ʿUmda*: when a poet appeared in a tribe, the neighbouring tribes came to congratulate it, with feasting and singing as at a wedding.
    >
    > Poets competed in public at the annual fair of ʿUkāẓ, and the *rajaz* metre existed largely for verse improvised on the battlefield, where champions traded lines before they traded blows.
    >
    > *Hijāʾ*, satire aimed at a rival tribe, counted as an act of war in itself, and could settle a quarrel in place of one.
    >
    > *Ṣaḥīḥ al-Bukhārī* 3213 and *Ṣaḥīḥ Muslim* 2490: the Prophet ﷺ set his own poet Ḥassān ibn Thābit on the Quraysh — "Lampoon them, and Gabriel is with you" — because satire "is more grievous to them than the hurt of an arrow".
    {: .src }
```

What each part is doing:

- **The claim line** states the point and bolds the words a reader skimming the
  page needs. Read the bold spans alone and they still say something: *challenged
  the Arabs … skill … motive*.
- **The `.gloss`** is the author's voice. It sets up why the claim matters
  before the apparatus arrives, so the reader knows what they are looking at
  when it does. Bold inside it where it carries the argument.
- **The `.src`** is the apparatus: named sources, one fact per paragraph, no
  argument. Separate paragraphs matter — four facts run together into one block
  is the commonest reason a bullet reads as heavy.

A second shape, where the source comes first because the claim is a single
historical episode:

```markdown
1. He went to **Ṭāʾif** seeking refuge and was driven out by a mob that stoned him until he bled. An angel offered to destroy the city, and he **declined**, hoping instead that their descendants would come to worship God.
    > *Ṣaḥīḥ al-Bukhārī* 3231. Aisha asked him whether any day had been harder than the battle of Uhud, and this was the day he named. The angel of the mountains offered to crush the two mountains upon the town. He answered: "No, but I hope that God will bring forth from their loins those who worship God alone."
    {: .src }

    > A man inventing a divine mandate had just been handed the perfect proof of it, in front of the town that had driven him out. He refused it.
    {: .gloss }
```

**The blocks.** A quotation carries its attribution at the end; everything else
carries its source at the front. Tag every block: `{: .quote }` for Qur'an or
hadith, `{: .src }` for source-led detail, `{: .gloss }` for the author's
commentary. Gold is scripture and nothing else. A blockquote holding only a link
stays untagged.

**Order** is quotation, then Arabic, then the supporting blocks — except that a
`.gloss` may come first where it is what makes the evidence legible, as above.
One `.src` and one `.gloss` per bullet at most, and never two blocks doing the
same job.

**No bullet repeats itself.** If the gloss makes a point, the claim line does not
also make it, and neither does the bullet above.

---

## What goes wrong

Every line in the left column was written for these articles and cut.

| Written | Why it failed | Kept instead |
| --- | --- | --- |
| Recitation carries across the language barrier. | Nobody says this. Plain word by word, and no phrase a person would use. It also drops the beauty, which was the point. | Flows perfectly and is beautifully melodic, with a profound effect on the heart. |
| deeper senses that scholars have drawn out | A vague English noun bolted to a precise term. The fix is never to drop the technical word; it is to fix the ordinary ones around it. | the *esoteric* meanings, several layers of them, which scholars have been drawing out for fourteen centuries |
| One good chapter would have finished him in an afternoon. | Invented drama, and it overstates: a poem would not have finished him. Punch almost always smuggles in a claim the evidence does not carry. | They never produced it, and they went to war instead. |
| … weep listening to it, before anyone tells them what it means. | Invents a person doing the telling. The scene is not in the evidence. | … to weep when listening to it, without even knowing what it means. |
| Everything claimed below concerns a work of that length. | The article narrating itself. | a full-length book, not a handful of memorable sayings |
| The next section sets out what it cost the man who brought it. | Same. The heading already says so. | *cut* |
| Think about what that takes … It is one item on this list. | Performed instruction to the reader, closing on a gnomic self-reference. | Revelation that arrived in pieces, out of order, and fixed on first utterance is the hardest possible condition under which to build a symmetry across a whole book. |
| Stakes its authenticity on having no contradictions, and hands you the test to run. | Reader-address for effect. | … and names that as the test to run against it. |
| Contains numerical and structural patterns running through the text. | Flat where the fact is not. Neutral phrasing here misreports. | Astonishing mathematical structures are embedded in the text. |
| A verse stood in the wording it was first recited in. Later revelation could change a ruling, and the earlier wording stayed unaltered. | Pre-empting an objection nobody raised, at the cost of the point. | Once he spoke a verse it was fixed: no retraction, no revision, no going back later to smooth an earlier line. |
| Became the standard against which Arabic grammar was codified. | Implies the claim instead of making it. | They took the Qur'an as the standard of correct Arabic since it contains no linguistic errors. |
| Power arrived, and the behaviour did not change. | Aphorism in place of the conclusion. Elegant, and it costs a second pass. | For twenty-one years he had no power to punish anyone. He now had it over the people who had tortured his followers, and he used it to let them go. |
| He was never once refused a request that he was able to grant. | Passive plus negation inverts silently: it says other people never refused *him*. | He never refused a request he was able to grant. |
| a mechanism that steadily drained the institution from within | Abstract where people were available. | every broken oath set someone free, so the law kept emptying the institution |

---

## The rules

**1. Say it plainly, specifically, and as strongly as the evidence allows.**
Neither hedge a fact that is solid nor inflate one that is not.

**2. Nothing goes in the sentence that is not in the evidence.** Rewriting for
cadence tends to smuggle in a small scene — someone doing the telling, an
afternoon it would have taken, a crowd that turned. Cut the picture, keep the
fact.

**3. State the step the argument rests on. Leave the rest to the reader.** The
test: could someone reach the next paragraph having drawn the *wrong*
conclusion? Then state it. If the only risk is that they got there a beat early,
cut the sentence. Prose that states every inference reads as though it does not
trust them.

**4. Keep the reader and the article out of the prose.** No *you* except in an
instruction the reader can act on. No *think about what that takes*, no *try
that with a novel*, no sentence describing what this section or the next one is
about to do. They came to check an argument, not to be addressed.

**5. Precision outranks rhythm.** Median sentence under twenty words, long
followed by short, vary the shape — these are the lowest-priority rules here. A
qualifier that makes a claim true, a date that fixes a sequence, or a criterion
that belongs in a list stays in, whatever it costs the cadence.

**6. Edit for the fault, not for the style.** These rules are diagnostic, not a
template. A sentence that reads cleanly the first time is finished, whatever its
shape. Rewrite it when it fails a test above — it needs a second pass, it buries
a step, it repeats its neighbour, it says something inaccurate. A revision whose
diff touches every line has stopped editing and started rewriting, and rewriting
loses what the author put there on purpose.

**7. Confidence, never polemic.** Correct errors calmly and without adjectives
aimed at the person who made them. *This claim depends on assumptions that do
not survive examination*, never *this has been destroyed countless times*. Do not
mirror hostility, do not simplify an objection until it is easy to answer, and
do not call a criticism answered until the reasoning behind it has been.
