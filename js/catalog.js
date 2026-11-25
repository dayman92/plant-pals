// Catalogue of common houseplants used by the "Add a plant" picker.
// Frequencies are WINTER defaults; other seasons are derived below. Users can edit per plant.
// Groups are everyday, non-botanical categories; each plant sits in exactly one.
// `match` is used to guess the type of existing plants from their name.
(function () {
  const T = 'Tap', TT = 'Tap (tepid)', TR = 'Tap (room temp)', R = 'Rainwater', F = 'Filtered';

  const GROUPS = [
    { key: 'leafy', name: 'Leafy & tropical', emoji: '🌿', blurb: 'Classic green foliage plants' },
    { key: 'patterned', name: 'Colourful & patterned', emoji: '🎨', blurb: 'Stripes, spots and splashes of colour' },
    { key: 'trailing', name: 'Trailing & climbing', emoji: '🍃', blurb: 'Vines for shelves, hanging pots and moss poles' },
    { key: 'palms-ferns', name: 'Palms & ferns', emoji: '🌴', blurb: 'Feathery fronds that love humidity' },
    { key: 'trees', name: 'Trees & tall plants', emoji: '🌳', blurb: 'Statement plants for the floor' },
    { key: 'flowering', name: 'Flowering', emoji: '🌸', blurb: 'Grown for their blooms' },
    { key: 'succulents', name: 'Succulents', emoji: '🪴', blurb: 'Chunky, water-storing leaves — water sparingly' },
    { key: 'cacti', name: 'Cacti', emoji: '🌵', blurb: 'Spiny desert and jungle cacti' },
    { key: 'herbs', name: 'Herbs & edibles', emoji: '🌱', blurb: 'Windowsill herbs, fruit and seedlings' },
    { key: 'quirky', name: 'Quirky & carnivorous', emoji: '🪰', blurb: 'Bug-eaters, air plants and oddballs' },
  ];

  // [key, name, latin, minDays, maxDays, water, note, match]
  const BY_GROUP = {
    leafy: [
      ['monstera', 'Monstera', 'Monstera deliciosa', 10, 14, TT, 'Let the top 5 cm of soil dry between waterings. Bright, indirect light; keep away from radiators.', /monst(?!era adansonii)|swiss cheese plant/],
      ['zz-plant', 'ZZ Plant', 'Zamioculcas zamiifolia', 21, 28, T, 'Water-storing rhizomes: let the soil dry out completely. Copes with low light.', /\bzz\b|zamioculcas/],
      ['snake-plant', 'Snake Plant', 'Dracaena trifasciata', 28, 42, T, 'Water only when the soil is bone dry. Never let water sit in the leaf crowns.', /snake|sansevieria|trifasciata|mother.in.law/],
      ['spider-plant', 'Spider Plant', 'Chlorophytum comosum', 10, 14, R, 'Let the top half of the soil dry. Rainwater avoids brown leaf tips from fluoride.', /spider/],
      ['cast-iron-plant', 'Cast Iron Plant', 'Aspidistra elatior', 21, 28, TR, 'Almost indestructible. Copes with low light and dry soil.', /iron plant|aspidistra/],
      ['peperomia', 'Peperomia', 'Peperomia obtusifolia', 14, 21, TT, 'Fleshy leaves store water; let the soil dry 80% before watering.', /peperomia(?! argyreia)|baby rubber/],
      ['pilea', 'Chinese Money Plant', 'Pilea peperomioides', 10, 14, TT, 'Water when the top half is dry. Rotate weekly so it grows evenly.', /pilea|chinese money/],
      ['alocasia', 'Alocasia', 'Alocasia amazonica', 7, 10, R, 'Keep lightly moist but never soggy; may sulk and drop leaves in winter. Loves humidity.', /alocasia|elephant ear|african mask/],
      ['dieffenbachia', 'Dumb Cane', 'Dieffenbachia', 10, 14, TT, 'Let the top few cm dry. Sap is irritating — keep away from pets and children.', /dieffenbachia|dumb cane/],
      ['syngonium', 'Arrowhead Plant', 'Syngonium podophyllum', 7, 10, TT, 'Keep lightly moist. Can climb a moss pole or trail as it matures.', /syngonium|arrowhead/],
    ],
    patterned: [
      ['prayer-plant', 'Prayer Plant', 'Maranta leuconeura', 7, 10, R, 'Keep lightly moist with room-temperature rainwater. Leaves fold up at night.', /prayer|maranta/],
      ['calathea', 'Calathea', 'Goeppertia', 7, 10, R, 'Keep evenly moist with lukewarm rainwater. Protect from draughts and dry radiator air.', /calathea(?! lancifolia)|goeppertia(?! insignis)/],
      ['rattlesnake-plant', 'Rattlesnake Plant', 'Goeppertia insignis', 7, 10, R, 'Keep evenly moist with rainwater; crispy edges mean the air is too dry.', /rattlesnake|lancifolia|insignis/],
      ['stromanthe', 'Stromanthe Triostar', 'Stromanthe sanguinea', 7, 10, R, 'Keep lightly moist and humid. Bright light keeps the pink stripes vivid.', /stromanthe|triostar/],
      ['fittonia', 'Fittonia', 'Fittonia albivenis', 5, 7, R, 'Collapses dramatically when dry — keep slightly damp. Bounces back quickly after a drink.', /fittonia|nerve plant/],
      ['polka-dot-plant', 'Polka Dot Plant', 'Hypoestes phyllostachya', 5, 7, TT, 'Keep lightly moist; wilts fast when dry. Pinch tips to keep it bushy.', /polka dot plant|hypoestes/],
      ['begonia', 'Polka Dot Begonia', 'Begonia maculata', 7, 10, TT, 'Let the top 2 cm dry. Likes humidity but not wet leaves.', /begonia(?! rex)|maculata/],
      ['rex-begonia', 'Rex Begonia', 'Begonia rex', 7, 10, TT, 'Water when the top 2 cm is dry, at the soil — never on the leaves.', /rex begonia|begonia rex/],
      ['aglaonema', 'Chinese Evergreen', 'Aglaonema', 10, 14, TT, 'Let the top half dry. Tolerates lower light well.', /aglaonema|chinese evergreen/],
      ['croton', 'Croton', 'Codiaeum variegatum', 7, 10, TT, 'Keep lightly moist and warm. Bright light keeps the colours vivid.', /croton|codiaeum/],
      ['coleus', 'Coleus', 'Coleus scutellarioides', 5, 7, TT, 'Keep lightly moist and in bright light. Pinch out flowers to keep the leaves colourful.', /^coleus$|coleus (?!amboinicus)|scutellarioides/],
      ['caladium', 'Caladium', 'Caladium bicolor', 28, 42, T, 'Dies back to a tuber in winter — keep almost dry until new shoots appear in spring.', /caladium|angel wings/],
      ['watermelon-peperomia', 'Watermelon Peperomia', 'Peperomia argyreia', 10, 14, TT, 'Let the top half dry. Thick leaves and red stems rot if kept wet.', /watermelon|argyreia/],
      ['oxalis', 'Purple Shamrock', 'Oxalis triangularis', 7, 10, TT, 'Let the top 2 cm dry. Leaves close at night; may go dormant — just water less.', /oxalis|shamrock/],
    ],
    trailing: [
      ['pothos', 'Pothos', 'Epipremnum aureum', 10, 14, TT, 'Allow the top half of the soil to dry out. Yellowing leaves usually mean too much water.', /(?<!satin )pothos|epipremnum|devil'?s ivy/],
      ['philodendron', 'Heartleaf Philodendron', 'Philodendron hederaceum', 10, 14, TT, 'Let the top 50% of soil dry out. Avoid cold draughts from windows.', /philodendron/],
      ['satin-pothos', 'Satin Pothos', 'Scindapsus pictus', 10, 14, TT, 'Let the top half dry; leaves curl when it’s thirsty.', /satin pothos|scindapsus/],
      ['monstera-adansonii', 'Swiss Cheese Vine', 'Monstera adansonii', 7, 10, TT, 'Keep lightly moist; give it a moss pole or let it trail.', /adansonii|swiss cheese vine/],
      ['english-ivy', 'English Ivy', 'Hedera helix', 7, 10, TT, 'Likes it cool. Keep lightly moist and mist occasionally to deter spider mites.', /\bivy\b|hedera/],
      ['creeping-fig', 'Creeping Fig', 'Ficus pumila', 5, 7, TT, 'Tiny leaves dry out fast — never let it dry completely.', /creeping fig|pumila/],
      ['tradescantia', 'Tradescantia', 'Tradescantia zebrina', 7, 10, TT, 'Keep lightly moist; water the soil, not the stems. Pinch back leggy winter growth.', /tradescantia|wandering|inch plant/],
      ['hoya', 'Hoya', 'Hoya carnosa', 14, 21, TT, 'Thick leaves store water; let the soil dry out between drinks.', /hoya|wax plant/],
      ['string-of-hearts', 'String of Hearts', 'Ceropegia woodii', 14, 21, TT, 'Let the pot dry out fully. Water when the leaves feel slightly soft.', /string of hearts|chain of hearts|ceropegia/],
      ['string-of-pearls', 'String of Pearls', 'Curio rowleyanus', 14, 21, TT, 'Water when the pearls look slightly wrinkled. Very prone to rot if kept wet.', /string of pearls|rowleyanus/],
      ['string-of-dolphins', 'String of Dolphins', 'Curio × peregrinus', 14, 21, T, 'Treat like a succulent: let it dry out, then water thoroughly.', /dolphins|peregrinus/],
      ['string-of-bananas', 'String of Bananas', 'Curio radicans', 14, 21, T, 'Water when the soil is dry. Faster growing and more forgiving than String of Pearls.', /bananas|radicans/],
      ['lipstick-plant', 'Lipstick Plant', 'Aeschynanthus radicans', 10, 14, TT, 'Let the top third dry. Bright light encourages the red tube flowers.', /lipstick|aeschynanthus/],
    ],
    'palms-ferns': [
      ['boston-fern', 'Boston Fern', 'Nephrolepis exaltata', 5, 7, R, 'Keep soil evenly moist but never soggy. Loves humidity; sensitive to tap-water minerals.', /boston fern|nephrolepis|(?<!(asparagus|maidenhair|staghorn|nest|foot|star) )fern$/],
      ['maidenhair-fern', 'Maidenhair Fern', 'Adiantum raddianum', 4, 6, R, 'Never let it dry out — the fronds crisp within a day. Ideal for a bathroom.', /maidenhair|adiantum/],
      ['birds-nest-fern', 'Bird’s Nest Fern', 'Asplenium nidus', 7, 10, R, 'Water around the edge of the pot, not into the central rosette.', /bird'?s nest|asplenium/],
      ['staghorn-fern', 'Staghorn Fern', 'Platycerium bifurcatum', 7, 10, R, 'Soak the root ball for 10 minutes when it feels light; mist between soaks.', /staghorn|platycerium/],
      ['asparagus-fern', 'Asparagus Fern', 'Asparagus setaceus', 7, 10, TT, 'Keep lightly moist; drops needles if it dries out or the air is too dry.', /asparagus/],
      ['rabbits-foot-fern', 'Rabbit’s Foot Fern', 'Davallia fejeensis', 7, 10, R, 'Keep moist but don’t bury or soak the furry “feet” (rhizomes).', /rabbit'?s foot|davallia/],
      ['blue-star-fern', 'Blue Star Fern', 'Phlebodium aureum', 7, 10, R, 'Let the surface dry slightly between waterings. Copes with lower light.', /blue star|phlebodium/],
      ['parlour-palm', 'Parlour Palm', 'Chamaedorea elegans', 10, 14, R, 'Let the top 50% of soil dry. Rainwater stops brown tips caused by chlorine and fluoride.', /parlou?r palm|chamaedorea/],
      ['areca-palm', 'Areca Palm', 'Dypsis lutescens', 10, 14, R, 'Keep lightly moist; dislikes drying out fully. Bright, indirect light.', /areca|dypsis/],
      ['kentia-palm', 'Kentia Palm', 'Howea forsteriana', 14, 21, R, 'Let the top half dry. Very tolerant of shade and neglect.', /kentia|howea/],
      ['lady-palm', 'Lady Palm', 'Rhapis excelsa', 10, 14, R, 'Let the top few cm dry. Slow-growing and shade-tolerant.', /lady palm|rhapis/],
      ['sago-palm', 'Sago Palm', 'Cycas revoluta', 21, 28, T, 'Not a true palm. Let the soil dry well; toxic to pets.', /sago|cycas/],
      ['ponytail-palm', 'Ponytail Palm', 'Beaucarnea recurvata', 21, 28, T, 'Actually a succulent — the swollen trunk stores water. Let it dry out fully.', /ponytail|beaucarnea/],
    ],
    trees: [
      ['fiddle-leaf-fig', 'Fiddle Leaf Fig', 'Ficus lyrata', 10, 14, TT, 'Let the top 50–70% dry. Hates being moved and cold draughts.', /fiddle|lyrata/],
      ['rubber-plant', 'Rubber Plant', 'Ficus elastica', 10, 14, TT, 'Let the top half dry out. Wipe the big leaves to keep them glossy.', /rubber plant|ficus elastica/],
      ['weeping-fig', 'Weeping Fig', 'Ficus benjamina', 10, 14, TT, 'Let the top few cm dry. Drops leaves if moved or chilled — it usually recovers.', /weeping fig|benjamina/],
      ['olive-tree', 'Olive Tree', 'Olea europaea', 21, 28, TR, 'Needs maximum winter sun. Water sparingly, just enough so the root ball never fully dries.', /olive/],
      ['dragon-tree', 'Dragon Tree', 'Dracaena marginata', 21, 28, R, 'Keep mostly dry; wet roots rot easily. Rainwater prevents tip scorch.', /dragon|marginata/],
      ['corn-plant', 'Corn Plant', 'Dracaena fragrans', 10, 14, R, 'Let the top 50% of soil dry. Sensitive to fluoride — rainwater is best.', /corn plant|fragrans/],
      ['yucca', 'Yucca', 'Yucca elephantipes', 21, 28, T, 'Let the soil dry out well. Loves bright light; very forgiving.', /yucca/],
      ['umbrella-tree', 'Umbrella Tree', 'Schefflera arboricola', 10, 14, TT, 'Let the top half dry. Drops leaves when overwatered.', /schefflera|umbrella/],
      ['money-tree', 'Money Tree', 'Pachira aquatica', 10, 14, TT, 'Let the top half dry; braided trunks rot if left in water.', /money tree|pachira/],
      ['norfolk-pine', 'Norfolk Island Pine', 'Araucaria heterophylla', 7, 10, TT, 'Keep lightly moist and in bright light. Rotate it to keep it straight.', /norfolk|araucaria/],
      ['bird-of-paradise', 'Bird of Paradise', 'Strelitzia reginae', 10, 14, TT, 'Let the top few cm dry. Wants lots of bright light.', /bird of paradise|strelitzia/],
      ['banana-plant', 'Banana Plant', 'Musa', 7, 10, TT, 'Thirsty in summer; in winter keep just moist. Split leaves are normal.', /banana plant|\bmusa\b/],
    ],
    flowering: [
      ['peace-lily', 'Peace Lily', 'Spathiphyllum', 7, 10, R, 'Water when the top 2–3 cm is dry or leaves start to soften. Rainwater prevents brown tips.', /peace lily|spathiphyllum/],
      ['orchid', 'Moth Orchid', 'Phalaenopsis', 10, 14, R, 'Water when the roots turn silvery. Soak, then drain fully — never leave in water.', /orchid|phalaenopsis/],
      ['anthurium', 'Anthurium', 'Anthurium andraeanum', 7, 10, R, 'Let the top third dry. Loves humidity and bright, indirect light.', /anthurium|flamingo/],
      ['african-violet', 'African Violet', 'Saintpaulia', 7, 10, TT, 'Water from below with tepid water; keep drops off the fuzzy leaves.', /african violet|saintpaulia/],
      ['amaryllis', 'Amaryllis', 'Hippeastrum', 7, 10, TT, 'Keep lightly moist once the stem emerges; never pour water on the bulb nose.', /amaryllis|hippeastrum/],
      ['bromeliad', 'Bromeliad', 'Bromeliaceae', 14, 21, R, 'Keep the central cup a quarter full of fresh rainwater; keep the mix barely moist.', /bromel|guzmania|aechmea/],
      ['kalanchoe', 'Flaming Katy', 'Kalanchoe blossfeldiana', 14, 21, T, 'Succulent leaves — let it dry out between drinks. Short days trigger flowering.', /flaming katy|blossfeldiana|^kalanchoe$/],
      ['cyclamen', 'Cyclamen', 'Cyclamen persicum', 5, 7, TT, 'Water from below so the crown stays dry. Likes a cool room.', /cyclamen/],
      ['poinsettia', 'Poinsettia', 'Euphorbia pulcherrima', 7, 10, TT, 'Water when the surface is dry; hates draughts and soggy roots.', /poinsettia|pulcherrima/],
      ['hibiscus', 'Hibiscus', 'Hibiscus rosa-sinensis', 7, 10, TT, 'Keep lightly moist and in bright light. Buds drop if it dries out.', /hibiscus/],
      ['jasmine', 'Jasmine', 'Jasminum polyanthum', 7, 10, TT, 'Keep lightly moist and cool in winter for scented spring flowers.', /jasmin/],
      ['gardenia', 'Gardenia', 'Gardenia jasminoides', 5, 7, R, 'Keep evenly moist with lime-free rainwater; buds drop if it dries or chills.', /gardenia/],
      ['streptocarpus', 'Cape Primrose', 'Streptocarpus', 7, 10, TT, 'Let the top dry slightly. Water at the edge of the pot, not on the leaves.', /streptocarpus|cape primrose/],
      ['clivia', 'Clivia', 'Clivia miniata', 21, 28, T, 'Keep fairly dry and cool in winter — this rest triggers the orange flowers.', /clivia|bush lily/],
      ['geranium', 'Geranium', 'Pelargonium', 14, 21, T, 'Keep on the dry side in winter; water when the surface is dry.', /geranium|pelargonium/],
    ],
    succulents: [
      ['echeveria', 'Echeveria', 'Echeveria', 21, 28, T, 'Water only when bone dry and lower leaves wrinkle. Water the soil, never the rosette.', /echev/],
      ['haworthia', 'Haworthia', 'Haworthiopsis', 28, 42, T, 'Water sparingly once the soil is completely dry; don’t let water pool in the rosette.', /haworthia|zebra/],
      ['aloe-vera', 'Aloe Vera', 'Aloe barbadensis', 28, 42, T, 'Water lightly only when leaves flatten or crease. Damp roots rot fast in the cold.', /aloe/],
      ['jade-plant', 'Jade Plant', 'Crassula ovata', 21, 28, T, 'Let the soil dry right out. Wrinkly leaves mean it’s thirsty.', /jade|crassula/],
      ['mexican-hat-plant', 'Mexican Hat Plant', 'Kalanchoe daigremontiana', 14, 21, T, 'Succulent leaves store water; let the soil dry fully. Drops lots of babies!', /mexican hat|daigremontiana|mother of thousands/],
      ['panda-plant', 'Panda Plant', 'Kalanchoe tomentosa', 21, 28, T, 'Fuzzy leaves store water. Let it dry out completely.', /panda|tomentosa/],
      ['paddle-plant', 'Paddle Plant', 'Kalanchoe luciae', 21, 28, T, 'Let it dry out fully. More sun = redder paddle edges.', /paddle|flapjack|luciae|thyrsiflora/],
      ['chalksticks', 'Chalksticks', 'Senecio mandraliscae', 28, 42, T, 'Keep dry in winter; give a light sip only if the fingers wrinkle.', /chalk ?sticks|mandraliscae/],
      ['burros-tail', 'Burro’s Tail', 'Sedum morganianum', 21, 28, T, 'Let it dry out. Handle gently — the beads drop at a touch.', /burro|donkey'?s tail|morganianum/],
      ['agave', 'Agave', 'Agave', 28, 42, T, 'Very drought-tolerant; water sparingly in winter. Watch the spiky tips!', /agave/],
      ['hens-and-chicks', 'Hens & Chicks', 'Sempervivum', 21, 28, T, 'Keep on the dry side; the “chicks” root easily around the mother.', /hens|sempervivum|houseleek/],
      ['gasteria', 'Gasteria', 'Gasteria', 21, 28, T, 'Let the soil dry out. Copes with less light than most succulents.', /gasteria|ox ?tongue/],
      ['aeonium', 'Aeonium', 'Aeonium arboreum', 10, 14, T, 'A winter grower — water a little more in winter and less in summer.', /aeonium/],
      ['lithops', 'Living Stones', 'Lithops', 42, 56, T, 'Don’t water from late autumn until the old leaves have shrivelled in spring.', /lithops|living stone/],
    ],
    cacti: [
      ['golden-barrel', 'Golden Barrel Cactus', 'Echinocactus grusonii', 42, 56, T, 'Desert cactus: keep dry through winter, resume watering in spring.', /barrel/],
      ['pincushion-cactus', 'Pincushion Cactus', 'Mammillaria', 42, 56, T, 'Keep almost completely dry in winter — the cool, dry rest triggers spring flowers.', /pincushion/],
      ['mammillaria', 'Mammillaria Cactus', 'Mammillaria', 42, 56, T, 'Cold winter rest: keep 100% dry. Clusters trap moisture, so avoid splashing.', /mammillaria/],
      ['blue-torch', 'Blue Torch Cactus', 'Pilosocereus', 42, 56, T, 'Keep bone dry all winter to protect the blue waxy coating.', /blue torch|pilosocereus/],
      ['bunny-ears', 'Bunny Ears Cactus', 'Opuntia microdasys', 42, 56, T, 'Keep dry in winter. The fuzzy dots are tiny barbed spines — don’t stroke!', /bunny|opuntia|prickly pear/],
      ['moon-cactus', 'Moon Cactus', 'Gymnocalycium mihanovichii', 28, 42, T, 'A colourful cactus grafted onto a green stem. Let it dry out between waterings.', /moon cactus|gymnocalycium/],
      ['fairy-castle', 'Fairy Castle Cactus', 'Acanthocereus tetragonus', 42, 56, T, 'Slow-growing turrets. Keep dry in winter and in bright light.', /fairy castle|acanthocereus/],
      ['old-man-cactus', 'Old Man Cactus', 'Cephalocereus senilis', 42, 56, T, 'The white “hair” shades it from sun. Keep dry and avoid wetting the hair.', /old man|cephalocereus/],
      ['star-cactus', 'Star Cactus', 'Astrophytum asterias', 42, 56, T, 'Very rot-prone: keep completely dry in winter.', /star cactus|bishop|astrophytum/],
      ['christmas-cactus', 'Christmas Cactus', 'Schlumbergera', 7, 10, TT, 'A forest cactus — likes more water than desert types, especially while flowering.', /christmas cactus|schlumbergera|easter cactus/],
      ['fishbone-cactus', 'Fishbone Cactus', 'Disocactus anguliger', 10, 14, TT, 'A jungle cactus: water when the top half is dry, and give it humidity.', /fishbone|zig ?zag|anguliger/],
      ['rhipsalis', 'Mistletoe Cactus', 'Rhipsalis baccifera', 10, 14, TT, 'A jungle cactus that trails. Keep lightly moist; never bone dry.', /rhipsalis|mistletoe/],
    ],
    herbs: [
      ['mint', 'Mint', 'Mentha / Coleus amboinicus', 7, 10, TT, 'Let the top half of the soil dry. Protect from cold window draughts.', /mint|coleus amboinicus|mentha|cuban oregano/],
      ['basil', 'Basil', 'Ocimum basilicum', 4, 6, T, 'Keep moist but not soggy; water in the morning. Loves a sunny windowsill.', /basil/],
      ['rosemary', 'Rosemary', 'Salvia rosmarinus', 10, 14, T, 'Let the top dry out; it hates wet feet. Sunniest windowsill you have.', /rosemary|rosmarinus/],
      ['thyme', 'Thyme', 'Thymus vulgaris', 10, 14, T, 'Water when the soil is dry. Gritty compost and full sun.', /thyme|thymus/],
      ['parsley', 'Parsley', 'Petroselinum crispum', 4, 6, T, 'Keep evenly moist. Cut outer stems first.', /parsley/],
      ['chives', 'Chives', 'Allium schoenoprasum', 4, 6, T, 'Keep moist. Snip from the base and it regrows.', /chive/],
      ['coriander', 'Coriander', 'Coriandrum sativum', 4, 6, T, 'Keep evenly moist and cool; bolts to seed if stressed.', /coriander|cilantro/],
      ['chilli-plant', 'Chilli Plant', 'Capsicum annuum', 7, 10, TT, 'Let the top dry between waterings. Hand-pollinate flowers with a brush.', /chil+i|capsicum|pepper plant/],
      ['lemon-tree', 'Lemon Tree', 'Citrus × limon', 7, 10, TR, 'Water when the top few cm are dry; use citrus feed. Brightest spot possible.', /lemon|citrus|orange tree|calamondin/],
      ['strawberry', 'Strawberry', 'Fragaria × ananassa', 5, 7, T, 'Keep evenly moist; water the soil, not the fruit.', /strawberr/],
      ['propagation-tray', 'Cuttings & Seedlings', 'Propagation tray', 5, 7, R, 'Fragile new roots need light, consistent moisture. Bottom-water or mist gently.', /baby tray|cutting|seedling|propagat|pups/],
    ],
    quirky: [
      ['venus-flytrap', 'Venus Flytrap', 'Dionaea muscipula', 7, 10, R, 'Rainwater only — never tap. Dormant in winter: keep cool and just moist.', /flytrap|dionaea/],
      ['pitcher-plant', 'Pitcher Plant', 'Sarracenia / Nepenthes', 5, 7, R, 'Rainwater only, kept moist. Don’t fill the pitchers.', /pitcher|sarracenia|nepenthes/],
      ['sundew', 'Sundew', 'Drosera', 3, 5, R, 'Stand the pot in a saucer of rainwater; never let it dry out.', /sundew|drosera/],
      ['air-plant', 'Air Plant', 'Tillandsia', 7, 10, R, 'No soil! Soak in rainwater for 20 minutes, then dry upside down.', /air plant|tillandsia/],
      ['lucky-bamboo', 'Lucky Bamboo', 'Dracaena sanderiana', 7, 10, F, 'Keep roots covered with filtered water; change it every couple of weeks.', /lucky bamboo|sanderiana/],
      ['sensitive-plant', 'Sensitive Plant', 'Mimosa pudica', 4, 6, TT, 'Keep moist and warm. Leaves fold up when touched!', /sensitive|mimosa/],
    ],
  };

  const CATALOG = [];
  for (const g of GROUPS) {
    for (const [key, name, latin, minDays, maxDays, waterType, note, match] of BY_GROUP[g.key]) {
      CATALOG.push({ key, name, latin, minDays, maxDays, waterType, note, match, group: g.key });
    }
  }
  const byKey = Object.fromEntries(CATALOG.map((c) => [c.key, c]));
  const groupByKey = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

  // ----- seasonal schedules -----
  // Catalogue ranges are WINTER values. Other seasons are derived with a
  // rule-of-thumb multiplier on the winter interval, by kind of plant: growing plants drink
  // more often in spring/summer; desert cacti and succulents swing the most.
  const PROFILES = {
    standard: { spring: 0.75, summer: 0.55, autumn: 0.85, winter: 1 },
    herb: { spring: 0.7, summer: 0.5, autumn: 0.8, winter: 1 },
    succulent: { spring: 0.5, summer: 0.35, autumn: 0.6, winter: 1 },
    desert: { spring: 0.35, summer: 0.22, autumn: 0.45, winter: 1 },
  };
  const GROUP_PROFILE = { succulents: 'succulent', cacti: 'desert', herbs: 'herb' };
  const SPECIES_PROFILE = {
    // jungle cacti behave like ordinary tropicals
    'christmas-cactus': 'standard', 'fishbone-cactus': 'standard', rhipsalis: 'standard',
    // water-storing plants filed elsewhere
    'snake-plant': 'succulent', 'zz-plant': 'succulent', 'ponytail-palm': 'succulent', yucca: 'succulent',
    'sago-palm': 'succulent', 'string-of-pearls': 'succulent', 'string-of-dolphins': 'succulent',
    'string-of-bananas': 'succulent', 'string-of-hearts': 'succulent', hoya: 'succulent', kalanchoe: 'succulent',
  };
  // Plants whose year doesn't follow the usual pattern (explicit ranges in days).
  const OVERRIDES = {
    lithops: { spring: [14, 21], summer: [28, 42], autumn: [10, 14] }, // rests in summer, grows autumn/spring
    aeonium: { spring: [10, 14], summer: [21, 28], autumn: [7, 10] }, // summer-dormant
    caladium: { spring: [7, 10], summer: [4, 6], autumn: [10, 14] }, // tuber sleeps through winter
    'venus-flytrap': { spring: [3, 5], summer: [2, 3], autumn: [5, 7] }, // stands in a tray when growing
  };

  /** Full four-season schedule from a winter range. */
  function schedule(speciesKey, winterMin, winterMax) {
    const c = speciesKey ? byKey[speciesKey] : null;
    const profile = PROFILES[SPECIES_PROFILE[speciesKey] || (c && GROUP_PROFILE[c.group]) || 'standard'];
    const wMin = winterMin || winterMax || 7, wMax = Math.max(winterMax || wMin, wMin);
    const out = {};
    for (const season of ['spring', 'summer', 'autumn', 'winter']) {
      const fixed = season !== 'winter' && OVERRIDES[speciesKey] && OVERRIDES[speciesKey][season];
      if (fixed) { out[season] = { min: fixed[0], max: fixed[1] }; continue; }
      const f = profile[season];
      const min = Math.max(1, Math.round(wMin * f));
      out[season] = { min, max: Math.max(min, Math.round(wMax * f)) };
    }
    return out;
  }

  window.Catalog = {
    all: CATALOG,
    groups: GROUPS,
    group(key) { return groupByKey[key] || null; },
    get(key) { return byKey[key] || null; },
    schedule,
    /** Best-guess species key for a plant, checking the name first, then name + detail. */
    guess(name, detail = '') {
      for (const text of [name, `${name} ${detail}`]) {
        const t = String(text).toLowerCase().trim();
        if (!t) continue;
        const hit = CATALOG.find((c) => c.match.test(t));
        if (hit) return hit.key;
      }
      return null;
    },
  };
})();
