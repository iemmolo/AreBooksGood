(function() {
  'use strict';

  /* ── Answer pool (2,315 curated Wordle words) ── */
  var ANSWERS = [
    'aback','abase','abate','abbey','abbot','abhor','abide','abled','abode','abort','about','above','abuse','abyss','acorn',
    'acrid','actor','acute','adage','adapt','adept','admin','admit','adobe','adopt','adore','adorn','adult','affix','afire',
    'afoot','afoul','after','again','agape','agate','agent','agile','aging','aglow','agony','agora','agree','ahead','aider',
    'aisle','alarm','album','alert','algae','alibi','alien','align','alike','alive','allay','alley','allot','allow','alloy',
    'aloft','alone','along','aloof','aloud','alpha','altar','alter','amass','amaze','amber','amble','amend','amiss','amity',
    'among','ample','amply','amuse','angel','anger','angle','angry','angst','anime','ankle','annex','annoy','annul','anode',
    'antic','anvil','aorta','apart','aphid','aping','apnea','apple','apply','apron','aptly','arbor','ardor','arena','argue',
    'arise','armor','aroma','arose','array','arrow','arson','artsy','ascot','ashen','aside','askew','assay','asset','atoll',
    'atone','attic','audio','audit','augur','aunty','avail','avert','avian','avoid','await','awake','award','aware','awash',
    'awful','awoke','axial','axiom','axion','azure','bacon','badge','badly','bagel','baggy','baker','baler','balmy','banal',
    'banjo','barge','baron','basal','basic','basil','basin','basis','baste','batch','bathe','baton','batty','bawdy','bayou',
    'beach','beady','beard','beast','beech','beefy','befit','began','begat','beget','begin','begun','being','belch','belie',
    'belle','belly','below','bench','beret','berry','berth','beset','betel','bevel','bezel','bible','bicep','biddy','bigot',
    'bilge','billy','binge','bingo','biome','birch','birth','bison','bitty','black','blade','blame','bland','blank','blare',
    'blast','blaze','bleak','bleat','bleed','bleep','blend','bless','blimp','blind','blink','bliss','blitz','bloat','block',
    'bloke','blond','blood','bloom','blown','bluer','bluff','blunt','blurb','blurt','blush','board','boast','bobby','boney',
    'bongo','bonus','booby','boost','booth','booty','booze','boozy','borax','borne','bosom','bossy','botch','bough','boule',
    'bound','bowel','boxer','brace','braid','brain','brake','brand','brash','brass','brave','bravo','brawl','brawn','bread',
    'break','breed','briar','bribe','brick','bride','brief','brine','bring','brink','briny','brisk','broad','broil','broke',
    'brood','brook','broom','broth','brown','brunt','brush','brute','buddy','budge','buggy','bugle','build','built','bulge',
    'bulky','bully','bunch','bunny','burly','burnt','burst','bused','bushy','butch','butte','buxom','buyer','bylaw','cabal',
    'cabby','cabin','cable','cacao','cache','cacti','caddy','cadet','cagey','cairn','camel','cameo','canal','candy','canny',
    'canoe','canon','caper','caput','carat','cargo','carol','carry','carve','caste','catch','cater','catty','caulk','cause',
    'cavil','cease','cedar','cello','chafe','chaff','chain','chair','chalk','champ','chant','chaos','chard','charm','chart',
    'chase','chasm','cheap','cheat','check','cheek','cheer','chess','chest','chick','chide','chief','child','chili','chill',
    'chime','china','chirp','chock','choir','choke','chord','chore','chose','chuck','chump','chunk','churn','chute','cider',
    'cigar','cinch','circa','civic','civil','clack','claim','clamp','clang','clank','clash','clasp','class','clean','clear',
    'cleat','cleft','clerk','click','cliff','climb','cling','clink','cloak','clock','clone','close','cloth','cloud','clout',
    'clove','clown','cluck','clued','clump','clung','coach','coast','cobra','cocoa','colon','color','comet','comfy','comic',
    'comma','conch','condo','conic','copse','coral','corer','corny','couch','cough','could','count','coupe','court','coven',
    'cover','covet','covey','cower','coyly','crack','craft','cramp','crane','crank','crash','crass','crate','crave','crawl',
    'craze','crazy','creak','cream','credo','creed','creek','creep','creme','crepe','crept','cress','crest','crick','cried',
    'crier','crime','crimp','crisp','croak','crock','crone','crony','crook','cross','croup','crowd','crown','crude','cruel',
    'crumb','crump','crush','crust','crypt','cubic','cumin','curio','curly','curry','curse','curve','curvy','cutie','cyber',
    'cycle','cynic','daddy','daily','dairy','daisy','dally','dance','dandy','datum','daunt','dealt','death','debar','debit',
    'debug','debut','decal','decay','decor','decoy','decry','defer','deign','deity','delay','delta','delve','demon','demur',
    'denim','dense','depot','depth','derby','deter','detox','deuce','devil','diary','dicey','digit','dilly','dimly','diner',
    'dingo','dingy','diode','dirge','dirty','disco','ditch','ditto','ditty','diver','dizzy','dodge','dodgy','dogma','doing',
    'dolly','donor','donut','dopey','doubt','dough','dowdy','dowel','downy','dowry','dozen','draft','drain','drake','drama',
    'drank','drape','drawl','drawn','dread','dream','dress','dried','drier','drift','drill','drink','drive','droit','droll',
    'drone','drool','droop','dross','drove','drown','druid','drunk','dryer','dryly','duchy','dully','dummy','dumpy','dunce',
    'dusky','dusty','dutch','duvet','dwarf','dwell','dwelt','dying','eager','eagle','early','earth','easel','eaten','eater',
    'ebony','eclat','edict','edify','eerie','egret','eight','eject','eking','elate','elbow','elder','elect','elegy','elfin',
    'elide','elite','elope','elude','email','embed','ember','emcee','empty','enact','endow','enema','enemy','enjoy','ennui',
    'ensue','enter','entry','envoy','epoch','epoxy','equal','equip','erase','erect','erode','error','erupt','essay','ester',
    'ether','ethic','ethos','etude','evade','event','every','evict','evoke','exact','exalt','excel','exert','exile','exist',
    'expel','extol','extra','exult','eying','fable','facet','faint','fairy','faith','false','fancy','fanny','farce','fatal',
    'fatty','fault','fauna','favor','feast','fecal','feign','fella','felon','femme','femur','fence','feral','ferry','fetal',
    'fetch','fetid','fetus','fever','fewer','fiber','fibre','ficus','field','fiend','fiery','fifth','fifty','fight','filer',
    'filet','filly','filmy','filth','final','finch','finer','first','fishy','fixer','fizzy','fjord','flack','flail','flair',
    'flake','flaky','flame','flank','flare','flash','flask','fleck','fleet','flesh','flick','flier','fling','flint','flirt',
    'float','flock','flood','floor','flora','floss','flour','flout','flown','fluff','fluid','fluke','flume','flung','flunk',
    'flush','flute','flyer','foamy','focal','focus','foggy','foist','folio','folly','foray','force','forge','forgo','forte',
    'forth','forty','forum','found','foyer','frail','frame','frank','fraud','freak','freed','freer','fresh','friar','fried',
    'frill','frisk','fritz','frock','frond','front','frost','froth','frown','froze','fruit','fudge','fugue','fully','fungi',
    'funky','funny','furor','furry','fussy','fuzzy','gaffe','gaily','gamer','gamma','gamut','gassy','gaudy','gauge','gaunt',
    'gauze','gavel','gawky','gayer','gayly','gazer','gecko','geeky','geese','genie','genre','ghost','ghoul','giant','giddy',
    'gipsy','girly','girth','given','giver','glade','gland','glare','glass','glaze','gleam','glean','glide','glint','gloat',
    'globe','gloom','glory','gloss','glove','glyph','gnash','gnome','godly','going','golem','golly','gonad','goner','goody',
    'gooey','goofy','goose','gorge','gouge','gourd','grace','grade','graft','grail','grain','grand','grant','grape','graph',
    'grasp','grass','grate','grave','gravy','graze','great','greed','green','greet','grief','grill','grime','grimy','grind',
    'gripe','groan','groin','groom','grope','gross','group','grout','grove','growl','grown','gruel','gruff','grunt','guard',
    'guava','guess','guest','guide','guild','guile','guilt','guise','gulch','gully','gumbo','gummy','guppy','gusto','gusty',
    'gypsy','habit','hairy','halve','handy','happy','hardy','harem','harpy','harry','harsh','haste','hasty','hatch','hater',
    'haunt','haute','haven','havoc','hazel','heady','heard','heart','heath','heave','heavy','hedge','hefty','heist','helix',
    'hello','hence','heron','hilly','hinge','hippo','hippy','hitch','hoard','hobby','hoist','holly','homer','honey','honor',
    'horde','horny','horse','hotel','hotly','hound','house','hovel','hover','howdy','human','humid','humor','humph','humus',
    'hunch','hunky','hurry','husky','hussy','hutch','hydro','hyena','hymen','hyper','icily','icing','ideal','idiom','idiot',
    'idler','idyll','igloo','iliac','image','imbue','impel','imply','inane','inbox','incur','index','inept','inert','infer',
    'ingot','inlay','inlet','inner','input','inter','intro','ionic','irate','irony','islet','issue','itchy','ivory','jaunt',
    'jazzy','jelly','jerky','jetty','jewel','jiffy','joint','joist','joker','jolly','joust','judge','juice','juicy','jumbo',
    'jumpy','junta','junto','juror','kappa','karma','kayak','kebab','khaki','kinky','kiosk','kitty','knack','knave','knead',
    'kneed','kneel','knelt','knife','knock','knoll','known','koala','krill','label','labor','laden','ladle','lager','lance',
    'lanky','lapel','lapse','large','larva','lasso','latch','later','lathe','latte','laugh','layer','leach','leafy','leaky',
    'leant','leapt','learn','lease','leash','least','leave','ledge','leech','leery','lefty','legal','leggy','lemon','lemur',
    'leper','level','lever','libel','liege','light','liken','lilac','limbo','limit','linen','liner','lingo','lipid','lithe',
    'liver','livid','llama','loamy','loath','lobby','local','locus','lodge','lofty','logic','login','loopy','loose','lorry',
    'loser','louse','lousy','lover','lower','lowly','loyal','lucid','lucky','lumen','lumpy','lunar','lunch','lunge','lupus',
    'lurch','lurid','lusty','lying','lymph','lynch','lyric','macaw','macho','macro','madam','madly','mafia','magic','magma',
    'maize','major','maker','mambo','mamma','mammy','manga','mange','mango','mangy','mania','manic','manly','manor','maple',
    'march','marry','marsh','mason','masse','match','matey','mauve','maxim','maybe','mayor','mealy','meant','meaty','mecca',
    'medal','media','medic','melee','melon','mercy','merge','merit','merry','metal','meter','metro','micro','midge','midst',
    'might','milky','mimic','mince','miner','minim','minor','minty','minus','mirth','miser','missy','mocha','modal','model',
    'modem','mogul','moist','molar','moldy','money','month','moody','moose','moral','moron','morph','mossy','motel','motif',
    'motor','motto','moult','mound','mount','mourn','mouse','mouth','mover','movie','mower','mucky','mucus','muddy','mulch',
    'mummy','munch','mural','murky','mushy','music','musky','musty','myrrh','nadir','naive','nanny','nasal','nasty','natal',
    'naval','navel','needy','neigh','nerdy','nerve','never','newer','newly','nicer','niche','niece','night','ninja','ninny',
    'ninth','noble','nobly','noise','noisy','nomad','noose','north','nosey','notch','novel','nudge','nurse','nutty','nylon',
    'nymph','oaken','obese','occur','ocean','octal','octet','odder','oddly','offal','offer','often','olden','older','olive',
    'ombre','omega','onion','onset','opera','opine','opium','optic','orbit','order','organ','other','otter','ought','ounce',
    'outdo','outer','outgo','ovary','ovate','overt','ovine','ovoid','owing','owner','oxide','ozone','paddy','pagan','paint',
    'paler','palsy','panel','panic','pansy','papal','paper','parer','parka','parry','parse','party','pasta','paste','pasty',
    'patch','patio','patsy','patty','pause','payee','payer','peace','peach','pearl','pecan','pedal','penal','pence','penne',
    'penny','perch','peril','perky','pesky','pesto','petal','petty','phase','phone','phony','photo','piano','picky','piece',
    'piety','piggy','pilot','pinch','piney','pinky','pinto','piper','pique','pitch','pithy','pivot','pixel','pixie','pizza',
    'place','plaid','plain','plait','plane','plank','plant','plate','plaza','plead','pleat','plied','plier','pluck','plumb',
    'plume','plump','plunk','plush','poesy','point','poise','poker','polar','polka','polyp','pooch','poppy','porch','poser',
    'posit','posse','pouch','pound','pouty','power','prank','prawn','preen','press','price','prick','pride','pried','prime',
    'primo','print','prior','prism','privy','prize','probe','prone','prong','proof','prose','proud','prove','prowl','proxy',
    'prude','prune','psalm','pubic','pudgy','puffy','pulpy','pulse','punch','pupal','pupil','puppy','puree','purer','purge',
    'purse','pushy','putty','pygmy','quack','quail','quake','qualm','quark','quart','quash','quasi','queen','queer','quell',
    'query','quest','queue','quick','quiet','quill','quilt','quirk','quite','quota','quote','quoth','rabbi','rabid','racer',
    'radar','radii','radio','rainy','raise','rajah','rally','ralph','ramen','ranch','randy','range','rapid','rarer','raspy',
    'ratio','ratty','raven','rayon','razor','reach','react','ready','realm','rearm','rebar','rebel','rebus','rebut','recap',
    'recur','recut','reedy','refer','refit','regal','rehab','reign','relax','relay','relic','remit','renal','renew','repay',
    'repel','reply','rerun','reset','resin','retch','retro','retry','reuse','revel','revue','rhino','rhyme','rider','ridge',
    'rifle','right','rigid','rigor','rinse','ripen','riper','risen','riser','risky','rival','river','rivet','roach','roast',
    'robin','robot','rocky','rodeo','roger','rogue','roomy','roost','rotor','rouge','rough','round','rouse','route','rover',
    'rowdy','rower','royal','ruddy','ruder','rugby','ruler','rumba','rumor','rupee','rural','rusty','sadly','safer','saint',
    'salad','sally','salon','salsa','salty','salve','salvo','sandy','saner','sappy','sassy','satin','satyr','sauce','saucy',
    'sauna','saute','savor','savoy','savvy','scald','scale','scalp','scaly','scamp','scant','scare','scarf','scary','scene',
    'scent','scion','scoff','scold','scone','scoop','scope','score','scorn','scour','scout','scowl','scram','scrap','scree',
    'screw','scrub','scrum','scuba','sedan','seedy','segue','seize','semen','sense','sepia','serif','serum','serve','setup',
    'seven','sever','sewer','shack','shade','shady','shaft','shake','shaky','shale','shall','shalt','shame','shank','shape',
    'shard','share','shark','sharp','shave','shawl','shear','sheen','sheep','sheer','sheet','sheik','shelf','shell','shied',
    'shift','shine','shiny','shire','shirk','shirt','shoal','shock','shone','shook','shoot','shore','shorn','short','shout',
    'shove','shown','showy','shrew','shrub','shrug','shuck','shunt','shush','shyly','siege','sieve','sight','sigma','silky',
    'silly','since','sinew','singe','siren','sissy','sixth','sixty','skate','skier','skiff','skill','skimp','skirt','skulk',
    'skull','skunk','slack','slain','slang','slant','slash','slate','slave','sleek','sleep','sleet','slept','slice','slick',
    'slide','slime','slimy','sling','slink','sloop','slope','slosh','sloth','slump','slung','slunk','slurp','slush','slyly',
    'smack','small','smart','smash','smear','smell','smelt','smile','smirk','smite','smith','smock','smoke','smoky','smote',
    'snack','snail','snake','snaky','snare','snarl','sneak','sneer','snide','sniff','snipe','snoop','snore','snort','snout',
    'snowy','snuck','snuff','soapy','sober','soggy','solar','solid','solve','sonar','sonic','sooth','sooty','sorry','sound',
    'south','sower','space','spade','spank','spare','spark','spasm','spawn','speak','spear','speck','speed','spell','spelt',
    'spend','spent','sperm','spice','spicy','spied','spiel','spike','spiky','spill','spilt','spine','spiny','spire','spite',
    'splat','split','spoil','spoke','spoof','spook','spool','spoon','spore','sport','spout','spray','spree','sprig','spunk',
    'spurn','spurt','squad','squat','squib','stack','staff','stage','staid','stain','stair','stake','stale','stalk','stall',
    'stamp','stand','stank','stare','stark','start','stash','state','stave','stead','steak','steal','steam','steed','steel',
    'steep','steer','stein','stern','stick','stiff','still','stilt','sting','stink','stint','stock','stoic','stoke','stole',
    'stomp','stone','stony','stood','stool','stoop','store','stork','storm','story','stout','stove','strap','straw','stray',
    'strip','strut','stuck','study','stuff','stump','stung','stunk','stunt','style','suave','sugar','suing','suite','sulky',
    'sully','sumac','sunny','super','surer','surge','surly','sushi','swami','swamp','swarm','swash','swath','swear','sweat',
    'sweep','sweet','swell','swept','swift','swill','swine','swing','swirl','swish','swoon','swoop','sword','swore','sworn',
    'swung','synod','syrup','tabby','table','taboo','tacit','tacky','taffy','taint','taken','taker','tally','talon','tamer',
    'tango','tangy','taper','tapir','tardy','tarot','taste','tasty','tatty','taunt','tawny','teach','teary','tease','teddy',
    'teeth','tempo','tenet','tenor','tense','tenth','tepee','tepid','terra','terse','testy','thank','theft','their','theme',
    'there','these','theta','thick','thief','thigh','thing','think','third','thong','thorn','those','three','threw','throb',
    'throw','thrum','thumb','thump','thyme','tiara','tibia','tidal','tiger','tight','tilde','timer','timid','tipsy','titan',
    'tithe','title','toast','today','toddy','token','tonal','tonga','tonic','tooth','topaz','topic','torch','torso','torus',
    'total','totem','touch','tough','towel','tower','toxic','toxin','trace','track','tract','trade','trail','train','trait',
    'tramp','trash','trawl','tread','treat','trend','triad','trial','tribe','trice','trick','tried','tripe','trite','troll',
    'troop','trope','trout','trove','truce','truck','truer','truly','trump','trunk','truss','trust','truth','tryst','tubal',
    'tuber','tulip','tulle','tumor','tunic','turbo','tutor','twang','tweak','tweed','tweet','twice','twine','twirl','twist',
    'twixt','tying','udder','ulcer','ultra','umbra','uncle','uncut','under','undid','undue','unfed','unfit','unify','union',
    'unite','unity','unlit','unmet','unset','untie','until','unwed','unzip','upper','upset','urban','urine','usage','usher',
    'using','usual','usurp','utile','utter','vague','valet','valid','valor','value','valve','vapid','vapor','vault','vaunt',
    'vegan','venom','venue','verge','verse','verso','verve','vicar','video','vigil','vigor','villa','vinyl','viola','viper',
    'viral','virus','visit','visor','vista','vital','vivid','vixen','vocal','vodka','vogue','voice','voila','vomit','voter',
    'vouch','vowel','vying','wacky','wafer','wager','wagon','waist','waive','waltz','warty','waste','watch','water','waver',
    'waxen','weary','weave','wedge','weedy','weigh','weird','welch','welsh','wench','whack','whale','wharf','wheat','wheel',
    'whelp','where','which','whiff','while','whine','whiny','whirl','whisk','white','whole','whoop','whose','widen','wider',
    'widow','width','wield','wight','willy','wimpy','wince','winch','windy','wiser','wispy','witch','witty','woken','woman',
    'women','woody','wooer','wooly','woozy','wordy','world','worry','worse','worst','worth','would','wound','woven','wrack',
    'wrath','wreak','wreck','wrest','wring','wrist','write','wrong','wrote','wrung','wryly','yacht','yearn','yeast','yield',
    'young','youth','zebra','zesty','zonal'
  ];

  /* ── Valid guesses (13,378 additional dictionary words) ── */
  var EXTRA_VALID = [
    'aalii','aargh','aarti','abaca','abaci','abacs','abaff','abaft','abaka','abamp','aband','abash','abask','abave','abaya',
    'abaze','abbas','abbed','abbes','abcee','abdal','abdat','abeam','abear','abele','abers','abets','abidi','abies','abilo',
    'abkar','abler','ables','ablet','ablow','abmho','abnet','abody','abohm','aboil','aboma','aboon','abord','abore','abram',
    'abray','abret','abrim','abrin','abris','absey','absit','abuna','abune','abura','abuts','abuzz','abwab','abyes','abysm',
    'acais','acana','acapu','acara','acari','acate','accas','accoy','acedy','acerb','acers','aceta','achar','ached','acher',
    'aches','achoo','achor','acids','acidy','acier','acing','acini','ackee','acker','ackey','aclys','acmes','acmic','acned',
    'acnes','acock','acoin','acold','acoma','acone','acred','acres','acron','acros','acryl','acted','actin','acton','acyls',
    'adati','adawe','adawn','adaws','adays','adbot','addax','added','adder','addio','addle','adead','adeem','adeep','adfix',
    'adhan','adieu','adion','adios','adits','adjag','adlay','adlet','adman','admen','admix','adnex','adobo','adown','adoxy',
    'adoze','adpao','adrad','adred','adrip','adrop','adrue','adsum','aduki','adunc','adusk','adust','advew','adyta','adzed',
    'adzer','adzes','aecia','aedes','aegis','aeons','aeric','aerie','aeros','aesir','aevia','aface','afald','afara','afars',
    'afear','aflaj','aflat','aflow','afoam','afore','afret','afrit','afros','agama','agami','agamy','agars','agasp','agast',
    'agaty','agave','agaze','agene','agers','agger','aggie','aggri','aggro','aggry','aggur','aghas','agila','agios','agism',
    'agist','agita','aglee','aglet','agley','agloo','aglus','agmas','agnel','agnus','agoge','agoho','agone','agons','agood',
    'agrah','agral','agria','agrin','agrom','agros','agsam','agued','agues','aguey','aguna','agush','agust','aguti','aheap',
    'ahent','ahigh','ahind','ahing','ahint','ahold','ahong','ahsan','ahull','ahunt','ahura','ahuru','ahush','ahwal','aidas',
    'aided','aides','aidoi','aidos','aiery','aigas','aight','ailed','aillt','aimed','aimer','ainee','ainga','ainoi','aioli',
    'airan','aired','airer','airns','airth','airts','aitch','aitus','aiver','aiwan','aiyee','aizle','ajaja','ajari','ajava',
    'ajhar','ajies','ajiva','ajuga','ajwan','akala','akasa','akebi','akees','akeki','akela','akene','aking','akita','akkas',
    'aknee','akpek','akule','akund','alaap','alack','alada','alala','alamo','aland','alane','alang','alani','alans','alant',
    'alapa','alaps','alary','alate','alays','alban','albas','albee','albus','alcid','alcos','aldea','alder','aldim','aldol',
    'aleak','aleck','alecs','alefs','aleft','aleph','alews','aleye','alfas','alfet','algal','algas','algic','algid','algin',
    'algor','algum','alias','alifs','alima','aline','alish','aliso','alisp','alist','alite','aliya','alkie','alkos','alkyd',
    'alkyl','allan','allee','allel','aller','allis','allod','allyl','almah','almas','almeh','almes','almon','almud','almug',
    'alods','alody','aloed','aloes','alogy','aloha','aloid','aloin','aloma','aloos','alose','alowe','altho','altin','altos',
    'altun','alula','alums','alure','aluta','alvar','alvus','alway','amaas','amaga','amahs','amain','amala','amang','amani',
    'amapa','amate','amaut','amban','ambar','ambay','ambit','ambon','ambos','ambry','ameba','ameed','ameen','ameer','amelu',
    'amene','amens','ament','amhar','amias','amice','amici','amide','amido','amids','amies','amiga','amigo','amine','amini',
    'amino','amins','amirs','amlas','amman','ammer','ammon','ammos','amnia','amnic','amnio','amoke','amoks','amole','amort',
    'amour','amove','amowt','amped','amper','ampul','ampyx','amrit','amsel','amuck','amula','amuze','amvis','amylo','amyls',
    'anabo','anama','anana','anata','ancho','ancle','ancon','andro','anear','anele','anend','anent','angas','anglo','angor',
    'anigh','anile','anils','anima','animi','anion','anise','anjan','ankee','anker','ankhs','ankus','anlas','annal','annas',
    'annat','annet','anoas','anoil','anole','anoli','anomy','ansae','ansar','antae','antal','antar','antas','anted','antes',
    'antis','antra','antre','antsy','anura','anury','anyon','apace','apage','apaid','apayd','apays','apeak','apeek','apers',
    'apert','apery','apgar','aphis','apian','apiin','apiol','apish','apism','apode','apods','apoop','aport','apout','appal',
    'appay','appel','appet','appro','appui','appuy','apres','apses','apsis','apsos','apted','apter','aquae','aquas','araba',
    'araca','arado','arain','arake','araks','arame','arara','arars','arati','arbas','arced','arche','archi','archy','arcos',
    'arcus','ardeb','ardri','aread','areae','areal','arear','areas','areca','aredd','arede','areek','areel','arefy','areic',
    'arend','arene','areng','arent','arepa','arere','arete','arets','arett','argal','argan','argel','argil','argle','argol',
    'argon','argot','argus','arhar','arhat','arias','ariel','ariki','arils','ariot','arish','arist','arite','arjun','arked',
    'arled','arles','armed','armer','armet','armil','arnas','arnee','arnut','aroar','aroba','arock','aroha','aroid','aroon',
    'arpas','arpen','arrah','arras','arrau','arret','arrie','arris','arroz','arsed','arses','arsey','arsis','arsle','arsyl',
    'artal','artar','artel','artha','artic','artis','aruhe','aruke','arums','arupa','arusa','arval','arvee','arvel','arvos',
    'aryls','arzan','arzun','asale','asana','ascan','ascii','ascon','ascry','ascus','asdic','ashed','ashes','ashet','ashur',
    'askar','asked','asker','askip','askoi','askos','aslop','asoak','asoka','aspen','asper','aspic','aspie','aspis','aspro',
    'assai','assam','asses','assez','assis','assot','astay','aster','astir','astor','astun','asura','asway','aswim','asyla',
    'ataps','atavi','ataxy','atelo','athar','atigi','atilt','atimy','atlas','atlee','atman','atmas','atmid','atmos','atocs',
    'atoke','atoks','atoms','atomy','atony','atopy','atour','atria','atrip','attap','attar','atter','attid','atuas','atule',
    'atune','atwin','atypy','audad','augen','auger','aught','aulae','aulas','aulic','auloi','aulos','aumil','aunes','aunts',
    'aurae','aural','aurar','auras','aurei','aures','auric','aurin','aurir','auris','aurum','auryl','autem','autos','auxin',
    'avahi','avale','avant','avast','avels','avens','avera','avers','avgas','avick','avine','avion','avise','aviso','avize',
    'avows','avyze','awabi','awaft','awald','awalt','awane','awarn','awato','awave','aways','awber','awdls','aweek','aweel',
    'awest','aweto','awhet','awhir','awide','awing','awink','awiwi','awmry','awned','awner','awols','awork','axels','axile',
    'axils','axine','axing','axite','axled','axles','axman','axmen','axoid','axone','axons','ayahs','ayaya','ayelp','aygre',
    'ayins','aylet','ayllu','ayond','ayont','ayous','ayres','ayrie','azans','azide','azido','azine','azlon','azoch','azofy',
    'azoic','azole','azons','azote','azoth','azoxy','azuki','azurn','azury','azygy','azyme','azyms','baaed','baals','babai',
    'babas','babby','babel','babes','babka','baboo','babul','babus','bacao','bacca','bacco','baccy','bacha','bache','bachs',
    'backs','badan','baddy','baels','baffs','baffy','bafta','bafts','baghs','bagie','bagre','bahan','bahar','bahay','bahoe',
    'bahoo','bahts','bahur','bahus','bahut','bails','baioc','bairn','baisa','baith','baits','baiza','baize','bajan','bajra',
    'bajri','bajus','bakal','baked','baken','bakes','bakie','bakli','bakra','balai','balao','balas','balds','baldy','baled',
    'balei','bales','balks','balky','balli','balls','bally','balms','baloo','balow','balsa','balti','balun','balus','balut',
    'balza','bambi','banak','banat','banca','banco','bancs','banda','bande','bandh','bandi','bando','bands','bandy','baned',
    'banes','banga','bange','bangs','bania','banig','banks','banky','banns','bants','bantu','banty','banya','bapus','barad',
    'barbe','barbs','barby','barca','barde','bardo','bards','bardy','bared','barer','bares','barff','barfi','barfs','bargh',
    'baria','baric','barid','barie','baris','barit','barks','barky','barms','barmy','barns','barny','baroi','barps','barra',
    'barre','barro','barry','barse','barth','barye','basan','based','basen','baser','bases','basho','basij','basks','bason',
    'basos','basse','bassi','basso','bassy','basta','basti','basto','basts','batad','batea','bated','batel','bater','bates',
    'baths','batik','batta','batts','battu','bauch','bauds','bauks','baulk','bauno','baurs','bauta','bavin','bawds','bawks',
    'bawls','bawns','bawrs','bawty','bayal','bayed','bayer','bayes','bayle','bayok','bayts','bazar','bazoo','beads','beaks',
    'beaky','beala','beals','beams','beamy','beano','beans','beant','beany','beare','bearm','bears','beata','beath','beats',
    'beaty','beaus','beaut','beaux','bebar','bebat','bebay','bebed','bebog','bebop','becap','becke','becks','becry','becut',
    'bedad','beday','bedel','beden','bedes','bedew','bedim','bedin','bedip','bedog','bedot','bedub','bedur','bedye','beedi',
    'beefs','beeps','beers','beery','beest','beeth','beets','beety','beeve','befan','befog','befop','begad','begar','begay',
    'begem','begob','begot','begum','begut','behap','behen','beice','beige','beigy','beins','beira','beisa','bejan','bejel',
    'bejig','bekah','bekko','belah','belam','belar','belay','belee','belga','bells','belon','belts','belve','bemad','beman',
    'bemar','bemas','bemat','bemix','bemud','benab','benda','bends','bendy','benes','benet','benga','benis','benjy','benne',
    'benni','benny','bensh','bento','bents','benty','benzo','beode','bepat','bepaw','bepen','bepun','berat','beray','beres',
    'bergs','bergy','berko','berks','berme','berms','berne','berob','berri','beryl','besan','besat','besaw','besee','beses',
    'besin','besit','besom','besot','bespy','besra','besti','bests','betag','betas','beted','betes','beths','betid','betis',
    'beton','betso','betta','betty','bever','bevor','bevue','bevvy','bewet','bewig','bezes','bezil','bezzi','bezzo','bezzy',
    'bhais','bhaji','bhalu','bhang','bhara','bhats','bhava','bhels','bhoot','bhuna','bhuts','biabo','biach','biali','bialy',
    'bibbs','bibes','biccy','bices','bichy','bidar','bided','bider','bides','bidet','bidis','bidon','bidri','bield','biers',
    'bifer','biffo','biffs','biffy','bifid','bigae','biggs','biggy','bigha','bight','bigly','bigos','bijou','biked','biker',
    'bikes','bikie','bilbo','bilby','bilch','biled','biles','bilgy','bilic','bilio','bilks','billa','bills','bilsh','bimah',
    'bimas','bimbo','binal','bindi','binds','biner','bines','bings','bingy','binit','binks','binna','bints','biogs','biont',
    'biose','biota','biped','bipod','birds','birdy','birks','birle','birls','birma','birny','biros','birrs','birse','birsy',
    'bises','bisks','bisom','bisti','bitch','biter','bites','bitos','bitou','bitsy','bitte','bitts','biune','bivia','bivvy',
    'bixin','bizes','bizet','bizzo','bizzy','blabs','blads','blady','blaer','blaes','blaff','blags','blahs','blain','blair',
    'blake','blams','blanc','blart','blase','blash','blate','blats','blatt','blaud','blawn','blaws','blays','blazy','blear',
    'blebs','blech','bleck','blees','blent','blert','blest','blets','bleys','blibe','blick','blimy','bling','blini','blins',
    'bliny','blips','blist','blite','blits','blive','blizz','blobs','blocs','blogs','blook','bloop','blore','blots','blout',
    'blows','blowy','blubs','blude','bluds','bludy','blued','blues','bluet','bluey','bluid','blume','blunk','blurs','blype',
    'boabs','boaks','boars','boart','boats','bobac','bobak','bobas','bobol','bobos','bocal','bocca','bocce','bocci','boche',
    'bocks','bocoy','boded','boden','boder','bodes','bodge','bodhi','bodle','boeps','boets','boeuf','boffo','boffs','bogan',
    'bogey','boggy','bogie','bogle','bogue','bogum','bogus','bohea','bohor','bohos','boils','boily','boing','boink','boist',
    'boite','boked','bokeh','bokes','bokom','bokos','bolar','bolas','boldo','bolds','boled','boles','bolis','bolix','bolls',
    'bolly','bolos','bolti','bolts','bolus','bomas','bombe','bombo','bombs','bonce','bonds','boned','boner','bones','bongs',
    'bonie','bonks','bonne','bonny','bonza','bonze','booai','booay','boobs','boody','booed','boofy','boogy','boohs','books',
    'booky','bools','booly','booms','boomy','boong','boonk','boons','boord','boors','boort','boose','boosy','boots','boppy',
    'borak','boral','boras','borde','bords','bored','boree','borel','borer','bores','borgh','borgo','boric','borks','borms',
    'borna','boron','borts','borty','bortz','boryl','bosch','boser','bosie','bosks','bosky','boson','bosun','botas','botel',
    'botes','bothy','botte','botts','botty','bouge','bouks','boult','bouns','bourd','bourg','bourn','bouse','bousy','bouto',
    'bouts','bovid','bowat','bowed','bower','bowes','bowet','bowie','bowla','bowls','bowly','bowne','bowrs','bowse','boxed',
    'boxen','boxes','boxla','boxty','boyar','boyau','boyed','boyer','boyfs','boygs','boyla','boyos','boysy','bozal','bozos',
    'bozze','braai','braca','brach','brack','bract','brads','braes','brags','brail','braks','braky','brame','brane','brank',
    'brans','brant','brast','brats','brava','bravi','braws','braxy','brays','braza','braze','bream','breba','breck','brede',
    'bredi','breds','breek','breem','breer','brees','breid','breis','breme','brens','brent','brere','brers','breth','brett',
    'breva','breve','brews','breys','brier','bries','brigs','briki','briks','brill','brims','brins','brios','brise','briss',
    'brith','brits','britt','brize','brizz','broch','brock','brods','brogh','brogs','broll','broma','brome','bromo','bronc',
    'brond','bronk','brool','broon','broos','brose','brosy','brows','brugh','bruin','bruit','bruke','brule','brume','brung',
    'brusk','brust','bruts','bruzz','buats','buaze','bubal','bubas','bubba','bubbe','bubby','bubus','bucca','buchu','bucko',
    'bucks','bucku','bucky','budas','budis','budos','buffa','buffe','buffi','buffo','buffs','buffy','bufos','bufty','bugan',
    'bugre','buhls','buhrs','buiks','buist','bukes','bulak','bulbs','bulby','bulgy','bulks','bulla','bulls','bulse','bumbo',
    'bumfs','bumph','bumps','bumpy','bunas','bunce','bunco','bunde','bundh','bunds','bundt','bundu','bundy','bungo','bungs',
    'bungy','bunia','bunje','bunjy','bunko','bunks','bunns','bunts','bunty','bunya','buoys','buppy','buran','burao','buras',
    'burbs','burds','burel','buret','burfi','burgh','burgs','burin','burka','burke','burks','burls','burns','burny','buroo',
    'burps','burqa','burro','burrs','burry','bursa','burse','busby','buses','bushi','busks','busky','bussu','busti','busts',
    'busty','buteo','butes','butic','butle','butoh','butts','butty','butut','butyl','butyr','buzzy','bwana','bwazi','byded',
    'bydes','byked','bykes','byous','byres','byrls','bysen','byssi','bytes','byway','caaed','caama','caban','cabas','cabda',
    'caber','cabio','cabob','caboc','cabot','cabre','cacam','cacas','cacks','cacky','cacur','cadee','cader','cades','cadew',
    'cadge','cadgy','cadie','cadis','cados','cadre','cadua','cadus','caeca','caese','cafes','caffa','caffs','cafiz','caged',
    'cager','cages','caggy','cagit','cagot','cahiz','cahot','cahow','caids','cains','caird','cajon','cajun','caked','caker',
    'cakes','cakey','calfs','calid','calif','calix','calks','calla','calli','callo','calls','calms','calmy','calor','calos',
    'calpa','calps','calve','calyx','caman','camas','cames','camis','camos','campi','campo','camps','campy','camus','canch',
    'caned','caneh','canel','caner','canes','cangs','canid','canna','canns','canso','canst','canto','cants','canty','canun',
    'caoba','capas','capax','caped','capel','capes','capex','caphs','capiz','caple','capon','capos','capot','cappy','capri',
    'capsa','capul','carap','carbo','carbs','carby','cardi','cardo','cards','cardy','cared','carer','cares','caret','carex',
    'carga','carid','carks','carle','carls','carns','carny','caroa','carob','carom','caron','carpi','carps','carrs','carse',
    'carta','carte','carts','carty','carua','carvy','caryl','casal','casas','casco','cased','caser','cases','casha','casks',
    'casky','casse','casts','casus','catan','cates','cauch','cauda','cauks','cauld','cauls','cauma','caums','caupo','caups',
    'cauri','causa','cavae','caval','cavas','caved','cavel','caver','caves','cavie','cavus','cawed','cawks','cawky','caxon',
    'ceaze','cebid','cebil','cebur','cecal','cecum','ceded','ceder','cedes','cedis','cedre','cedry','ceiba','ceibo','ceile',
    'ceili','ceils','celeb','cella','celli','cells','celom','celts','cense','cento','cents','centu','ceorl','cepes','cequi',
    'ceral','ceras','cerci','cered','cerer','ceres','cerge','ceria','ceric','cerin','cerne','ceroc','ceros','certs','certy',
    'ceryl','cesse','cesta','cesti','cetes','cetic','cetin','cetyl','cezve','chace','chack','chaco','chado','chads','chaft',
    'chais','chaja','chaka','chals','chams','chana','chang','chank','chape','chaps','chapt','chara','chare','chark','charr',
    'chars','chary','chati','chats','chauk','chaus','chave','chavs','chawk','chawl','chaws','chaya','chays','cheep','cheet',
    'chefs','cheir','cheka','cheke','cheki','chela','chelp','chemo','chems','chena','cheng','chere','chert','cheth','cheve',
    'chevy','chews','chewy','chiao','chias','chibs','chica','chich','chico','chics','chiel','chien','chiks','chile','chimb',
    'chimo','chimp','chine','ching','chink','chino','chins','chint','chips','chirk','chirl','chirm','chiro','chirr','chirt',
    'chiru','chits','chive','chivs','chivy','chizz','chlor','choca','choco','chocs','chode','choel','choga','chogs','choil',
    'choko','choky','chola','chold','choli','cholo','chomp','chons','choof','chook','choom','choon','choop','chopa','chops',
    'chort','chota','chott','choup','chous','chout','choux','chowk','chows','choya','chria','chubs','chufa','chuff','chugs',
    'chums','churl','churm','churr','chuse','chuts','chyak','chyle','chyme','chynd','cibol','cicad','cicer','cided','cides',
    'ciels','ciggy','cigua','cilia','cills','cimar','cimex','cinct','cinel','cines','cinqs','cions','cippi','circs','cires',
    'cirls','cirri','cisco','cissy','cista','cists','cital','cited','citee','citer','cites','citua','cives','civet','civie',
    'civvy','clach','clade','clads','claes','clags','clamb','clame','clams','clans','claps','clapt','clark','claro','clart',
    'clary','clast','clats','claut','clava','clave','clavi','clavy','clawk','claws','clays','clead','cleam','cleck','cleek',
    'cleep','clefs','clegs','cleik','clems','clepe','clept','cleve','clews','clied','clies','clift','clima','clime','cline',
    'clint','clipe','clips','clipt','clite','clits','clive','cloam','clods','cloff','clogs','cloit','cloke','clomb','clomp',
    'clonk','clons','cloof','cloop','cloot','clops','closh','clote','clots','clour','clous','clows','cloye','cloys','cloze',
    'clubs','clues','cluey','cluff','clunk','clyer','clype','cnida','coact','coady','coaid','coala','coals','coaly','coapt',
    'coarb','coate','coati','coats','coaxy','cobbs','cobby','cobia','coble','cobza','cocas','cocci','cocco','cocks','cocky',
    'cocos','codas','codec','coded','coden','coder','codes','codex','codol','codon','coeds','coffs','cogie','cogon','cogue',
    'cohab','cohen','cohoe','cohog','cohol','cohos','coifs','coign','coils','coins','coiny','coirs','coits','coked','coker',
    'cokes','colas','colby','colds','coled','coles','coley','colic','colin','colls','colly','colog','colts','colza','comae',
    'comal','comas','combe','combi','combo','combs','comby','comer','comes','comix','commo','comms','commy','compo','comps',
    'compt','comte','comus','conal','coned','coner','cones','coney','confs','conga','conge','congo','conia','conin','conks',
    'conky','conne','conns','conte','conto','conus','convo','cooba','cooch','cooed','cooee','cooer','cooey','coofs','cooja',
    'cooks','cooky','cools','cooly','coomb','cooms','coomy','coons','coony','coops','coopt','coost','coots','cooze','copal',
    'copay','coped','copei','copen','coper','copes','copis','coppy','copra','copsy','copus','coque','coqui','corah','coram',
    'corbe','corby','cords','cordy','cored','cores','corey','corge','corgi','coria','corke','corks','corky','corms','corni',
    'corno','corns','cornu','coroa','corol','corps','corse','corso','corta','coryl','cosec','cosed','coses','coset','cosey',
    'cosie','cosse','costa','coste','costs','cotan','cotch','coted','cotes','cothe','coths','cothy','cotta','cotte','cotts',
    'cotty','couac','coude','couma','coups','courb','courd','coure','cours','couta','couth','coved','coves','covid','covin',
    'cowal','cowan','cowed','cowks','cowle','cowls','cowps','cowry','coxae','coxal','coxed','coxes','coxib','coyan','coyau',
    'coyed','coyer','coyol','coypu','cozed','cozen','cozes','cozey','cozie','craal','crabs','crags','craic','craig','crain',
    'crake','crame','crams','crans','crape','craps','crapy','crare','cravo','crawm','craws','crays','creat','creds','creel',
    'creem','creen','crees','crems','crena','creps','crepy','creta','crewe','crews','crias','cribo','cribs','cries','criey',
    'crile','crims','crine','crink','crios','cripe','crips','crise','criss','crith','crits','croci','crocs','croft','crogs',
    'cromb','crome','cronk','crons','crood','crool','croon','crops','crore','crosa','crost','crout','crowl','crows','croze',
    'cruce','cruck','crudo','cruds','crudy','crues','cruet','cruft','crunk','crunt','cruor','crura','cruse','crusy','cruth',
    'cruve','crwth','cryer','ctene','cubby','cubeb','cubed','cuber','cubes','cubit','cuddy','cueca','cuffo','cuffs','cuffy',
    'cuifs','cuing','cuish','cuits','cukes','culch','culet','culex','culla','culls','cully','culms','culmy','culpa','culti',
    'cults','culty','cumal','cumay','cumbu','cumec','cumic','cumol','cumyl','cundy','cunei','cunit','cunts','cunye','cupay',
    'cupel','cupid','cuppa','cuppy','curat','curbs','curby','curch','curds','curdy','cured','curer','cures','curet','curfs',
    'curia','curie','curin','curli','curls','curns','curny','currs','cursi','curst','curua','cusec','cushy','cusie','cusks',
    'cusps','cuspy','cusso','cusum','cutch','cuter','cutes','cutey','cutin','cutis','cutto','cutty','cutup','cuvee','cuzes',
    'cwtch','cyano','cyans','cyath','cycad','cycas','cyclo','cyder','cylix','cymae','cymar','cymas','cymba','cymes','cymol',
    'cypre','cyrus','cysts','cytes','cyton','czars','daals','dabba','dabby','daces','dacha','dacks','dadah','dadap','dadas',
    'dados','daffs','daffy','dagga','daggy','dagos','dahls','daiko','daine','daint','daira','dairi','daiva','daker','dakir',
    'dalar','daled','daler','dales','dalis','dalle','dalts','daman','damar','dames','damie','damme','damns','damps','dampy',
    'dancy','danda','dangs','danio','danks','danli','danny','danta','dants','darac','daraf','darat','darbs','darby','darcy',
    'dared','darer','dares','darga','dargs','daric','daris','darks','darky','darns','daroo','darre','darst','darts','darzi',
    'dashi','dashy','dasnt','dassy','datal','datch','dated','dater','dates','datil','datos','datto','daube','daubs','dauby',
    'dauds','dault','daurs','dauts','daven','daver','davit','dawah','dawds','dawdy','dawed','dawen','dawks','dawns','dawny',
    'dawts','dawut','dayal','dayan','daych','daynt','dazed','dazer','dazes','deads','deair','deals','deans','deare','dearn',
    'dears','deary','deash','deave','deaws','deawy','debag','debby','debel','deben','debes','debts','debud','debur','debus',
    'debye','decad','decaf','decan','decap','decil','decke','decko','decks','decos','decus','decyl','dedal','deeds','deedy',
    'deely','deems','deens','deeps','deere','deers','deets','deeve','deevs','defat','deffo','defis','defog','degas','degum',
    'degus','deice','deids','deify','deils','deink','deism','deist','deked','dekes','dekko','dekle','deled','deles','delfs',
    'delft','delis','dells','delly','delos','delph','delts','demal','deman','demes','demic','demit','demob','demoi','demos',
    'dempt','denar','denat','denay','dench','denda','denes','denet','denis','dents','denty','deota','deoxy','depas','depoh',
    'derah','derat','deray','dered','deres','deric','derig','derma','derms','derns','derny','deros','derro','derry','derth',
    'dervs','desex','deshi','desis','desks','desma','dessa','desse','desyl','detar','detax','detin','detur','devas','devel',
    'devis','devon','devos','devot','devow','dewan','dewar','dewax','dewed','dewer','dexes','dexie','dhaba','dhabb','dhaks',
    'dhals','dhava','dheri','dhikr','dhobi','dhole','dholl','dhols','dhoni','dhoon','dhoti','dhoul','dhows','dhuti','dhyal',
    'diact','dials','diamb','diane','diazo','dibbs','diced','dicer','dices','dicht','dicks','dicky','dicot','dicta','dicts',
    'dicty','diddy','didie','didle','didna','didnt','didos','didst','didym','diebs','diels','diene','diets','diffs','dight',
    'dikas','diked','diker','dikes','dikey','dildo','dilli','dills','dimbo','dimer','dimes','dimit','dimps','dinar','dined',
    'dines','dinge','dings','dinic','dinks','dinky','dinna','dinos','dints','dinus','diols','diose','diota','dioxy','dippy',
    'dipso','diram','direr','dirke','dirks','dirls','dirts','disas','disci','discs','dishy','disks','disme','disna','dital',
    'ditas','dited','diter','dites','ditsy','ditts','ditzy','divan','divas','dived','divel','dives','divis','divna','divos',
    'divot','divus','divvy','diwan','dixie','dixit','diyas','dizen','djave','djinn','djins','doabs','doats','dobby','dobes',
    'dobie','dobla','dobra','dobro','docht','docks','docos','docus','doddy','dodos','doeks','doers','doest','doeth','doffs',
    'dogal','dogan','doges','dogey','doggo','doggy','dogie','dogly','dohyo','doigt','doilt','doily','doina','doits','dojos',
    'dolce','dolci','doled','doles','dolia','dolls','dolma','dolor','dolos','dolts','domal','domba','domed','domer','domes',
    'domic','dompt','donah','donas','donax','donee','doner','doney','donga','dongs','donko','donna','donne','donny','donsy',
    'donum','doobs','dooce','doody','dooja','dooks','doole','dooli','dools','dooly','dooms','doomy','doona','doorn','doors',
    'doozy','dopas','doped','doper','dopes','dorab','dorad','dorba','dorbs','doree','dores','doria','doric','doris','dorje',
    'dorks','dorky','dorms','dormy','dorps','dorrs','dorsa','dorse','dorts','dorty','dosai','dosas','dosed','doseh','doser',
    'doses','dosha','dosis','dotal','doted','doter','dotes','dotty','douar','douce','doucs','douks','doula','douma','doums',
    'doups','doura','douse','douts','doved','doven','dover','doves','dovie','dowar','dowds','dowed','dower','dowie','dowle',
    'dowls','dowly','downa','downs','dowps','dowse','dowts','doxed','doxes','doxie','doyen','doyly','dozed','dozer','dozes',
    'drabs','drack','draco','draff','drago','drags','drail','dramm','drams','drang','drant','draps','drate','drats','drave',
    'drawk','draws','drays','drear','dreck','dreed','dreep','dreer','drees','dregs','dreks','dreng','drent','drere','drest',
    'dreys','drias','dribs','drice','dries','drily','drinn','drips','dript','drisk','drogh','droid','droil','droke','drole',
    'drome','drona','drony','droob','droog','drook','drops','dropt','droud','drouk','drovy','drows','drubs','drugs','drums',
    'drung','drupe','druse','drusy','druxy','dryad','dryas','dryth','dsobo','dsomo','duads','duali','duals','duans','duars',
    'dubba','dubbo','dubby','ducal','ducat','duces','ducks','ducky','ducts','duddy','duded','dudes','duels','duets','duett',
    'duffs','dufus','dugal','duhat','duing','duits','dujan','dukas','duked','dukes','dukhn','dukka','dulce','duler','dules',
    'dulia','dulls','dulse','dumas','dumba','dumbo','dumbs','dumka','dumky','dumps','dunal','dunam','dunch','dunes','dungs',
    'dungy','dunks','dunne','dunno','dunny','dunsh','dunst','dunts','duole','duomi','duomo','duped','duper','dupes','dupla',
    'duple','duply','duppy','dural','duras','durax','dured','dures','durgy','durns','duroc','duros','duroy','durra','durrs',
    'durry','durst','durum','duryl','durzi','dusio','dusks','dusts','dutra','duxes','dwaal','dwale','dwalm','dwams','dwang',
    'dwaum','dweeb','dwile','dwine','dyads','dyers','dyked','dyker','dykes','dykey','dykon','dynel','dynes','dzhos','eagre',
    'ealed','eales','eaned','eards','eared','earls','earns','earnt','earst','eased','easer','eases','easle','easts','eathe',
    'eaved','eaver','eaves','ebbed','ebbet','ebons','ebook','ecads','echea','eched','eches','echos','ecize','ecoid','ecole',
    'ecrus','ectad','ectal','edder','edema','edged','edger','edges','edile','edits','educe','educt','eejit','eeler','eensy',
    'eeven','eevns','effed','egads','egers','egest','eggar','egged','egger','egmas','ehing','eider','eidos','eigne','eiked',
    'eikon','eilds','eimer','eisel','ejido','ekaha','ekkas','elain','eland','elans','elchi','eldin','elemi','elfed','elfic',
    'eliad','elint','elmen','eloge','elogy','eloin','elops','elpee','elsin','elute','elvan','elven','elver','elves','elvet',
    'emacs','embar','embay','embog','embow','embox','embus','emeer','emend','emerg','emery','emeus','emics','emirs','emits',
    'emmas','emmer','emmet','emmew','emmys','emoji','emong','emote','emove','empts','emule','emure','emyde','emyds','enage',
    'enapt','enarm','enate','encup','ended','ender','endew','endue','enews','enfix','engem','enhat','eniac','enlit','enmew',
    'ennog','enoil','enoki','enols','enorm','enows','enray','enrib','enrol','enrut','ensew','ensky','entad','ental','entia',
    'enure','enurn','envoi','enzym','eorls','eosin','epact','epees','ephah','ephas','ephod','ephor','epics','epode','epopt',
    'epris','epulo','eques','equid','erade','erbia','erept','erevs','ergal','ergon','ergos','ergot','erhus','erica','erick',
    'erics','erika','ering','erizo','erned','ernes','erose','erred','erses','eruca','eruct','erugo','eruvs','erven','ervil',
    'escar','escot','esere','eshin','esile','eskar','esker','esnes','essed','esses','estoc','estop','estre','estro','estus',
    'etage','etape','etats','etens','ethal','ethel','ethid','ethne','ethyl','etics','etnas','ettin','ettle','etuis','etwee',
    'etyma','eughs','euked','eupad','euros','eusol','evase','evens','evert','evets','evhoe','evils','evite','evohe','ewder',
    'ewers','ewery','ewest','ewhow','ewked','exams','exdie','exeat','execs','exeem','exeme','exfil','exies','exine','exing',
    'exite','exits','exlex','exode','exody','exome','exons','expat','expos','exter','exude','exuls','exurb','eyass','eyers',
    'eyots','eyoty','eyras','eyres','eyrie','eyrir','ezine','fabby','fabes','faced','facer','faces','facia','facks','facta',
    'facts','facty','faddy','faded','faden','fader','fades','fadge','fados','faena','faery','faffs','faffy','fager','faggy',
    'fagin','fagot','faham','faiks','fails','faine','fains','fairm','fairs','faked','faker','fakes','fakey','fakie','fakir',
    'falaj','falls','fally','famed','fames','fanal','fanam','fands','fanes','fanga','fango','fangs','fangy','fanks','fanon',
    'fanos','fanum','faqir','farad','farci','farcy','farde','fardh','fardo','fards','fared','farer','fares','farle','farls',
    'farms','farmy','faros','farro','farse','farts','fasci','fasti','fasts','fated','fates','fatil','fatly','fatso','fatwa',
    'faugh','fauld','fauns','faurd','fause','faust','fauts','fauve','favas','favel','faver','faves','favus','fawns','fawny',
    'faxed','faxes','fayed','fayer','fayne','fayre','fazed','fazes','feals','feare','fears','feart','fease','feats','featy',
    'feaze','feces','fecht','fecit','fecks','fedex','feebs','feeds','feedy','feels','feens','feere','feers','feese','feeze',
    'fehme','feint','feist','felch','felid','fells','felly','felts','felty','femal','femes','femic','femmy','fends','fendy',
    'fenis','fenks','fenny','fents','feods','feoff','ferer','feres','feria','ferie','ferly','ferme','fermi','ferms','ferns',
    'ferny','ferri','fesse','festa','fests','festy','fetas','feted','fetes','fetor','fetta','fetts','fetwa','feuar','feuds',
    'feued','feyed','feyer','feyly','fezes','fezzy','fiard','fiars','fiats','fibro','fibry','fices','fiche','fichu','ficin',
    'ficos','fides','fidge','fidos','fiefs','fient','fiere','fiers','fiest','fifed','fifer','fifes','fifie','fifis','figgy',
    'figos','fiked','fikes','fikie','filao','filar','filch','filed','files','filii','filks','fille','fillo','fills','filmi',
    'films','filos','filum','finca','finds','fined','fines','finis','finks','finny','finos','fiord','fiqhs','fique','firca',
    'fired','firer','fires','firie','firks','firms','firns','firry','firth','fiscs','fisks','fists','fisty','fitch','fitly',
    'fitna','fitte','fitts','fitty','fiver','fives','fixed','fixes','fixit','fjeld','flabs','flaff','flags','flaks','flamb',
    'flamm','flams','flamy','flane','flans','flaps','flary','flats','flava','flavo','flawn','flaws','flawy','flaxy','flays',
    'fleam','fleas','fleay','fleek','fleer','flees','flegs','fleme','fleur','flews','flexi','flexo','fleys','flics','flied',
    'flies','flimp','flims','flipe','flips','flirs','flisk','flite','flits','flitt','flobs','flocs','floes','floey','flogs',
    'flong','flops','flors','flory','flosh','flota','flote','flows','flubs','flued','fluer','flues','fluey','fluky','flump',
    'fluor','flurn','flurr','flusk','fluty','fluyt','flyby','flype','flyte','foals','foaly','foams','fodda','foder','fodge',
    'foehn','fogey','fogie','fogle','fogon','fogou','fogus','fohat','fohns','foids','foils','foins','folds','foldy','foley',
    'folia','folic','folie','folks','folky','fomes','fonda','fonds','fondu','fones','fonly','fonts','foods','foody','fools',
    'foots','footy','foppy','foram','forbs','forby','fordo','fords','fordy','forel','fores','forex','forks','forky','forme',
    'forms','formy','forts','forza','forze','fosie','fossa','fosse','fotch','fotui','fouat','fouds','fouer','fouet','foule',
    'fouls','fount','fours','foute','fouth','fovea','fowls','fowth','foxed','foxer','foxes','foxie','foyle','foyne','frabs',
    'frack','fract','frags','fraid','fraik','fraim','franc','frape','fraps','frase','frass','frate','frati','frats','fraus',
    'frawn','frayn','frays','fraze','fream','freck','frees','freet','freir','freit','fremd','frena','freon','frere','frets',
    'frett','fribs','frier','fries','frigs','frike','frise','frist','frith','frits','fritt','frize','frizz','froes','frogs',
    'frons','froom','frore','frorn','frory','frosh','frowl','frows','frowy','frugs','frump','frush','frust','fryer','fubar',
    'fubby','fubsy','fucks','fucus','fuddy','fuder','fudgy','fuels','fuero','fuffs','fuffy','fugal','fuggy','fugie','fugio',
    'fugle','fugly','fugus','fujis','fulls','fulth','fulwa','fumed','fumer','fumes','fumet','fundi','funds','fundy','fungo',
    'fungs','funis','funks','fural','furan','furca','furil','furls','furol','furrs','furth','furyl','furze','furzy','fused',
    'fusee','fusel','fuses','fusht','fusil','fusks','fusts','fusty','futon','futwa','fuzed','fuzee','fuzes','fuzil','fyces',
    'fyked','fykes','fyles','fyrds','fytte','gabba','gabby','gable','gaddi','gades','gadge','gadid','gadis','gadje','gadjo',
    'gadso','gaffs','gaged','gagee','gager','gages','gagor','gaids','gaine','gains','gairs','gaita','gaits','gaitt','gaize',
    'gajos','galah','galas','galax','galea','galed','galee','gales','galet','galey','galla','galls','gally','galop','galut',
    'galvo','gamas','gamay','gamba','gambe','gambo','gambs','gamed','games','gamey','gamic','gamin','gamme','gammy','gamps',
    'ganam','ganch','gandy','ganef','ganev','ganga','gange','gangs','ganja','ganof','gansy','ganta','gants','ganza','gaols',
    'gaped','gaper','gapes','gapos','gappy','garad','garbe','garbo','garbs','garce','garda','gardy','gareh','gares','garis',
    'garle','garms','garni','garoo','garre','garse','garth','garum','gases','gashy','gasps','gaspy','gasts','gatch','gated',
    'gater','gates','gaths','gator','gauby','gauch','gaucy','gauds','gauje','gault','gaums','gaumy','gaups','gaurs','gauss',
    'gauzy','gavot','gawby','gawcy','gawds','gawks','gawps','gawsy','gayal','gazal','gazar','gazed','gazee','gazel','gazes',
    'gazon','gazoo','geals','geans','geare','gears','gease','geats','gebur','gecks','geeks','geeps','geest','geira','geist',
    'geits','gelds','gelee','gelid','gelly','gelts','gemel','gemma','gemmy','gemot','gemul','genal','genas','genep','genes',
    'genet','genic','genii','genin','genip','genny','genoa','genom','genos','genro','gents','genty','genua','genus','genys',
    'geode','geoid','geoty','gerah','gerbe','geres','gerim','gerip','gerle','germs','germy','gerne','gesse','gesso','geste',
    'gests','getah','getas','getup','geums','geyan','geyer','ghast','ghats','ghaut','ghazi','ghees','ghest','ghoom','ghyll',
    'gibby','gibed','gibel','giber','gibes','gibli','gibus','gifts','gigas','gighe','gigot','gigue','gilas','gilds','gilet',
    'gilia','gilim','gills','gilly','gilpy','gilse','gilts','gimel','gimme','gimps','gimpy','ginch','ginge','gings','ginks',
    'ginny','ginzo','gipon','gippo','gippy','girba','girds','girls','girns','girny','giron','giros','girrs','girse','girsh',
    'girts','gisla','gismo','gisms','gists','gitch','gites','giust','gived','gives','givey','gizmo','glace','glack','glads',
    'glady','glaga','glaik','glair','glaky','glams','glans','glary','glaum','glaur','glazy','gleba','glebe','gleby','glede',
    'gleds','gledy','gleed','gleek','glees','gleet','gleis','glens','glent','gleys','glial','glias','glibs','gliff','glift',
    'glike','glime','glims','glink','glisk','glits','glitz','gloam','globi','globs','globy','glode','gloea','glogg','glome',
    'gloms','gloop','glops','glore','glost','glout','glows','gloze','gluck','glued','gluer','glues','gluey','glugs','gluma',
    'glume','glump','glums','gluon','glute','gluts','gnarl','gnarr','gnars','gnats','gnawn','gnaws','gnows','goads','goafs',
    'goals','goary','goats','goaty','goave','goban','gobar','gobbe','gobbi','gobbo','gobby','gobis','gobos','godet','godso',
    'goels','goers','goest','goeth','goety','gofer','goffs','gogga','gogos','goier','gojis','golds','goldy','golee','goles',
    'golfs','goloe','golpe','golps','gombo','gomer','gompa','gonal','gonch','gonef','gongs','gonia','gonid','gonif','gonks',
    'gonna','gonne','gonof','gonys','gonzo','gooby','goods','goofs','googs','gooks','gooky','goold','gools','gooly','gooma',
    'goons','goony','goops','goopy','goors','goory','goosy','gopak','gopik','goral','goran','goras','gorce','gored','gorer',
    'gores','goric','goris','gorms','gormy','gorps','gorra','gorry','gorse','gorsy','gosht','gosse','gossy','gotch','goths',
    'gothy','gotra','gotta','gouch','gouks','goumi','goura','gouts','gouty','gowan','gowds','gowfs','gowks','gowls','gowns',
    'goxes','goyim','goyin','goyle','graal','grabs','grads','graff','graip','grama','grame','gramp','grams','grana','grane',
    'grank','grano','grans','grapy','gravs','grays','grebe','grebo','grece','greek','grees','grege','grego','grein','grens',
    'grese','greve','grews','greys','grice','gride','grids','griff','grift','grigs','grike','grimp','grins','griot','grips',
    'gript','gripy','grise','grist','grisy','grith','grits','grize','groat','grody','groff','grogs','groks','groma','grone',
    'groof','groop','groot','grosz','grots','grouf','grovy','grows','grrls','grrrl','grubs','grued','grues','grufe','grume',
    'grump','grund','grush','gruss','gryce','gryde','gryke','grype','grypt','guaba','guaco','guaka','guama','guana','guano',
    'guans','guara','guars','guasa','guaza','gubbo','gucki','gucks','gucky','gudes','gudge','gudok','guffs','guffy','gugal',
    'gugas','guiba','guids','guige','guijo','guily','guimp','guiro','gulae','gulag','gular','gulas','gules','gulet','gulfs',
    'gulfy','gulix','gulls','gulph','gulps','gulpy','gumby','gumly','gumma','gummi','gumps','gundi','gundy','gunge','gungy',
    'gunks','gunky','gunne','gunny','guqin','gurdy','gurge','gurls','gurly','gurns','gurry','gursh','gurus','gushy','gusla',
    'gusle','gusli','gussy','gusts','gutsy','gutta','gutte','gutti','gutty','guyed','guyer','guyle','guyot','guyse','gweed',
    'gwely','gwine','gyals','gyans','gybed','gybes','gyeld','gymel','gymps','gynae','gynic','gynie','gynny','gynos','gyoza',
    'gypos','gyppo','gyppy','gyral','gyred','gyres','gyric','gyron','gyros','gyrus','gytes','gyved','gyves','haafs','haars',
    'hable','habus','hacek','hache','hacks','hacky','hadal','haddo','haded','hades','hadji','hadst','haems','haets','haffs',
    'hafiz','hafts','haggs','haggy','hagia','hahas','haick','haika','haiks','haiku','hails','haily','haine','hains','haint',
    'haire','hairs','haith','hajes','hajib','hajis','hajji','hakam','hakas','hakea','hakes','hakim','hakus','halal','halch',
    'haled','haler','hales','halfa','halfs','halid','hallo','halls','halma','halms','halon','halos','halse','halts','halva',
    'halwa','hamal','hamba','hamed','hamel','hames','hammy','hamsa','hamus','hamza','hanap','hance','hanch','hands','hange',
    'hangi','hangs','hanif','hanks','hanky','hanna','hansa','hanse','hants','haole','haoma','haori','hapax','haply','happi',
    'hapus','haram','harbi','hards','hared','hares','harim','harka','harks','harls','harms','harns','haros','harps','harts',
    'hasan','hashy','hasks','hasky','hasps','hasta','hated','hates','hatha','hathi','hatty','hauds','haufs','haugh','hauld',
    'haulm','hauls','hault','hauns','hause','havel','haver','haves','hawed','hawer','hawks','hawky','hawms','hawok','hawse',
    'hayed','hayer','hayey','hayle','hazan','hazed','hazen','hazer','hazes','hazle','heads','heald','heals','heame','heaps',
    'heapy','heare','hears','heast','heats','heben','hebes','hecht','hecks','hecte','heder','hedgy','heeds','heedy','heels',
    'heeze','heezy','hefte','hefts','heiau','heids','heigh','heils','heirs','hejab','hejra','heled','heles','helio','hells',
    'helly','helms','heloe','helos','helot','helps','helve','hemad','hemal','hemen','hemes','hemic','hemin','hemol','hemps',
    'hempy','henad','hench','hends','henge','henna','henny','henry','hents','hepar','herbs','herby','herds','herem','heres',
    'herls','herma','herms','herne','herns','heros','herry','herse','hertz','herye','hesps','hests','hetes','heths','heuau',
    'heuch','heugh','hevea','hewed','hewel','hewer','hewgh','hexad','hexed','hexer','hexes','hexis','hexyl','heyed','hiant',
    'hiate','hicks','hided','hider','hides','hield','hiems','highs','hight','hijab','hijra','hiked','hiker','hikes','hikoi',
    'hilar','hilch','hillo','hills','hilsa','hilts','hilum','hilus','himbo','hinau','hinch','hinds','hings','hinky','hinny',
    'hints','hiois','hiper','hiply','hired','hiree','hirer','hires','hirse','hissy','hists','hithe','hived','hiver','hives',
    'hizen','hoaed','hoagy','hoars','hoary','hoast','hobos','hocco','hocks','hocky','hocus','hodad','hoddy','hodja','hoers',
    'hogan','hogen','hoggs','hoggy','hoghs','hohed','hoick','hoied','hoiks','hoing','hoise','hokas','hoked','hokes','hokey',
    'hokis','hokku','hokum','holds','holed','holer','holes','holey','holia','holks','holla','hollo','holme','holms','holon',
    'holos','holts','homas','homed','homes','homey','homie','homme','homos','honan','honda','hondo','honds','honed','honer',
    'hones','hongi','hongs','honks','honky','hooch','hoods','hoody','hooey','hoofs','hoofy','hooka','hooks','hooky','hooly',
    'hoons','hoops','hoord','hoors','hoose','hoosh','hoots','hooty','hoove','hopak','hoped','hoper','hopes','hoppy','horah',
    'horal','horas','horis','horks','horme','horns','horst','horsy','hosed','hosel','hosen','hoser','hoses','hosey','hosta',
    'hosts','hotch','hoten','hotty','houff','houfs','hough','houri','hours','housy','houts','hovea','hoved','hoven','hoves',
    'howbe','howel','howes','howff','howfs','howks','howls','howre','howso','hoxed','hoxes','hoyas','hoyed','hoyle','huaca',
    'huaco','hubba','hubby','hucho','hucks','hudna','hudud','huers','huffs','huffy','huger','huggy','huhus','huias','hulas',
    'hules','hulks','hulky','hullo','hulls','hully','humas','humbo','humet','humfs','humic','humin','humps','humpy','hundi',
    'hunks','hunts','hurds','hurls','hurly','huron','hurra','hurst','hurts','hurty','husho','hushy','husks','husos','hutia',
    'huzza','huzzy','hwyls','hydra','hyens','hygge','hying','hykes','hylas','hyleg','hyles','hylic','hymns','hynde','hyoid',
    'hyped','hypes','hypha','hypho','hyphy','hypos','hyrax','hyson','hythe','iambi','iambs','ibota','ibrik','icaco','icers',
    'iched','iches','ichor','icica','icier','icker','ickle','icons','ictal','ictic','ictus','idant','iddat','ideas','idees',
    'ident','idgah','idite','idled','idles','idola','idols','idose','idryl','idyls','iftar','igapo','igged','iglus','ihram',
    'ikans','ikats','ikona','ikons','ileac','ileal','ileon','ileum','ileus','iliad','ilial','iliau','ilima','ilium','iller',
    'illth','imago','imams','imari','imaum','imban','imbar','imbat','imbed','imber','imide','imido','imids','imine','imino',
    'immew','immit','immix','impar','imped','impen','impis','impot','impro','imshi','imshy','inaja','inapt','inarm','inbye',
    'incel','incle','incog','incus','incut','indan','indew','india','indic','indie','indol','indow','indri','indue','indyl',
    'inerm','infit','infix','infos','infra','ingan','ingle','inial','inion','inked','inken','inker','inket','inkle','inlaw',
    'inned','innet','innit','inoma','inone','inorb','inrub','inrun','insea','insee','inset','inspo','intel','intil','intis',
    'intra','intue','inula','inure','inurn','inust','invar','inwit','iodic','iodid','iodin','iodol','iotas','ippon','irade',
    'irene','irian','irids','iring','irked','iroko','irone','irons','isbas','ishes','islay','isled','isles','islot','ismal',
    'isnae','issei','istle','itcze','items','itemy','ither','ivied','ivies','ixias','ixnay','ixora','ixtle','izard','izars',
    'izote','iztle','izzat','jaaps','jabia','jabot','jabul','jacal','jacko','jacks','jacky','jaded','jades','jafas','jaffa',
    'jagas','jagat','jager','jaggs','jaggy','jagir','jagla','jagra','jagua','jails','jaker','jakes','jakey','jalap','jalop',
    'jaman','jambe','jambo','jambs','jambu','james','jammy','jamon','janes','janns','janny','jantu','janty','janua','japan',
    'japed','japer','japes','jarks','jarls','jarps','jarra','jarry','jarta','jarul','jasey','jaspe','jasps','jatha','jatos',
    'jauks','jaups','javas','javel','javer','jawab','jawan','jawed','jaxie','jeans','jeats','jebel','jedis','jeels','jeely',
    'jeeps','jeers','jeery','jeeze','jefes','jeffs','jehad','jehup','jehus','jelab','jello','jells','jembe','jemmy','jenna',
    'jenny','jeons','jerez','jerib','jerid','jerks','jerry','jesse','jests','jesus','jetes','jeton','jeune','jewed','jewie',
    'jhala','jheel','jhool','jiaos','jibba','jibbs','jibby','jibed','jiber','jibes','jiboa','jiffs','jiggy','jigot','jihad',
    'jills','jilts','jimmy','jimpy','jingo','jinja','jinks','jinne','jinni','jinns','jinny','jiqui','jirds','jirga','jirre',
    'jisms','jitro','jived','jiver','jives','jivey','jixie','jnana','jobed','jobes','jocko','jocks','jocky','jocos','jocum',
    'jodel','joeys','johns','joins','joked','jokes','jokey','jokol','jokul','joled','joles','jolls','jolts','jolty','jomon',
    'jomos','jones','jongs','jonty','jooks','joola','joram','joree','jorum','joshi','josie','jotas','jotty','jotun','joual',
    'jough','jougs','jouks','joule','jours','jowar','jowed','jowel','jower','jowls','jowly','jowpy','joyed','jubas','jubbe',
    'jubes','jucos','judas','judex','judgy','judos','jufti','jugal','juger','jugum','jujus','juked','jukes','jukus','julep',
    'julid','julio','jumar','jumba','jumby','jumma','jumps','junco','junks','junky','jupes','jupon','jural','jurat','jurel',
    'jures','justo','justs','jutes','jutka','jutty','juves','juvia','juvie','kaama','kabab','kabar','kabel','kabob','kacha',
    'kacks','kadai','kades','kadis','kados','kafir','kafiz','kafta','kagos','kagus','kahal','kahar','kahau','kaiak','kaids',
    'kaies','kaifs','kaika','kaiks','kails','kaims','kaing','kains','kaiwi','kakar','kakas','kakis','kakke','kalam','kales',
    'kalif','kalis','kalon','kalpa','kamao','kamas','kames','kamik','kamis','kamme','kanae','kanap','kanas','kanat','kande',
    'kandy','kaneh','kanes','kanga','kangs','kanji','kants','kanzu','kaons','kapai','kapas','kaphs','kapok','kapow','kappe',
    'kapur','kapus','kaput','karas','karat','karbi','karch','karks','karns','karoo','karos','karou','karri','karst','karsy',
    'karts','karzy','kasha','kashi','kasme','kassu','katal','katar','katas','katha','katis','katti','katun','kaugh','kauri',
    'kauru','kaury','kaval','kavas','kawas','kawau','kawed','kayle','kayos','kazis','kazoo','kbars','keach','keawe','kebar',
    'kebob','kecks','kecky','kedge','kedgy','keech','keefs','keeks','keels','keema','keena','keeno','keens','keeps','keest',
    'keets','keeve','kefir','kehua','keirs','keita','keleh','kelek','kelep','kelim','kella','kells','kelly','kelps','kelpy',
    'kelts','kelty','kembo','kembs','kemps','kempt','kempy','kenaf','kench','kendo','kenno','kenos','kente','kents','kepis',
    'kerat','kerbs','kerel','kerfs','kerky','kerma','kerne','kerns','keros','kerry','kerve','kesar','kests','ketal','ketas',
    'ketch','keten','ketes','ketol','kette','ketty','ketyl','kevel','kevil','kexes','keyed','keyer','khadi','khafs','khair',
    'khaja','khans','khaph','khass','khats','khaya','khazi','kheda','kheth','khets','khoja','khoka','khors','khoum','khuds',
    'khula','khvat','kiaat','kiack','kiaki','kiang','kibbe','kibbi','kibei','kibes','kibla','kicks','kicky','kiddo','kiddy',
    'kidel','kidge','kiefs','kiers','kieve','kievs','kieye','kight','kikar','kikes','kikoi','kilah','kilan','kileh','kiley',
    'kilim','kills','killy','kilns','kilos','kilps','kilts','kilty','kimbo','kinah','kinas','kinch','kinda','kinds','kindy',
    'kines','kings','kinin','kinks','kinos','kioea','kiore','kipes','kippa','kipps','kippy','kirby','kirks','kirns','kirri',
    'kirve','kisan','kishy','kisra','kissy','kists','kiswa','kitab','kitar','kited','kiter','kites','kithe','kiths','kitul',
    'kivas','kiver','kiwis','kiyas','klang','klaps','klett','klick','klieg','kliks','klong','kloof','klops','klosh','kluge',
    'klutz','knags','knape','knaps','knark','knarl','knars','knaur','knawe','knees','knell','knezi','kniaz','knick','knish',
    'knits','knive','knobs','knops','knosp','knots','knout','knowe','knows','knubs','knurl','knurr','knurs','knuts','knyaz',
    'koali','koans','koaps','koban','kobos','kodak','kodro','koels','koffs','kofta','kogal','kohas','kohen','kohls','kohua',
    'koila','koine','kojis','kokam','kokan','kokas','koker','kokil','kokio','kokra','kokum','kolas','kolea','kolos','kombu',
    'konak','konbu','kondo','kongu','konks','kooka','kooks','kooky','koori','kopek','kophs','kopje','koppa','korai','koras',
    'korat','korec','kores','korin','korma','koros','korun','korus','koses','kosin','kotal','kotch','kotos','kotow','koura',
    'kouza','kovil','koyan','kraal','krabs','kraft','krais','krait','krama','krang','krans','kranz','kraut','krays','kreep',
    'kreis','krems','kreng','krewe','krina','krome','krona','krone','kroon','krosa','krubi','krunk','ksars','kubba','kubie',
    'kudos','kudus','kudzu','kufis','kugel','kuias','kukri','kukui','kukus','kulah','kulak','kulan','kulas','kulfi','kumbi',
    'kumis','kumys','kunai','kuris','kurre','kurta','kurus','kusam','kusha','kusso','kusti','kusum','kutas','kutch','kutis',
    'kutus','kuzus','kvass','kvell','kvint','kwela','kyack','kyaks','kyang','kyars','kyats','kybos','kydst','kyles','kylie',
    'kylin','kylix','kyloe','kynde','kynds','kypes','kyrie','kytes','kythe','laang','laari','labba','labda','labia','labis',
    'labra','lacca','laced','lacer','laces','lacet','lacey','lache','lacis','lacks','lacto','laddy','laded','lader','lades',
    'laers','laeti','laevo','lagan','lagen','lagna','lahal','lahar','laich','laics','laids','laigh','laika','laiks','laine',
    'laird','lairs','lairy','laith','laity','laked','laker','lakes','lakhs','lakie','lakin','laksa','laldy','lalls','lamas',
    'lamba','lambs','lamby','lamed','lamel','lamer','lames','lamia','lamin','lammy','lamps','lanai','lanas','lanaz','lanch',
    'lande','lands','lanes','laney','langi','lanks','lants','lanum','lapin','lapis','lapje','lapon','lapsi','larch','lards',
    'lardy','laree','lares','largo','larid','larin','laris','larks','larky','larns','larnt','larry','larum','larve','lased',
    'laser','lases','lassi','lassu','lassy','lasts','lasty','latah','lated','laten','latex','lathi','laths','lathy','latke',
    'latro','latus','lauan','lauch','lauds','laufs','lauia','laund','laura','laval','lavas','laved','laver','laves','lavic',
    'lavra','lavvy','lawed','lawer','lawin','lawks','lawns','lawny','lawzy','laxed','laxer','laxes','laxly','layed','layin',
    'layne','layup','lazar','lazed','lazes','lazos','lazzi','lazzo','leads','leady','leafs','leaks','leams','leans','leany',
    'leaps','leare','lears','leary','leath','leats','leavy','leaze','leban','leben','leccy','leden','ledes','ledgy','ledol',
    'ledum','leear','leeks','leeky','leeps','leers','leese','leets','leeze','lefte','lefts','leger','leges','legge','leggo',
    'legit','legoa','legua','lehrs','lehua','leirs','leish','lekha','leman','lemed','lemel','lemes','lemma','lemme','lenad',
    'lench','lends','lenes','lengs','lenis','lenos','lense','lenth','lenti','lento','leone','lepid','lepra','lepta','lered',
    'leres','lerot','lerps','lesbo','leses','lesiy','lessn','lests','letch','lethe','letup','leuch','leuco','leuds','leugh',
    'leuma','levas','levee','leves','levin','levir','levis','lewis','lewth','lexes','lexia','lexis','lezes','lezza','lezzy',
    'liana','liane','liang','liard','liars','liart','liber','libra','libri','licca','lichi','licht','licit','licks','lidar',
    'lidos','liefs','liens','liers','liesh','lieue','lieus','lieve','lifer','lifes','lifey','lifts','ligan','ligas','liger',
    'ligge','ligne','liked','liker','likes','likin','lills','lilos','lilts','liman','limas','limax','limba','limbi','limbs',
    'limby','limed','limen','limer','limes','limey','limma','limmu','limns','limos','limpa','limps','limpy','limsy','linac',
    'linch','lindo','linds','lindy','linea','lined','lines','liney','linga','linge','lings','lingy','linha','linie','linin',
    'linja','linje','links','linky','linns','linny','linon','linos','lints','linty','linum','linux','lions','lipas','lipes',
    'lipin','lipos','lippy','liras','lirks','lirot','lisks','lisle','lisps','lists','litai','litas','litch','lited','liter',
    'lites','lithi','litho','liths','lithy','litra','litre','litus','lived','liven','lives','livor','livre','liwan','llano',
    'loach','loads','loafs','loams','loans','loast','loave','lobal','lobar','lobed','lobes','lobos','lobus','loche','lochs',
    'lochy','locie','locis','locks','locky','locos','locum','loden','lodes','loess','lofts','logan','loges','loggy','logia',
    'logie','logoi','logon','logos','lohan','loids','loins','loipe','loirs','lokao','lokes','loket','lolls','lolly','lolog',
    'lomas','lomed','lomes','loner','longa','longe','longs','looby','looed','looey','loofa','loofs','looie','looks','looky',
    'looms','loons','loony','loops','loord','loots','loped','loper','lopes','loppy','loral','loran','lords','lordy','lored',
    'lorel','lores','loric','loris','lorum','losed','losel','losen','loses','lossy','lotah','lotas','lotes','lotic','lotos',
    'lotsa','lotta','lotte','lotto','lotus','louch','loued','louey','lough','louie','louis','loulu','louma','lound','louns',
    'loupe','loups','loure','lours','loury','louts','louty','lovat','loved','loves','lovey','lovie','lowan','lowed','lowes',
    'lownd','lowne','lowns','lowps','lowry','lowse','lowth','lowts','loxed','loxes','loxia','loxic','lozen','luach','luaus',
    'lubed','lubes','lubra','luces','lucet','lucks','lucre','ludes','ludic','ludos','luffa','luffs','luged','luger','luges',
    'lulab','lulls','lulus','lumas','lumbi','lumme','lummy','lumps','lunas','lunes','lunet','lungi','lungs','lungy','lunks',
    'lunts','lupin','lupis','lural','lured','lurer','lures','lurex','lurgi','lurgy','lurks','lurky','lurry','lurve','luser',
    'lushy','lusks','lusky','lusts','lusus','lutea','luted','luteo','luter','lutes','luvvy','luxed','luxer','luxes','luxus',
    'lweis','lyams','lyard','lyart','lyase','lycea','lycee','lycid','lycra','lyery','lymes','lynes','lyres','lysed','lyses',
    'lysin','lysis','lysol','lyssa','lyted','lytes','lythe','lytic','lytta','maaed','maare','maars','mabes','macan','macao',
    'macas','macco','maced','macer','maces','mache','machi','machs','macks','macle','macon','madge','madid','madre','maerl',
    'mafic','mafoo','magas','mages','maggs','magot','magus','mahar','mahoe','mahua','mahwa','maids','maidy','maiid','maiko',
    'maiks','maile','maill','mails','maims','mains','maint','maire','mairs','maise','maist','makar','makes','makis','makos',
    'makuk','malam','malar','malas','malax','maleo','males','malic','malik','malis','malls','malms','malmy','malts','malty',
    'malus','malva','malwa','mamas','mamba','mamee','mamey','mamie','manal','manas','manat','mandi','maneb','maned','maneh',
    'manei','manes','manet','maney','mangi','mangs','manid','manis','maniu','manky','manna','manny','manoc','manos','manse',
    'manso','manta','manto','manty','manul','manus','mapau','mappy','maqui','marae','marah','maral','maras','marco','marcs',
    'mardy','mares','marge','margs','maria','marid','maris','marka','marks','marle','marli','marls','marly','marms','marok',
    'maron','maror','marra','marri','marse','marts','marvy','masas','mased','maser','mases','masha','mashy','masks','massa',
    'massy','masts','masty','masus','matai','matax','mated','mater','mates','maths','matin','matka','matlo','matra','matsu',
    'matta','matte','matti','matts','matza','matzo','mauby','mauds','maugh','mauls','maund','mauri','mausy','mauts','mauzy',
    'maven','mavie','mavin','mavis','mawed','mawks','mawky','mawns','mawrs','maxed','maxes','maxis','mayan','mayas','mayed',
    'maynt','mayos','mayst','mazed','mazer','mazes','mazey','mazic','mazut','mbira','mbori','meads','meals','meane','means',
    'meany','meare','mease','meath','meats','mebos','mechs','mecks','mecon','medii','medio','medle','meece','meeds','meers',
    'meese','meets','meffs','meile','meins','meint','meiny','meith','mekka','melam','melas','melba','melch','melds','melic',
    'melik','mells','meloe','melos','melts','melty','memes','memos','menad','mends','mened','menes','menge','mengs','mensa',
    'mense','mensh','mensk','menta','mento','menus','meous','meows','merch','mercs','merde','mered','merel','merer','meres',
    'mergh','meril','meris','merks','merle','merls','merop','meros','merse','mesad','mesal','mesas','mesel','mesem','meses',
    'meshy','mesic','mesne','meson','messe','messy','mesto','metad','meted','metel','metes','metho','meths','metic','metif',
    'metis','metol','metra','metre','metze','meuse','meute','meved','meves','mewed','mewer','mewls','meynt','mezes','mezze',
    'mezzo','mhorr','miaou','miaow','miasm','miaul','micas','miche','micht','micks','micky','micos','micra','middy','midgy',
    'midis','miens','mieve','miffs','miffy','mifty','miggs','mihas','mihis','miked','mikes','mikie','mikra','mikva','milch',
    'milds','miler','miles','milfs','milha','milia','milko','milks','milla','mille','mills','milor','milos','milpa','milts',
    'milty','miltz','mimed','mimeo','mimer','mimes','mimly','mimsy','minae','minar','minas','mincy','minds','mined','mines',
    'minge','mings','mingy','minis','minke','minks','minny','minos','minot','mints','miqra','mired','mires','mirex','mirid',
    'mirin','mirks','mirky','mirly','miros','mirvs','mirza','misch','misdo','mises','misgo','misky','misos','missa','mists',
    'misty','mitch','miter','mites','mitis','mitra','mitre','mitts','mitty','mixed','mixen','mixer','mixes','mixte','mixup',
    'mizen','mizzy','mneme','moans','moats','mobby','mobed','mobes','mobey','mobie','moble','mochi','mochs','mochy','mocks',
    'moder','modes','modge','modii','modus','moers','mofos','moggy','mohar','mohel','mohos','mohrs','mohua','mohur','moile',
    'moils','moira','moire','moise','moits','moity','mojos','mokes','mokis','mokos','mokum','molal','molas','molds','moled',
    'moler','moles','molka','molla','molle','molls','molly','molpe','molto','molts','molys','momes','momma','momme','mommy',
    'momus','monad','monal','monas','monde','mondo','monel','moner','mongo','mongs','monic','monie','monks','monny','monos',
    'monte','monty','moobs','mooch','moods','mooed','mooks','moola','mooli','mools','mooly','moong','moons','moony','moops',
    'moorn','moors','moory','moosa','moost','mooth','moots','moove','moped','moper','mopes','mopey','mopla','moppy','mopsy',
    'mopus','morae','moras','morat','moray','morel','mores','morga','moria','moric','morin','mormo','morne','morns','moroc',
    'morra','morro','morse','morth','morts','mosed','moses','mosey','mosks','mosso','moste','mosts','moted','moten','moter',
    'motes','motet','motey','moths','mothy','motis','motte','motts','motty','motus','motza','mouch','moudy','moues','mould',
    'moule','mouls','mouly','moups','moust','mousy','moved','moves','mowas','mowch','mowed','mowha','mowie','mowra','mowse',
    'mowth','moxas','moxie','moyas','moyen','moyle','moyls','mozed','mozes','mozos','mpret','muang','mucho','mucic','mucid',
    'mucin','mucks','mucor','mucro','mudar','mudde','mudee','mudge','mudir','mudra','muffs','muffy','mufti','mufty','mugga',
    'muggs','muggy','muhly','muids','muils','muirs','muist','mujik','mukti','mulct','muled','mules','muley','mulga','mulie',
    'mulla','mulls','mulse','mulsh','mumms','mumps','mumsy','mumus','munga','munge','mungo','mungs','mungy','munis','munts',
    'muntu','muons','muras','mured','mures','murex','murga','murid','murks','murls','murly','murra','murre','murri','murrs',
    'murry','murti','murva','murza','musal','musar','musca','mused','muser','muses','muset','musha','musie','musit','musks',
    'musos','musse','mussy','musth','musts','mutch','muted','muter','mutes','mutha','mutic','mutis','muton','mutts','muxed',
    'muxes','muzak','muzzy','mvule','myall','mylar','mynah','mynas','myoid','myoma','myope','myops','myopy','myron','mysel',
    'mysid','mythi','myths','mythy','myxos','mzees','naams','naans','nabak','nabes','nabis','nabks','nabla','nable','nabob',
    'nache','nacho','nacre','nacry','nadas','naeve','naevi','naffs','nagas','naggy','naght','nagor','nahal','naiad','naifs',
    'naiks','nails','naily','naira','nairu','nairy','naish','naked','naker','nakfa','nakoo','nalas','naled','nalla','namaz',
    'namda','named','namer','names','namma','namus','nanas','nance','nancy','nandi','nandu','nanes','nanga','nanna','nanos',
    'nanua','napal','napas','naped','napes','napoo','nappa','nappe','nappy','naras','narco','narcs','nards','nares','naric',
    'naris','narks','narky','narra','narre','nasab','nasch','nashi','nasus','natch','nates','nathe','natis','natty','nauch',
    'naumk','naunt','navar','naves','navet','navew','navvy','nawab','nazes','nazim','nazir','nazis','nduja','neafe','neals',
    'neaps','nears','neath','neats','nebby','nebek','nebel','necks','neddy','needs','neeld','neele','neemb','neems','neeps',
    'neese','neeze','neffy','neger','negro','negus','neifs','neist','neive','nelis','nelly','nemas','nemns','nempt','nenes',
    'nenta','neons','neoza','neper','nepit','neral','nerds','nerka','nerks','nerol','nerts','nertz','nervy','nests','nesty',
    'neter','netes','netop','netts','netty','neuks','neuma','neume','neums','nevel','neves','nevoy','nevus','newbs','newed',
    'newel','newie','newsy','newts','nexal','nexts','nexum','nexus','ngaio','ngana','ngapi','ngati','ngoma','ngwee','niata',
    'nibby','nicad','nicht','nicks','nicky','nicol','nidal','nided','nides','nidge','nidor','nidus','niefs','niepa','nieve',
    'nifes','niffs','niffy','nific','nifle','nifty','niger','nighs','nigre','nigua','nihil','nikab','nikah','nikau','nills',
    'nimbi','nimbs','nimps','niner','nines','ninon','nintu','ninut','niota','nipas','nippy','niqab','nirls','nirly','nisei',
    'nisse','nisus','nitch','niter','nites','nitid','niton','nitre','nitro','nitry','nitty','nival','nixed','nixer','nixes',
    'nixie','nizam','njave','nkosi','noahs','nobby','nocks','nodal','noddy','noded','nodes','nodus','noels','nogal','noggs',
    'nohow','noils','noily','noint','noirs','nokta','noles','nolle','nolls','nolos','nomas','nomen','nomes','nomic','nomoi',
    'nomos','nonas','nonce','nonda','nondo','nones','nonet','nongs','nonic','nonis','nonly','nonny','nonya','nonyl','noobs',
    'nooit','nooks','nooky','noons','noops','nopal','noria','norie','noris','norks','norma','norms','nosed','noser','noses',
    'notal','notan','noted','noter','notes','notum','nould','noule','nouls','nouns','nouny','noups','novae','novas','novem',
    'novum','noway','nowed','nowel','nowls','nowts','nowty','noxal','noxes','noyau','noyed','noyes','nubby','nubia','nucal',
    'nucha','nucin','nuddy','nuder','nudes','nudie','nudzh','nuffs','nugae','nuked','nukes','nulla','nullo','nulls','numbs',
    'numda','numen','nummi','nummy','numud','nunch','nunky','nunni','nunny','nuque','nurds','nurdy','nurls','nurly','nurrs',
    'nursy','nutso','nutsy','nyaff','nyala','nying','nymil','nyssa','nyxis','oadal','oaked','oaker','oakum','oared','oaric',
    'oasal','oases','oasis','oasts','oaten','oater','oaths','oaves','obang','obeah','obeli','obeys','obias','obied','obiit',
    'obits','objet','obley','oboes','obole','oboli','obols','occam','ocher','oches','ochre','ochro','ochry','ocker','ocote',
    'ocque','ocrea','octad','octan','octas','octic','octyl','ocuby','oculi','odahs','odals','odeon','odeum','odism','odist',
    'odium','odoom','odors','odour','odyle','odyls','oecus','oenin','ofays','offed','offie','oflag','ofter','oftly','ogams',
    'ogeed','ogees','oggin','ogham','ogive','ogled','ogler','ogles','ogmic','ogres','ohelo','ohias','ohing','ohmic','ohone',
    'oidia','oiled','oiler','oinks','oints','oisin','ojime','okapi','okays','okehs','okras','okrug','oktas','oldie','oleic',
    'olein','olena','olent','oleos','oleum','olios','oliva','ollas','ollav','oller','ollie','ology','olona','olpae','olpes',
    'omasa','omber','ombus','omens','omers','omina','omits','omlah','omovs','omrah','oncer','onces','oncet','oncia','oncin',
    'oncus','onely','oners','onery','onium','onkos','onkus','onlay','onned','ontal','ontic','onymy','oobit','oohed','oolak',
    'oolly','oomph','oonts','oopak','ooped','oopod','oorie','ooses','ootid','oozed','oozes','opahs','opals','opens','opepe',
    'ophic','oping','oppos','opsin','opted','opter','orach','oracy','orage','orals','orang','orant','orary','orate','orbed',
    'orbic','orcas','orcin','ordos','oread','orfes','orgia','orgic','orgue','oribi','oriel','orixa','orles','orlet','orlon',
    'orlop','ormer','ornis','orpin','orris','orsel','ortet','ortho','orval','orzos','oscar','oscin','osela','oshac','oside',
    'osier','osmic','osmin','osmol','osone','ossal','ossia','ostia','otaku','otary','otate','otkon','ottar','ottos','ouabe',
    'oubit','oucht','ouens','ouija','oukia','oulap','oulks','oumas','ounds','oundy','oupas','ouped','ouphe','ouphs','ourie',
    'ousel','ousts','outby','outed','outen','outly','outre','outro','outta','ouzel','ouzos','ovals','ovant','ovels','ovens',
    'overs','ovest','ovile','ovism','ovist','ovoli','ovolo','ovule','owche','owght','owies','owled','owler','owlet','owned',
    'owres','owrie','owsen','owser','oxane','oxbow','oxboy','oxers','oxeye','oxfly','oxids','oxies','oxime','oxims','oxlip',
    'oxman','oxter','oyers','ozeki','ozena','ozzie','paals','paans','paauw','pablo','pacas','pacay','paced','pacer','paces',
    'pacey','pacha','packs','pacos','pacta','pacts','padge','padis','padle','padma','padre','padri','paean','paedo','paeon',
    'paged','pager','pages','pagle','pagod','pagri','pagus','pahmi','paiks','pails','pains','paire','pairs','paisa','paise',
    'pakka','palar','palas','palay','palch','palea','paled','pales','palet','palis','palki','palla','palli','palls','pally',
    'palma','palmo','palms','palmy','palpi','palps','palsa','palus','pampa','panax','pance','panda','pands','pandy','paned',
    'panes','panga','pangi','pangs','panim','panko','panne','panni','panse','panto','pants','panty','paoli','paolo','papas',
    'papaw','papes','papey','pappi','pappy','papyr','parae','parah','param','parao','paras','parch','pardi','pardo','pards',
    'pardy','pared','parel','paren','pareo','pares','pareu','parev','parge','pargo','paris','parki','parks','parky','parle',
    'parly','parma','parol','parps','parra','parrs','parti','parto','parts','parve','parvo','pasan','paseo','pases','pasha',
    'pashm','paska','pasmo','paspy','passe','passo','pasts','pasul','patao','patas','pated','patel','paten','pater','pates',
    'paths','pathy','patin','patka','patly','patta','patte','pattu','patus','pauas','pauls','pauxi','pavan','paved','paven',
    'paver','paves','pavid','pavin','pavis','pawas','pawaw','pawed','pawer','pawks','pawky','pawls','pawns','paxes','payed',
    'payor','paysd','peage','peags','peaks','peaky','peals','peans','peare','pears','peart','pease','peasy','peats','peaty',
    'peavy','peaze','pebas','pechs','pecht','pecke','pecks','pecky','pedee','pedes','pedis','pedro','pedum','peece','peeks',
    'peele','peels','peens','peeoy','peepe','peeps','peepy','peers','peery','peeve','peggy','peghs','peine','peins','peise',
    'peize','pekan','pekes','pekin','pekoe','pelas','pelau','peles','pelfs','pells','pelma','pelon','pelta','pelts','penda',
    'pends','pendu','pened','penes','pengo','penie','penis','penks','penna','penni','pensy','penta','pents','peons','peony',
    'pepla','pepos','peppy','pepsi','perai','perce','percs','perdu','perdy','perea','peres','peris','perit','perks','perle',
    'perms','perns','perog','perps','perry','perse','perst','perts','perty','perve','pervo','pervs','pervy','pesos','peste',
    'pests','pesty','petar','peter','petit','petre','petri','petti','petto','peuhl','pewee','pewit','peyse','pfund','phage',
    'phang','phano','phare','pharm','phasm','pheal','pheer','phene','pheon','phese','phial','phish','phizz','phlox','phoby',
    'phoca','phono','phons','phose','phots','phpht','phuts','phyla','phyle','phyma','piaba','piani','pians','pibal','pical',
    'picas','piccy','pichi','picks','picot','picra','picul','pidan','piend','piers','piert','pieta','piets','piezo','pight',
    'pigly','pigmy','piing','pikas','pikau','piked','pikel','piker','pikes','pikey','pikis','pikle','pikul','pilae','pilaf',
    'pilao','pilar','pilau','pilaw','pilch','pilea','piled','pilei','piler','piles','pilin','pilis','pills','pilmy','pilon',
    'pilow','pilum','pilus','pimas','pimps','pinas','pinax','pinda','pindy','pined','piner','pines','pingo','pings','pinic',
    'pinko','pinks','pinna','pinny','pinon','pinot','pinta','pinte','pints','pinup','pinyl','pions','piony','pious','pioye',
    'pioys','pipal','pipas','piped','pipes','pipet','pipis','pipit','pippy','pipul','pirai','pirls','pirns','pirny','pirog',
    'pirol','pisay','pisco','pises','pishu','pisky','pisos','pissy','piste','pitas','pitau','piths','piton','pitot','pitta',
    'piums','piuri','pixes','pized','pizes','plaas','plack','plaga','plage','plang','plans','plaps','plash','plasm','plass',
    'plast','plats','platt','platy','plaud','playa','plays','pleas','plebe','plebs','pleck','plena','pleny','pleon','plesh',
    'plews','plica','plies','plims','pling','plink','ploat','ploce','plock','plods','plomb','plong','plonk','plook','plops',
    'plote','plots','plotz','plouk','plout','plows','ploye','ploys','plues','pluff','plugs','pluma','plums','plumy','pluot',
    'pluto','plyer','poach','poaka','poake','pobby','poboy','poche','pocks','pocky','podal','poddy','podex','podge','podgy',
    'podia','poems','poeps','poets','pogey','pogge','poggy','pogos','pohed','pohna','poilu','poind','pokal','poked','pokes',
    'pokey','pokie','poled','poler','poles','poley','polio','polis','polje','polks','polls','polly','polos','polts','polys',
    'pombe','pombo','pomes','pomey','pomme','pommy','pomos','pompa','pomps','ponce','poncy','ponds','pondy','pones','poney',
    'ponga','pongo','pongs','pongy','ponja','ponks','ponto','ponts','ponty','ponzu','poods','pooed','poofs','poofy','poohs',
    'pooja','pooka','pooks','pooli','pools','pooly','poons','poops','poopy','poori','poort','poots','poove','poovy','popal',
    'popes','poppa','popsy','porae','poral','pored','porer','pores','porge','porgy','porin','porks','porky','porno','porns',
    'porny','poros','porry','porta','porto','ports','porty','porus','posca','posed','poses','posey','posho','posts','potae',
    'potch','poted','poter','potes','potin','potoo','potsy','potto','potts','potty','pouce','pouff','poufs','pouke','pouks',
    'poule','poulp','poult','poupe','poupt','pours','pouts','powan','powin','pownd','powns','powny','powre','poxed','poxes',
    'poynt','poyou','poyse','pozzy','praam','prads','prahu','prams','prana','prang','praos','prase','prate','prats','pratt',
    'praty','praus','praya','prays','predy','preed','prees','preif','prems','premy','prent','preon','preop','preps','presa',
    'prese','prest','preve','prexy','preys','prial','prich','pricy','pridy','prief','prier','pries','prigs','prill','prima',
    'primi','primp','prims','primy','prine','prink','prion','prise','priss','prius','proal','proas','probs','prods','proem',
    'profs','progs','proin','proke','prole','proll','promo','proms','pronk','props','prore','proso','pross','prost','prosy',
    'prote','proto','proul','prows','proyn','prunt','pruta','pryer','pryse','pseud','pshaw','psion','psoae','psoai','psoas',
    'psora','psych','psyop','pubal','pubco','pubes','pubis','pucan','pucer','puces','pucka','pucks','puddy','pudge','pudic',
    'pudor','pudsy','pudus','puers','puffa','puffs','puggi','puggy','pugil','puhas','puist','pujah','pujas','pukas','puked',
    'puker','pukes','pukey','pukka','pukus','pulao','pulas','puled','puler','pules','pulik','pulis','pulka','pulks','pulli',
    'pulls','pully','pulmo','pulps','pulus','pumas','pumie','pumps','punas','punce','punct','punga','pungi','pungs','punji',
    'punka','punks','punky','punny','punta','punti','punto','punts','punty','pupae','pupas','pupus','purda','purdy','pured',
    'pures','purga','purin','puris','purls','purpy','purre','purrs','purry','pursy','purty','puses','pusle','pussy','putid',
    'puton','putti','putto','putts','puzel','pwned','pyats','pyche','pyets','pygal','pyins','pylar','pylic','pylon','pyned',
    'pynes','pyoid','pyots','pyral','pyran','pyres','pyrex','pyric','pyros','pyxed','pyxes','pyxie','pyxis','pzazz','qadis',
    'qaids','qajaq','qanat','qapik','qibla','qophs','qorma','quads','quaff','quags','quair','quais','quaky','quale','quant',
    'quare','quarl','quass','quata','quate','quats','quauk','quave','quawk','quayd','quays','qubba','qubit','queak','queal',
    'quean','queet','quegh','queme','quena','querl','quern','queyn','queys','quica','quich','quids','quiff','quila','quims',
    'quina','quine','quink','quino','quins','quint','quipo','quips','quipu','quira','quire','quirl','quirt','quist','quits',
    'quoad','quods','quoif','quoin','quoit','quoll','quonk','quops','qursh','quyte','raash','rabat','rabic','rabis','raced',
    'races','rache','racks','racon','radge','radix','radon','raffe','raffs','rafts','rafty','ragas','ragde','raged','ragee',
    'rager','rages','ragga','raggs','raggy','ragis','ragus','rahed','rahui','raias','raids','raiks','raile','rails','raine',
    'rains','raird','raita','raits','rajas','rajes','rakan','raked','rakee','raker','rakes','rakia','rakis','rakit','rakus',
    'rales','ramal','ramed','ramee','ramet','ramex','ramie','ramin','ramis','rammy','ramps','ramus','ranal','ranas','rance',
    'rands','ranee','ranga','rangi','rangs','rangy','ranid','ranis','ranke','ranks','ranny','rants','ranty','raped','raper',
    'rapes','raphe','rapic','rappe','rared','raree','rares','rarks','rased','rasen','raser','rases','rasps','rasse','rasta',
    'ratal','ratan','ratas','ratch','rated','ratel','rater','rates','ratha','rathe','raths','ratoo','ratos','ratti','ratus',
    'ratwa','rauli','rauns','raupo','raved','ravel','raver','raves','ravey','ravin','rawer','rawin','rawly','rawns','raxed',
    'raxes','rayah','rayas','rayed','rayle','rayne','razed','razee','razer','razes','razoo','reaal','readd','reads','reais',
    'reaks','realo','reals','reame','reams','reamy','reans','reaps','rears','reask','reast','reasy','reata','reate','reave',
    'rebab','rebag','reban','rebbe','rebec','rebed','rebeg','rebia','rebid','rebit','rebob','rebop','rebox','rebud','rebuy',
    'recal','recce','recco','reccy','recit','recks','recon','recta','recti','recto','redan','redds','reddy','reded','redes',
    'redia','redid','redig','redip','redly','redon','redos','redox','redry','redub','redue','redux','redye','reech','reede',
    'reeds','reefs','reefy','reeks','reeky','reels','reens','reese','reesk','reest','reeve','refan','refed','refel','reffo',
    'refis','refix','refly','refry','regar','reges','reget','reggo','regia','regie','regin','regle','regma','regna','regos',
    'regur','rehem','rehoe','reifs','reify','reiki','reiks','reina','reink','reins','reird','reist','reive','rejig','rejon',
    'reked','rekes','rekey','relap','relet','relie','relit','rello','relot','reman','remap','remen','remet','remex','remix',
    'remop','renay','rends','reneg','renes','renet','reney','renga','renig','renin','renky','renne','renos','rente','rents',
    'reoil','reorg','reown','repeg','repen','repew','repic','repin','repla','repos','repot','repps','repro','reran','reree',
    'rerig','rerob','rerow','rerub','resat','resaw','resay','resee','reses','resew','resex','resid','resit','resod','resow',
    'resto','rests','resty','resue','resun','resup','resus','retag','retan','retax','retem','rethe','retia','retie','retin',
    'retip','retox','reune','rever','revet','revie','rewan','rewax','rewed','rewet','rewin','rewon','rewth','rexen','rexes',
    'rezes','rhamn','rheas','rheen','rheic','rhein','rhema','rheme','rheum','rhies','rhime','rhine','rhody','rhomb','rhone',
    'rhumb','rhymy','rhyne','rhyta','riads','rials','riant','riata','ribas','ribat','ribby','ribes','riced','ricer','rices',
    'ricey','richt','ricin','ricks','riden','rides','ridgy','ridic','riels','riems','rieve','rifer','riffs','rifte','rifts',
    'rifty','riggs','rigol','riled','riles','riley','rille','rills','rilly','rimae','rimal','rimed','rimer','rimes','rimpi',
    'rimus','rinch','rinds','rindy','rines','ringe','rings','ringy','rinka','rinks','rioja','riots','ripal','riped','ripes',
    'ripps','ripup','rises','rishi','risks','risps','risus','rites','ritts','ritzy','rivas','rived','rivel','riven','rives',
    'riyal','rizas','roads','roams','roans','roars','roary','roate','robed','rober','robes','roble','robur','rocks','rocta',
    'roded','rodes','rodge','rogan','roguy','rohan','rohes','rohob','rohun','roids','roils','roily','roins','roist','rojak',
    'rojis','roked','rokee','roker','rokes','rokey','rolag','roleo','roles','rolfs','rolls','romal','roman','romeo','romps',
    'rompu','rompy','ronco','ronde','rondo','roneo','rones','ronin','ronne','ronte','ronts','roods','roofs','roofy','rooks',
    'rooky','rooms','roons','roops','roopy','roosa','roose','roots','rooty','roove','roped','roper','ropes','ropey','roque',
    'roral','rores','roric','rorid','rorie','rorts','rorty','rosal','rosed','rosel','roses','roset','roshi','rosin','rosit',
    'rosti','rosts','rotal','rotan','rotas','rotch','roted','roter','rotes','rotge','rotis','rotls','roton','rotos','rotte',
    'rouen','roues','rougy','rouky','roule','rouls','roums','roups','roupy','roust','routh','routs','roved','roven','roves',
    'rovet','rowan','rowed','rowel','rowen','rowet','rowie','rowme','rownd','rowth','rowts','rowty','royet','royne','royst',
    'rozet','rozit','rozum','ruach','ruana','rubai','rubby','rubel','rubes','rubin','ruble','rubli','rubor','rubus','ruche',
    'rucks','rucky','rudas','rudds','rudes','rudge','rudie','rudis','rueda','ruers','ruffe','ruffs','rufus','rugae','rugal',
    'ruggy','ruing','ruins','rukhs','ruled','rules','rumal','rumbo','rumen','rumes','rumly','rummy','rumpo','rumps','rumpy',
    'runby','runch','runds','runed','runer','runes','rungs','runic','runny','runts','runty','rupia','rupie','rurps','rurus',
    'rusas','ruses','rushy','rusks','rusky','rusma','rusot','russe','rusts','rutch','ruths','rutic','rutin','rutty','rutyl',
    'ruvid','ryals','rybat','ryder','ryked','rykes','rymme','rynds','ryots','ryper','saags','sabal','sabed','saber','sabes',
    'sabha','sabin','sabir','sable','sably','sabot','sabra','sabre','sabzi','sacks','sacra','sacro','saddo','sades','sadhe',
    'sadhu','sadic','sadis','sados','sadza','safed','safen','safes','sagas','sager','sages','saggy','sagos','sagum','saheb',
    'sahib','sahme','saice','saick','saics','saids','saiga','sails','saily','saims','saimy','saine','sains','sairs','sairy',
    'saist','saith','sajou','sakai','saker','sakes','sakia','sakis','sakti','salal','salar','salat','salay','salep','sales',
    'salet','salic','salix','salle','salma','salmi','salol','salop','salpa','salps','salse','salta','salto','salts','salue',
    'salut','salvy','samaj','saman','samas','samba','sambo','samek','samel','samen','sames','samey','samfu','sammy','sampi',
    'samps','sanai','sanct','sands','saned','sanes','sanga','sangh','sango','sangs','sanko','sansa','sansi','santo','sants',
    'saola','sapan','sapek','sapid','sapin','saple','sapor','saraf','saran','sards','sared','saree','sarge','sargo','sarif',
    'sarin','sarip','saris','sarks','sarky','sarna','sarod','saron','saros','sarpo','sarra','sarsa','sarus','sasan','saser',
    'sasin','sasse','satai','satan','satay','sated','satem','sates','satis','sauba','sauch','saugh','sauld','sauls','sault',
    'saunt','saury','sauts','sauty','sauve','saved','saver','saves','savey','savin','sawah','sawed','sawer','saxes','sayed',
    'sayer','sayid','sayne','sayon','sayst','sazen','sazes','scabs','scads','scaff','scags','scail','scala','scall','scalt',
    'scams','scand','scans','scapa','scape','scapi','scarn','scarp','scars','scart','scase','scath','scats','scatt','scaud',
    'scaul','scaum','scaup','scaur','scaut','scawd','scawl','scaws','sceat','scena','scend','schav','schmo','schuh','schul',
    'schwa','scind','sclaw','scler','sclim','scoad','scobs','scody','scogs','scoke','scolb','scoog','scoon','scoot','scopa',
    'scops','scote','scots','scoug','scouk','scoup','scove','scovy','scowp','scows','scrab','scrae','scrag','scran','scrat',
    'scraw','scray','scrim','scrin','scrip','scrob','scrod','scrog','scroo','scrow','scruf','scudi','scudo','scuds','scuff',
    'scuft','scugs','sculk','scull','sculp','sculs','scums','scups','scurf','scurs','scuse','scuta','scute','scuts','scuzz',
    'scyes','sdayn','sdein','seals','seame','seams','seamy','seans','seare','sears','seary','sease','seats','seave','seavy',
    'seaze','sebum','secco','sechs','secos','secre','sects','seder','sedes','sedge','sedgy','sedum','seech','seeds','seege',
    'seeks','seeld','seels','seely','seems','seeps','seepy','seers','sefer','segar','segni','segno','segol','segos','sehri',
    'seifs','seils','seine','seirs','seise','seism','seity','seiza','sekos','sekts','selah','seles','selfs','sella','selle',
    'sells','selly','selva','semee','semes','semic','semie','semis','senam','senas','sence','sends','senes','sengi','senna',
    'senor','sensa','sensi','senso','sente','senti','sents','senvy','senza','sepad','sepal','sepic','sepoy','septa','septs',
    'sequa','serab','serac','serai','seral','serau','seraw','sered','sereh','serer','seres','serfs','serge','seric','serin',
    'serio','serks','sermo','seron','serow','serra','serre','serrs','serry','serta','serut','servo','sesey','sesma','sessa',
    'sesti','setae','setal','seton','setts','seugh','sewan','sewar','sewed','sewel','sewen','sewin','sexed','sexer','sexes',
    'sexly','sexto','sexts','seyen','sfoot','shads','shags','shahi','shahs','shako','shakt','shaku','shalm','shaly','shama',
    'shams','shand','shans','shant','shaps','shapy','sharn','shash','shaul','shaup','shawm','shawn','shaws','shawy','shaya',
    'shays','shchi','sheaf','sheal','sheas','sheat','sheds','sheel','shela','sheld','shend','sheng','shent','sheol','sherd',
    'shere','shero','sheth','shets','sheva','shewa','shewn','shews','shiai','shice','shide','shiel','shier','shies','shiko',
    'shilf','shill','shily','shims','shins','ships','shirl','shirr','shirs','shish','shisn','shiso','shist','shita','shite',
    'shits','shiur','shiva','shive','shivs','shivy','shlep','shlub','shmek','shmoe','shoad','shoat','shode','shoed','shoer',
    'shoes','shogi','shogs','shoji','shojo','shola','shole','shood','shooi','shool','shoon','shoop','shoor','shoos','shope',
    'shops','shorl','shote','shots','shott','showd','shows','shoya','shoyu','shrab','shraf','shrag','shram','shrap','shred',
    'shree','shrip','shris','shrog','shrow','shtik','shtum','shtup','shuba','shuff','shule','shuln','shuls','shune','shuns',
    'shura','shure','shurf','shute','shuts','shwas','shyer','sials','sibbs','sibby','sibyl','sicca','sices','sicht','sicko',
    'sicks','sicky','sidas','sided','sider','sides','sidha','sidhe','sidle','sidth','sield','siens','sient','sieth','sieur',
    'sievy','sifac','sifts','sighs','sigil','sigla','signa','signs','sijos','sikar','sikas','siker','sikes','siket','silds',
    'siled','silen','siler','siles','silex','silks','sills','silos','silts','silty','silva','silyl','simal','simar','simas',
    'simba','simis','simps','simul','sinal','sinds','sined','sines','singh','sings','sinhs','sinks','sinky','sinus','siped',
    'siper','sipes','sipid','sippy','sired','siree','sires','sirih','siris','sirki','sirky','siroc','sirra','sirup','sisal',
    'sisel','sises','sista','sists','sitao','sitar','sitch','sited','sites','sithe','sitio','sitka','situp','situs','siver',
    'sixer','sixes','sixmo','sixte','sizal','sizar','sized','sizel','sizer','sizes','skaff','skags','skail','skair','skald',
    'skank','skart','skats','skatt','skaws','skean','skear','skeds','skeed','skeef','skeeg','skeel','skeen','skeer','skees',
    'skeet','skegg','skegs','skeif','skein','skelf','skell','skelm','skelp','skemp','skene','skens','skeos','skeps','skere',
    'skers','skete','skets','skewl','skews','skewy','skice','skids','skied','skies','skiey','skift','skime','skimo','skims',
    'skink','skins','skint','skios','skips','skirl','skirp','skirr','skite','skits','skive','skivy','sklim','skoal','skody',
    'skoff','skogs','skols','skool','skort','skosh','skout','skran','skrik','skuas','skugs','skulp','skuse','skyed','skyer',
    'skyey','skyfs','skyre','skyrs','skyte','slabs','slade','slaes','slags','slaid','slait','slake','slaky','slamp','slams',
    'slane','slank','slape','slaps','slare','slart','slath','slats','slaty','slaum','slaws','slays','slebs','sleck','sleds',
    'sleer','slent','slete','slews','sleys','slich','slier','slily','slims','sline','slipe','slips','slipt','slirt','slish',
    'slite','slits','slive','sloan','slobs','slock','sloes','slogs','sloid','slojd','sloka','sloke','slomo','slone','slonk',
    'sloom','sloot','slops','slopy','slorm','slorp','slote','slots','slour','slove','slows','sloyd','slubb','slubs','slued',
    'sluer','slues','sluff','slugs','sluig','sluit','slums','slurb','slurs','sluse','sluts','slyer','slype','smaak','smaik',
    'smalm','smalt','smarm','smaze','smeek','smeer','smees','smeik','smeke','smerk','smeth','smews','smich','smily','smirr',
    'smirs','smits','smogs','smoko','smolt','smook','smoor','smoot','smore','smorg','smous','smout','smowt','smugs','smurr',
    'smurs','smuse','smush','smuts','smyth','snabs','snaff','snafu','snags','snape','snaps','snapy','snarf','snark','snars',
    'snary','snash','snath','snaws','snead','sneap','snebs','sneck','sneds','sneed','snees','snell','snerp','snibs','snick',
    'snies','snift','snigs','snips','snipy','snirl','snirt','snite','snits','snivy','snobs','snock','snods','snoek','snoep',
    'snoga','snogs','snoke','snood','snook','snool','snoot','snork','snots','snowk','snowl','snows','snubs','snugs','snurl',
    'snurp','snurt','snush','snyes','soaks','soaky','soaps','soare','soars','soary','soave','sobas','sobby','socas','soces',
    'socht','socii','socko','socks','socky','socle','sodas','soddy','sodic','sodio','sodom','sofar','sofas','softa','softs',
    'softy','soger','soget','sohur','soils','soily','sojas','sojus','sokah','soken','sokes','sokol','solah','solan','solas',
    'solay','solde','soldi','soldo','solds','solea','soled','solei','solen','soler','soles','solio','solod','solon','solos',
    'solum','solus','somal','soman','somas','somma','sonce','sonde','sones','songs','songy','sonly','sonne','sonny','sonse',
    'sonsy','sooey','sooks','sooky','soole','sools','sooms','soops','soord','soote','soots','sophs','sophy','sopor','soppy',
    'sopra','soral','soras','sorbo','sorbs','sorda','sordo','sords','sored','soree','sorel','sorer','sores','sorex','sorgo',
    'sorns','sorra','sorta','sorts','sorty','sorus','sorva','soths','sotie','sotol','souce','souct','sough','souks','souls',
    'souly','soums','soups','soupy','sours','soury','souse','souts','sowan','sowar','sowce','sowed','sowel','sowff','sowfs',
    'sowle','sowls','sowms','sownd','sowne','sowps','sowse','sowte','sowth','soyas','soyle','soyuz','sozin','spack','spacy',
    'spado','spaed','spaer','spaes','spags','spahi','spaid','spaik','spail','spain','spait','spake','spald','spale','spall',
    'spalt','spams','spane','spang','spann','spans','spard','sparm','spars','spart','spary','spate','spats','spaul','spave',
    'spawl','spaws','spayd','spays','spaza','spazz','speal','spean','speat','spece','specs','spect','speel','speen','speer',
    'speil','speir','speks','speld','spelk','speos','spets','speug','spews','spewy','spial','spica','spick','spics','spide',
    'spier','spies','spiff','spifs','spiks','spile','spims','spina','spink','spins','spiro','spirt','spiry','spise','spits',
    'spitz','spivs','splay','splet','splog','spode','spods','spoky','spole','spong','spoom','spoor','spoot','spork','sposh',
    'spots','sprad','sprag','sprat','spred','spret','sprew','sprit','sprod','sprog','sprue','sprug','spuds','spued','spuer',
    'spues','spugs','spuke','spule','spume','spumy','spung','spurl','spurs','sputa','spyal','spyer','spyre','squab','squam',
    'squaw','squeg','squid','squin','squit','squiz','sruti','staab','stabs','stade','stags','stagy','staia','staig','staio',
    'stane','stang','staph','staps','starn','starr','stars','stary','stats','stauk','staun','staup','stawn','staws','stays',
    'stchi','stean','stear','stech','stedd','stede','steds','steek','steem','steen','steid','steil','stela','stele','stell',
    'stema','steme','stems','stend','steng','steno','stens','stent','steps','stept','stere','steri','sterk','stero','stert',
    'stets','stews','stewy','steys','stich','stied','sties','stife','stilb','stile','stime','stims','stimy','stine','stion',
    'stipa','stipe','stire','stirk','stirp','stirs','stite','stith','stive','stivy','stoae','stoai','stoas','stoat','stobs',
    'stoep','stoff','stoga','stogy','stoit','stola','stoln','stoma','stond','stong','stonk','stonn','stoof','stook','stoon',
    'stoor','stoot','stopa','stope','stops','stopt','stosh','stoss','stots','stott','stoun','stoup','stour','stown','stowp',
    'stows','strad','strae','strag','strak','stram','stree','strep','stret','strew','strey','stria','strid','strig','strim',
    'strit','strix','strom','strop','strow','stroy','strub','strue','strum','struv','stubb','stubs','stude','studs','stull',
    'stulm','stumm','stums','stuns','stupa','stupe','stupp','sture','sturk','sturt','stuss','styan','styca','styed','styes',
    'styli','stylo','styme','stymy','styre','styte','suade','suant','subah','subas','subby','suber','subha','succi','sucks',
    'sucky','sucre','sudds','suddy','sudor','sudsy','suede','suent','suers','suete','suets','suety','sugan','sughs','sugos',
    'suhur','suids','suine','suint','suist','suits','suity','sujee','sukhs','sukuk','sulci','sulea','sulfa','sulfo','sulka',
    'sulks','sulla','sulph','sulus','sumis','summa','sumos','sumph','sumps','sunis','sunks','sunna','sunns','sunup','supes',
    'supra','surah','sural','suras','surat','surds','sured','sures','surfs','surfy','surgy','surma','surra','sused','suses',
    'susus','sutor','sutra','sutta','swabs','swack','swads','swage','swags','swail','swain','swale','swaly','swamy','swang',
    'swank','swans','swape','swaps','swapt','sward','sware','swarf','swart','swats','swayl','sways','sweal','swede','sweed',
    'sweel','sweer','swees','swego','sweir','swelp','swelt','swerd','swerf','sweys','swick','swies','swigs','swile','swims',
    'swimy','swink','swipe','swipy','swird','swire','swiss','swith','swits','swive','swizz','swobs','swole','swoln','swops',
    'swopt','swosh','swots','swoun','swure','sybbe','sybil','syboe','sybow','sycee','syces','sycon','syens','syker','sykes',
    'sylid','sylis','sylph','sylva','symar','synch','syncs','synds','syned','synes','synth','syped','sypes','syphs','syrah',
    'syren','syrma','sysop','sythe','syver','taals','taata','taber','tabes','tabet','tabic','tabid','tabis','tabla','tabog',
    'tabor','tabun','tabus','tabut','tacan','taces','tacet','tache','tacho','tachs','tacks','tacos','tacso','tacts','taels',
    'tafia','taggy','tagma','tagua','tahas','tahil','tahin','tahrs','tahua','taich','taiga','taigs','taiko','tails','taily',
    'tains','taipo','taira','tairn','taise','taish','taits','tajes','takar','takas','takes','takhi','takin','takis','takky',
    'takyr','talak','talao','talaq','talar','talas','talcs','talcy','talea','taled','taler','tales','talis','talks','talky',
    'talls','talma','talpa','taluk','talus','tamal','tamas','tambo','tamed','tames','tamin','tamis','tammy','tamps','tanak',
    'tanan','tanas','tanga','tangi','tangs','tanha','tanhs','tania','tanka','tanks','tanky','tanna','tanoa','tansy','tanti',
    'tanto','tanty','tanzy','tapas','taped','tapen','tapes','tapet','tapia','tapis','tapoa','tappa','tapul','tapus','taqua',
    'taraf','taras','tarau','tardo','tarea','tared','tares','tarfa','targa','targe','tarie','tarin','tarns','taroc','tarok',
    'taros','tarps','tarre','tarri','tarry','tarse','tarsi','tarts','tarty','tarve','tasar','tasco','tased','taser','tases',
    'tasks','tassa','tasse','tasso','tatar','tater','tates','taths','tatie','tatou','tatta','tatts','tatus','taube','taula',
    'tauld','tauon','taupe','taupo','tauts','tavah','tavas','taver','tawai','tawas','tawed','tawer','tawie','tawpi','tawse',
    'tawts','taxed','taxer','taxes','taxis','taxol','taxon','taxor','taxus','tayer','tayir','tayra','tazia','tazza','tazze',
    'tchai','teade','teads','teaed','teaer','teaey','teaks','teals','teams','tears','teart','teasy','teats','teaty','teave',
    'teaze','techs','techy','tecon','tecta','tecum','tedge','teels','teems','teend','teene','teens','teeny','teers','teest',
    'teety','teffs','teggs','tegua','tegus','tehrs','teiid','teils','teind','teins','tejon','tekke','tekya','telae','telar',
    'telco','teles','telex','telia','telic','tells','tellt','telly','teloi','telos','telyn','teman','tembe','temed','temes',
    'temin','tempi','temps','tempt','temse','tenai','tench','tends','tendu','tenes','tenge','tengu','tenia','tenio','tenne',
    'tenno','tenny','tenon','tents','tenty','tenue','tepal','tepas','tepor','tepoy','terai','terap','teras','terce','terek',
    'teres','tereu','terfe','terfs','terga','terma','terms','terna','terne','terns','terry','terts','terzo','tesla','testa',
    'teste','tests','tetch','tetel','tetes','teths','tetra','tetri','teuch','teugh','tewed','tewel','tewer','tewit','tewly',
    'texas','texes','texts','thack','thagi','thaim','thale','thali','thana','thane','thang','thans','thanx','tharf','tharm',
    'thars','thatn','thats','thave','thawn','thaws','thawy','theah','theat','thebe','theca','theed','theek','theer','thees',
    'theet','thegn','theic','thein','thelf','thema','thens','theow','therm','thesp','thete','thews','thewy','thigs','thilk',
    'thill','thine','thins','thiol','thirl','thirt','thisn','thoft','thoke','thole','tholi','thone','thoom','thore','thoro',
    'thorp','thort','thous','thowl','thowt','thrae','thram','thrap','thraw','thrid','thrip','throe','throu','thruv','thuds',
    'thugs','thuja','thulr','thung','thunk','thuoc','thurl','thurm','thurt','thuya','thymi','thymy','tiang','tians','tiars',
    'tibby','tibet','tibey','tical','ticca','ticed','ticer','tices','tichy','ticks','ticky','ticul','tiddy','tided','tides',
    'tiers','tiffs','tiffy','tifos','tifts','tiges','tigon','tikas','tikes','tikis','tikka','tikor','tikur','tilak','tiled',
    'tiler','tiles','tills','tilly','tilth','tilts','tilty','timar','timbe','timbo','timed','times','timon','timor','timps',
    'tinas','tinct','tinds','tinea','tined','tines','tinge','tingi','tings','tinks','tinny','tinta','tints','tinty','tipis',
    'tiple','tippy','tipup','tired','tirer','tires','tirls','tirma','tiros','tirrs','tirve','tisar','titar','titch','titer',
    'titis','titre','titty','titup','tiver','tiyin','tiyns','tizes','tizzy','tlaco','tmema','toads','toady','toaze','tocks',
    'tocky','tocos','todde','toeas','toffs','toffy','tofts','tofus','togae','togas','toged','toges','togue','toher','tohos',
    'toile','toils','toing','toise','toits','toity','tokay','toked','toker','tokes','tokos','tolan','tolar','tolas','toldo',
    'toled','toles','tolls','tolly','tolts','tolus','tolyl','toman','tombe','tombs','tomes','tomia','tomin','tommy','tomos',
    'tondi','tondo','toned','toner','tones','toney','tongs','tonka','tonks','tonne','tonus','tools','tooms','toons','toosh',
    'toots','toped','topee','topek','toper','topes','tophe','tophi','tophs','topia','topis','topoi','topos','toppy','topsl',
    'toque','torah','toral','toran','toras','torcs','tored','tores','toric','torii','torma','toros','torot','torrs','torse',
    'torsi','torsk','torta','torte','torts','torve','tosas','tosed','toses','toshy','tossy','toted','toter','totes','totty',
    'totum','touks','tould','touns','tourn','tours','touse','tousy','touts','touze','touzy','tovar','towai','towan','towed',
    'towie','towns','towny','towse','towsy','towts','towze','towzy','toxon','toyed','toyer','toyon','toyos','tozed','tozee',
    'tozer','tozes','tozie','trabs','trads','trady','tragi','traik','trama','trame','trams','trank','tranq','trans','trant',
    'trape','traps','trapt','trass','trasy','trats','tratt','trave','trayf','trays','treck','treed','treen','trees','treey',
    'trefa','treif','treks','trema','trems','tress','trest','trets','trews','treyf','treys','triac','trica','tride','trier',
    'tries','trifa','triff','trigo','trigs','trike','trild','trill','trims','trine','trink','trins','triol','trior','trios',
    'trips','tripy','trist','troad','troak','troat','troca','trock','troco','trode','trods','troft','trogs','trois','troke',
    'tromp','trona','tronc','trone','tronk','trons','troot','trooz','troth','trots','trows','troys','trubu','trued','trues',
    'truff','trugo','trugs','trull','trush','tryer','tryke','tryma','trypa','tryps','tsade','tsadi','tsars','tsere','tsine',
    'tsked','tsuba','tsubo','tuans','tuarn','tuart','tuath','tubae','tubar','tubas','tubba','tubby','tubed','tubes','tubig',
    'tubik','tucks','tucky','tucum','tudel','tufan','tufas','tuffe','tuffs','tufts','tufty','tugra','tugui','tuile','tuina',
    'tuism','tukra','tuktu','tules','tulpa','tulsi','tumid','tummy','tumps','tumpy','tunas','tunca','tunds','tuned','tuner',
    'tunes','tungo','tungs','tunna','tunny','tupek','tupik','tuple','tuque','turco','turds','turfs','turfy','turgy','turio',
    'turks','turma','turme','turms','turns','turnt','turps','turrs','turse','turus','tushy','tusks','tusky','tutee','tutin',
    'tutly','tutti','tutty','tutus','tuxes','tuyer','twaes','twain','twale','twals','twalt','twank','twant','twats','tways',
    'tweag','tweeg','tweel','tween','tweep','tweer','tweil','twere','twerk','twerp','twick','twier','twigs','twill','twilt',
    'twink','twins','twiny','twire','twirk','twirp','twite','twits','twoer','twyer','tydie','tyees','tyers','tyiyn','tyken',
    'tykes','tyler','tylus','tymps','tynde','tyned','tynes','typal','typed','typer','types','typey','typic','typos','typps',
    'typto','tyran','tyred','tyres','tyros','tyste','tythe','tzars','uayeb','uckia','udals','udasi','udell','udons','ugali',
    'ugged','uhlan','uhllo','uhuru','uinal','ukase','ulama','ulans','ulema','uller','ulmic','ulmin','ulnad','ulnae','ulnar',
    'ulnas','uloid','ulpan','uluhi','ululu','ulvas','ulyie','ulzie','umami','umbel','umber','umble','umbos','umbre','umiac',
    'umiak','umiaq','umiri','ummah','ummas','ummed','umped','umphs','umpie','umpty','umrah','umras','unact','unadd','unais',
    'unamo','unapt','unark','unarm','unary','unaus','unbag','unban','unbar','unbay','unbed','unbet','unbid','unbit','unbog',
    'unbow','unbox','unboy','unbud','uncap','unces','uncia','uncos','uncoy','uncus','undam','undee','unden','undig','undim',
    'undog','undon','undos','undry','undub','undug','undye','uneth','uneye','unfar','unfew','unfix','unfur','ungag','unget',
    'ungka','ungod','ungot','ungum','unhad','unhap','unhat','unhex','unhid','unhip','unhit','unhot','uniat','unica','unice',
    'uninn','units','unjam','unked','unken','unket','unkey','unkid','unkin','unlap','unlaw','unlay','unled','unlet','unlid',
    'unlie','unmad','unman','unmew','unmix','unnew','unode','unoil','unold','unorn','unown','unpay','unpeg','unpen','unpin',
    'unpot','unput','unram','unray','unred','unrid','unrig','unrip','unrow','unrun','unsad','unsaw','unsay','unsee','unsew',
    'unsex','unshy','unsin','unsly','unsod','unson','unsty','unsun','untap','untar','untax','untin','untop','unurn','unuse',
    'unwan','unwax','unweb','unwet','unwig','unwit','unwon','unzen','uparm','upbar','upbay','upbid','upbow','upbuy','upbye',
    'upcry','upcut','updos','updry','upeat','upend','upfly','upget','upher','upjet','uplay','upled','upleg','uplit','upmix',
    'upped','uppop','upran','uprid','uprip','uprun','upsee','upsey','upsit','upsun','upsup','uptak','upter','uptie','upwax',
    'upway','uraei','urali','uraos','urare','urari','urase','urate','urbex','urbia','urbic','urdee','ureal','ureas','uredo',
    'ureic','ureid','urena','urent','urged','urger','urges','urial','urite','urlar','urled','urman','urnae','urnal','urned',
    'urped','ursae','ursal','ursid','urson','ursuk','urubu','urucu','urvas','usara','usent','users','usnea','usnic','usque',
    'uster','usure','usury','utchy','utees','uteri','utick','utrum','utsuk','uvate','uveal','uveas','uviol','uvito','uvrou',
    'uvula','uvver','uzara','vache','vacoa','vacua','vaded','vades','vagal','vagas','vagus','vails','vaire','vairs','vairy',
    'vajra','vakas','vakia','vakil','vales','valis','valse','valva','valyl','vamps','vampy','vanda','vaned','vanes','vangs',
    'vants','vaped','vaper','vapes','varan','varas','vardy','varec','vares','varia','varix','varna','varus','varve','vasal',
    'vases','vasts','vasty','vatic','vatus','vauch','vaudy','vaute','vauts','vawte','vaxes','veale','veals','vealy','vedro',
    'veena','veeps','veers','veery','vegas','veges','vegie','vegos','vehme','veils','veily','veins','veiny','velal','velar',
    'velds','veldt','veles','velic','vells','velte','velum','venae','venal','vends','vendu','veney','venge','venie','venin',
    'vents','venus','verbs','verby','verek','vergi','verra','verre','verry','verst','verts','vertu','vespa','vesta','vests',
    'vetch','veuve','vexed','vexer','vexes','vexil','vezir','vials','viand','vibes','vibex','vibey','vibix','viced','vices',
    'vichy','vidry','vidya','viers','views','viewy','vifda','viffs','vigas','vigia','vijao','vilde','viler','ville','villi',
    'vills','vimen','vinal','vinas','vinca','vinea','vined','viner','vines','vinew','vinic','vinny','vinos','vinta','vints',
    'viold','viols','vired','vireo','vires','virga','virge','virid','virls','viron','virtu','visas','vised','vises','visie',
    'visne','vison','visto','vitae','vitas','vitex','vitro','vitta','viuva','vivas','vivat','vivax','vivda','viver','vives',
    'vizir','vizor','vleis','vlies','vlogs','voars','vocab','voces','voddy','vodou','vodun','voema','vogie','voids','voile',
    'voips','volae','volar','voled','voles','volet','volks','volta','volte','volti','volts','volva','volve','vomer','votal',
    'voted','votes','vouge','voulu','vowed','vower','voxel','vozhd','vraic','vrils','vroom','vrous','vrouw','vrows','vuggs',
    'vuggy','vughs','vughy','vulgo','vulns','vulva','vutty','waacs','waapa','wabby','wacke','wacko','wacks','wadds','waddy',
    'waded','wader','wades','wadge','wadis','wadna','wadts','waffs','wafts','wafty','waged','wages','wagga','waggy','wagyu',
    'wahoo','waide','waifs','waift','wails','waily','wains','waird','wairs','waise','waite','waits','wakan','wakas','waked',
    'waken','waker','wakes','wakfs','wakif','wakon','waldo','walds','waled','waler','wales','walie','walis','walks','walla',
    'walls','wally','walsh','walth','walty','wamed','wamel','wames','wamus','wands','wandy','waned','wanes','waney','wanga',
    'wangs','wanks','wanky','wanle','wanly','wanna','wanny','wants','wanty','wanze','waqfs','warbs','warby','warch','wards',
    'wared','wares','warez','warks','warly','warms','warns','warnt','warps','warre','warse','warst','warth','warts','warve',
    'wasel','wases','washy','wasms','wasnt','wasps','waspy','wasts','wasty','watap','watts','wauch','wauff','waugh','wauks',
    'waulk','wauls','wauns','waurs','wauve','waved','waves','wavey','wawah','wawas','wawes','wawls','waxed','waxer','waxes',
    'wayed','wazir','wazoo','weaky','weald','weals','weamb','weans','wears','webby','weber','wecht','wedel','wedgy','weeda',
    'weeds','weeke','weeks','weels','weems','weens','weeny','weeps','weepy','weesh','weest','weete','weets','weeze','wefte',
    'wefts','wefty','weids','weils','weirs','weise','weism','weize','wekas','wekau','welds','welke','welks','welkt','wells',
    'welly','welts','wembs','wende','wends','wenge','wenny','wents','weros','wersh','weste','wests','westy','wetas','wetly',
    'wevet','wexed','wexes','whalm','whalp','whaly','whame','whamo','whamp','whams','whand','whang','whank','whaps','whare',
    'wharl','wharp','whart','whase','whata','whats','whauk','whaup','whaur','wheal','wheam','whear','wheem','wheen','wheep',
    'wheer','wheft','whein','wheki','whelk','whelm','whens','whets','whewl','whews','whewt','wheys','whiba','whick','whids',
    'whift','whigs','whilk','whill','whils','whims','whing','whins','whios','whips','whipt','whirr','whirs','whish','whisp',
    'whiss','whist','whits','whity','whizz','whomp','whone','whoof','whoot','whops','whore','whorl','whort','whoso','whows',
    'whuff','whulk','whump','whups','whush','whute','whyda','wicca','wicht','wicks','wicky','widdy','wides','wiels','wifed',
    'wifes','wifey','wifie','wifty','wigan','wigga','wiggy','wikis','wilco','wilds','wiled','wiles','wilga','wilis','wilja',
    'wills','wilts','wimps','winds','wined','winer','wines','winey','winge','wings','wingy','winks','winly','winna','winns',
    'winos','winze','wiped','wiper','wipes','wired','wirer','wires','wirra','wised','wisen','wises','wisha','wisht','wisps',
    'wisse','wiste','wists','witan','wited','wites','withe','withs','withy','wived','wiver','wives','wizen','wizes','wloka',
    'woads','woady','woald','wocks','wodge','wodgy','woful','woibe','wojus','wokas','woker','wokka','wolds','woldy','wolfs',
    'wolly','wolve','wombs','womby','womyn','wonga','wongi','wonks','wonky','wonna','wonts','woods','wooed','woofs','woofy',
    'woold','wools','woons','woops','woopy','woose','woosh','wootz','words','works','worky','worms','wormy','worts','wouch',
    'wough','wowed','wowee','woxen','wramp','wrang','wraps','wrapt','wrast','wrate','wrawl','wreat','wrens','wrick','wride',
    'wried','wrier','wries','writh','writs','wrive','wroke','wroot','wroth','wryer','wuddy','wudge','wudus','wulls','wunna',
    'wurst','wuses','wushu','wussy','wuxia','wuzzy','wyled','wyles','wynds','wynns','wyson','wyted','wytes','wyver','xebec',
    'xenia','xenic','xenon','xenyl','xeric','xerox','xerus','xoana','xrays','xurel','xylan','xylem','xylic','xylol','xylon',
    'xylyl','xyrid','xysti','xysts','yaars','yabas','yabba','yabbi','yabby','yacal','yacca','yacka','yacks','yaffs','yager',
    'yages','yagis','yagua','yahan','yahoo','yaird','yakin','yakka','yakow','yales','yalla','yamen','yampa','yamph','yampy',
    'yamun','yangs','yanks','yanky','yaply','yapok','yapon','yapps','yappy','yarak','yaray','yarco','yards','yarer','yarfa',
    'yarke','yarks','yarly','yarns','yarrs','yarta','yarth','yarto','yates','yauds','yauld','yaups','yawed','yawey','yawls',
    'yawns','yawny','yawps','ybore','yclad','ycled','ycond','ydrad','ydred','yeads','yeahs','yealm','yeans','yeara','yeard',
    'years','yecch','yechs','yechy','yedes','yeeds','yeesh','yeggs','yelks','yells','yelms','yelps','yelts','yenta','yente',
    'yerba','yerds','yerga','yerks','yerth','yeses','yesks','yesso','yests','yesty','yetis','yetts','yeuks','yeuky','yeven',
    'yeves','yewen','yexed','yexes','yezzy','yfere','ygapo','yiked','yikes','yills','yince','yinst','yipes','yippy','yirds',
    'yirks','yirrs','yirth','yites','yitie','ylems','ylike','ylkes','ymolt','ympes','yobbo','yobby','yocco','yocks','yodel',
    'yodhs','yodle','yogas','yogee','yoghs','yogic','yogin','yogis','yoick','yojan','yoked','yokel','yoker','yokes','yokul',
    'yolks','yolky','yomer','yomim','yomps','yonic','yonis','yonks','yoofs','yoops','yores','yorks','yorps','youff','youks',
    'yourn','yours','yourt','youse','youve','youze','yoven','yowed','yowes','yowie','yowls','yowza','yrapt','yrent','yrivd',
    'yrneh','ysame','ytost','yuans','yucas','yucca','yucch','yucko','yucks','yucky','yufts','yugas','yuked','yukes','yukky',
    'yukos','yulan','yules','yummo','yummy','yumps','yupon','yuppy','yurta','yurts','yuzus','zabra','zabti','zacks','zaida',
    'zaidy','zaire','zakat','zaman','zambo','zamia','zanja','zante','zanza','zanze','zapas','zappy','zarfs','zaris','zatis',
    'zaxes','zayat','zayin','zazen','zeals','zebec','zebub','zebus','zedas','zeins','zeism','zeist','zemmi','zemni','zendo',
    'zerda','zerks','zeros','zests','zetas','zexes','zezes','zhomo','ziara','zibet','ziega','ziffs','zigan','zihar','zilas',
    'zilch','zilla','zills','zimbi','zimbs','zimme','zimmi','zinco','zincs','zincy','zineb','zines','zings','zingy','zinke',
    'zinky','zippo','zippy','zirai','ziram','zitis','zizel','zizit','zlote','zloty','zoaea','zobos','zobus','zocco','zoeae',
    'zoeal','zoeas','zogan','zoism','zoist','zokor','zolle','zombi','zonae','zonar','zonda','zoned','zoner','zones','zonic',
    'zonks','zooea','zooey','zooid','zooks','zooms','zoons','zooty','zoppa','zoppo','zoril','zoris','zorro','zouks','zowee',
    'zowie','zudda','zulus','zupan','zupas','zuppa','zurfs','zuzim','zygal','zygon','zymes','zymic','zymin'
  ];

  /* Build valid-words set: answers + extra = 15,693 total */
  var validSet = {};
  var i;
  for (i = 0; i < ANSWERS.length; i++) { validSet[ANSWERS[i]] = true; }
  for (i = 0; i < EXTRA_VALID.length; i++) { validSet[EXTRA_VALID[i]] = true; }

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
        /* Flash tiles red */
        var rowTiles = board[currentRow];
        for (var t = 0; t < rowTiles.length; t++) { rowTiles[t].classList.add('wl-invalid'); }
        setTimeout(function() {
          for (var t = 0; t < rowTiles.length; t++) { rowTiles[t].classList.remove('wl-invalid'); }
        }, 600);
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
          /* Lose — flash board red and shake */
          showMessage(targetWord.toUpperCase(), 0);
          var boardEl = document.getElementById('wl-board');
          boardEl.classList.add('wl-lose');
          setTimeout(function() { boardEl.classList.remove('wl-lose'); }, 1500);
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
