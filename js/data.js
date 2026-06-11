/* Zone definitions and story flavor text. */

const ZONES = [
  {
    id: 'meadow',
    name: 'Sunny Meadow',
    emoji: '🌻',
    tables: [1, 2],
    color: '#f9a826',
    intro: 'Whisker wakes up in a meadow full of sunflowers. Time to explore!',
    obstacles: [
      'A gate of sunflowers blocks the path!',
      'A friendly bunny wants to play a number game!',
      'Butterflies spell out a puzzle in the air!',
      'A wobbly bridge needs the magic number to hold!',
      'A ladybug asks for help counting her spots!',
    ],
  },
  {
    id: 'woods',
    name: 'Whisker Woods',
    emoji: '🌲',
    tables: [3, 4],
    color: '#5b9c4a',
    intro: 'The woods are shady and full of secrets. Whisker pads in bravely.',
    obstacles: [
      'A wise old owl hoots a riddle from a branch!',
      'Tangled vines block the trail!',
      'A squirrel will trade acorns for the right answer!',
      'Mysterious paw prints lead to a number lock!',
      'A hollow log echoes with a math question!',
    ],
  },
  {
    id: 'beach',
    name: 'Berry Beach',
    emoji: '🏖️',
    tables: [5, 6],
    color: '#2aa5a0',
    intro: 'Waves splash and berries grow right by the sand. Whisker loves it here!',
    obstacles: [
      'A crab snaps a tricky question with its claws!',
      'A message in a bottle holds a puzzle!',
      'Stepping stones across a tide pool need the magic number!',
      'A seagull guards the berry bush with a riddle!',
      'A sandcastle door only opens for the right answer!',
    ],
  },
  {
    id: 'hollow',
    name: 'Mushroom Hollow',
    emoji: '🍄',
    tables: [7, 8],
    color: '#c0564f',
    intro: 'Glowing mushrooms light the hollow. These are the trickiest tables — Whisker believes in you!',
    obstacles: [
      'A giant mushroom won’t budge without the answer!',
      'Fireflies blink out a number puzzle!',
      'A grumpy toad guards the mossy path!',
      'A ring of toadstools hides a secret code!',
      'A glowworm lights the way — for a price!',
    ],
  },
  {
    id: 'cave',
    name: 'Crystal Cave',
    emoji: '💎',
    tables: [9, 10],
    color: '#6f5fb5',
    intro: 'Crystals sparkle in every color. Whisker’s eyes go wide!',
    obstacles: [
      'A crystal door is sealed with a number lock!',
      'A sleepy bat mumbles a math riddle!',
      'Gems light up — but only for the right answer!',
      'An echo asks the same question three times!',
      'A treasure chest needs the magic number!',
    ],
  },
  {
    id: 'summit',
    name: 'Star Summit',
    emoji: '⭐',
    tables: [11, 12],
    color: '#e2731c',
    intro: 'The very top of the world! Stars feel close enough to touch.',
    obstacles: [
      'A shooting star drops a puzzle from the sky!',
      'The summit gate glows with a final challenge!',
      'A cloud spirit whispers a tricky question!',
      'Starlight spells out a number riddle!',
      'The grand star door awaits the magic number!',
    ],
  },
];

const PRAISE = [
  'Purr-fect!', 'Paw-some job!', 'Meow-nificent!', 'You’re a star!',
  'Whisker is so proud!', 'Cat-tastic!', 'Super smart!', 'Brilliant!',
];

const ENCOURAGE = [
  'So close! Try once more!', 'Almost! You can do it!',
  'Hmm, not quite — one more try!', 'Whisker believes in you!',
];

const QUESTIONS_PER_ZONE = 10;
