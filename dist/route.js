// Real destinations first. After the known route, imagined waypoints keep
// generating forever. Flight units are game distances, never astronomical scale.
const STOPS = [
  { name: "Earth", image: "earth", color: "#7abaf1", fact: "Earth takes about a year to orbit the Sun. The average distance between the two defines one astronomical unit, or AU.", link: "earth/facts/" },
  { name: "Mars", image: "mars", color: "#e99972", fact: "Mars is home to Olympus Mons, the largest volcano in the solar system. It is about three times as tall as Mount Everest.", link: "mars/facts/" },
  { name: "Asteroid Belt", kind: "belt", color: "#bdb5c8", fact: "The main asteroid belt is between Mars and Jupiter. All the solar system’s asteroids together have less mass than Earth’s Moon.", link: "solar-system/asteroids/" },
  { name: "Jupiter", image: "jupiter", color: "#d9b18c", fact: "Jupiter is the largest planet in our solar system. It also has the shortest day: the giant turns once in about 9.9 hours.", link: "jupiter/jupiter-facts/" },
  { name: "Saturn", image: "saturn", color: "#e5c69d", fact: "Saturn’s rings are made up of chunks of ice and rock, from tiny grains to pieces as big as mountains.", link: "saturn/facts/" },
  { name: "Uranus", image: "uranus", color: "#a6deda", fact: "Uranus rotates with such an extreme tilt that it appears to roll around the Sun on its side. One of its years lasts about 84 Earth years.", link: "uranus/facts/" },
  { name: "Neptune", image: "neptune", color: "#9aaef4", fact: "Neptune is the farthest planet from the Sun. One Neptune year lasts about 165 Earth years.", link: "neptune/facts/" },
  { name: "Pluto", image: "pluto", color: "#d8c5b7", fact: "Pluto is a dwarf planet in the Kuiper Belt. NASA’s New Horizons spacecraft revealed its bright, heart-shaped region in 2015.", link: "dwarf-planets/pluto/facts/" },
  { name: "Kuiper Belt", kind: "belt", ice: true, color: "#a7d9df", fact: "The Kuiper Belt is a broad region of icy objects beyond Neptune. Pluto and Arrokoth both live there and were visited by New Horizons.", link: "solar-system/kuiper-belt/" },
  { name: "Oort Cloud", kind: "belt", ice: true, color: "#b7c9eb", fact: "Far beyond the Kuiper Belt, scientists think a vast spherical shell of icy bodies surrounds our solar system: the Oort Cloud.", link: "solar-system/oort-cloud/" },
  { name: "Proxima Centauri", kind: "star", color: "#ed9a82", fact: "Proxima Centauri is the closest star to the Sun, just over four light-years from Earth. It belongs to the Alpha Centauri triple-star system.", link: "asset/hubble/proxima-centauri/" },
  { name: "Proxima b", image: "mars", color: "#c39f92", fact: "Proxima b orbits the red dwarf Proxima Centauri. Being in a star’s habitable zone does not prove that a planet is habitable. Its appearance here is imagined.", link: "resource/proxima-b-3d-model/" },
];

function checkpoint(index) {
  const number = Math.max(0, Math.floor(index));
  const known = STOPS[number];
  if (known) return { ...known, index: number, side: number % 2 ? 1 : -1 };
  const n = number - STOPS.length + 1;
  const images = ["uranus", "pluto", "jupiter", "neptune", "mars", "earth"];
  return { index: number, name: "Uncharted " + String(n).padStart(3, "0"), image: images[(n - 1) % images.length],
    color: ["#add7d2", "#d6bda7", "#b4b6e8"][n % 3], side: number % 2 ? 1 : -1, imagined: true,
    fact: "This is an imagined waypoint on your open-ended voyage. Real worlds orbit many other stars; astronomers call these worlds exoplanets. Keep exploring to see how far your signals can take you.",
    link: "exoplanets/" };
}

function routeWindow(world) {
  const first = Math.max(0, world - 2);
  return Array.from({ length: 6 }, (_, i) => first + i);
}

function overviewIndices(world) {
  const last = world + 2;
  if (last <= 17) return Array.from({ length: last + 1 }, (_, i) => i);
  // Keep Earth in view on very long voyages; the full checkpoint ledger stays available.
  return [...Array.from({ length: 5 }, (_, i) => i), null,
    ...Array.from({ length: 11 }, (_, i) => world - 8 + i)];
}

function voyageAnswers(run) {
  return [...(run.journeyAnswers || []), ...run.answers];
}
function voyageScore(run) {
  return voyageAnswers(run).reduce((sum, answer) => sum + pointsFor(answer), 0);
}
function flightFor(run) {
  let earned = 0, drift = 0, driftTotal = 0;
  const encounters = [0], answers = voyageAnswers(run);
  for (const answer of answers) {
    if (answer.points > 0) {
      earned += pointsFor(answer) / GAME_RULES.pointsPerFlightUnit;
      drift = 0;
      const stop = Math.round(earned);
      if (stop !== encounters.at(-1)) encounters.push(stop);
    } else {
      drift = Math.min(.32, drift + .06);
      driftTotal = Math.min(.32, driftTotal + .06);
    }
  }
  const world = Math.round(earned);
  const last = answers.at(-1);
  return { world, earned, distance: earned + driftTotal, drift, driftTotal,
    routePosition: earned + driftTotal, encounters, complete: run.step === 6,
    missed: !!last && last.points === 0,
    key: (run.isExploration ? "explore:" : "flight:") + answers.length + ":" +
      answers.map((answer) => pointsFor(answer) + "/" + answer.points).join(",") + (run.step === 6 ? ":overview" : "") };
}
