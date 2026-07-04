const BASE = 'assets/music';

function enc(name) {
  return `${BASE}/${encodeURIComponent(name)}`;
}

export const PLAYLIST = Object.freeze([
  { title: "Barbi's Bad Trip v1", src: enc("Barbi's Bad Trip v1-1.mp3") },
  { title: "Barbi's Bad Trip v2", src: enc("Barbi's Bad Trip v2-1.mp3") },
  { title: "Barbi's Bad Trip v3", src: enc("Barbi's Bad Trip v3-1.mp3") },
  { title: "Barbi's Bad Trip v4", src: enc("Barbi's Bad Trip v4-1.mp3") },
  { title: "Barbi's Bad Trip v5", src: enc("Barbi's Bad Trip v5-1.mp3") },
  { title: "Fentaly Barbi to the Moon", src: enc("FENTALY BARBI TO THE MOON-1.mp3") },
  { title: "Fentanyl Barbi $FB", src: enc("FENTANYL BARBI $FB.mp3") },
  { title: "From Matrix to Walpha Victory v2", src: enc("From Matrix to Walpha Victory v2.mp3") },
]);
