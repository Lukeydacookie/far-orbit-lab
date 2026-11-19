// The calendar keeps six rounds per day. These replacements broaden earlier
// prompts that left too few direct answers. New flights use this edition.
const MISSIONS = LEGACY_MISSIONS.map((mission) => mission.slice());

function replaceRound(day, signal, puzzle) {
  MISSIONS[day][signal] = puzzle;
}

replaceRound(0, 3, round("Ceres|Vesta|Pallas", "Look between Mars and Jupiter.",
  ["another named main-belt object", "Hygiea|Juno|Psyche|Eunomia|Iris|Flora|Metis|Hebe|Astraea|Euphrosyne|Interamnia|Davida"],
  ["a small body outside the main belt", "Eros|Bennu|Ryugu|Apophis|Pluto|Arrokoth"],
  ["a planet", "Mars|Jupiter|Earth|Saturn|Venus"], "Euphrosyne|Interamnia|Davida"));
replaceRound(0, 4, round("Catan|Carcassonne|Ticket to Ride", "Think tabletop games with a board.",
  ["another board game", "Monopoly|Scrabble|Risk|Clue/Cluedo|Pandemic|Azul|Chess|Checkers/Draughts|Go|Othello/Reversi|Scythe|Wingspan|Terraforming Mars|Root|Brass|Agricola"],
  ["a card game", "Poker|Bridge|Rummy|Solitaire|Uno|Canasta"],
  ["another game or puzzle", "Sudoku|Crossword|Wordle|Tetris|Minecraft"], "Scythe|Root|Agricola|Brass"));
replaceRound(0, 5, round("Sapphire|Diamond|Emerald", "Think gemstones.",
  ["another gemstone", "Ruby|Opal|Amethyst|Garnet|Topaz|Aquamarine|Peridot|Jade|Onyx|Tourmaline|Citrine|Turquoise|Spinel|Tanzanite|Zircon|Alexandrite|Morganite|Lapis lazuli"],
  ["a precious metal", "Gold|Silver|Platinum|Palladium"],
  ["another material used in jewelry", "Glass|Wood|Resin|Steel|Copper"], "Alexandrite|Spinel|Morganite|Tanzanite"));
replaceRound(2, 2, round("Hydrogen|Carbon|Oxygen", "They are elements outside the metals.",
  ["another nonmetal element", "Nitrogen|Phosphorus|Sulfur/Sulphur|Selenium|Fluorine|Chlorine|Bromine|Iodine|Helium|Neon|Argon|Krypton|Xenon|Radon"],
  ["a metalloid", "Boron|Silicon|Germanium|Arsenic|Antimony|Tellurium"],
  ["a metallic element", "Iron|Copper|Gold|Silver|Nickel|Sodium|Calcium"], "Selenium|Krypton|Xenon"));
replaceRound(3, 4, round("Alpha|Delta|Sigma", "These names come from an alphabet.",
  ["another Greek letter", "Beta|Gamma|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Tau|Upsilon|Phi|Chi|Psi|Omega"],
  ["a NATO spelling-alphabet word", "Bravo|Charlie|Echo|Foxtrot|Golf|Hotel|India|Juliet|Kilo|Lima|Tango"],
  ["another alphabet name or symbol", "Aleph|Bet|A|B|C|Ampersand"], "Upsilon|Omicron|Xi"));
replaceRound(3, 5, round("Nix|Triton|Charon", "Think natural satellites far from the Sun.",
  ["another moon of Neptune, Uranus or Pluto", "Nereid|Proteus|Larissa|Galatea|Despina|Naiad|Thalassa|Hippocamp|Hydra|Styx|Kerberos|Titania|Oberon|Ariel|Umbriel|Miranda"],
  ["another moon", "Titan|Io|Europa|Callisto|Ganymede|Moon|Enceladus"],
  ["an outer solar-system planet or small world", "Neptune|Uranus|Pluto|Eris|Makemake"], "Hippocamp|Despina|Thalassa"));
replaceRound(4, 0, round("Baltic|Adriatic|Aegean", "Think seas.",
  ["another named sea", "Mediterranean|Caribbean|North Sea|Red Sea|Black Sea|Arabian Sea|Coral Sea|Tasman Sea|Bering Sea|Caspian Sea|Sea of Japan|Weddell Sea|Ross Sea|Sargasso Sea|Labrador Sea|Tyrrhenian Sea|Ionian Sea"],
  ["an ocean", "Atlantic|Pacific|Indian|Arctic|Southern"],
  ["another named body of water", "Lake Superior|Lake Victoria|Nile|Amazon|Thames"], "Sargasso Sea|Weddell Sea|Tyrrhenian Sea"));
replaceRound(4, 2, round("Jupiter|Saturn|Neptune", "Think of the Roman names behind the planets.",
  ["another Roman deity", "Juno|Vesta|Ceres|Mars|Mercury|Venus|Pluto|Diana|Minerva|Vulcan|Janus|Bacchus|Cupid|Proserpina|Bellona"],
  ["a Greek deity", "Zeus|Hera|Poseidon|Hades|Athena|Ares|Hermes|Artemis"],
  ["another mythological figure", "Odin|Thor|Loki|Ra|Anubis|Osiris"], "Proserpina|Bellona|Janus"));
replaceRound(5, 5, round("Voyager 1|Cassini|Juno", "Think robotic missions sent to study space.",
  ["another robotic space mission", "Voyager 2|Pioneer 10|Pioneer 11|Galileo|New Horizons|Rosetta|Dawn|OSIRIS-REx|Hayabusa|Hayabusa2|Mariner 4|Viking 1|Viking 2|Magellan|MESSENGER|BepiColombo|JUICE|Europa Clipper|Parker Solar Probe|Lucy|DART"],
  ["a crewed space mission", "Apollo 11|Apollo 8|Apollo 13|Gemini 4|Shenzhou 5"],
  ["another space-related object", "Hubble|ISS|Moon|Mars"], "BepiColombo|Magellan|Hayabusa2|MESSENGER"));
replaceRound(6, 5, round("Io|Europa|Enceladus", "Think natural satellites.",
  ["another named moon", "Titan|Callisto|Ganymede|Triton|Nereid|Charon|Phobos|Deimos|Miranda|Titania|Oberon|Ariel|Umbriel|Dione|Tethys|Rhea|Mimas|Iapetus|Hyperion|Amalthea|Moon/Luna"],
  ["a planet", "Jupiter|Saturn|Neptune|Uranus|Mars|Earth"],
  ["another solar-system object", "Ceres|Vesta|Pluto|Eris|Arrokoth"], "Hyperion|Amalthea|Umbriel|Iapetus"));
replaceRound(7, 3, round("Gothic|Baroque|Romanesque", "Picture architectural styles.",
  ["another architectural style", "Neoclassical|Renaissance|Brutalism|Art deco|Art nouveau|Modernism|Postmodernism|Rococo|Bauhaus|Byzantine|Georgian|Victorian|Palladian|Gothic revival|Deconstructivism"],
  ["an architectural element", "Column|Arch|Dome|Pediment|Cornice|Portico"],
  ["another artistic movement", "Impressionism|Cubism|Surrealism|Fauvism"], "Palladian|Deconstructivism|Byzantine"));
replaceRound(7, 5, round("Athens|Rome|Alexandria", "Think cities of the ancient world.",
  ["another ancient city", "Babylon|Thebes|Memphis|Carthage|Pompeii|Ephesus|Troy|Nineveh|Ur|Uruk|Persepolis|Petra|Jericho|Knossos|Sparta|Corinth|Palmyra|Susa|Mohenjo-daro|Harappa"],
  ["another historic city", "Paris|London|Kyoto|Prague|Venice"],
  ["a modern capital", "Canberra|Brasilia|Ottawa|Washington"], "Uruk|Susa|Mohenjo-daro|Palmyra"));
replaceRound(8, 0, round("Violin|Viola|Cello", "Think instruments with strings.",
  ["another string instrument", "Double bass/Upright bass|Guitar|Harp|Mandolin|Banjo|Sitar|Ukulele|Lute|Erhu|Viola da gamba|Koto|Zither|Dulcimer|Oud|Balalaika|Sarangi|Nyckelharpa"],
  ["a woodwind instrument", "Flute|Clarinet|Oboe|Bassoon|Saxophone"],
  ["another instrument", "Trumpet|Trombone|Drums|Xylophone"], "Sarangi|Nyckelharpa|Oud|Viola da gamba"));
replaceRound(8, 3, round("Hippocampus|Thalamus|Amygdala", "Think brain structures.",
  ["another brain structure", "Cerebellum|Hypothalamus|Pons|Medulla|Corpus callosum|Frontal lobe|Parietal lobe|Temporal lobe|Occipital lobe|Insula|Putamen|Caudate nucleus|Substantia nigra"],
  ["another part of the nervous system", "Spinal cord|Optic nerve|Vagus nerve|Neuron|Retina"],
  ["another body organ", "Heart|Liver|Lung|Kidney"], "Putamen|Insula|Caudate nucleus|Substantia nigra"));
replaceRound(8, 4, round("Swimming|Rowing|Water polo", "Think water-based sports.",
  ["another aquatic sport", "Diving|Surfing|Sailing|Kayaking|Canoeing|Windsurfing|Kitesurfing|Artistic swimming/Synchronized swimming|Wakeboarding|Water skiing|Paddleboarding|Dragon boat racing|Freediving"],
  ["a related activity", "Snorkeling|Fishing|Boating|Scuba diving"],
  ["another sport", "Running|Cycling|Tennis|Basketball"], "Dragon boat racing|Freediving|Artistic swimming"));
replaceRound(8, 5, round("Cassini|Galileo|Kepler", "Think astronomers behind the mission names.",
  ["another astronomer", "Copernicus|Hubble|Herschel|Tycho Brahe/Brahe|Edwin Hubble|Caroline Herschel|Annie Jump Cannon|Cecilia Payne|Henrietta Leavitt|Vera Rubin|William Herschel|Ptolemy|Hipparchus"],
  ["another scientist", "Einstein|Newton|Curie|Darwin|Faraday"],
  ["another space-related name", "Apollo|Artemis|Orion|Hubble telescope"], "Henrietta Leavitt|Annie Jump Cannon|Hipparchus"));
replaceRound(9, 1, round("Wrist|Elbow|Knee", "Think joints in your body.",
  ["another named joint", "Ankle|Shoulder|Hip|Knuckle|Jaw|Temporomandibular joint/TMJ|Sacroiliac joint|Atlantoaxial joint|Thumb joint"],
  ["another body part", "Palm|Finger|Toe|Heel|Forearm|Shin|Thigh"],
  ["a bone", "Femur|Tibia|Humerus|Ulna|Radius"], "Sacroiliac joint|Atlantoaxial joint|Temporomandibular joint"));
replaceRound(9, 5, round("Saturn|Neptune|Titan", "Think solar-system worlds named after mythology.",
  ["another world with a mythological name", "Jupiter|Mercury|Venus|Mars|Uranus|Pluto|Ceres|Eris|Haumea|Makemake|Europa|Io|Ganymede|Callisto|Triton|Enceladus|Charon"],
  ["another solar-system object", "Earth|Moon|Sun|Vesta|Bennu"],
  ["another mythological figure", "Zeus|Odin|Thor|Athena"], "Haumea|Makemake|Enceladus|Charon"));
replaceRound(10, 1, round("September|April|June", "Think about where month names appear on a chart.",
  ["another month of the year", "January|February|March|May|July|August|October|November|December"],
  ["a season", "Spring|Summer|Autumn/Fall|Winter"],
  ["another calendar unit", "Week|Day|Year|Decade|Century|Fortnight"]));
replaceRound(10, 3, round("Paramount|Universal|Warner Bros.", "Think film studios.",
  ["another film studio", "Disney|Sony|Columbia Pictures/Columbia|A24|Lionsgate|MGM|DreamWorks|Pixar|Studio Ghibli/Ghibli|Laika|Focus Features|Searchlight|Neon|Blumhouse|Toho|StudioCanal|Pathé/Pathe|Gaumont|Working Title"],
  ["another streaming or television company", "Netflix|Hulu|HBO|Apple TV|Amazon Prime|BBC"],
  ["another entertainment company", "Spotify|Nintendo|Sega|Electronic Arts"], "Gaumont|Pathé|Working Title|Laika"));
replaceRound(10, 5, round("Comet|Asteroid|Meteoroid", "Think natural things found in space.",
  ["another type of natural celestial object", "Planet|Dwarf planet|Moon|Star|Nebula|Galaxy|Black hole|Pulsar|Quasar|Brown dwarf|White dwarf|Red giant|Globular cluster|Open cluster|Centaur|Kuiper Belt object/KBO"],
  ["a space phenomenon", "Meteor|Aurora|Supernova|Eclipse|Solar flare"],
  ["a human-made object", "Satellite|Space station|Probe|Rocket"], "Brown dwarf|Globular cluster|Centaur|Pulsar"));
replaceRound(11, 2, round("Mitosis|Meiosis|Cytokinesis", "Think processes in cells.",
  ["another cellular process", "Transcription|Translation|Replication/DNA replication|Respiration/Cellular respiration|Photosynthesis|Osmosis|Diffusion|Endocytosis|Exocytosis|Apoptosis|Autophagy|Glycolysis|Fermentation|Phagocytosis"],
  ["a cell structure", "Nucleus|Ribosome|Mitochondrion/Mitochondria|Membrane|Chloroplast"],
  ["another biological process", "Digestion|Circulation|Pollination|Germination"], "Autophagy|Phagocytosis|Exocytosis"));

// Refreshed six-signal edition: every connection leaves room for personal choices.
// Keep this revision stable until the authored questions change again.
const MISSION_REVISION = "open-orbits-2";
MISSIONS[1] = [
  round("Velvet|Denim|Linen", "Think fabrics.",
    ["another fabric", "Cotton|Silk|Wool|Satin|Chiffon|Tweed|Corduroy|Flannel|Organza|Tulle|Muslin|Jersey|Canvas|Poplin|Brocade|Damask|Seersucker|Gabardine|Cashmere|Fleece|Taffeta|Calico|Chambray|Polyester|Nylon|Rayon|Viscose|Acrylic|Hemp|Bamboo|Spandex/Lycra/Elastane"],
    ["a textile technique", "Weaving|Knitting|Spinning|Crochet|Embroidery|Quilting|Dyeing|Sewing"],
    ["a clothing material", "Leather|Suede|Rubber|Latex"], "Gabardine|Seersucker|Damask|Brocade|Chambray"),
  round("Otter|Beaver|Capybara", "Think mammals that spend time in water and on land.",
    ["another semiaquatic mammal", "Platypus|Mink|Muskrat|Coypu/Nutria|Hippopotamus/Hippo|Seal|Walrus|Sea lion|Water vole|Water shrew|Desman|Fishing cat|Marsh mongoose|Polar bear|Water opossum/Yapok"],
    ["an aquatic mammal", "Dolphin|Whale|Orca/Killer whale|Manatee|Dugong|Porpoise|Narwhal|Beluga"],
    ["another animal associated with water", "Penguin|Crocodile|Alligator|Frog|Turtle|Duck|Salmon|Shark"], "Desman|Water shrew|Water opossum|Marsh mongoose"),
  round("Salsa|Tango|Waltz", "Think dances.",
    ["another dance", "Foxtrot|Quickstep|Rumba|Samba|Cha-cha/Cha cha cha|Bachata|Merengue|Mambo|Jive|Polka|Charleston|Lindy hop|Swing|Ballet|Tap|Flamenco|Sirtaki|Mazurka|Kizomba|Paso doble|Bolero|Zouk|Hula|Kathak|Bharatanatyam"],
    ["a musical style associated with dance", "Disco|House|Techno|Funk|Reggaeton|Jazz|Swing music"],
    ["another performance art", "Opera|Theatre/Theater|Circus|Mime|Singing"], "Mazurka|Kizomba|Kathak|Zouk|Bharatanatyam"),
  round("Cinnamon|Cumin|Paprika", "Think spices in a kitchen cupboard.",
    ["another spice", "Turmeric|Ginger|Nutmeg|Clove/Cloves|Cardamom|Coriander|Saffron|Allspice|Star anise|Anise|Fennel|Fenugreek|Mustard seed|Black pepper/Pepper|White pepper|Cayenne|Sumac|Mace|Asafoetida/Hing|Grains of paradise|Long pepper|Caraway|Nigella"],
    ["a culinary herb", "Basil|Thyme|Rosemary|Sage|Oregano|Parsley|Mint|Dill|Tarragon|Chervil|Cilantro"],
    ["another seasoning", "Salt|Sugar|Vinegar|Soy sauce|Lemon juice|Honey|Vanilla"], "Asafoetida|Grains of paradise|Mace|Long pepper|Nigella"),
  round("Kilimanjaro|Fuji|Etna", "Think volcanic mountains.",
    ["another volcano", "Vesuvius|Krakatoa/Krakatau|Stromboli|Mauna Loa|Kilauea|Mauna Kea|Mount St. Helens/Mount Saint Helens/St Helens|Mount Rainier/Rainier|Mount Pinatubo/Pinatubo|Tambora|Eyjafjallajokull|Hekla|Popocatepetl|Cotopaxi|Chimborazo|Erebus/Mount Erebus|Olympus Mons|Mount Teide/Teide|Mayon|Sakurajima|Merapi"],
    ["another mountain", "Everest|K2|Denali|Mont Blanc|Matterhorn|Aconcagua|Annapurna|Kangchenjunga"],
    ["a mountain range", "Alps|Andes|Himalayas|Rockies|Atlas|Pyrenees|Cascades"], "Erebus|Hekla|Cotopaxi|Sakurajima|Chimborazo"),
  round("Andromeda|Whirlpool|Sombrero", "Think galaxies with names of their own.",
    ["another named galaxy", "Milky Way|Triangulum/M33|Large Magellanic Cloud/LMC|Small Magellanic Cloud/SMC|Pinwheel/M101|Sunflower/M63|Black Eye/Black Eye Galaxy/M64|Cartwheel|Tadpole|Cigar/M82|Bode's Galaxy/Bodes Galaxy/M81|Centaurus A|Sculptor/NGC 253|Hoag's Object/Hoags Object|Barnard's Galaxy/Barnards Galaxy|Malin 1|Messier 87/M87|Messier 32/M32|Messier 110/M110"],
    ["a nebula", "Orion Nebula|Crab Nebula|Eagle Nebula|Ring Nebula|Horsehead Nebula|Carina Nebula|Helix Nebula"],
    ["a constellation", "Orion|Cassiopeia|Ursa Major|Cygnus|Lyra|Draco|Pegasus|Leo"], "Hoag's Object|Barnard's Galaxy|Malin 1|Sculptor|Centaurus A"),
];
