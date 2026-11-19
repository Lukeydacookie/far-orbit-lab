// This page fetches the real game files. textContent displays code as text,
// so HTML and JavaScript in the chosen file are never executed in the viewer.
const SOURCE_FILES = [
  {
    name: "scoring.js", label: "Points & settings",
    description: "The smallest place to start. This file sets the time limit and turns a match level into a score.",
    notes: [
      "GAME_RULES sets 120/300/600 connection points, a 300-point niche bonus and up to 100 speed points. The maximum per signal is 1,000. pointsPerFlightUnit controls travel distance.",
      "scoreAnswer adds connection points, rarity points, and a speed bonus. The full 100-point speed bonus lasts for three seconds, then decreases proportionally with the time left.",
      "pointsFor also reads older saved answers. Their original match level is converted with no speed bonus because their response time was never recorded.",
      "LEAGUES defines the six score intervals and colors. optimalChoices returns the authored best answers and their maximum score; maximumScore adds the real maxima for the mission.",
    ],
  },
  {
    name: "game.js", label: "Rounds & timer",
    description: "This file runs the game. It connects the clues, typed answers, saved progress, timer, scoring, and camera.",
    notes: [
      "tierMatch looks for the typed answer in the puzzle’s authored answer lists. It ignores capitalization, accents, and punctuation, and accepts listed alternate names.",
      "startSignal saves a deadline. updateClock subtracts the current time from that deadline. requestAnimationFrame redraws the bar before each repaint, using milliseconds rather than whole seconds.",
      "recordAnswer locks in one answer, calls scoreAnswer, saves the result, and updates the screen. The next signal starts only after you press its button.",
      "continueVoyage keeps all earlier answers and distance, selects the next six exploration puzzles, and saves the exploration separately from the scored daily mission.",
    ],
  },
  {
    name: "spelling.js", label: "Spelling suggestions",
    description: "This file helps with typos without silently submitting a different answer.",
    notes: [
      "editDistance counts inserted, missing, replaced and swapped letters. Spanishs is one edit away from Spanish; spanihs is one letter swap away.",
      "suggestAnswers checks only the current puzzle’s authored choices, excludes the three supplied clues, and returns up to three equally close corrections. Short words need an exact match.",
      "game.js displays Did you mean…? with a Use button. Confirming checks that the same question, input and deadline are still active before scoring the corrected answer. The timer continues while choosing.",
    ],
  },
  {
    name: "missions.js", label: "Clues & answers",
    description: "This file broadens the daily puzzle calendar. Each mission has six rounds with at least five accepted direct choices per round.",
    notes: [
      "replaceRound(day, signal, puzzle) updates one slot in the calendar. Day and signal count from zero. round(clues, hint, direct, close, related, bonus) creates a puzzle. Direct answers fit the intended connection. Close and related answers earn fewer points.",
      "A vertical bar separates different answers. A slash separates alternate spellings for one answer. For example, Saxophone/Sax accepts either name.",
      "The optional bonus argument lists the primary names of direct answers selected as less obvious. Their alternate names receive the same bonus.",
      "FIRST_MISSION sets the first date. The initial twelve missions run November 17–28, 2026. The game labels later editions as replays until more missions are added.",
    ],
  },
  {
    name: "route.js", label: "Route & distance",
    description: "This file defines the planets, keeps distance open-ended, and turns scores into travel.",
    notes: [
      "STOPS lists the real solar-system destinations and Proxima Centauri. checkpoint(index) generates labelled imagined worlds after that list, so there is no final checkpoint.",
      "flightFor combines answers from the daily flight and later exploration legs. Every 400 points adds one flight unit: a 1,000-point answer can jump 2.5 checkpoints. Misses cause a small drift near the same body.",
      "routeWindow shows a moving section of the bottom distance bar. It never claims the voyage is 100% complete. overviewIndices keeps Earth and the current region visible on long voyages; the report ledger lists every crossed checkpoint.",
      "Planet facts link to NASA. Generated outer worlds are explicitly imagined, and flight units are adjusted game distances.",
    ],
  },
  {
    name: "chart.js", label: "Space & motion",
    description: "This file draws the full-screen space scene using the browser’s Canvas API.",
    notes: [
      "The sky, planets, complete rock sprite and pointed-wing rear-view probe use matching generated artwork. Each asteroid has its own depth and size; nearby rocks pass in front of the craft. Sizes and distances are adjusted for the game.",
      "flightPath defines one continuous curved corridor in world space. The probe follows its tangent with yaw, pitch and banking, while a slower chase camera follows its position. Screen position comes from the distance between camera and craft, instead of a sideways offset tied to roll. A left-side planet still lowers the left wing; a right-side planet lowers the right wing.",
      "setFlight starts a chase flight whose duration grows for multi-checkpoint jumps. draw moves the camera along the route. Perspective makes nearby worlds grow and pass out of view. A miss advances only a little and keeps the current world nearby. When the flight report opens, a 2.6-second pullback reveals an overhead route. Solid lines show distance covered, dotted lines show what is still ahead, and a marker shows the current position with more route ahead.",
      "paintProbe rotates the rear-view artwork in three dimensions and projects its strips: the near wing gets larger and the far wing recedes. The long panels still flex gently while typing. The engine wake attaches to the projected nozzle and trails behind the heading. Stars, rocks and planets all share the camera position for parallax. Reduced-motion preferences stop this animation. Artwork, tinted ice rocks, glows and soft trails are cached once. Busy displays can lower pixel density to preserve steadier motion.",
    ],
  },
  {
    name: "audio.js", label: "Music & sounds",
    description: "The quiet ambient music and answer sounds are created with the Web Audio API.",
    notes: [
      "An AudioContext starts after the player presses Start. tone creates a note with a soft volume envelope and stereo position.",
      "playChord cycles through four original ambient chords. Reverb gives the sustained notes their airy sound.",
      "cue plays a rising chime for a recognized answer, a brighter sequence for a niche hit, and two low notes for an unrecognized guess or timeout.",
      "The Sound button mutes both the music and effects. Its preference is saved, and audio fades out when the tab is hidden.",
    ],
  },
  {
    name: "legacy-missions.js", label: "Base calendar",
    description: "The base puzzle calendar is broadened by missions.js before any fresh flight starts.",
    notes: [
      "New missions start from this calendar and apply the broader replacements in missions.js.",
      "readSaved compares older saved questions with the current edition. Changed flights are retained as score summaries in Stats and a fresh flight starts with the new prompts.",
      "For new daily rounds, edit missions.js and update MISSION_REVISION. Earlier answers remain stored with their original questions, so their scores can be preserved without regrading them against new clues.",
    ],
  },
  {
    name: "index.html", label: "Page structure",
    description: "HTML defines what is on the page and loads the other files in the right order.",
    notes: [
      "The canvas is the space background. The question, text input, buttons, and menus are normal HTML controls that work with keyboards and screen readers.",
      "Script tags load missions and scoring before game.js, because the game needs those definitions before it starts.",
      "Element IDs are names used by JavaScript to update a specific part of the screen, such as the score or current world.",
    ],
  },
  {
    name: "style.css", label: "Layout & type",
    description: "CSS controls the visual design, spacing, fonts, and layout on different screen sizes.",
    notes: [
      ":root defines shared colors and font families. Change those variables to change the look throughout the interface.",
      ".voyage lays out the scene caption and question on large screens. The media query rearranges them for a phone.",
      ".shake defines the input animation after an unrecognized answer. Reduced-motion preferences turn off that animation.",
    ],
  },
];
const tabs = document.getElementById("source-tabs");
const sourceText = document.getElementById("source-text");
let currentFile = "";
let requestNumber = 0;

tabs.innerHTML = SOURCE_FILES.map((file) =>
  '<button type="button" data-file="' + file.name + '"><strong>' + file.label +
  '</strong><small>' + file.name + '</small></button>').join("");

async function openSource(name) {
  const file = SOURCE_FILES.find((item) => item.name === name) || SOURCE_FILES[0];
  currentFile = file.name;
  const thisRequest = ++requestNumber;
  tabs.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.file === currentFile));
  });
  document.getElementById("file-title").textContent = file.name;
  document.getElementById("file-description").textContent = file.description;
  const notes = document.getElementById("file-notes");
  notes.replaceChildren(...file.notes.map((note) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = note;
    return paragraph;
  }));
  document.getElementById("download-source").href = "./" + file.name;
  sourceText.textContent = "Loading source…";
  const url = new URL(location.href);
  url.searchParams.set("file", file.name);
  history.replaceState(null, "", url);
  try {
    const response = await fetch("./" + file.name, { cache: "no-cache" });
    if (!response.ok) throw new Error("Source unavailable");
    const text = await response.text();
    if (thisRequest === requestNumber) sourceText.textContent = text;
  } catch {
    if (thisRequest === requestNumber) sourceText.textContent = "Could not load this file. Refresh to try again.";
  }
}

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) void openSource(button.dataset.file);
});
void openSource(new URLSearchParams(location.search).get("file"));
