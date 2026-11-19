const byId = (id) => document.getElementById(id);
const game = byId("game");
const dialog = byId("dialog");
const modal = byId("dialog-content");
const storageKey = "far-orbit-v1";
const chart = createFlightChart(byId("universe"));
const audio = createSoundscape(byId("sound-toggle"));
let dismissedFact = "";
let factTimer = 0;
const oneDay = 86_400_000;
const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
});
const calendar = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
});
const timestamp = (date) => Date.parse(date + "T00:00:00Z");
const getIndex = (date) => Math.round((timestamp(date) - timestamp(FIRST_MISSION)) / oneDay);
const offsetDate = (date, offset) => new Date(timestamp(date) + offset * oneDay).toISOString().slice(0, 10);
const escapeText = (text) => String(text).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const normalize = (text) => text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
  .replace(/[^\p{L}\p{N}]/gu, "");
const ROUND_SECONDS = GAME_RULES.roundSeconds;
let clockFrame = 0;
const grades = ["Skipped", "Related", "Close link", "Direct hit", "Niche hit"];
const SCORE_KEY = '<div class="score-key" aria-label="Scoring"><span>Connection <b>120–600</b></span>' +
  '<span>Rarity <b>+300</b></span><span>Speed <b>up to +100</b></span></div>';

function gradeLabel(answer) {
  return answer.outcome === "timeout" ? "Time’s up" : grades[answer.points];
}

function currentDay() {
  const parts = Object.fromEntries(clock.formatToParts().map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join("-");
}

function readSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey));
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    let changed = false;
    for (const [date, run] of Object.entries(data)) {
      const day = getIndex(date);
      if (!run || !Array.isArray(run.answers) || !Number.isFinite(day)) continue;
      const index = Math.max(0, day) % MISSIONS.length;
      const fresh = MISSIONS[index];
      const original = run.mission || LEGACY_MISSIONS[index];
      if (run.revision === MISSION_REVISION && run.scoringVersion === GAME_RULES.scoringVersion) continue;
      const previousEditions = Array.isArray(run.previousEditions) ? run.previousEditions : [];
      if (JSON.stringify(original) !== JSON.stringify(fresh) || run.scoringVersion !== GAME_RULES.scoringVersion) {
        // Keep the old result intact, but never put an old answer under new clues.
        // Both unfinished and completed older editions become score summaries.
        if (run.answers.length || Number.isFinite(run.deadline)) {
          const { previousEditions: history, ...earlier } = run;
          previousEditions.push({ ...earlier, mission: original });
        }
        data[date] = { step: 0, answers: [], mission: fresh,
          revision: MISSION_REVISION, scoringVersion: GAME_RULES.scoringVersion, previousEditions };
      } else {
        run.mission = fresh;
        run.revision = MISSION_REVISION;
        run.scoringVersion = GAME_RULES.scoringVersion;
      }
      changed = true;
    }
    if (changed) {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Memory play still works. */ }
    }
    return data;
  } catch {
    return {};
  }
}

let today = currentDay();
const playableDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(timestamp(date)) && offsetDate(date, 0) === date && date >= FIRST_MISSION && date <= today;
const queryDate = new URLSearchParams(location.search).get("date");
let activeDate = playableDate(queryDate) ? queryDate : today;
let saved = readSaved();
const explorationKey = "far-orbit-exploration-v2";
function readExploration() {
  try {
    const run = JSON.parse(localStorage.getItem(explorationKey));
    return run && run.isExploration && run.scoringVersion === GAME_RULES.scoringVersion && Array.isArray(run.answers) && Array.isArray(run.journeyAnswers) &&
      Array.isArray(run.mission) && run.mission.length === 6 && Number.isInteger(run.step) && run.step >= 0 && run.step <= 6 &&
      run.answers.length >= run.step && run.answers.length <= Math.min(6, run.step + 1) &&
      voyageAnswers(run).every((answer) => answer && typeof answer.guess === "string" && Number.isInteger(answer.points) && answer.points >= 0 && answer.points <= 4) ? run : null;
  } catch { return null; }
}
let replayRun = new URLSearchParams(location.search).has("explore") ? readExploration() : null;

function missionFor(date) {
  const fresh = MISSIONS[Math.max(0, getIndex(date)) % MISSIONS.length];
  if (date === activeDate && replayRun) return replayRun.mission || fresh;
  const stored = saved[date]?.mission;
  return Array.isArray(stored) && stored.length === 6 ? stored : fresh;
}

function progress(date = activeDate) {
  const run = saved[date];
  if (!run || !Array.isArray(run.answers) || !Number.isInteger(run.step) ||
      run.step < 0 || run.step > 6 || run.answers.length < run.step ||
      run.answers.length > Math.min(run.step + 1, 6)) return { step: 0, answers: [] };
  const valid = run.answers.every((item) => item && typeof item.guess === "string" &&
    Number.isInteger(item.points) && item.points >= 0 && item.points <= 4);
  return valid ? run : { step: 0, answers: [] };
}

function currentRun() {
  return replayRun || progress();
}

function save(run) {
  if (replayRun) {
    replayRun = run;
    if (run.isExploration) { try { localStorage.setItem(explorationKey, JSON.stringify(run)); } catch {} }
    return;
  }
  saved = { ...saved, ...readSaved(), [activeDate]: run };
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Play remains available if browser storage is disabled.
  }
}

function setFlight(run, animate) {
  const flight = flightFor(run);
  document.body.classList.toggle("flight-complete", flight.complete);
  byId("about-world").hidden = flight.complete;
  const description = byId("overview-description");
  description.hidden = !flight.complete;
  if (flight.complete) description.textContent = "Bird’s-eye view of the voyage so far. Launched from Earth and now near " +
    checkpoint(flight.world).name + ". The route continues beyond this checkpoint.";
  const next = flight.world + 1;
  byId("position").textContent = flight.complete ? "Voyage so far" : checkpoint(flight.world).name;
  byId("score-text").textContent = voyageScore(run).toLocaleString("en-US");
  byId("score-caption").textContent = replayRun?.isExploration ? "Exploration total" : replayRun ? "Practice flight" : "Your daily voyage";
  byId("destination-note").textContent = flight.complete ?
    "From Earth to " + checkpoint(flight.world).name + ". There’s always farther to go." : flight.missed ?
    "Drifting nearby. A stronger signal will carry you farther." :
    voyageAnswers(run).length ? "A little farther from home." : "Your voyage starts here.";
  byId("next-destination").textContent = checkpoint(next).name;
  byId("destination-button").dataset.stop = next;
  byId("about-world").textContent = "About " + checkpoint(flight.world).name;
  const window = routeWindow(flight.world), first = window[0], span = window.length - 1;
  const local = Math.max(0, Math.min(span, flight.routePosition - first));
  byId("journey-progress").textContent = flight.distance.toFixed(1) + " flight units from Earth";
  byId("journey-meter").setAttribute("aria-valuemax", span);
  byId("journey-meter").setAttribute("aria-valuenow", local.toFixed(2));
  byId("journey-meter").setAttribute("aria-valuetext", flight.distance.toFixed(1) + " flight units from Earth. The route continues.");
  byId("journey-fill").style.width = local / span * 100 + "%";
  byId("journey-probe").style.left = local / span * 100 + "%";
  byId("journey-stops").innerHTML = window.map((i) =>
    '<li><button type="button" data-stop="' + i + '"' +
    (i === flight.world ? ' aria-current="location"' : '') + '>' + checkpoint(i).name + '</button></li>').join("");
  const last = run.answers.at(-1);
  const awaitingNext = run.answers.length > run.step || run.step === 6;
  const previousWorld = flightFor({ journeyAnswers: run.journeyAnswers, answers: run.answers.slice(0, -1) }).world;
  clearTimeout(factTimer);
  byId("planet-fact").hidden = true;
  const travelTime = chart.setFlight(flight, animate);
  if (!flight.complete && awaitingNext && last?.points > 0 && flight.world > previousWorld && dismissedFact !== flight.key) {
    // Let the player see the flyby before the field note opens over the scene.
    if (travelTime) factTimer = setTimeout(() => showPlanetFact(flight.world), travelTime);
    else showPlanetFact(flight.world);
  }
}

function tierMatch(puzzle, word) {
  const candidate = normalize(word);
  const alternatives = puzzle.tiers.flatMap(({ answers }, index) => answers.flatMap((group) =>
    group.map((answer) => ({ key: normalize(answer),
      points: index === 0 && puzzle.bonuses.includes(group[0]) ? 4 : 3 - index }))));
  const keys = [candidate, ...(/^the\s+/i.test(word) ? [normalize(word.replace(/^the\s+/i, ""))] : [])];
  const match = alternatives.find((option) => keys.includes(option.key));
  if (match) return match.points;
  return 0;
}

function setHeader() {
  const index = Math.max(0, getIndex(activeDate));
  const edition = activeDate === today ? "DAILY MISSION" : "ARCHIVE MISSION";
  const label = replayRun?.isExploration ? "EXPLORATION LEG " + replayRun.segment + " ·" : replayRun ? "PRACTICE FLIGHT" : index >= MISSIONS.length ? "REPLAY MISSION" : edition;
  byId("edition").textContent = label + " " + String(index + 1).padStart(2, "0");
  byId("date").textContent = calendar.format(timestamp(activeDate));
}

function render(animate = false) {
  const run = currentRun();
  setHeader();
  setFlight(run, animate);
  if (run.step === 6) renderResults(run);
  else renderRound(run, missionFor(activeDate)[run.step]);
  if (replayRun) {
    game.insertAdjacentHTML("beforeend", '<button type="button" id="exit-replay" class="ghost">' + (replayRun.isExploration ? "Back to daily mission" : "Exit practice flight") + '</button>');
  }
  startClockLoop();
}

function renderRound(run, puzzle) {
  const step = run.step;
  const answer = run.answers[step];
  const active = !answer && Number.isFinite(run.deadline);
  const showClues = active || !!answer;
  const roundMarkers = Array.from({ length: 6 }, (_, i) => {
    const answer = run.answers[i];
    const league = answer ? leagueFor(pointsFor(answer)) : null;
    return '<i role="listitem" class="' + (i === step ? "current" : answer ? "done" : "") + '"' +
      (league ? ' style="--round-color:' + league.color + '" aria-label="Signal ' + (i + 1) + ', ' + league.name + '"' : '') + '></i>';
  }).join("");
  const clueList = puzzle.clues.map((clue, i) => '<li class="clue' + (showClues ? "" : " waiting") +
    '"><span class="rung" aria-hidden="true">' + (i + 1) + '</span><span class="clue-label">' +
    (showClues ? escapeText(clue) : "Clue " + (i + 1)) + '</span></li>').join("");
  const guess = active ?
    '<label class="sr-only" for="guess">Your guess</label><input id="guess" name="guess" placeholder="Type your answer" ' +
      'minlength="1" maxlength="70" required autocomplete="off" autocapitalize="sentences" spellcheck="false" ' +
      'enterkeyhint="send" aria-describedby="match-note spelling-suggestion">' :
    '<span class="clue-label">' + (answer ? escapeText(answer.guess || gradeLabel(answer)) : "Your answer") + '</span>';
  const ladder = '<ol class="clues" aria-label="Clue ladder">' + clueList +
    '<li class="clue missing"><span class="rung" aria-hidden="true">4</span>' + guess + '</li></ol>';
  const tools = '<div class="form-footer"><button type="button" class="ghost" id="hint" aria-expanded="false" aria-controls="hint-text">Need a hint?</button>' +
    '<button type="button" class="ghost" id="skip">Skip signal</button></div>' +
    '<p class="match-note hint-text" id="hint-text" hidden>' + escapeText(puzzle.hint) + '</p>';
  const form = '<form class="answer-form" id="answer-form">' + ladder +
    '<p class="match-note" id="match-note" role="status" hidden></p>' +
    '<div id="spelling-suggestion" class="spelling-suggestion" role="status" hidden></div>' +
    '<button type="submit" class="primary">Send answer <span aria-hidden="true">→</span></button></form>' + tools;
  const refreshed = run.previousEditions?.length ?
    '<p class="edition-note">New scoring is ready. Your earlier scores are kept in Stats.</p>' : "";
  const launch = refreshed + ladder + '<button type="button" class="primary" id="start">Start mission <span aria-hidden="true">→</span></button>';
  const clockLabel = answer ? "" : '<div class="signal-clock" id="signal-clock"><div class="clock-track" aria-hidden="true">' +
    '<div id="clock-fill"></div></div><span id="clock-text" role="timer" aria-label="Seconds remaining">' +
    ROUND_SECONDS + 's</span></div>';
  const subtitle = showClues ? "Type a fourth item that fits all three clues." :
    "You’ll have " + ROUND_SECONDS + " seconds per signal once the clues appear.";
  game.innerHTML = '<header class="round-header"><p class="eyebrow">SIGNAL ' + (step + 1) +
    ' OF 6</p><div class="rounds" role="list" aria-label="Answer leagues">' + roundMarkers +
    '</div></header><div><h2 class="game-title" id="game-title" tabindex="-1">What belongs next?</h2>' +
    '<p class="game-subtitle">' + subtitle + '</p></div>' + clockLabel +
    (answer ? ladder + answerPanel(run, puzzle, answer) : (active ? form : launch) + SCORE_KEY);
}

function answerPanel(run, puzzle, answer) {
  const { points } = answer;
  const details = points ? '<p>Your answer fits as ' +
    escapeText(puzzle.tiers[3 - Math.min(points, 3)].reason) + '.</p>' : "";
  const sample = puzzle.tiers[0].answers.slice(0, 3).map((names) => names[0]).join(" · ");
  const examples = points >= 3 ? "" : '<p><strong>Best fit</strong> — ' +
    escapeText(puzzle.tiers[0].reason) + '. Examples: ' + escapeText(sample) + '.</p>';
  const league = leagueFor(pointsFor(answer));
  const breakdown = answer.score || scoreAnswer(points, 0);
  return '<div class="feedback' + (points < 2 ? ' low' : '') +
    '" id="feedback" style="--league-color:' + league.color + '"><div class="answer-league">' +
    '<strong>' + league.name + '</strong><span>' + gradeLabel(answer) + '</span></div>' +
    '<div class="answer-score"><strong>+' + pointsFor(answer) + '</strong><small>points</small></div>' +
    '<p class="score-breakdown">' + breakdown.connection + ' connection + ' +
    breakdown.rarity + ' rarity + ' + breakdown.speed + ' speed</p>' +
    details + examples + '</div>' +
    '<button type="button" class="primary" id="next">' +
    (run.step === 5 ? "See flight report" : "Start next signal") + ' →</button>';
}

function fieldNote(stop) {
  return '<div class="field-note"><p class="eyebrow">Field note · ' + stop.name + '</p><p>' +
    escapeText(stop.fact) + ' <a href="https://science.nasa.gov/' + stop.link +
    '" target="_blank" rel="noopener">NASA →</a></p></div>';
}

function startSignal(run) {
  void audio.start();
  if (!run.mission) run.mission = missionFor(activeDate);
  run.revision = MISSION_REVISION;
  run.scoringVersion = GAME_RULES.scoringVersion;
  run.deadline = Date.now() + ROUND_SECONDS * 1000;
  save(run);
  render();
  byId("guess").focus({ preventScroll: true });
}

// Draw the timer just before every browser repaint. Its scale comes from
// exact milliseconds remaining, so it moves between whole seconds.
function updateClock() {
  const run = currentRun();
  if (!Number.isFinite(run.deadline) || run.answers.length > run.step || run.step === 6) return false;
  const milliseconds = Math.max(0, run.deadline - Date.now());
  if (!milliseconds) {
    recordAnswer("", 0, "timeout");
    return false;
  }
  const label = byId("clock-text");
  if (label) {
    label.textContent = (milliseconds / 1000).toFixed(1) + "s";
    byId("clock-fill").style.transform =
      "scaleX(" + milliseconds / (ROUND_SECONDS * 1000) + ")";
    byId("signal-clock").classList.toggle("urgent", milliseconds <= 5000);
  }
  return true;
}

function startClockLoop() {
  cancelAnimationFrame(clockFrame);
  clockFrame = 0;
  function tick() {
    clockFrame = 0;
    if (updateClock() && !document.hidden) clockFrame = requestAnimationFrame(tick);
  }
  tick();
}

function recordAnswer(guess, points, outcome = "") {
  const run = currentRun();
  if (run.step >= 6 || run.answers.length > run.step || !Number.isFinite(run.deadline)) return;
  const answer = Date.now() >= run.deadline ? { guess: "", points: 0, outcome: "timeout" } : { guess, points, outcome };
  answer.score = scoreAnswer(answer.points, Math.max(0, run.deadline - Date.now()));
  audio.cue(answer.points === 0 ? "wrong" : answer.points === 4 ? "rare" : "right");
  run.answers.push(answer);
  delete run.deadline;
  save(run);
  render(true);
  byId("announcement").textContent = gradeLabel(answer) + ". " + pointsFor(answer) +
    " points earned. Now near " + checkpoint(flightFor(run).world).name + ".";
  if (!dialog.open) byId("next").focus({ preventScroll: true });
}

function renderResults(run) {
  const score = totalScore(run), flight = flightFor(run), rounds = missionFor(activeDate);
  const format = (value) => value.toLocaleString("en-US");
  const scores = run.answers.map((answer, index) => {
    const league = leagueFor(pointsFor(answer));
    return '<span style="color:' + league.color + '" aria-label="Signal ' + (index + 1) +
      ', ' + league.name + ', ' + pointsFor(answer) + ' points">' + format(pointsFor(answer)) +
      '<small>' + league.name + '</small></span>';
  }).join("");
  const review = run.answers.map((answer, i) => '<li><strong>' +
    escapeText(answer.guess || gradeLabel(answer)) + '</strong> · ' + format(pointsFor(answer)) +
    ' points. Best fit: ' + escapeText(rounds[i].tiers[0].reason) + '.</li>').join("");
  const optimal = rounds.map((puzzle, i) => {
    const best = optimalChoices(puzzle);
    return '<li><span>Signal ' + (i + 1) + ' · ' + escapeText(puzzle.clues.join(" / ")) +
      '</span><strong>' + best.answers.map(escapeText).join(" · ") + '</strong><small>' +
      format(best.score) + ' possible with the full speed bonus</small></li>';
  }).join("");
  const ledger = Array.from({ length: flight.world + 1 }, (_, i) =>
    '<button type="button" data-stop="' + i + '"><span>' + escapeText(checkpoint(i).name) +
    '</span><small>' + (i === 0 ? 'Started here' : flight.encounters.includes(i) ? 'Signal encounter' : 'Flew past') +
    '</small></button>').join("");
  const exploring = !!run.isExploration;
  game.innerHTML = '<p class="eyebrow">' + (exploring ? 'EXPLORATION LEG LOGGED' : 'SIX SIGNALS LOGGED') +
    '</p><div><h2 class="game-title" id="game-title" tabindex="-1">' + (exploring ? 'Voyage log' : 'Flight report') +
    '</h2><p class="game-subtitle">Now near ' + escapeText(checkpoint(flight.world).name) +
    '. The route keeps going.</p></div><p class="result-score">' + format(score) +
    ' <small>' + (exploring ? 'POINTS THIS LEG' : replayRun ? 'PRACTICE POINTS' : 'DAILY POINTS') + '</small></p><p class="best-possible">Best possible: <strong>' + format(maximumScore(rounds)) +
    '</strong><span>Optimal answers + the full speed bonus</span></p>' +
    (exploring ? '<p class="voyage-total">Voyage total <strong>' + format(voyageScore(run)) + '</strong> · ' +
      voyageAnswers(run).length + ' signals · ' + flight.distance.toFixed(1) + ' flight units</p>' : '') +
    '<div class="score-row" aria-label="Points by signal">' + scores + '</div>' +
    '<button type="button" class="primary" id="continue-voyage">Continue exploring</button>' +
    '<p class="continuation-note">Keep this distance and fly onward with another six practice signals.</p>' +
    (replayRun ? '' : '<button type="button" class="ghost" id="share">Copy spoiler-free result</button>') +
    '<p class="share-status" id="share-status" role="status" hidden></p>' +
    '<details class="review optimal-review"><summary>See the optimal answers</summary><p>Several answers can tie for the top score. These are the authored best choices for each signal.</p><ol>' + optimal + '</ol></details>' +
    '<details class="review"><summary>Review your six answers</summary><ol>' + review + '</ol></details>' +
    '<details class="review"><summary>Every checkpoint along the way</summary><div class="checkpoint-ledger">' + ledger + '</div></details>' +
    (replayRun ? '' : '<div class="form-footer"><button type="button" class="ghost" id="replay">Replay mission</button>' +
      (readExploration() ? '<button type="button" class="ghost" id="resume-exploration">Resume exploration</button>' : '') + '</div>');
}

function openExploration(run) {
  replayRun = run;
  const url = new URL(location.href);
  url.searchParams.set("explore", "1");
  history.replaceState(null, "", url);
  save(run);
  render(true);
  (byId("start") || byId("game-title")).focus({ preventScroll: true });
}
function continueVoyage() {
  const previous = currentRun();
  if (previous.step !== 6) return;
  const cached = readExploration();
  const history = voyageAnswers(previous);
  if (!previous.isExploration && cached && JSON.stringify(cached.journeyAnswers.slice(0, history.length)) === JSON.stringify(history)) {
    openExploration(cached);
    return;
  }
  const segment = (previous.segment || 0) + 1;
  openExploration({ step: 0, answers: [], journeyAnswers: voyageAnswers(previous),
    isExploration: true, segment, scoringVersion: GAME_RULES.scoringVersion,
    mission: MISSIONS[(Math.max(0, getIndex(activeDate)) + segment) % MISSIONS.length],
    revision: MISSION_REVISION });
}

async function share() {
  const run = currentRun();
  const edition = Math.max(1, getIndex(activeDate) + 1);
  const url = new URL(location.href);
  url.search = "?date=" + activeDate;
  url.hash = "";
  const symbols = ["⬛", "🟦", "🟨", "🟩", "⭐"];
  const text = "Far Orbit #" + String(edition).padStart(2, "0") + " · " + totalScore(run) +
    "/" + maximumScore(missionFor(activeDate)) + " points\n" + run.answers.map(({ points }) => symbols[points]).join("") + "\n" +
    "Reached " + checkpoint(flightFor(run).world).name + "\n" + url.href;
  const status = byId("share-status");
  status.hidden = false;
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied to your clipboard.";
  } catch {
    status.textContent = "Copy your result below.";
    const box = game.querySelector(".share-text") || document.createElement("textarea");
    box.className = "share-text";
    box.readOnly = true;
    box.setAttribute("aria-label", "Spoiler-free result");
    box.value = text;
    status.after(box);
    box.focus();
    box.select();
  }
}

function openDate(date) {
  activeDate = date;
  replayRun = null;
  if (dialog.open) dialog.close();
  if (location.protocol !== "file:") {
    const url = new URL(location.href);
    url.searchParams.delete("explore");
    if (date === today) url.searchParams.delete("date");
    else url.searchParams.set("date", date);
    history.replaceState(null, "", url);
  }
  render();
  byId("game-title").focus({ preventScroll: true });
}

function openDialog(title, html) {
  byId("dialog-title").textContent = title;
  modal.innerHTML = html;
  if (!dialog.open) dialog.showModal();
}

function showMenu(page) {
  if (page === "help") {
    openDialog("How to play", '<p>Each signal gives you three clues. Type a fourth item that belongs with them, within ' + ROUND_SECONDS + ' seconds.</p>' +
      '<ol><li>A related answer earns 120 points, a close answer 300, and a direct match 600.</li>' +
      '<li>A direct answer selected for its rarity earns 300 extra points.</li>' +
      '<li>Speed adds up to 100 points. The full bonus lasts for the first three seconds, then falls smoothly with time.</li></ol>' +
      '<p>Rarity bonuses are authored for each puzzle. Recognized answers lock in your score. ' +
      'You can retry an unrecognized guess while the clock runs, or reveal a free hint.</p>' +
      '<p>Strong answers can skip several checkpoints. The route has no finish line. After six daily signals, Continue exploring carries the same voyage onward with practice questions. Imagined worlds follow the real destinations. Flight units and artwork are illustrative; NASA links explain the real science.</p>' +
      '<div class="league-list">' + LEAGUES.map((league, i) => '<p style="color:' + league.color +
        '"><strong>' + league.name + '</strong><span>' + league.min + '–' +
        (i === LEAGUES.length - 1 ? 1000 : LEAGUES[i + 1].min - 1) + ' points</span></p>').join("") + '</div>' +
      '<p><a href="./code.html">Explore the code and change the settings →</a></p>');
  } else if (page === "archive") {
    const count = Math.min(Math.max(1, getIndex(today) + 1), 30);
    const items = Array.from({ length: count }, (_, i) => {
      const date = offsetDate(today, -i);
      const run = progress(date);
      const state = run.step === 6 ? totalScore(run) + " pts" : run.answers.length || run.deadline ? "In progress" : "Play →";
      return '<button type="button" class="ghost" data-date="' + date + '"><span>' +
        (i === 0 ? "Today · " : "") + calendar.format(timestamp(date)) + '</span><small>' + state + '</small></button>';
    }).join("");
    openDialog("Mission archive", '<p>Play a past mission or revisit your flight report.</p><div class="archive-list">' + items + '</div>');
  } else {
    const earlier = Object.entries(saved).flatMap(([date, run]) =>
      playableDate(date) && Array.isArray(run.previousEditions) ?
        run.previousEditions.filter((item) => Array.isArray(item.answers)).map((item) => ({ date, run: item })) : []);
    const flights = Object.keys(saved).filter((date) => playableDate(date))
      .map((date) => ({ date, run: progress(date) })).concat(earlier).filter(({ run }) => run.step === 6);
    const completed = new Set(flights.map(({ date }) => date));
    let cursor = completed.has(today) ? today : offsetDate(today, -1);
    let streak = 0;
    while (completed.has(cursor)) {
      streak++;
      cursor = offsetDate(cursor, -1);
    }
    const currentFlights = flights.filter(({ run }) => run.scoringVersion === GAME_RULES.scoringVersion);
    const best = currentFlights.length ? Math.max(...currentFlights.map(({ run }) => totalScore(run))) : "–";
    const history = earlier.length ? '<h3>Earlier editions</h3><p>Scores from earlier question or scoring editions.</p>' +
      '<div class="archive-list">' + earlier.map(({ date, run }) => '<p><strong>' + calendar.format(timestamp(date)) +
        '</strong> · ' + totalScore(run) + ' points · ' + run.answers.length + '/6 signals</p>').join("") + '</div>' : "";
    openDialog("Your stats", '<p>Your missions are saved in this browser.</p><div class="stats"><p><strong>' +
      flights.length + '</strong>Completed</p><p><strong>' + streak + '</strong>Day streak</p><p><strong>' +
      best + '</strong>Best score</p></div>' + history);
  }
}

function showPlanetFact(index) {
  const stop = checkpoint(index);
  const card = byId("planet-fact");
  card.innerHTML = '<button type="button" class="fact-close" id="close-fact" aria-label="Close field note">×</button>' +
    '<p class="eyebrow">Field note</p><h2>' + stop.name + '</h2><p class="fact-body">' +
    escapeText(stop.fact) + '</p><a href="https://science.nasa.gov/' + stop.link +
    '" target="_blank" rel="noopener">Explore with NASA →</a>';
  card.hidden = false;
}

function showStop(index) {
  const stop = checkpoint(index);
  const reached = flightFor(currentRun()).world;
  const notes = Array.from({ length: Math.max(12, reached + 4) }, (_, i) => '<button type="button" class="ghost" data-stop="' + i +
    '"><span>' + checkpoint(i).name + '</span><small>' + (i <= reached ? 'Read field note' : 'Ahead') +
    '</small></button>').join("");
  openDialog(stop.name, (index <= reached ? fieldNote(stop) :
    '<p>Ahead on your journey. Keep sending signals to reach ' + stop.name + '.</p>') +
    '<div class="field-list">' + notes + '</div>');
}

game.addEventListener("submit", (event) => {
  if (event.target.id !== "answer-form") return;
  event.preventDefault();
  const run = currentRun();
  if (Date.now() >= run.deadline) {
    updateClock();
    return;
  }
  const input = byId("guess");
  const guess = input.value.trim();
  if (!guess) { input.focus(); return; }
  const puzzle = missionFor(activeDate)[run.step];
  const clue = puzzle.clues.some((entry) => normalize(entry) === normalize(guess));
  const points = clue ? 0 : tierMatch(puzzle, guess);
  if (points > 0) {
    recordAnswer(guess, points);
  } else {
    const suggestions = clue ? [] : suggestAnswers(puzzle, guess);
    const suggestion = byId("spelling-suggestion");
    if (suggestions.length) {
      byId("match-note").hidden = true;
      suggestion.dataset.original = guess;
      suggestion.innerHTML = '<p>' + (suggestions.length === 1 ? 'Did you mean <strong>' +
        escapeText(suggestions[0]) + '</strong>?' : 'Did you mean one of these?') + '</p><div>' +
        suggestions.map((name) => '<button type="button" data-correction="' + escapeText(name) +
          '">Use ' + escapeText(name) + '</button>').join("") + '</div><small>Choose a correction to send it.</small>';
      suggestion.hidden = false;
      input.focus();
      return;
    }
    suggestion.hidden = true;
    audio.cue("wrong");
    const note = byId("match-note");
    note.hidden = false;
    note.textContent = clue ? "That’s already on the list. Try a different answer." :
      "That answer isn’t in this puzzle’s word list. Check the spelling or try another answer.";
    input.setAttribute("aria-invalid", "true");
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
    input.focus();
    input.select();
  }
});

game.addEventListener("input", (event) => {
  if (event.target.id === "guess") {
    byId("match-note").hidden = true;
    byId("spelling-suggestion").hidden = true;
    event.target.removeAttribute("aria-invalid");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.correction) {
    const run = currentRun();
    const input = byId("guess");
    const suggestion = byId("spelling-suggestion");
    if (!input || !suggestion || suggestion.hidden || input.value.trim() !== suggestion.dataset.original ||
        run.step >= 6 || run.answers.length > run.step || !Number.isFinite(run.deadline)) return;
    if (Date.now() >= run.deadline) { updateClock(); return; }
    const points = tierMatch(missionFor(activeDate)[run.step], button.dataset.correction);
    if (points) recordAnswer(button.dataset.correction, points);
  } else if (button.id === "close-fact") {
    clearTimeout(factTimer);
    dismissedFact = flightFor(currentRun()).key;
    byId("planet-fact").hidden = true;
  } else if (button.id === "about-world") {
    clearTimeout(factTimer);
    showPlanetFact(flightFor(currentRun()).world);
  } else if (button.dataset.dialog) showMenu(button.dataset.dialog);
  else if (button.dataset.date && playableDate(button.dataset.date)) openDate(button.dataset.date);
  else if (button.dataset.stop !== undefined) showStop(Number(button.dataset.stop));
  else if (button.id === "hint") {
    const hint = byId("hint-text");
    hint.hidden = !hint.hidden;
    button.textContent = hint.hidden ? "Need a hint?" : "Hide hint";
    button.setAttribute("aria-expanded", String(!hint.hidden));
  } else if (button.id === "skip") recordAnswer("", 0);
  else if (button.id === "start") startSignal(currentRun());
  else if (button.id === "next") {
    const run = currentRun();
    if (run.answers.length !== run.step + 1) return;
    run.step++;
    if (run.step < 6) {
      startSignal(run);
    } else {
      save(run);
      render(true);
      byId("game-title").focus({ preventScroll: true });
    }
  } else if (button.id === "replay" || button.id === "exit-replay") {
    replayRun = button.id === "replay" ? { step: 0, answers: [], scoringVersion: GAME_RULES.scoringVersion } : null;
    const url = new URL(location.href); url.searchParams.delete("explore"); history.replaceState(null, "", url);
    render();
    (byId("start") || byId("game-title")).focus({ preventScroll: true });
  } else if (button.id === "continue-voyage") continueVoyage();
  else if (button.id === "resume-exploration") {
    const run = readExploration();
    if (run) openExploration(run);
  } else if (button.id === "share") void share();
});

function refreshDay() {
  const date = currentDay();
  if (date === today) return;
  const onDaily = activeDate === today;
  today = date;
  if (onDaily) openDate(today);
  else setHeader();
}

window.addEventListener("storage", (event) => {
  if (event.key === storageKey || event.key === null) {
    saved = readSaved();
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshDay();
    startClockLoop();
  }
});
window.setInterval(refreshDay, 30_000);
window.setInterval(updateClock, 125);
render();
