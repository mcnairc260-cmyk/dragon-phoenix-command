# -*- coding: utf-8 -*-
"""Single source of truth for the book's words.

Both build_epub.py (ebook) and build_painted.py (print PDF + web flipbook)
import from here, so a wording change only has to be made once.
"""

TITLE = u"Princess Lia and the Littlest Knight"
SUBTITLE = u"A tale of two brave hearts"
AUTHOR = u"Uncle Courtney"        # <- the name that gets published on the store
COVER_SUB = u"A tale of two brave hearts ✦ starring Lia & Lachlan"

DEDICATION = (u"For Lia and Lachlan — may you always be as brave as you are kind, "
              u"and may every star you wish on shine right back at you.")
DEDICATION_LINES = (u"For Lia and Lachlan —<br/>may you always be as brave as you are kind,<br/>"
                    u"and may every star you wish on<br/>shine right back at you.")
SIGNATURE = u"With all my love,<br/>your Uncle Courtney,<br/>who loves you both dearly."

BLURB_1 = (u"When the Great Star above the Kingdom of Everbright goes dim, it takes a brave "
           u"princess, the littlest knight, and one very lonely baby dragon to light it up again.")
BLURB_2 = (u"A bedtime adventure about holding hands, being brave, and the magic of a kind heart.")
BACK_CREDIT = (u"&#10022; MADE WITH LOVE FOR LIA &amp; LACHLAN<br/>BY THEIR UNCLE COURTNEY &#10022;")

COVER_ALT = (u"Princess Lia and Sir Lachlan stand hand in hand on a hilltop at night before a "
             u"glowing fairy-tale castle, a baby dragon peeking over the boy's shoulder and a "
             u"great golden star shining above the tallest tower.")

# (story text, illustration alt text) for pages 1..14
PAGES = [
    (u"Once upon a time, in the golden Kingdom of Everbright, there lived a little princess named Lia. She had sunshine hair, sky-blue eyes, and the kindest heart in all the land.",
     u"Princess Lia twirls in her rose-pink gown in a sunny castle garden full of pink roses and butterflies."),
    (u"And wherever Princess Lia went, there toddled her favorite knight in the whole wide world — Sir Lachlan the Littlest. His sword was wooden. His helmet was wobbly. But his heart was as big as the castle. “Go-go!” he cheered. It was his favorite word.",
     u"Sir Lachlan marches proudly across a castle courtyard, his helmet over one eye and his wooden sword raised, while Lia giggles behind him."),
    (u"Every night, the Great Star above the castle filled Everbright with light and color. But one morning, Lia looked out her window and gasped. The roses were turning gray! The banners drooped! High above the tallest tower, the Great Star had gone dim.",
     u"Lia looks worried at an arched castle window while the kingdom outside fades to gray beneath a dim star."),
    (u"“Someone has to bring back the light,” said Princess Lia, putting on her bravest face. Sir Lachlan lifted his little wooden sword. “Go-go!” And so, hand in hand, the two marched out through the great castle gates.",
     u"Lia and Lachlan walk hand in hand through enormous open castle gates toward a winding path and golden morning light."),
    (u"They tramped into the Whispering Woods, where the trees hummed lullabies and fireflies lit the path like tiny floating lanterns. “Hello, trees!” called Lia. The leaves waved back.",
     u"The two children walk a mossy forest path lit by hundreds of golden fireflies beneath giant friendly trees."),
    (u"At the Giggling Brook, they hopped from stone to stone. Hop! Hop! Whoops — Lachlan slipped! But quick as a wish, Lia caught his hand. “I’ve got you, little knight,” she said. “We stick together.”",
     u"Lachlan wobbles on a stepping stone in a sparkling brook while Lia catches his hand to steady him."),
    (u"Deep in the woods, a silver owl swooped down. “Whoo seeks the light?” she asked. “We do!” said Lia. The owl blinked her moon-round eyes. “The Great Star fell from the sky… into the Dragon’s Cave on Moonberry Hill.”",
     u"A silver owl on a low branch speaks to the two children at twilight among glowing purple moonberry bushes."),
    (u"A dragon?! Lia’s tummy did a flip-flop. But she squeezed Lachlan’s hand, and Lachlan squeezed right back. That is how brave works — it’s easier when you hold hands. Up, up Moonberry Hill they climbed, all the way to the deep, dark cave.",
     u"Lia and Lachlan climb a purple flowered hillside at night toward a cave mouth glowing with warm light."),
    (u"But inside the cave there was no big scary dragon at all. There was a baby dragon — small and round as a puppy — curled around the glowing Great Star. And the baby dragon was… crying. Plip. Plip. Plip.",
     u"A tiny pink and gold baby dragon curls around a radiant golden star inside a cave, crying sparkling tears."),
    (u"“I’m sorry,” sniffled the little dragon. “My name is Ember. I was cold, and I was lonely, and the star was so warm… I didn’t know the whole kingdom would go gray.”",
     u"Ember the baby dragon looks up with a tear on its cheek as Lia kneels to listen and Lachlan peeks from behind her."),
    (u"Princess Lia did not draw a sword. Princesses like Lia know a better magic. She wrapped Ember in the biggest, warmest hug. “You don’t have to be lonely anymore,” she said. “Come home with us.” Lachlan patted Ember’s nose. “Go-go!”",
     u"Lia hugs Ember the baby dragon in a burst of golden light while Lachlan gently pats the dragon's nose."),
    (u"So Ember stretched her little wings — flap, flap, WHOOSH! — and flew Lia and Lachlan up, up, past the clouds, to hang the Great Star back in the sky. It burst into light! And every color came flooding home: pink for the roses, purple for the banners, gold for every tower.",
     u"The children ride the flying baby dragon high above the kingdom, placing the blazing golden star back in the starry sky as color floods the land below."),
    (u"That night, the castle held the grandest ball Everbright had ever seen — for Princess Lia, Sir Lachlan the Littlest, and Ember, the newest friend of the kingdom. Because the bravest thing of all isn’t a sword or a crown. It’s a kind heart.",
     u"Lia twirls at a joyful castle ball with Lachlan dancing beside her and Ember wearing a tiny bow, under glowing chandeliers and confetti."),
    (u"And when the music grew soft and the candles grew sleepy, the littlest knight climbed onto the princess’s shoulder and closed his eyes. High above the castle, the Great Star shone its brightest — right over two brave hearts. Goodnight, Lia. Goodnight, Lachlan. The end.",
     u"On a quiet castle balcony at night, Lachlan sleeps against Lia's shoulder with Ember curled at their feet beneath a huge glowing star."),
]
