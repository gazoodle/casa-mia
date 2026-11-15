// Whose fridge it is: the three households the Fridge can be dressed as. A household is
// data and nothing else, as a paper's voice is in the Gazette: its colours, the magnets it
// owns, the odd words among its word magnets and what else is stuck to its door.
// styles.ts has each one's door and handwriting, under the class of its id.

export type Skin = {
  id: string;
  label: string; // on the magnet that chooses it
  picker: string; // that magnet: a novelty's name
  colours: string[]; // its button magnets
  holders: string[]; // the novelty magnets that hold its photographs; the first holds the first camera's
  pad: string; // the heading of its notepad
  words: string[]; // word magnets that are only words, among the ones that are scenes
  extra: { title: string; lines: string[]; holder: string }; // one more thing on the door: a list, a card
};

export const SKINS: Skin[] = [
  {
    id: "family", label: "Young family", picker: "teddy",
    colours: ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#9b5de5", "#f15bb5", "#e9b949"],
    holders: ["butterfly", "ladybird", "bee", "frog", "strawberry", "sun", "star", "heart", "fish", "cat", "flower", "apple"],
    pad: "Today", words: ["we", "love", "toast", "bath", "story", "jam", "wellies"],
    extra: { title: "Star chart", lines: ["Teeth  ★ ★ ★", "Shoes on  ★ ★", "Peas eaten  ★"], holder: "star" },
  },
  {
    id: "yuppies", label: "Yuppies", picker: "briefcase",
    colours: ["#20242a", "#3a4250", "#59636f", "#c7541e"],
    holders: ["butterfly", "apple", "fish", "star"],
    pad: "To do", words: ["espresso", "deadline", "brunch", "inbox", "taxi", "gym"],
    extra: { title: "ESSENTIALS", lines: ["oat milk", "espresso pods", "limes", "sparkling water"], holder: "apple" },
  },
  {
    id: "grandparents", label: "Grandparents", picker: "teacup",
    colours: ["#8f3d3d", "#3f6b5a", "#3b5a8a", "#b08a35", "#7a4a6a"],
    holders: ["butterfly", "flower", "cat", "strawberry", "ladybird", "apple", "heart"],
    pad: "Don't forget", words: ["tea", "biscuits", "crossword", "wireless", "garden", "the"],
    extra: { title: "Greetings from Sandy Bay", lines: ["Weather lovely.", "Wish you were here!"], holder: "flower" },
  },
];
