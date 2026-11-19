// Change these settings to tune the game without touching its screens.
const GAME_RULES = {
  roundSeconds: 25,
  scoringVersion: 2,
  pointsPerFlightUnit: 400,
  speedBonus: 100,
  fullSpeedSeconds: 3,
  connectionPoints: [0, 120, 300, 600, 600],
  rarityPoints: [0, 0, 0, 0, 300],
};

// Match levels are 0 = missed, 1 = related, 2 = close,
// 3 = direct, and 4 = a direct answer selected for its rarity.
function scoreAnswer(matchLevel, millisecondsLeft) {
  const connection = GAME_RULES.connectionPoints[matchLevel];
  const rarity = GAME_RULES.rarityPoints[matchLevel];
  // Three seconds at the full bonus makes an optimal human answer attainable.
  const fractionLeft = Math.max(0, Math.min(1,
    millisecondsLeft / (Math.max(1, GAME_RULES.roundSeconds - GAME_RULES.fullSpeedSeconds) * 1000)
  ));
  const speed = matchLevel > 0
    ? Math.round(fractionLeft * GAME_RULES.speedBonus)
    : 0;

  return {
    connection,
    rarity,
    speed,
    total: connection + rarity + speed,
  };
}

// Older saved games contain a match level but no detailed score.
// Convert those answers when displaying them, using zero speed bonus.
function pointsFor(answer) {
  return answer.score?.total ?? [0, 25, 50, 80, 90][answer.points];
}

function totalScore(run) {
  return run.answers.reduce((sum, answer) => sum + pointsFor(answer), 0);
}

function maximumScore(mission) {
  return mission.reduce((sum, puzzle) => {
    const bestMatch = puzzle.bonuses.length > 0 ? 4 : 3;
    return sum + scoreAnswer(bestMatch, GAME_RULES.roundSeconds * 1000).total;
  }, 0);
}

// League names describe answer scores. The same colors are reused by the
// result badge, the six round markers, and the flight report.
const LEAGUES = [
  { name: "Adrift", min: 0, color: "#aab8c4" },
  { name: "Cadet", min: 120, color: "#91caff" },
  { name: "Navigator", min: 300, color: "#78decb" },
  { name: "Voyager", min: 600, color: "#f4cf8b" },
  { name: "Starfarer", min: 850, color: "#c4a6ff" },
  { name: "Supernova", min: 970, color: "#ff9acb" },
];

function leagueFor(score) {
  return LEAGUES.findLast((league) => score >= league.min) || LEAGUES[0];
}

// All displayed optimal choices really attain the authored maximum for a round.
function optimalChoices(puzzle) {
  const choices = puzzle.tiers[0].answers.map((names) => names[0]);
  const rare = choices.filter((name) => puzzle.bonuses.includes(name));
  return { answers: rare.length ? rare : choices,
    score: scoreAnswer(rare.length ? 4 : 3, GAME_RULES.roundSeconds * 1000).total };
}
