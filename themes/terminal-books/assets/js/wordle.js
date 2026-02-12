(function() {
  'use strict';

  /* ── Answer pool (~2500 common 5-letter words) ── */
  var ANSWERS = [
    'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
    'agent','agree','ahead','alarm','album','alert','alien','align','alive','alley',
    'allow','alone','along','alter','ample','angel','anger','angle','angry','anime',
    'ankle','annex','antic','apart','apple','apply','arena','argue','arise','armor',
    'aroma','array','arrow','aside','asset','atlas','attic','audio','audit','avoid',
    'await','awake','award','aware','awful','axial','bacon','badge','badly','baker',
    'baron','basic','basin','basis','batch','beach','beard','beast','began','begin',
    'being','below','bench','berry','birth','black','blade','blame','bland','blank',
    'blast','blaze','bleak','bleed','blend','bless','blind','bliss','block','blond',
    'blood','bloom','blown','blues','bluff','blunt','board','boast','bonus','boost',
    'booth','bound','bowel','boxer','brain','brand','brave','bread','break','breed',
    'brick','bride','brief','bring','brink','broad','broke','brook','brown','brush',
    'buddy','buggy','build','built','bunch','burst','buyer','cabin','cable','camel',
    'candy','cargo','carry','catch','cater','cause','cedar','chain','chair','chalk',
    'champ','chant','chaos','charm','chart','chase','cheap','check','cheek','cheer',
    'chess','chest','chief','child','chill','china','choir','chord','chose','chunk',
    'cinch','circa','civic','civil','claim','clash','class','clean','clear','clerk',
    'click','cliff','climb','cling','clock','clone','close','cloth','cloud','clown',
    'cluck','coach','coast','color','comet','comic','coral','couch','could','count',
    'court','cover','crack','craft','crane','crash','crawl','crazy','cream','crest',
    'crime','crisp','cross','crowd','crown','crude','crush','curve','cycle','daddy',
    'daily','dairy','dance','debut','decay','decor','decoy','deity','delay','delta',
    'dense','depot','depth','derby','devil','diary','dirty','disco','ditch','dizzy',
    'dodge','doing','donor','doubt','dough','draft','drain','drake','drama','drank',
    'drape','drawn','dream','dress','dried','drift','drill','drink','drive','droit',
    'drone','drops','drove','drown','drugs','drums','drunk','dryer','dryly','dully',
    'dummy','dunce','dusty','dwarf','dwell','dying','eager','eagle','early','earth',
    'easel','eaten','edges','edict','eight','elbow','elder','elect','elite','email',
    'ember','empty','enjoy','enter','entry','equal','equip','error','essay','ethic',
    'event','every','exact','exalt','exile','exist','extra','fable','facet','faith',
    'false','fancy','fatal','fault','feast','fence','ferry','fever','fiber','field',
    'fiend','fifth','fifty','fight','final','first','fixed','flame','flash','flask',
    'fleet','flesh','float','flock','flood','floor','flora','flour','fluid','fluke',
    'flung','flush','flute','focal','focus','folly','force','forge','forth','forum',
    'fossil','found','frame','frank','fraud','fresh','front','frost','froze','fruit',
    'fully','fungi','fuzzy','gaffe','gauge','ghost','giant','given','gland','glass',
    'gleam','glide','globe','gloom','glory','gloss','glove','glyph','gnome','going',
    'goose','gorge','grace','grade','grain','grand','grant','grape','graph','grasp',
    'grass','grave','gravel','great','greed','green','greet','grief','grill','grind',
    'gripe','groan','groom','gross','group','grove','grown','gruel','guard','guess',
    'guest','guide','guild','guilt','guise','gulch','gully','gummy','gusto','gusty',
    'habit','hairy','happy','harsh','haste','hasty','hatch','haven','heart','heavy',
    'hedge','heist','hello','hence','herbs','hinge','hippo','hobby','homer','honey',
    'honor','horse','hotel','hotly','house','hover','human','humid','humor','hurry',
    'hyena','hyper','icing','ideal','image','imply','inbox','incur','index','indie',
    'inept','inert','infer','inner','input','inter','intro','ionic','irate','ivory',
    'jazzy','jelly','jewel','jiffy','joker','jolly','judge','juice','juicy','jumbo',
    'jumpy','juror','kayak','kebab','kinky','knack','knead','kneel','knelt','knife',
    'knock','knoll','known','label','labor','lance','laser','latch','later','laugh',
    'layer','learn','lease','leave','ledge','legal','lemon','level','lever','light',
    'liken','lilac','limbo','limit','linen','liner','lived','liver','llama','lobby',
    'local','lodge','lofty','logic','loose','lorry','loser','lover','lower','loyal',
    'lucid','lucky','lunar','lunch','lunge','lusty','lying','lyric','macho','magic',
    'major','maker','manga','manor','maple','march','marry','marsh','match','maxim',
    'maybe','mayor','means','media','medic','melon','mercy','merge','merit','merry',
    'messy','metal','meter','midst','might','mimic','minor','minus','mirth','misty',
    'model','modem','mogul','moist','money','month','moose','moral','motif','motor',
    'motto','mound','mount','mourn','mouse','mouth','movie','muddy','mural','mushy',
    'music','musty','muted','naive','nanny','nasty','naval','nerve','never','newly',
    'nexus','niche','night','ninja','noble','noise','north','notch','noted','novel',
    'nudge','nurse','nylon','occur','ocean','olive','omega','onset','opera','opted',
    'orbit','order','organ','other','ought','outer','owned','owner','oxide','ozone',
    'paddy','pagan','paint','panel','panic','paper','parse','party','pasta','paste',
    'patch','pause','peace','peach','pearl','penal','penny','perch','peril','perky',
    'pesto','petty','phase','phone','photo','piano','piece','pilot','pinch','pitch',
    'pixel','pizza','place','plain','plane','plank','plant','plate','plaza','plead',
    'pleat','plier','pluck','plumb','plume','plump','plunge','plunk','point','poker',
    'polar','polka','polyp','pooch','poppy','porch','poser','posse','pouch','pound',
    'power','prank','prawn','press','price','pride','prime','print','prior','prize',
    'probe','prone','proof','prose','proud','prove','proxy','prude','prune','psalm',
    'pulse','punch','pupil','puppy','purge','purse','pushy','quack','qualm','query',
    'quest','queue','quick','quiet','quill','quirk','quota','quote','rabbi','radar',
    'radio','rainy','raise','rally','ranch','range','rapid','raven','reach','react',
    'realm','rebel','rebus','refer','reign','relax','relay','relic','remit','renew',
    'repay','reply','resin','retry','reuse','revel','rider','ridge','rifle','right',
    'rigid','rigor','rinse','risky','rival','river','roast','robin','robot','rocky',
    'rogue','roman','roost','rouge','rough','round','route','rover','royal','rugby',
    'ruler','rumor','rural','rusty','sadly','saint','salad','sally','salon','salsa',
    'salty','salve','sandy','satin','sauce','sauna','savor','scale','scare','scarf',
    'scary','scene','scent','scoop','scope','score','scout','scram','scrap','screw',
    'scrim','scrub','sedan','sense','serum','serve','setup','seven','sever','shade',
    'shady','shaft','shake','shall','shame','shape','share','shark','sharp','shave',
    'sheep','sheer','sheet','shelf','shell','shift','shine','shiny','shire','shirt',
    'shock','shore','short','shout','shove','shrub','shrug','sight','sigma','silky',
    'silly','since','siren','sixth','sixty','sized','skill','skull','slang','slash',
    'slate','sleep','sleet','slice','slide','slimy','sling','slope','sloth','small',
    'smart','smell','smile','smith','smoke','snack','snake','snare','sneak','snore',
    'solar','solid','solve','sonic','sorry','south','space','spare','spark','speak',
    'spear','speck','speed','spell','spend','spent','spice','spicy','spill','spine',
    'spite','split','spoke','spoon','sport','spray','squad','squid','stack','staff',
    'stage','stain','stair','stake','stale','stalk','stall','stamp','stand','stank',
    'stark','start','state','stave','stays','steak','steal','steam','steel','steep',
    'steer','stern','stick','stiff','still','sting','stink','stock','stoic','stoke',
    'stone','stood','stool','store','stork','storm','story','stout','stove','strap',
    'straw','stray','strip','stuck','study','stuff','stump','stung','stunk','style',
    'sugar','suite','sunny','super','surge','sushi','swamp','swarm','swear','sweat',
    'sweep','sweet','swept','swift','swill','swine','swing','swirl','swoop','sword',
    'swore','sworn','swung','synod','syrup','tabby','table','taboo','taint','taken',
    'tally','talon','tangy','taper','taste','tasty','taunt','tease','teeth','tempo',
    'tense','tenth','tepid','theme','there','thick','thief','thigh','thing','think',
    'third','thorn','those','three','threw','throw','thump','tiara','tidal','tiger',
    'tight','timer','timid','tired','titan','title','toast','today','token','tonal',
    'torch','total','touch','tough','towel','tower','toxic','trace','track','trade',
    'trail','train','trait','tramp','trash','tread','treat','trend','trial','tribe',
    'trick','tried','troop','trout','truck','truly','trump','trunk','trust','truth',
    'tulip','tumor','tuner','tuple','turbo','tutor','twang','tweak','tweed','twice',
    'twirl','twist','tying','udder','ulcer','ultra','under','undue','unfit','union',
    'unite','unity','unsay','until','upper','upset','urban','usage','usher','using',
    'usual','utter','vague','valid','value','valve','vapor','vault','verse','vigor',
    'vinyl','viola','viper','viral','virus','visit','visor','vista','vital','vivid',
    'vocal','vodka','vogue','voice','voila','voter','vouch','vowel','vulva','wacky',
    'wagon','waist','watch','water','weary','weave','wedge','weedy','weigh','weird',
    'whale','wheat','wheel','where','which','while','whine','whirl','white','whole',
    'whose','widen','width','witch','woman','works','world','worry','worse','worst',
    'worth','would','wound','wrack','wrath','wreak','wreck','wrist','write','wrong',
    'wrote','yacht','yearn','yield','young','youth','zebra','zesty','abbey','abort',
    'adapt','adept','adorn','afoot','agile','aging','agony','aisle','algae','alibi',
    'allot','aloof','amaze','amber','amend','ample','angel','annoy','anvil','aorta',
    'apex','arise','artsy','atone','avail','avert','badge','bagel','barge','batch',
    'begin','being','bible','binge','biome','birch','bison','blare','blast','bleat',
    'blimp','blitz','bloat','bloke','blurt','bogus','bongo','booth','bored','boron',
    'brace','brake','brave','brawl','braze','breed','bribe','brisk','brood','brute',
    'budge','bulge','bully','bunny','cabal','cache','cadet','cairn','canal','cargo',
    'carve','caulk','cedar','cello','chafe','chalk','cheap','cheek','chief','chose',
    'chunk','cider','cigar','civic','clamp','clasp','claw','clerk','climb','cling',
    'cloak','clout','cocoa','comet','comma','conch','coral','covet','crack','cramp',
    'crane','crave','crawl','craze','creed','creep','crimp','croak','crock','cruel',
    'crumb','crush','cubic','cumin','cynic','decal','decoy','demon','demur','denim',
    'dense','depot','derby','dicey','diner','dirge','dizzy','dodge','dolly','donor',
    'dowdy','dowel','drain','drape','drear','drier','drone','drool','droop','drove',
    'dryad','dunce','dusky','dwelt','eager','easel','eater','eerie','eight','elder',
    'elfin','elite','elope','elude','embed','emcee','emote','enact','endow','ensue',
    'envoy','epoch','equip','erode','erupt','ether','evade','evict','evoke','exile',
    'exude','faint','fairy','farce','feast','feign','feint','fence','fetid','feuds',
    'fiber','fiery','filth','finch','fjord','flail','flair','flaky','flank','flaxy',
    'fleet','flick','fling','flint','flirt','float','flora','floss','flout','flown',
    'flush','focal','foggy','foray','forge','forte','found','frail','freak','friar',
    'frost','froze','fugal','fungi','gaily','gazer','gecko','genre','ghost','giddy',
    'girth','giver','gland','glare','glaze','gleam','glean','glide','glint','gloss',
    'glyph','golem','gorge','gouge','gourd','grace','grasp','grate','graze','greed',
    'grief','grime','grind','gripe','grits','grope','grove','growl','gruff','grunt',
    'guava','gully','gumbo','gusto','gusty','gypsy','habit','handy','happy','hardy',
    'haven','hazel','heady','heave','hedge','hefty','helix','herbs','heron','hiker',
    'hilly','hitch','hoard','homer','horny','hound','hover','human','humid','husky',
    'idler','igloo','imp','inane','incur','inept','infer','ingot','inner','inter',
    'ionic','ivory','jaunt','jazzy','jetty','joint','joker','jolly','joust','juicy',
    'karma','kayak','kebab','kiosk','knack','knave','knead','kneel','knelt','knoll',
    'kudos','label','lance','lanky','lapse','large','larva','latch','later','lathe',
    'layer','ledge','leech','legal','lemur','level','lever','libel','light','lilac',
    'limbo','liner','lingo','livid','llama','lobby','locus','lofty','logic','loner',
    'loopy','lotus','lucid','lumen','lunar','lunge','lusty','lymph','lyric','mafia',
    'magma','mange','mango','mania','manor','maple','marsh','match','mayor','mealy',
    'media','mercy','metal','mince','minim','minor','mirth','modal','model','mogul',
    'moist','month','moody','moose','morph','motel','motif','motor','mound','mourn',
    'mucus','murky','mused','mushy','naive','nanny','nasal','naval','nerdy','newly',
    'nexus','nifty','night','noble','notch','novel','nudge','nurse','nymph','oaken',
    'oasis','ocean','ochre','offal','olive','omega','onset','optic','orbit','organ',
    'other','otter','outer','ovary','oxide','ozone','paddy','paint','panel','panic',
    'parch','parse','pasta','paste','patsy','pause','peach','pearl','penal','penny',
    'perch','perky','petal','petty','phase','phone','photo','piano','piece','pilot',
    'pinch','pitch','pivot','pixie','pizza','plaid','plait','plank','plant','plate',
    'plaza','pleat','pluck','plumb','plume','plump','plunk','plush','pluto','poach',
    'point','polar','polyp','poppy','porch','poser','posse','pouch','poult','pound',
    'power','prank','prawn','press','price','prime','print','prior','prism','privy',
    'probe','prong','proof','prose','proud','prove','prowl','prude','prune','psalm',
    'pulpy','pulse','punch','puree','pushy','pygmy','qualm','quart','quasi','query',
    'quest','quilt','quirk','quota','quote','rabbi','radar','radio','rainy','rally',
    'ranch','rapid','raven','rayon','reach','realm','rebus','reign','relax','relic',
    'remit','renew','repay','retry','reuse','revel','ridge','right','rigid','ripen',
    'risky','rival','river','roast','robin','rocky','rogue','rouge','rover','royal',
    'rugby','ruler','rumba','rumor','rural','rusty','saint','salad','salon','salsa',
    'salty','sandy','satin','sauce','sauna','savor','scale','scalp','scamp','scant',
    'scene','scent','scone','scoop','scope','score','scorn','scout','scowl','scram',
    'scrap','scrub','sedan','sense','serum','serve','seven','shade','shaft','shake',
    'shame','shape','share','shark','sharp','shawl','sheep','sheer','shelf','shell',
    'shift','shine','shirt','shock','shore','shout','shove','shrub','shrug','sight',
    'sigma','silky','silly','since','sixth','sixty','skill','skull','slain','slang',
    'slant','slate','sleek','sleep','slice','slide','slope','sloth','slurp','small',
    'smart','smell','smile','smirk','smite','smoke','snack','snail','snake','snare',
    'sneak','sneer','snore','snout','snowy','soggy','solar','solid','solve','sonic',
    'sorry','south','space','spare','spark','spawn','speak','spear','spell','spice',
    'spill','spine','spite','spoke','spoof','spook','spool','spoon','sport','spray',
    'sprig','spunk','squad','squat','squid','stack','staff','stage','staid','stain',
    'stair','stake','stale','stalk','stall','stamp','stand','stank','stare','stark',
    'start','stash','state','stays','steak','steal','steam','steel','steep','steer',
    'stern','stick','stiff','still','sting','stink','stint','stock','stoic','stoke',
    'stone','stool','stoop','store','storm','story','stout','stove','strap','straw',
    'stray','strip','strum','strut','stuck','study','stuff','stump','stung','stunk',
    'style','sugar','suite','sulky','sunny','super','surge','sushi','swamp','swarm',
    'swear','sweat','sweep','sweet','swift','swine','swing','swirl','swoop','sworn',
    'swung','syrup','tabby','table','tacit','taffy','taint','tally','talon','tangy',
    'taper','tardy','taste','tasty','taunt','tease','tempo','tense','tepid','terra',
    'thick','thief','thigh','thing','think','third','thorn','those','three','threw',
    'throw','thyme','tiara','tidal','tiger','tight','timer','timid','titan','title',
    'toast','today','token','tonic','torch','total','touch','tough','towel','tower',
    'toxic','trace','track','trade','trail','train','trait','trash','tread','treat',
    'trend','trial','tribe','trick','troop','trout','truce','truck','truly','trunk',
    'trust','truth','tulip','tuner','tuple','turbo','tutor','twang','tweak','tweed',
    'twice','twirl','twist','udder','ulcer','ultra','umber','uncut','under','undue',
    'unfit','union','unite','unity','unlit','untie','until','upper','upset','urban',
    'usher','usual','utter','valet','valid','valor','value','valve','vapor','vault',
    'vegan','venue','verge','verse','vigor','vinyl','viola','viper','viral','virus',
    'visit','visor','vista','vital','vivid','vixen','vocal','vodka','vogue','voice',
    'voter','vouch','vowel','wacky','wafer','wages','wagon','waist','watch','water',
    'weary','weave','wedge','weigh','weird','whale','wheat','wheel','where','which',
    'while','whine','whirl','white','whole','whose','widen','width','wield','windy',
    'witch','woman','woods','wordy','works','world','worry','worse','worst','worth',
    'would','wound','wrack','wrath','wreak','wreck','wring','wrist','write','wrong',
    'wrote','yacht','yearn','yeast','yield','young','youth','zebra','zesty'
  ];

  /* Remove duplicates from answers */
  var answerSet = {};
  var uniqueAnswers = [];
  var i;
  for (i = 0; i < ANSWERS.length; i++) {
    var w = ANSWERS[i].toLowerCase();
    if (w.length === 5 && !answerSet[w]) {
      answerSet[w] = true;
      uniqueAnswers.push(w);
    }
  }
  ANSWERS = uniqueAnswers;

  /* ── Extended valid guesses (answers + extra common words) ── */
  var EXTRA_VALID = [
    'aahed','aalii','aargh','abaca','abaci','aback','abaft','abash','abate','abbey',
    'abbot','abeam','abhor','abide','abler','abode','abort','abase','abuse','abyss',
    'acerb','acids','acmes','acned','acorn','acred','acted','addon','adder','addle',
    'adieu','adios','admin','admix','adobe','afoot','afoul','agape','agate','agave',
    'agent','aggro','agile','aging','agios','agism','aglow','agone','agony','agree',
    'ahold','aided','aider','aimed','aimer','aired','aisle','alarm','album','alder',
    'aleph','algae','algal','alias','alibi','alien','aline','alkyd','alkyl','allay',
    'alley','allot','alloy','aloes','aloft','aloha','alone','along','aloof','alpha',
    'altar','amass','amaze','amber','ambit','amble','amend','amino','amiss','amity',
    'amour','ample','amuse','angel','anger','angst','anime','ankle','annex','annul',
    'anode','antic','anvil','aorta','aphid','aping','apnea','apple','apply','apron',
    'ardor','arena','argue','arise','armor','aroma','arose','array','arrow','arson',
    'artsy','ascot','ashen','ashes','aside','asset','atoll','atone','attic','audio',
    'augur','aunts','avail','avert','avian','avoid','await','awake','award','aware',
    'awful','awing','awoke','axial','axion','axiom','azure','babel','badge','badly',
    'bagel','baggy','baker','balls','bands','bangs','banjo','banks','baron','basal',
    'based','bases','basic','basil','basin','basis','batch','bated','bathe','baton',
    'bayou','beady','beams','beans','beard','bears','beast','beats','beech','beefy',
    'beers','began','begat','begin','begun','being','belch','bells','belly','below',
    'belts','bench','berry','berth','beset','bible','bicep','bikes','billy','binge',
    'biome','birch','birds','birth','black','blade','blame','bland','blank','blare',
    'blast','blaze','bleak','bleat','bleed','blend','bless','blimp','blind','blink',
    'bliss','blitz','bloat','block','bloke','blond','blood','bloom','blown','blues',
    'bluff','blunt','blurb','blurs','blurt','board','boast','boats','boggy','bogus',
    'bolts','bombs','bonds','boned','bones','bongo','bonus','books','boost','boots',
    'booze','boozy','bored','borne','bosom','bossy','botch','bound','bowel','bowed',
    'bower','boxed','boxer','boxes','boyar','brace','brags','braid','brain','brake',
    'brand','brash','brass','brave','bravo','brawl','brawn','bread','break','breed',
    'briar','bribe','brick','bride','brief','brine','bring','brink','briny','brisk',
    'broad','broil','broke','brood','brook','broom','broth','brown','brunt','brush',
    'brute','buddy','budge','buggy','bugle','build','built','bulbs','bulge','bulky',
    'bully','bunch','bunny','bunts','buoys','burns','burnt','burst','buses','bushy',
    'buyer','byway','cabal','cabin','cable','cadet','cairn','calls','camel','camps',
    'canal','candy','canes','canoe','caped','caper','cards','cargo','carol','carry',
    'carve','cases','catch','cater','cause','caves','cease','cedar','cells','chain',
    'chair','chalk','champ','chant','chaos','chaps','charm','chart','chase','cheap',
    'cheat','check','cheek','cheer','chess','chest','chick','chief','child','chili',
    'chill','chimp','china','chips','choir','choke','chord','chore','chose','chump',
    'chunk','churn','cider','cigar','cinch','cited','civic','civil','claim','clamp',
    'clams','clang','clank','clans','claps','clash','clasp','class','claws','clean',
    'clear','clerk','click','cliff','climb','cling','clink','clips','cloak','clock',
    'clone','close','cloth','cloud','clout','clown','clubs','cluck','clued','clues',
    'clump','clung','coach','coals','coast','cocoa','coded','codes','coils','coins',
    'color','comet','comic','comma','conch','condo','cones','coops','coral','cords',
    'cores','corny','costs','couch','could','count','coupe','coups','court','cover',
    'covet','crack','craft','cramp','crane','crank','crash','crass','crate','crave',
    'crawl','craze','crazy','creak','cream','creed','creek','creep','crest','crews',
    'crimp','crisp','croak','crock','crook','crops','cross','crowd','crown','crude',
    'cruel','crush','crust','cubic','cumin','curds','cured','curly','curry','curse',
    'curve','cycle','cynic','daddy','daily','dairy','dance','dated','dates','daunt',
    'deals','dealt','death','debit','debug','debut','decal','decay','decor','decoy',
    'decoy','decry','deeds','deity','delay','delta','delve','demon','demur','denim',
    'dense','depot','depth','derby','desks','detox','deuce','devil','diary','dicey',
    'digit','dimly','dined','diner','dirty','disco','ditch','ditty','diver','dizzy',
    'dodge','dogma','doing','dolly','donor','donut','doors','doses','dotty','doubt',
    'dough','dowdy','dowel','downs','draft','drain','drake','drama','drank','drape',
    'drawn','draws','dread','dream','dress','dried','drier','drift','drill','drink',
    'drips','drive','droit','droll','drone','drool','droop','drops','dross','drove',
    'drown','drugs','drums','drunk','dryer','dryer','dryly','ducal','ducks','duels',
    'dummy','dumps','dumpy','dunce','dunes','dunks','dusty','dutch','dwarf','dwell',
    'dwelt','dying','eager','eagle','early','earns','earth','easel','eaten','eater',
    'eaves','ebbed','edges','edged','edict','eerie','eight','elbow','elder','elect',
    'elfin','elite','elope','elude','email','embed','ember','emcee','emote','empty',
    'enact','ended','endow','enemy','enjoy','ensue','enter','entry','envoy','epoch',
    'equal','equip','erode','error','erupt','essay','ethic','evade','event','every',
    'evict','evoke','exact','exalt','exams','excel','exile','exist','expat','extra',
    'exude','fable','faced','faces','facet','facts','fails','faint','fairy','faith',
    'false','famed','fancy','fangs','farce','farms','fatal','fated','fatty','fault',
    'fauna','feast','feats','feeds','feign','feint','feisty','fence','feral','ferry',
    'fetch','fetid','fetus','fever','fewer','fiber','fibre','field','fiend','fiery',
    'fifth','fifty','fight','filth','final','finch','finds','finer','fired','fires',
    'firms','first','fishy','fixed','fixer','fixes','fjord','flags','flail','flair',
    'flake','flaky','flame','flank','flaps','flare','flash','flask','fleet','flesh',
    'flick','flier','flies','fling','flint','flips','flirt','float','flock','flood',
    'floor','flora','floss','flour','flout','flows','fluid','fluke','flung','flunk',
    'flush','flute','foamy','focal','focus','foggy','folks','folly','fonts','foods',
    'foray','force','forge','forms','forte','forth','forty','forum','found','foxes',
    'foyer','frail','frame','frank','fraud','freak','freed','fresh','friar','fried',
    'fries','frill','frisk','fritz','frock','frogs','front','frost','froze','fruit',
    'fugal','fully','fumed','fumes','funds','fungi','funky','funny','furry','fuzzy',
    'gaffe','gains','gamer','games','gamma','gangs','gaped','gases','gauge','gaunt',
    'gauze','gazer','gears','gecko','geeks','genes','genie','genre','gents','germs',
    'ghost','giant','giddy','gifts','giddy','girth','giver','gives','gizmo','gland',
    'glare','glass','glaze','gleam','glean','glide','glint','globe','gloom','glory',
    'gloss','glove','glows','glyph','gnome','gnash','goals','goats','going','golem',
    'golly','goose','gorge','gouge','gourd','grace','grade','graft','grail','grain',
    'grand','grant','grape','graph','grasp','grass','grate','grave','gravy','graze',
    'great','greed','green','greet','grief','grill','grime','grimy','grind','gripe',
    'grips','grits','groan','groin','groom','grope','gross','group','grout','grove',
    'growl','grown','grows','gruel','gruff','grump','grunt','guano','guard','guava',
    'guess','guest','guide','guild','guilt','guise','gulch','gulls','gully','gummy',
    'gumbo','gunky','guppy','gusto','gusty','gypsy','habit','haiku','hairs','hairy',
    'halve','hands','handy','hangs','happy','hardy','harem','haste','hasty','hatch',
    'hated','haven','havoc','hazel','heads','heady','heals','heaps','heard','heart',
    'heats','heave','heavy','hedge','heels','hefty','heist','helix','hello','helps',
    'hence','herbs','herds','heron','hiker','hills','hilly','hinge','hints','hippo',
    'hippy','hired','hitch','hives','hoard','hoary','hobby','holes','holly','homer',
    'homes','honey','honor','hoods','hooks','hoops','hoped','hopes','horns','horny',
    'horse','hosts','hotel','hotly','hound','hours','house','hover','human','humid',
    'humor','humps','humus','hunks','hunts','hurry','husky','hyena','hyper','icing',
    'ideal','ideas','idiom','idler','idyll','igloo','image','imago','imbue','impel',
    'imply','inbox','incur','index','indie','inept','inert','infer','ingot','inner',
    'input','inter','intro','ionic','irate','ivory','jacks','jaded','jaunt','jaunty',
    'jazzy','jeans','jelly','jerks','jerky','jewel','jiffy','jimmy','joins','joint',
    'joker','jolly','jolts','joust','judge','juice','juicy','jumbo','jumps','jumpy',
    'juror','karma','kayak','kebab','keels','keeps','kilns','kilts','kinds','kings',
    'kiosk','kites','knack','knave','knead','kneel','knees','knelt','knife','knits',
    'knobs','knock','knoll','knots','known','knows','koala','kudos','label','labor',
    'laced','laces','lacks','laden','ladle','lager','lakes','lambs','lamps','lance',
    'lands','lanes','lanky','lapse','large','larva','laser','latch','later','latex',
    'lathe','lawns','layer','leads','leafy','leaks','leaky','leaps','learn','lease',
    'leash','least','leave','ledge','leech','lefts','legal','lemma','lemon','lemur',
    'lends','level','lever','libel','lifts','light','liked','lilac','limbo','limbs',
    'limed','limit','limps','lined','linen','liner','lines','lingo','links','lions',
    'liter','lived','liven','liver','lives','livid','llama','loads','loans','lobby',
    'local','locks','locus','lodge','lofty','logic','loner','looks','looms','loops',
    'loopy','loose','lords','lorry','loser','lotus','lousy','loved','lover','loves',
    'lower','lowly','loyal','lucid','lucky','lumen','lumps','lunar','lunch','lunge',
    'lungs','lusty','lying','lymph','lyric','macho','macro','mafia','magic','magma',
    'major','maker','makes','males','malls','mambo','manga','mange','mango','mania',
    'manor','maple','march','marks','marry','marsh','masks','mason','match','mated',
    'mates','maxim','maybe','mayor','meals','means','media','medic','meets','melon',
    'melts','mercy','merge','merit','merry','messy','metal','meter','midst','might',
    'miles','mills','mimic','mince','minds','mined','miner','mines','minim','minor',
    'minus','mirth','miser','misty','mixed','mixer','moans','moats','model','modem',
    'modal','modes','mogul','moist','molar','molds','moldy','money','monks','month',
    'moods','moody','moose','moral','morel','morph','mossy','motel','moths','motif',
    'motor','motto','mound','mount','mourn','mouse','mouth','moved','mover','moves',
    'movie','mucus','muddy','mules','mulch','mummy','mural','murky','mushy','music',
    'musky','musty','muted','nadir','naive','named','names','nanny','napes','nasal',
    'nasty','natal','naval','navel','needs','nerds','nerdy','nerve','nests','never',
    'newer','newly','nexus','nicer','niche','nifty','night','nimby','ninja','noble',
    'nobly','nodes','noise','noisy','nomad','norms','north','notch','noted','notes',
    'novel','nudge','nurse','nutty','nylon','nymph','oaken','oasis','occur','ocean',
    'ochre','odder','oddly','offal','offer','often','oiled','olive','omega','onset',
    'oomph','opens','opera','opted','optic','orbit','order','organ','other','otter',
    'ought','ounce','outed','outer','outdo','ovary','overt','owing','owned','owner',
    'oxide','ozone','paced','paces','packs','paddy','pagan','paged','pages','pains',
    'paint','pairs','palms','palsy','panda','panel','panes','panic','pansy','papal',
    'paper','parch','parse','parts','party','pasta','paste','pasty','patch','paths',
    'patio','patsy','pause','paved','paves','pawed','peace','peach','peaks','pearl',
    'pears','pecan','pedal','peeks','peels','penal','pence','penny','perch','peril',
    'perky','perms','pesto','petal','petty','phase','phone','photo','piano','picks',
    'piece','piety','piggy','pilot','pinch','pined','pines','pints','piper','pitch',
    'pivot','pixel','pixie','pizza','place','plaid','plain','plait','plane','plank',
    'plans','plant','plate','plays','plaza','plead','pleas','pleat','plied','plier',
    'plods','plots','plows','ploys','pluck','plugs','plumb','plume','plump','plums',
    'plunk','plush','pluto','poach','poems','poets','point','poise','poker','polar',
    'poles','polka','polls','polyp','ponds','pools','poppy','popup','porch','pored',
    'pores','ports','posed','poser','poses','posse','posts','pouch','poult','pound',
    'pours','power','prank','prawn','prays','press','price','pride','pried','prime',
    'print','prior','prism','privy','prize','probe','prods','prong','proof','props',
    'prose','proud','prove','prowl','prude','prune','pryer','psalm','puffs','pulls',
    'pulps','pulpy','pulse','pumps','punch','punks','pupil','puppy','purge','purse',
    'pushy','pygmy','quack','qualm','quart','quasi','queen','queer','query','quest',
    'queue','quick','quiet','quill','quilt','quirk','quota','quote','rabbi','races',
    'racks','radar','radio','raids','rails','rainy','raise','rally','ramps','ranch',
    'range','ranks','rapid','rated','rates','ratio','raven','rayon','reach','reads',
    'ready','realm','reams','rebel','rebus','recap','recon','recto','reeds','reefs',
    'refer','reign','reins','relax','relay','relic','remit','remix','renal','renew',
    'rents','repay','repel','reply','resin','rests','retry','reuse','revel','rider',
    'ridge','rifle','right','rigid','rigor','rinds','rings','rinse','riots','ripen',
    'risen','rises','risky','rites','rival','river','roads','roams','roars','roast',
    'robes','robin','robot','rocks','rocky','rodeo','rogue','roles','rolls','roman',
    'roofs','rooms','roost','roots','ropes','roses','rouge','rough','round','route',
    'rover','rowed','royal','rubes','rugby','ruins','ruled','ruler','rules','rumba',
    'rumor','rupee','rural','rusty','sadly','safer','sages','saint','sakes','salad',
    'sales','sally','salon','salsa','salts','salty','salve','sands','sandy','saner',
    'satin','sauce','sauna','savor','savvy','scale','scalp','scamp','scams','scant',
    'scare','scarf','scary','scene','scent','scone','scoop','scope','score','scorn',
    'scout','scowl','scram','scrap','screw','scrim','scrub','seals','seams','seeds',
    'seedy','seeks','seems','seize','sense','serum','serve','setup','seven','sever',
    'sewed','shade','shady','shaft','shake','shaky','shall','shame','shams','shape',
    'share','shark','sharp','shave','shawl','shear','sheds','sheen','sheep','sheer',
    'sheet','shelf','shell','shift','shine','shiny','ships','shire','shirt','shock',
    'shoes','shone','shook','shoot','shops','shore','short','shots','shout','shove',
    'shown','shows','shrub','shrug','shunt','sides','siege','sieve','sighs','sight',
    'sigma','signs','silks','silky','silly','since','siren','sites','sixth','sixty',
    'sized','sizes','skate','skied','skier','skimp','skins','skips','skirt','skull',
    'slabs','slack','slain','slang','slant','slaps','slash','slate','slave','sleek',
    'sleep','sleet','slept','slice','slick','slide','slime','slimy','sling','slink',
    'slope','sloth','slows','slugs','slump','slums','slurp','smack','small','smart',
    'smear','smell','smile','smirk','smite','smith','smock','smoke','smoky','snack',
    'snags','snail','snake','snare','snark','snarl','sneak','sneer','snobs','snoop',
    'snore','snort','snout','snowy','snubs','snuck','snuff','soaks','soaps','soars',
    'sober','socks','sofas','soggy','soils','solar','solid','solos','solve','songs',
    'sonic','sooth','sooty','sorry','sorts','souls','sound','south','sowed','sower',
    'space','spade','spare','spark','spawn','speak','spear','speck','specs','speed',
    'spell','spend','spent','spice','spicy','spill','spine','spite','split','spoil',
    'spoke','spoof','spook','spool','spoon','spore','sport','spots','spray','spree',
    'sprig','spunk','squad','squat','squid','stack','staff','stage','staid','stain',
    'stair','stake','stale','stalk','stall','stamp','stand','stank','stare','stark',
    'stars','start','stash','state','stays','steak','steal','steam','steel','steep',
    'steer','stems','steps','stern','stews','stick','stiff','still','sting','stink',
    'stint','stirs','stock','stoic','stoke','stole','stomp','stone','stood','stool',
    'stoop','stops','store','stork','storm','story','stout','stove','stows','strap',
    'straw','stray','strip','strum','strut','stuck','studs','study','stuff','stump',
    'stung','stunk','stuns','style','suave','sucks','sugar','suite','suits','sulky',
    'sunny','super','surge','sushi','swamp','swans','swaps','swarm','swear','sweat',
    'sweep','sweet','swell','swept','swift','swill','swine','swing','swipe','swirl',
    'swoop','sword','swore','sworn','swung','synod','syrup','tabby','table','taboo',
    'tacit','tacks','taffy','tails','taint','taken','takes','tales','talks','tally',
    'talon','tangs','tangy','tanks','taper','tapes','tardy','taste','tasty','taunt',
    'taxes','taxis','teach','teams','tears','tease','teddy','teeth','tells','tempo',
    'tends','tense','tenth','tents','tepid','terms','terra','tests','texts','thank',
    'theft','their','theme','there','these','thick','thief','thigh','thing','think',
    'third','thorn','those','three','threw','throw','thugs','thumb','thump','thyme',
    'tiara','tidal','tides','tiers','tiger','tight','tiled','tiles','tilts','timer',
    'times','timid','tipsy','tired','titan','title','toast','today','token','tolls',
    'tombs','tonal','toned','toner','tones','tongs','tools','tooth','torch','total',
    'touch','tough','tours','towel','tower','towns','toxic','trace','track','tract',
    'trade','trail','train','trait','tramp','traps','trash','trawl','tread','treat',
    'trees','trend','trial','tribe','trick','tried','tries','trims','trips','trite',
    'troll','troop','trots','trout','truce','truck','truly','trump','trunk','truss',
    'trust','truth','tubes','tucks','tulip','tumor','tuned','tuner','tunes','tuple',
    'turbo','turns','tutor','twang','tweak','tweed','tweet','twice','twigs','twine',
    'twirl','twist','tying','typed','types','udder','ulcer','ultra','umber','uncut',
    'under','undue','unfit','union','unite','units','unity','unlit','untie','until',
    'upper','upset','urban','urged','usage','users','usher','using','usual','utter',
    'vague','valet','valid','valor','value','valve','vapor','vault','vegan','veins',
    'venue','verge','verse','vests','vigor','vinyl','viola','viper','viral','virus',
    'visit','visor','vista','vital','vivid','vixen','vocal','vodka','vogue','voice',
    'voter','vouch','vowed','vowel','vulva','wacky','waded','wafer','waged','wager',
    'wages','wagon','waist','waits','walks','walls','waltz','wands','wants','wards',
    'waste','watch','water','waved','waves','waxed','weary','weave','wedge','weeds',
    'weedy','weeks','weigh','weird','wells','whale','wheat','wheel','where','which',
    'while','whims','whine','whirl','whisk','white','whole','whose','wicks','widen',
    'wider','width','wield','winds','windy','wines','wings','winks','wiped','wired',
    'wires','witch','woman','women','won','woods','woody','words','wordy','works',
    'world','worms','worry','worse','worst','worth','would','wound','wrack','wraps',
    'wrath','wreak','wreck','wring','wrist','write','wrong','wrote','yacht','yards',
    'yarns','yearn','years','yeast','yield','young','yours','youth','zebra','zesty',
    'zilch','zincs','zonal','zones'
  ];

  /* Build valid-words set: answers + extra */
  var validSet = {};
  for (i = 0; i < ANSWERS.length; i++) { validSet[ANSWERS[i]] = true; }
  for (i = 0; i < EXTRA_VALID.length; i++) {
    var ew = EXTRA_VALID[i].toLowerCase();
    if (ew.length === 5) { validSet[ew] = true; }
  }

  /* ── State ── */
  var WORD_LENGTH = 5;
  var MAX_GUESSES = 6;
  var targetWord = '';
  var currentRow = 0;
  var currentCol = 0;
  var currentGuess = '';
  var gameOver = false;
  var board = []; /* 2D array of tile elements */
  var keyMap = {}; /* letter -> key element */
  var keyStates = {}; /* letter -> 'correct' | 'present' | 'absent' */
  var messageTimer = null;

  /* ── Stats ── */
  var STATS_KEY = 'wordle-stats';
  var stats = loadStats();

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) { return JSON.parse(raw); }
    } catch (e) {}
    return { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] };
  }

  function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function renderStats() {
    var el = document.getElementById;
    document.getElementById('wl-stat-played').textContent = stats.played;
    document.getElementById('wl-stat-pct').textContent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('wl-stat-streak').textContent = stats.streak;
    document.getElementById('wl-stat-max').textContent = stats.maxStreak;

    /* Distribution bars */
    var maxVal = 0;
    for (i = 0; i < 6; i++) {
      if (stats.distribution[i] > maxVal) { maxVal = stats.distribution[i]; }
    }
    var bars = document.querySelectorAll('.wl-dist-bar');
    for (i = 0; i < bars.length; i++) {
      var count = stats.distribution[i];
      var pct = maxVal > 0 ? Math.max((count / maxVal) * 100, 8) : 8;
      bars[i].style.width = pct + '%';
      bars[i].querySelector('.wl-dist-count').textContent = count;
      bars[i].classList.remove('wl-dist-highlight');
    }
  }

  function highlightDistBar(guessNum) {
    var bars = document.querySelectorAll('.wl-dist-bar');
    if (guessNum >= 1 && guessNum <= 6) {
      bars[guessNum - 1].classList.add('wl-dist-highlight');
    }
  }

  /* ── DOM refs ── */
  function initBoard() {
    var boardEl = document.getElementById('wl-board');
    var rows = boardEl.querySelectorAll('.wl-row');
    board = [];
    for (var r = 0; r < rows.length; r++) {
      var tiles = rows[r].querySelectorAll('.wl-tile');
      var rowArr = [];
      for (var c = 0; c < tiles.length; c++) {
        tiles[c].textContent = '';
        tiles[c].className = 'wl-tile';
        rowArr.push(tiles[c]);
      }
      board.push(rowArr);
    }
  }

  function initKeyboard() {
    var keys = document.querySelectorAll('.wl-key');
    keyMap = {};
    keyStates = {};
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k].getAttribute('data-key');
      keyMap[key] = keys[k];
      keys[k].className = 'wl-key' + (key === 'ENTER' || key === 'BACKSPACE' ? ' wl-key-wide' : '');
    }
  }

  /* ── Game logic ── */
  function pickWord() {
    return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  }

  function showMessage(text, duration) {
    var msgEl = document.getElementById('wl-message');
    msgEl.textContent = text;
    if (messageTimer) { clearTimeout(messageTimer); }
    if (duration) {
      messageTimer = setTimeout(function() { msgEl.textContent = ''; }, duration);
    }
  }

  function shakeRow(row) {
    var rowEl = board[row][0].parentNode;
    rowEl.classList.add('wl-shake');
    setTimeout(function() { rowEl.classList.remove('wl-shake'); }, 400);
  }

  /* Compute tile colors handling duplicate letters correctly */
  function evaluateGuess(guess, target) {
    var result = ['absent', 'absent', 'absent', 'absent', 'absent'];
    var targetArr = target.split('');
    var guessArr = guess.split('');
    var used = [false, false, false, false, false];

    /* First pass: mark correct (green) */
    for (i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    /* Second pass: mark present (yellow) */
    for (i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === 'correct') { continue; }
      for (var j = 0; j < WORD_LENGTH; j++) {
        if (!used[j] && guessArr[i] === targetArr[j]) {
          result[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }

    return result;
  }

  function revealRow(row, guess, result, callback) {
    var delay = 300;
    for (var c = 0; c < WORD_LENGTH; c++) {
      (function(col) {
        setTimeout(function() {
          var tile = board[row][col];
          tile.classList.add('wl-flip');

          /* At the halfway point of the flip, apply the color */
          setTimeout(function() {
            tile.classList.add('wl-' + result[col]);
          }, 250);

          /* Update keyboard state */
          var letter = guess[col].toUpperCase();
          var newState = result[col];
          var currentState = keyStates[letter];

          /* Only upgrade: absent -> present -> correct */
          if (!currentState ||
              (currentState === 'absent' && (newState === 'present' || newState === 'correct')) ||
              (currentState === 'present' && newState === 'correct')) {
            keyStates[letter] = newState;
          }

          /* Apply keyboard colors after last tile reveals */
          if (col === WORD_LENGTH - 1) {
            setTimeout(function() {
              updateKeyboard();
              if (callback) { callback(); }
            }, 300);
          }
        }, col * delay);
      })(c);
    }
  }

  function updateKeyboard() {
    for (var letter in keyStates) {
      if (keyMap[letter]) {
        keyMap[letter].classList.remove('wl-correct', 'wl-present', 'wl-absent');
        keyMap[letter].classList.add('wl-' + keyStates[letter]);
      }
    }
  }

  function bounceRow(row) {
    for (var c = 0; c < WORD_LENGTH; c++) {
      (function(col) {
        setTimeout(function() {
          board[row][col].classList.add('wl-bounce');
        }, col * 80);
      })(c);
    }
  }

  function handleKey(key) {
    if (gameOver) { return; }

    if (key === 'BACKSPACE') {
      if (currentCol > 0) {
        currentCol--;
        currentGuess = currentGuess.slice(0, -1);
        board[currentRow][currentCol].textContent = '';
        board[currentRow][currentCol].classList.remove('wl-filled');
      }
      return;
    }

    if (key === 'ENTER') {
      if (currentCol < WORD_LENGTH) {
        showMessage('Not enough letters', 1500);
        shakeRow(currentRow);
        return;
      }

      var guess = currentGuess.toLowerCase();

      if (!validSet[guess]) {
        showMessage('Not in word list', 1500);
        shakeRow(currentRow);
        return;
      }

      var result = evaluateGuess(guess, targetWord);
      var guessRow = currentRow;

      /* Lock input during animation */
      gameOver = true;

      revealRow(guessRow, guess, result, function() {
        if (guess === targetWord) {
          /* Win */
          var messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
          showMessage(messages[guessRow] || 'Nice!', 0);
          bounceRow(guessRow);
          stats.played++;
          stats.wins++;
          stats.streak++;
          if (stats.streak > stats.maxStreak) { stats.maxStreak = stats.streak; }
          stats.distribution[guessRow]++;
          saveStats();
          renderStats();
          highlightDistBar(guessRow + 1);
          /* gameOver stays true */
        } else if (guessRow >= MAX_GUESSES - 1) {
          /* Lose */
          showMessage(targetWord.toUpperCase(), 0);
          stats.played++;
          stats.streak = 0;
          saveStats();
          renderStats();
          /* gameOver stays true */
        } else {
          /* Continue */
          gameOver = false;
          currentRow++;
          currentCol = 0;
          currentGuess = '';
        }
      });

      return;
    }

    /* Letter input */
    if (/^[A-Z]$/.test(key) && currentCol < WORD_LENGTH) {
      board[currentRow][currentCol].textContent = key;
      board[currentRow][currentCol].classList.add('wl-filled', 'wl-pop');
      setTimeout(function() {
        /* Remove pop class so it can re-trigger */
        for (var r = 0; r < MAX_GUESSES; r++) {
          for (var c = 0; c < WORD_LENGTH; c++) {
            board[r][c].classList.remove('wl-pop');
          }
        }
      }, 150);
      currentGuess += key;
      currentCol++;
    }
  }

  /* ── New game ── */
  function newGame() {
    targetWord = pickWord();
    currentRow = 0;
    currentCol = 0;
    currentGuess = '';
    gameOver = false;
    initBoard();
    initKeyboard();
    showMessage('', 0);
    renderStats();
  }

  /* ── Init ── */
  function init() {
    /* Physical keyboard */
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) { return; }
      var key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE') {
        e.preventDefault();
        handleKey(key);
      } else if (/^[A-Z]$/.test(key)) {
        handleKey(key);
      }
    });

    /* Virtual keyboard */
    document.getElementById('wl-keyboard').addEventListener('click', function(e) {
      var btn = e.target.closest('.wl-key');
      if (!btn) { return; }
      var key = btn.getAttribute('data-key');
      handleKey(key);
    });

    /* New game button */
    document.getElementById('wl-new-game').addEventListener('click', function() {
      newGame();
    });

    /* Reset stats */
    document.getElementById('wl-reset-stats').addEventListener('click', function() {
      if (confirm('Reset all Wordle stats?')) {
        stats = { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] };
        saveStats();
        renderStats();
      }
    });

    newGame();
  }

  /* Wait for DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
