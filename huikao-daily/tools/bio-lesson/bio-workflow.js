export const meta = {
  name: 'bio-mistake-lesson',
  description: 'Write, blind-solve, review (biology + weak-student lenses), fix and re-verify the 生殖 mistake-explanation lesson and retest',
  phases: [
    { title: 'Write', detail: 'one author per lesson section / retest batch' },
    { title: 'Verify', detail: 'blind solver + biology reviewer + weak-student reviewer' },
    { title: 'Fix', detail: 'author revises with every finding' },
    { title: 'Recheck', detail: 'fresh blind solve; disputed practice questions are dropped' },
  ],
}

const STYLE = `寫作對象與規則：
- 對象：台灣國三學生，自然科（生物）基礎不穩，用手機自己讀。他剛考完「生殖」單元的複習考，54 分，說「我不會，我好爛」。語氣要像溫和、有耐心的家教：不責備、不說「很簡單」「這題很基本」，讓他覺得「原來是這樣，我也會」。
- 繁體中文、台灣國中自然課本用語（108 課綱）、全形標點。
- 句子短，一句只講一件事；一個段落最多三句。專有名詞第一次出現要用一句白話解釋（例如「同源染色體：一條來自爸爸、一條來自媽媽，大小形狀一樣的一對染色體」）。
- 每個推理步驟都寫出來，不跳步；不要用「顯然」「易知」「同理可得」。
- 先講「怎麼認、怎麼想」，再講規則，最後才講為什麼。
- 符號用 Unicode，不用 LaTeX、不用 $：2n、n、×、÷、＝。染色體數目一定寫清楚單位是「對」還是「條」。
- 要寫成上下排的分數，用 [[分子/分母]]；重點詞可以用 **粗體**；不要用 emoji。
- 需要表格時，每一列寫成一行，格子之間用「｜」分隔，第一列是標題，網頁會畫成表格。
- 選擇題（check、會考實戰）的選項會被打亂順序，所以 why、hints、solution 都不可以用「(A)」「選項一」「第二個選項」指稱選項，要直接說選項的內容。考卷錯題（mistake）例外：它照考卷原本的 (A)(B)(C)(D) 順序顯示，可以用 (A)～(D)。`

const DEMOS = `可用的互動小工具（demo），只有這一個：
- chromo：畫出一個細胞裡的染色體（每一對是一條藍色〔來自爸爸〕和一條黃色〔來自媽媽〕、大小一樣的染色體）。學生可以選生物（人 23 對、果蠅 4 對、豌豆 7 對），按「細胞分裂」看到 1 個細胞變 2 個、每個和原來一模一樣；按「減數分裂」看到 1 個細胞變 4 個、每個只剩每對中的一條（不成對、數目減半，顏色組合各不相同）；按「受精」看到精子＋卵合成受精卵、又變回成對。畫面同時顯示幾對、幾條、2n 或 n。用法：{"type":"demo","name":"chromo","mode":"cell"}，mode 是一開始顯示的過程：cell＝細胞分裂、meiosis＝減數分裂、fert＝受精。`

const OUTLINE = `這份講解「生殖：把錯題弄懂」的節次：
g1 染色體怎麼算：「對」和「條」、細胞分裂、減數分裂、受精
g2 有性生殖還是無性生殖：要「一模一樣」還是「新組合」
g3 開花植物的有性生殖：花、授粉、花粉管、受精、種子
g4 動物的生殖：體內或體外受精、卵生或胎生、養分從哪裡來
g5 再考一次（綜合題）`

const MISTAKES = {
  2: { sec: 'g2', stem: '小佑最愛吃阿公家的柚子，他想種出和阿公家一樣又大又甜的柚子，最適合用下列哪一個構造來繁殖？', options: ['一個果實', '一粒種子', '一段枝條', '一些果皮'], answer: 2, yours: [0, 1] },
  4: { sec: 'g3', stem: '一般開花植物行有性生殖時，須經過下列步驟，則先後順序為何？\n甲.受精；乙.授粉；丙.新個體萌芽；丁.形成種子；戊.長出花粉管。', options: ['乙甲丁戊丙', '甲乙丁戊丙', '丁戊甲乙丙', '乙戊甲丁丙'], answer: 3, yours: [0] },
  5: { sec: 'g3', stem: '對種子植物的有性生殖而言，花粉管的形成有何意義？', options: ['不需媒介而能將花粉送到雌蕊柱頭上', '可吸引昆蟲前來協助傳粉', '能將種子散播到遠處', '不須以水為媒介而能將精細胞送到胚珠中，與卵受精'], answer: 3, yours: [1] },
  9: { sec: 'g1', stem: '某株植物葉肉細胞的核內染色體數目為 8 對，若該植物因照射 X 光產生突變，使個體產生配子時是進行細胞分裂，則其配子染色體數目應為多少？', options: ['4 條', '8 條', '16 條', '32 條'], answer: 2, yours: [3] },
  10: { sec: 'g1', stem: '若有一個細胞內含染色體 4 對，經過三次細胞分裂可產生 X 個細胞，每個細胞有 Y 條染色體，則 X－Y 的結果為何？', options: ['16', '8', '4', '0'], answer: 3, yours: [1] },
  13: { sec: 'g2', stem: '試問以下哪些生物的生殖過程中，必定有新的遺傳物質組合產生？\n甲.水螅的出芽生殖；乙.海葵的斷裂生殖；丙.松樹結松子；丁.眼鏡蛇產卵；戊.黑豆產生種子。', options: ['甲乙', '丁戊', '丙丁戊', '乙丁戊'], answer: 2, yours: [1] },
  15: { sec: 'g4', stem: '下列哪一種動物，其卵和精子在母體內結合，但胚胎發育的過程卻是在母體外進行？', options: ['面天樹蛙', '牛', '海豚', '紅鶴'], answer: 3, yours: [2] },
  16: { sec: 'g3', stem: '右圖為某植物雌蕊的構造，試由此圖判斷，此植物可能是下列哪一種水果？', fig: 'pistil', figText: '（圖：雌蕊由上而下是柱頭、花柱、子房；子房裡排著很多個胚珠。）', options: ['芭樂', '荔枝', '水蜜桃', '芒果'], answer: 0, yours: [1] },
  17: { sec: 'g4', stem: '有關胎生與卵生的比較，下列何者錯誤？\n選項｜胎生｜卵生\n(A)｜受精卵在母體內發育｜受精卵在母體外發育\n(B)｜養分由母體供給｜養分由卵本身供給\n(C)｜卵較小｜卵較大\n(D)｜哺乳類均為胎生｜魚類均為卵生', options: ['見表 (A) 列', '見表 (B) 列', '見表 (C) 列', '見表 (D) 列'], answer: 3, yours: [2] },
  23: { sec: 'g4', stem: '甲、乙、丙三種動物的生殖方式如右表，關於此表，下列敘述何者正確？\n動物｜受精方式｜生育方式\n甲｜體內受精｜卵生\n乙｜體外受精｜卵生\n丙｜體內受精｜胎生', options: ['甲的胚胎發育所需養分來自母體', '蝙蝠的生殖方式和甲相同', '青蛙的生殖方式和乙相同', '丙的胚胎發育所需養分來自卵本身'], answer: 2, yours: [1] },
  24: { sec: 'g1', stem: '生物行有性生殖時，精子和卵結合的主要作用，下列敘述何者正確？', options: ['使受精卵的染色體數目為親代染色體數目的兩倍', '使受精卵的染色體數目為親代染色體數目的一半', '使受精卵的染色體數目等於親代的染色體數目', '使受精卵具有兩個細胞核'], answer: 2, yours: [1] },
  25: { sec: 'g1', stem: '同一生物卵細胞與精細胞內的染色體套數分別為何？', options: ['n；n', 'n；2n', '2n；n', '2n；2n'], answer: 0, yours: [1] },
  27: { sec: 'g1', stem: '某生物的體細胞含有 10 對染色體，則該生物經過減數分裂所產生的生殖細胞中，含有的染色體數目應為多少？', options: ['10 對', '2 對', '10 條且不成對', '10 條且成對'], answer: 2, yours: [3] },
  30: { sec: 'g1', stem: '下表是單一細胞進行細胞分裂和減數分裂的比較，試問何者正確？\n項目｜細胞分裂｜減數分裂\n(A) 複製的染色體互相分離｜有｜有\n(B) 子細胞的數目｜4 個｜2 個\n(C) 子細胞染色體的數目｜加倍｜減半\n(D) 分裂的結果｜可使人類產生精子和卵｜可使變形蟲產生新個體', options: ['見表 (A) 列', '見表 (B) 列', '見表 (C) 列', '見表 (D) 列'], answer: 0, yours: [2] },
  32: { sec: 'g4', stem: '圖(一)為某一鳥類未受精的蛋剖面圖。圖(一)的哪一構造是由卵巢所產生，可以供給胚胎發育時所需的養分？', fig: 'egg', figText: '（圖(一)：甲指著蛋黃頂端的一個小白點；乙指著圓圓的蛋黃本身；丙指著從蛋黃連到兩端、扭轉的帶子；丁指著蛋的最外圈（蛋殼和蛋白一帶）。）', options: ['甲', '乙', '丙', '丁'], answer: 1, yours: [0] },
  34: { sec: 'g2', stem: '右圖為落地生根的葉片，葉片上可長出新植株。若想要培育「新品種」的落地生根，應採用的繁殖法是下列哪一種？', options: ['種子繁殖', '孢子繁殖', '出芽生殖', '營養器官繁殖'], answer: 0, yours: [3] },
}

const SECTIONS = {
  g1: { title: '染色體怎麼算：「對」和「條」', need: '例題 2 題、check 3 個', mistakes: [9, 10, 24, 25, 27, 30], brief: `這是最重要的一節（他錯的 16 題裡有 6 題是這個）。大約 16～22 個 block。
1. 先建立畫面：細胞核裡的染色體是一對一對的。每一對叫同源染色體，一條來自爸爸、一條來自媽媽。人有 23 對＝46 條。「對」和「條」一定要分清楚：1 對＝2 條。
2. 2n 和 n：體細胞（身體裡一般的細胞，例如皮膚、肌肉、葉肉細胞）染色體成對，叫 2n；精子、卵（生殖細胞，也叫配子）只有每對中的一條，不成對，叫 n。人：2n＝46，n＝23。
3. 三條規則（key）：細胞分裂（長大、傷口修補、單細胞生物和許多無性生殖）：1 個細胞變 2 個，每個的染色體數目和原來一樣。減數分裂（製造精子和卵）：1 個細胞最後變成 4 個，每個的染色體數目減半、不成對。受精：精子（n）＋卵（n）＝受精卵（2n），和親代一樣。
   也要說明：分裂前染色體會先複製，分裂時「複製的染色體互相分離」，細胞分裂和減數分裂都有這一步。
4. 放互動小工具 {"type":"demo","name":"chromo","mode":"cell"}，前後一句話說明怎麼玩。
5. 一張比較表（用「｜」表格）：細胞分裂 vs 減數分裂：發生在哪裡、子細胞數、子細胞染色體數目、成不成對、用途（細胞分裂：生長、修補、變形蟲等的生殖；減數分裂：產生精子和卵）。
6. trap：把「對」當成「條」；把細胞分裂和減數分裂的結果記反；以為受精後染色體會變兩倍。
7. 例題 2 題：(1) 某生物體細胞 8 對染色體：皮膚細胞幾條？精子幾條？受精卵幾條？(2) 一個細胞 3 對染色體，連續細胞分裂 2 次：共幾個細胞、每個幾條？
8. 考卷錯題（mistake）：第 9、10、24、25、27、30 題，放在講完規則之後。
9. check 3 個：(1) 對／條換算與 2n、n（給體細胞幾對，問生殖細胞幾條、成不成對）；(2) 細胞分裂次數、細胞數與每個細胞的染色體數；(3) 細胞分裂 vs 減數分裂的比較判斷。` },
  g2: { title: '有性還是無性：要「一模一樣」還是「新組合」', need: '例題 1 題、check 3 個', mistakes: [2, 13, 34], brief: `大約 10～14 個 block。
1. 一句話判斷法（key）：無性生殖＝只有一個親代，新個體的遺傳物質和親代一模一樣（像影印）；有性生殖＝精子和卵結合，遺傳物質來自兩個親代，會有新的組合（像洗牌）。
2. 怎麼認：無性生殖的例子（出芽生殖：水螅、酵母菌；斷裂生殖：渦蟲、海葵；營養器官繁殖：落地生根的葉、草莓的匍匐莖、番薯的塊根、枝條扦插；孢子繁殖：黴菌、蕨類；組織培養）。有性生殖：只要有精子和卵受精（開花植物結種子、松樹結松子、動物產卵或生小孩）。
3. 應用（key）：想要和原來「一模一樣」（例如阿公家好吃的柚子）→ 用無性生殖（枝條扦插、嫁接、壓條）；想要「新品種」→ 用有性生殖（種子），因為有新的組合才可能出現新特徵。
4. trap：以為種子種出來會和原來一模一樣（種子是受精來的，是新組合）；以為營養器官繁殖可以培育新品種。
5. 例題：判斷 4 個生物的生殖過程，哪些「一定有新的遺傳物質組合」。
6. 考卷錯題（mistake）：第 2、13、34 題。
7. check 3 個：(1) 想要一模一樣，選哪種繁殖；(2) 哪些一定產生新組合；(3) 培育新品種要用哪種方法、為什麼。` },
  g3: { title: '開花植物：授粉、花粉管、受精、種子', need: '例題 1 題、check 3 個', mistakes: [4, 5, 16], brief: `大約 10～14 個 block。
1. 花的構造（雌蕊：柱頭、花柱、子房、胚珠；雄蕊：花藥、花絲）和「之後會變成什麼」（key）：子房→果實；胚珠→種子。所以子房裡有幾個胚珠，最多就有幾粒種子。
2. 開花植物有性生殖的順序（key，給一個好記的說法）：授粉（花粉落到柱頭）→ 長出花粉管 → 受精（精細胞和胚珠裡的卵結合）→ 形成種子（胚珠變種子、子房變果實）→ 種子萌芽成新個體。
3. 花粉管的意義：花粉在柱頭上長出花粉管，穿過花柱伸到胚珠，把精細胞送到卵旁邊；所以種子植物受精不需要水當媒介（對比蕨類、苔蘚要靠水讓精子游過去）。
4. trap：把授粉和受精搞混（授粉是花粉到柱頭；受精是精細胞和卵結合）；以為花粉管是用來吸引昆蟲或幫忙傳粉。
5. 例題：用文字描述雌蕊（子房裡有很多胚珠／只有一個胚珠），推論可能是哪種水果（芭樂、番茄、西瓜種子多；芒果、水蜜桃、荔枝、龍眼只有一粒種子）。
6. 考卷錯題（mistake）：第 4、5、16 題（第 16 題網頁會放原圖：雌蕊的子房裡有很多胚珠）。
7. check 3 個：(1) 步驟排序；(2) 花粉管的作用；(3) 由胚珠數推種子數或推水果。` },
  g4: { title: '動物：在哪裡受精、在哪裡長大', need: '例題 1 題、check 3 個', mistakes: [15, 17, 23, 32], brief: `大約 12～16 個 block。
1. 兩個問題分開問（key）：受精在哪裡？（體內受精：精子在母體內和卵結合；體外受精：在水中結合）胚胎在哪裡發育、養分從哪裡來？（卵生：在母體外發育，養分來自卵本身的卵黃；胎生：在母體子宮內發育，養分由母體經過胎盤供給）。
2. 用「｜」表格把常見動物分類：體內受精＋卵生：鳥類（紅鶴、雞）、爬蟲類（眼鏡蛇）、昆蟲（獨角仙）；體外受精＋卵生：大多數魚類（鯉魚）、青蛙等兩生類（面天樹蛙）、珊瑚；體內受精＋胎生：大多數哺乳類（牛、海豚、蝙蝠、人）。提醒例外：鴨嘴獸是哺乳類卻是卵生；有些魚（例如孔雀魚）卵在母體內孵化。所以「哺乳類都是胎生」「魚類都是卵生」這種用「都」的說法是錯的。
3. 鳥蛋的構造：卵黃（蛋黃）由卵巢產生，是卵細胞的一部分，提供胚胎發育的養分；胚盤是卵黃表面的小白點，有細胞核，受精後會發育成胚胎；繫帶固定卵黃；卵白（蛋白）和卵殼在輸卵管形成，提供水分和保護。
4. 卵生與胎生、產卵數：卵生的卵通常比較大（要裝養分）；胎生的卵很小（養分靠母體）。親代保護越多，產卵數通常越少。
5. trap：以為體內受精就一定是胎生（鳥是體內受精，但卵生）；把卵黃和卵白的來源搞混。
6. 例題：給三種動物的受精方式、生育方式表，判斷哪個敘述正確。
7. 考卷錯題（mistake）：第 15、17、23、32 題（第 32 題網頁會放原圖：甲＝胚盤、乙＝卵黃、丙＝繫帶、丁＝卵白）。
8. check 3 個：(1) 依受精方式與生育方式判斷動物；(2) 卵生／胎生比較中錯誤的敘述（含「都」的陷阱）；(3) 鳥蛋構造的來源與功能。` },
}

const EXAM_TYPES = {
  r01: { section: 'g1', desc: '對／條與 2n、n：給某生物體細胞的染色體對數，問體細胞、生殖細胞、受精卵各幾條、成不成對。' },
  r02: { section: 'g1', desc: '細胞分裂次數：一個細胞連續細胞分裂幾次，共幾個細胞、每個幾條染色體（可做簡單計算組合）。' },
  r03: { section: 'g1', desc: '細胞分裂與減數分裂的比較：子細胞數、染色體數、成不成對、用途，挑出正確或錯誤的敘述。' },
  r04: { section: 'g1', desc: '受精的意義：受精卵的染色體數與親代的關係，或精子、卵、受精卵的染色體套數。' },
  r05: { section: 'g2', desc: '有性／無性生殖判斷：一組生殖例子中，哪些一定產生新的遺傳物質組合。' },
  r06: { section: 'g2', desc: '保留品種或培育新品種：情境題，選擇適合的繁殖方法並說明理由。' },
  r07: { section: 'g3', desc: '開花植物有性生殖：步驟順序，或花粉管的作用、授粉與受精的區別。' },
  r08: { section: 'g3', desc: '子房與胚珠：由胚珠數推果實中的種子數，或由水果推雌蕊構造。' },
  r09: { section: 'g4', desc: '受精方式與生育方式：給動物或表格，判斷正確敘述（含體內受精但卵生的陷阱）。' },
  r10: { section: 'g4', desc: '卵的構造與養分：鳥蛋各構造的來源與功能，或卵生與胎生的養分來源。' },
}

const BANK_TOPICS = {}

// ---------------------------------------------------------------- schemas
const S = { type: 'string' }
const MCQ = { type: 'object', properties: {
  stem: S,
  options: { type: 'array', items: S, minItems: 4, maxItems: 4 },
  answer: { type: 'integer', minimum: 0, maximum: 3 },
  why: { type: 'array', items: S, minItems: 4, maxItems: 4 },
  hints: { type: 'array', items: S, minItems: 2, maxItems: 2 },
  solution: { type: 'array', items: S, minItems: 1 },
}, required: ['stem', 'options', 'answer', 'why', 'hints', 'solution'] }
const BLOCK = { type: 'object', properties: {
  type: { type: 'string', enum: ['p', 'key', 'demo', 'example', 'trap', 'why', 'check', 'mistake'] },
  text: S, title: S, lines: { type: 'array', items: S },
  name: S, mode: S,
  stem: S, steps: { type: 'array', items: S }, final: S,
  wrong: S, right: S, reason: S,
  skill: S, variants: { type: 'array', items: MCQ },
  qno: { type: 'integer' }, think: { type: 'array', items: S }, optionWhy: { type: 'array', items: S }, remember: S,
}, required: ['type'] }
const SECTION_SCHEMA = { type: 'object', properties: { blocks: { type: 'array', items: BLOCK, minItems: 4 } }, required: ['blocks'] }
const EXAM_SCHEMA = { type: 'object', properties: { problems: { type: 'array', items: { type: 'object', properties: { type: S, title: S, variants: { type: 'array', items: MCQ, minItems: 1 } }, required: ['type', 'variants'] } } }, required: ['problems'] }
const SOLVE_SCHEMA = { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: {
  id: S, answer: { type: 'integer' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, broken: { type: 'boolean' }, note: S,
}, required: ['id', 'answer', 'confidence', 'broken'] } } }, required: ['results'] }
const REVIEW_SCHEMA = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: {
  where: S, severity: { type: 'string', enum: ['must', 'should'] }, problem: S, fix: S,
}, required: ['where', 'severity', 'problem', 'fix'] } } }, required: ['issues'] }

// ---------------------------------------------------------------- helpers (plain JS; no Date/Math.random)
const clone = x => JSON.parse(JSON.stringify(x))
const txt = s => (typeof s === 'string' ? s.trim() : '')
const POS_RE = /\([A-D]\)|（[A-D]）|選項\s*[一二三四ABCD]|第[一二三四]個選項|[A-D]\s*選項/

function textProblems(root) {
  const out = []
  const visit = (node, path, inMistake) => {
    if (typeof node === 'string') {
      if (/\$|\\frac|\\times|\\cdot|\\\(/.test(node)) out.push(`${path}：用了 LaTeX 或 $，請改成 Unicode 純文字`)
      if (!inMistake && /(why|hints|solution|steps)/.test(path) && POS_RE.test(node)) out.push(`${path}：用選項位置指稱選項（選項會被打亂），請改成直接說內容`)
      if (/顯然|易知|同理可得/.test(node)) out.push(`${path}：用了「顯然／易知／同理可得」，請把步驟寫出來`)
      return
    }
    if (Array.isArray(node)) { node.forEach((x, i) => visit(x, `${path}[${i}]`, inMistake)); return }
    if (node && typeof node === 'object') for (const k of Object.keys(node)) visit(node[k], path ? `${path}.${k}` : k, inMistake || node.type === 'mistake')
  }
  visit(root, '', false)
  return out
}

function cleanMCQ(q) {
  if (!q || !txt(q.stem) || !Array.isArray(q.options) || q.options.length !== 4) return null
  const opts = q.options.map(txt)
  if (opts.some(o => !o) || new Set(opts).size !== 4) return null
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return null
  if (!Array.isArray(q.why) || q.why.length !== 4) return null
  const hints = (q.hints || []).map(txt).filter(Boolean).slice(0, 2), solution = (q.solution || []).map(txt).filter(Boolean)
  if (hints.length < 2 || !solution.length) return null
  return { stem: txt(q.stem), options: opts, answer: q.answer, why: q.why.map(txt), hints, solution }
}
function mistakeData(qno) {
  const m = MISTAKES[qno]
  const o = { qno, stem: m.stem, options: m.options, answer: m.answer, yours: m.yours }
  if (m.fig) o.fig = m.fig
  if (m.figText) o.figText = m.figText
  return o
}
function cleanLesson(sec, sid) {
  const blocks = [], dropped = [], seenQ = {}
  let ci = 0, ei = 0
  for (const b0 of (sec && sec.blocks) || []) {
    const b = clone(b0), t = b.type
    if (t === 'p') { if (txt(b.text)) blocks.push({ type: t, text: txt(b.text) }); else dropped.push('empty p'); continue }
    if (t === 'key' || t === 'why') {
      const lines = (b.lines || []).map(txt).filter(Boolean)
      if (!lines.length) { dropped.push(t + ' without lines'); continue }
      blocks.push({ type: t, title: txt(b.title), lines }); continue
    }
    if (t === 'demo') {
      if (b.name !== 'chromo') { dropped.push('unknown demo ' + b.name); continue }
      blocks.push({ type: t, name: 'chromo', mode: ['cell', 'meiosis', 'fert'].includes(b.mode) ? b.mode : 'cell' }); continue
    }
    if (t === 'example') {
      const steps = (b.steps || []).map(txt).filter(Boolean)
      if (!txt(b.stem) || !steps.length) { dropped.push('example without stem/steps'); continue }
      blocks.push({ type: t, id: `${sid}e${++ei}`, stem: txt(b.stem), steps, final: txt(b.final) }); continue
    }
    if (t === 'trap') { if (!txt(b.wrong) || !txt(b.right)) { dropped.push('trap incomplete'); continue } blocks.push({ type: t, wrong: txt(b.wrong), right: txt(b.right), reason: txt(b.reason) }); continue }
    if (t === 'check') {
      const vs = (b.variants || []).map(cleanMCQ).filter(Boolean)
      if (!vs.length) { dropped.push('check with no usable variant'); continue }
      const id = `${sid}c${++ci}`
      vs.forEach((v, j) => { v.id = `${id}v${j + 1}` })
      blocks.push({ type: t, id, skill: txt(b.skill), variants: vs }); continue
    }
    if (t === 'mistake') {
      const q = b.qno
      if (!SECTIONS[sid].mistakes.includes(q) || seenQ[q]) { dropped.push('mistake with unexpected or duplicate qno ' + q); continue }
      const think = (b.think || []).map(txt).filter(Boolean), ow = (b.optionWhy || []).map(txt)
      if (!think.length || ow.length !== 4 || ow.some(x => !x)) { dropped.push('mistake ' + q + ' incomplete'); continue }
      seenQ[q] = true
      blocks.push(Object.assign({ type: t, id: `${sid}m${q}` }, mistakeData(q), { think, optionWhy: ow, remember: txt(b.remember) })); continue
    }
    dropped.push('unknown block type ' + t)
  }
  const missing = SECTIONS[sid].mistakes.filter(q => !seenQ[q])
  for (const q of missing) dropped.push('missing mistake ' + q)
  return { blocks, dropped, missing }
}
function cleanExam(res, types) {
  const problems = [], dropped = [], seen = {}
  for (const p of (res && res.problems) || []) {
    const type = txt(p.type)
    if (!types.includes(type)) { dropped.push('unexpected type ' + type); continue }
    if (seen[type]) { dropped.push('duplicate type ' + type); continue }
    const vs = (p.variants || []).map(cleanMCQ).filter(Boolean)
    if (!vs.length) { dropped.push(type + ' has no usable variant'); continue }
    seen[type] = true
    vs.forEach((v, j) => { v.id = `${type}v${j + 1}` })
    problems.push({ type, section: EXAM_TYPES[type].section, title: txt(p.title), variants: vs })
  }
  for (const t of types) if (!seen[t]) dropped.push('missing type ' + t)
  return { problems, dropped }
}

// items for a blind solver, and a map id -> answer key (test questions are included to double-check the transcribed key)
function solverView(mode, unit) {
  const items = [], key = {}
  const add = (id, q, isMistake) => { items.push({ id, stem: q.stem, options: q.options }); key[id] = { answer: q.answer, options: q.options, mistake: !!isMistake } }
  if (mode === 'lesson') {
    for (const b of unit.blocks) {
      if (b.type === 'check') for (const v of b.variants) add(v.id, v)
      if (b.type === 'mistake') add(b.id, { stem: b.stem + (b.figText ? '\n' + b.figText : ''), options: b.options, answer: b.answer }, true)
    }
  } else for (const p of unit.problems) for (const v of p.variants) add(v.id, v)
  return { items, key }
}
function judge(view, solved) {
  const by = new Map(((solved && solved.results) || []).map(r => [r.id, r]))
  const bad = []
  for (const it of view.items) {
    const r = by.get(it.id), k = view.key[it.id]
    if (!r) { bad.push({ id: it.id, mistake: k.mistake, why: 'solver gave no answer' }); continue }
    if (r.broken) { bad.push({ id: it.id, mistake: k.mistake, why: 'solver marked broken: ' + (r.note || '') }); continue }
    if (r.answer !== k.answer) bad.push({ id: it.id, mistake: k.mistake, why: `答案不同：答案鍵 ${k.answer}「${k.options[k.answer]}」，解題者 ${r.answer}「${k.options[r.answer] || '?'}」（${r.confidence}）${r.note ? '；' + r.note : ''}` })
  }
  return bad
}
function finalize(mode, unit, bad) {
  const badMc = new Set(bad.filter(b => !b.mistake).map(b => b.id))
  const report = { droppedVariants: [], droppedItems: [], keyDisputes: bad.filter(b => b.mistake) }
  const prune = (arr, idOf) => arr.filter(x => {
    const keep = x.variants.filter(v => !badMc.has(v.id))
    for (const v of x.variants) if (badMc.has(v.id)) report.droppedVariants.push(v.id)
    x.variants = keep
    if (!keep.length) { report.droppedItems.push(idOf(x)); return false }
    return true
  })
  if (mode === 'lesson') {
    const keep = new Set(prune(unit.blocks.filter(b => b.type === 'check'), b => b.id))
    unit.blocks = unit.blocks.filter(b => b.type !== 'check' || keep.has(b))
  }
  else unit.problems = prune(unit.problems, p => p.type)
  return report
}
function indexed(mode, unit) {
  if (mode === 'lesson') return { blocks: unit.blocks.map((b, i) => Object.assign({ i }, b, b.variants ? { variants: b.variants.map((v, j) => Object.assign({ j }, v)) } : {})) }
  return { problems: unit.problems.map((p, i) => Object.assign({ i }, p, { variants: p.variants.map((v, j) => Object.assign({ j }, v)) })) }
}
const letter = i => '(' + 'ABCD'[i] + ')'
function mistakeBrief(q) {
  const m = MISTAKES[q]
  return `第 ${q} 題：${m.stem}${m.figText ? '\n' + m.figText : ''}
選項：${m.options.map((o, i) => letter(i) + o).join('　')}
正確答案：${letter(m.answer)}；學生選的是：${m.yours.map(letter).join('、')}${m.yours.length > 1 ? '（他兩個都寫了，不確定）' : ''}`
}

// ---------------------------------------------------------------- prompts
const MCQ_FORMAT = `選擇題格式：{"stem":"...","options":["","","",""],"answer":正確選項索引0-3,"why":["","","",""],"hints":["",""],"solution":["",""]}
- why：每個選項各一句。錯的選項寫「選這個通常是……（哪裡想錯）」，正確的寫一句肯定加理由。
- hints：提示 1 只點出要用哪條規則或要先判斷什麼；提示 2 把判斷寫一半，但不直接說答案。
- solution：完整步驟，每步一個字串。
- 錯誤選項要來自真實常見錯誤（例如「對」「條」搞混、細胞分裂和減數分裂記反、把授粉當成受精、以為體內受精就是胎生）。
- 題目文字要完整，不看圖也能做；只能有一個正確選項；不超出國中自然（108 課綱）範圍。`

const MISTAKE_FORMAT = `考卷錯題（mistake）block：{"type":"mistake","qno":題號,"think":["...","..."],"optionWhy":["","","",""],"remember":"..."}
- 題目、選項、正確答案、學生選的答案網頁會自動放上（照考卷原樣），你只寫講解，不要重抄題目。
- think：「怎麼想」3～6 步，每步一句。第 1 步先說「這題在問什麼、題目裡哪個關鍵詞要注意」；接著用這一節的規則一步一步推到正確答案；最後一步明確說出答案。
- optionWhy：照考卷原本 (A)(B)(C)(D) 的順序，每個選項一句。學生選的那個錯誤選項，要溫和地說出他可能是怎麼想的、哪裡差了一點（例如「你可能把 8 對當成 8 條了」）；正確的寫為什麼對。
- remember：一句話記住，下次看到類似題目可以直接用。
- 這一節的考卷錯題要全部寫到，一題一個 block，放在講完相關規則之後。`

function writePrompt(mode, item) {
  if (mode === 'lesson') {
    const s = SECTIONS[item.id]
    return `你是台灣國中自然科（生物）老師，正在為一位學生寫手機上的互動講解頁「生殖：把錯題弄懂」。這次只寫其中一節。

${STYLE}

${OUTLINE}

這一節：${item.id} ${s.title}
這一節要教的內容與順序：
${s.brief}

這一節需要：${s.need}；每個 check 要有 3 個 variants（同一個觀念、同樣難度，但數字、生物或情境不同；學生按「換一題」會換到下一個）。

這一節要講解的考卷錯題（學生在這次考試答錯的題）：
${s.mistakes.map(mistakeBrief).join('\n\n')}

輸出 blocks 陣列，照畫面由上到下的順序。可用的 block：
- {"type":"p","text":"..."}：一段講解（最多三句）。
- {"type":"key","title":"...","lines":["...","..."]}：重點框（規則、口訣），每行一條。
- {"type":"demo","name":"chromo","mode":"..."}：互動小工具。
- {"type":"example","stem":"...","steps":["...","..."],"final":"..."}：例題。學生會一步一步按「下一步」看 steps。final 是最後答案的簡短寫法。
- {"type":"trap","wrong":"...","right":"...","reason":"..."}：常見錯誤：錯的想法、對的想法、為什麼。
- {"type":"why","title":"想知道為什麼？","lines":["...","..."]}：折疊的原理說明。
- {"type":"check","skill":"這題練什麼（一句）","variants":[題,題,題]}：「你試試」選擇題（和考卷錯題不同的新題目，不要只是把錯題換幾個字）。
- 考卷錯題 block（見下）。
${MCQ_FORMAT}

${MISTAKE_FORMAT}

${DEMOS}

寫完逐題自己再檢查一次：每個 check 的 answer 指向唯一正確的選項；每個例題的步驟和 final 正確；每個考卷錯題的講解推到的是上面給的正確答案。`
  }
  return `你是台灣國中自然科（生物）老師，正在為互動講解頁「生殖：把錯題弄懂」的最後一節「再考一次」出題。學生把錯題弄懂後，用這些題目檢驗自己真的會了。

${STYLE}

${OUTLINE}

請出下列題型，每個題型 2 個 variants（同觀念、同難度，生物、數字或情境不同，正確答案的內容也不同）。難度接近國中教育會考的中等題：要先判斷再推一步，不是只背一個名詞。不要和下列學生考卷上的原題一模一樣。
${item.types.map(t => `${t}（對應 ${EXAM_TYPES[t].section}）：${EXAM_TYPES[t].desc}`).join('\n')}

學生考卷上的原題（避免重複，但可以考同樣的觀念）：
${Object.keys(MISTAKES).map(q => '第 ' + q + ' 題：' + MISTAKES[q].stem.split('\n')[0]).join('\n')}

輸出 problems 陣列，每個元素 {"type":"題型代號（例如 ${item.types[0]}）","title":"題型名稱（10 字內）","variants":[題,題]}。
${MCQ_FORMAT}

寫完逐題自己再檢查一次，確認 answer 指向唯一正確的選項。`
}

function solvePrompt(items) {
  return `你是嚴格的國中自然科（生物）閱卷老師（台灣 108 課綱）。下面是一批選擇題，沒有附答案。請逐題獨立作答，一題都不能跳過：
- answer 填你判斷的正確選項索引（0～3，options 陣列的位置）。
- 只依題目文字作答；題目裡用「｜」分隔的行是表格（第一列是標題）。題目附的圖已改寫成文字說明。
- broken：條件不足、有矛盾、看不懂、沒有正確選項或不只一個正確選項、超出國中範圍 → true，note 寫原因。
- confidence：high / medium / low；不是 high 時在 note 說明猶豫的地方。
題目（JSON）：
${JSON.stringify(items)}`
}

function bioReviewPrompt(mode, unit) {
  const what = mode === 'lesson' ? '一節講解內容（含考卷錯題的講解）' : '「再考一次」題組'
  return `你是審稿的資深國中自然科（生物）老師（台灣 108 課綱，國二上「生殖」單元），請嚴格審查下面這份${what}（JSON）。只回報真的有問題的地方，每個問題寫出具體的修改方式。
檢查：
1. 每個生物敘述是否正確：染色體的「對」「條」、2n 與 n、細胞分裂與減數分裂（子細胞數、染色體數、成不成對、用途）、受精；有性與無性生殖的分類與例子；花的構造、授粉、花粉管、受精、子房→果實、胚珠→種子；體內／體外受精、卵生／胎生、養分來源、鳥蛋構造（胚盤、卵黃、繫帶、卵白、卵殼）的來源與功能。舉的生物例子分類要對，有例外的要小心（例如鴨嘴獸、孔雀魚）。
2. 每個選擇題：answer 指向的選項是否唯一正確，其他三個是否真的錯；why 的說法是否正確；hints 會不會誤導；solution 是否完整。
3. 例題的 steps 每步是否正確，final 是否正確。
4. 考卷錯題（type 為 mistake）：題目、選項、answer（正確答案索引）、yours（學生選的）是固定的；檢查 think 有沒有推到 answer 指的選項、推理對不對，optionWhy 是否照 (A)～(D) 順序且每句正確。
5. 是否超出 108 課綱國中範圍（例如減數分裂的詳細分期、DNA 複製機制），或用了國中沒教的詞而沒解釋。
6. 同一組 variants 是否真的是同一個觀念、同樣難度，又不是只換一個字的重複題。
7. 題目文字是否完整到不看圖也能做。
severity：must（錯誤，一定要改）或 should（建議）。where 用 JSON 路徑，例如 blocks[5].variants[2]、problems[1].variants[0]（索引從 0 開始，物件裡的 i、j 就是索引）。
內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

function studentReviewPrompt(mode, unit) {
  return `請你扮演一個台灣國三學生：自然科基礎不穩，國二學的「生殖」單元幾乎忘光了，剛考了 54 分，心情很差，覺得「我不會，我好爛」。你說過：「講得太專業我看不懂」。現在你要靠這份講解自己把錯題弄懂。
請像真的學生一樣從頭讀下面這份${mode === 'lesson' ? '講解（其中一節，含你考卷上錯的題目）' : '「再考一次」題組'}（JSON），然後回報：
- 哪一句看不懂、哪個詞沒解釋過（例如「同源染色體」「配子」「2n」「胚珠」「授粉」「胚盤」）；
- 哪裡跳步，讓你不知道結論從哪裡來；
- 哪裡句子太長、一次塞太多；
- 哪裡需要更具體的例子或比喻；
- 語氣有沒有讓你覺得被責備或覺得自己笨（例如「這很簡單」「這是基本的」）；
- 你實際試做每個選擇題的第一個 variant：寫下你直覺會選哪個、卡在哪裡；提示 1、提示 2 有沒有幫上忙；選錯時 why 說的原因你看不看得懂。
${mode === 'lesson' ? '- 每個考卷錯題（type 為 mistake，yours 是你當時選的）：讀完 think 和 optionWhy，你懂不懂自己當時為什麼錯？下次遇到會不會？\n' : ''}每個問題都要給「改成這樣比較好懂」的具體寫法。severity：must（不改就學不會）或 should。where 用 JSON 路徑，例如 blocks[5].variants[0]（物件裡的 i、j 就是索引）。
不要回報生物正確性（另一位老師會查），專心在「看不看得懂、學不學得會」。
內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

function fixPrompt(mode, item, unit, info) {
  const fmt = mode === 'lesson' ? '同樣的 blocks 格式，回傳完整的一節（所有 blocks，含每一個考卷錯題 block）' : '同樣的 problems 格式，回傳完整的題組（所有題型、所有 variants）'
  const s = mode === 'lesson' ? SECTIONS[item.id] : null
  return `你是這份內容的作者。下面是你寫的內容（JSON）、審稿意見、獨立解題者和你答案不同的題目，以及程式檢查出的問題。請改出最終版。
${s ? `這一節：${item.id} ${s.title}\n要教的內容：\n${s.brief}\n\n這一節的考卷錯題：\n${s.mistakes.map(mistakeBrief).join('\n\n')}\n` : ''}
處理原則：
- must 的問題全部處理；should 的問題，在能讓學生更好懂、又不會讓內容變太長時採用。
- 解題者答案和你不同的練習題：自己再仔細想一次決定誰對。你的答案錯，就改 answer、why、solution；題目會讓人誤解（條件不足、可以有兩種解讀）就改題目文字。解題者標 broken 的題一定要修。
- 考卷錯題的題目、選項和正確答案是固定的，不能改；解題者如果和正確答案不同，代表這題容易誤會，講解要把關鍵的判斷說得更清楚。
${info.missing && info.missing.length ? `- 你漏寫了第 ${info.missing.join('、')} 題的考卷錯題 block，這次一定要補上。\n` : ''}- 程式檢查的格式問題全部修好。
- 輸出${fmt}；不要只回傳修改的部分，也不要附上 i、j、id，考卷錯題 block 也不要附上題目、選項、answer、yours（只要 type、qno、think、optionWhy、remember）。
- 改完再逐題檢查一次。

${STYLE}

${MCQ_FORMAT}

${mode === 'lesson' ? MISTAKE_FORMAT + '\n\n' + DEMOS + '\n\n' : ''}生物審稿意見：
${JSON.stringify((info.bio && info.bio.issues) || [])}
學生視角審稿意見：
${JSON.stringify((info.student && info.student.issues) || [])}
獨立解題者和你不同的地方：
${JSON.stringify(info.bad)}
程式檢查出的問題：
${JSON.stringify(info.errs)}

你寫的內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

// ---------------------------------------------------------------- one unit of work
async function runUnit(mode, item) {
  const tag = item.id
  const clean = res => mode === 'lesson' ? cleanLesson(res, item.id) : cleanExam(res, item.types)
  const schema = mode === 'lesson' ? SECTION_SCHEMA : EXAM_SCHEMA
  const report = { id: tag, writeDropped: [], fixDropped: [] }

  const written = await agent(writePrompt(mode, item), { label: `write:${tag}`, phase: 'Write', schema, effort: 'high' })
  if (!written) return { id: tag, error: 'writer returned nothing' }
  let c = clean(written); report.writeDropped = c.dropped
  let unit = c
  const errs = textProblems(mode === 'lesson' ? { blocks: unit.blocks } : { problems: unit.problems })
  const view = solverView(mode, unit)

  const [solved, bio, student] = await parallel([
    () => agent(solvePrompt(view.items), { label: `solve:${tag}`, phase: 'Verify', schema: SOLVE_SCHEMA, effort: 'high' }),
    () => agent(bioReviewPrompt(mode, unit), { label: `bio:${tag}`, phase: 'Verify', schema: REVIEW_SCHEMA, effort: 'high' }),
    () => agent(studentReviewPrompt(mode, unit), { label: `student:${tag}`, phase: 'Verify', schema: REVIEW_SCHEMA, effort: 'high' }),
  ])
  const bad = judge(view, solved)
  report.firstPass = { solverDisagreements: bad.length, keyDisputes: bad.filter(b => b.mistake), bioIssues: ((bio && bio.issues) || []).length, studentIssues: ((student && student.issues) || []).length, format: errs.length }
  log(`${tag}: ${bad.length} solver disagreements (${report.firstPass.keyDisputes.length} on test questions), ${report.firstPass.bioIssues} bio issues, ${report.firstPass.studentIssues} student issues, ${errs.length} format problems`)

  const fixed = await agent(fixPrompt(mode, item, unit, { bio, student, bad, errs, missing: c.missing }), { label: `fix:${tag}`, phase: 'Fix', schema, effort: 'high' })
  if (fixed) {
    const c2 = clean(fixed)
    report.fixDropped = c2.dropped
    const n0 = view.items.length, n1 = solverView(mode, c2).items.length
    const lostMistakes = mode === 'lesson' && (c2.missing || []).some(q => !(c.missing || []).includes(q))
    if (n1 >= Math.ceil(n0 * 0.6) && !lostMistakes) unit = c2
    else log(`${tag}: fixer output lost too much (${n1}/${n0} items${lostMistakes ? ', dropped a test question' : ''}); keeping the first draft`)
  } else log(`${tag}: fixer returned nothing; keeping the first draft`)

  const errs2 = textProblems(mode === 'lesson' ? { blocks: unit.blocks } : { problems: unit.problems })
  const view2 = solverView(mode, unit)
  const solved2 = await agent(solvePrompt(view2.items), { label: `recheck:${tag}`, phase: 'Recheck', schema: SOLVE_SCHEMA, effort: 'high' })
  const bad2 = judge(view2, solved2)
  Object.assign(report, finalize(mode, unit, bad2), { remainingProblems: errs2, recheckDisagreements: bad2, missingMistakes: unit.missing || [] })
  log(`${tag}: done; dropped ${report.droppedVariants.length} variants, ${report.droppedItems.length} whole items, ${report.keyDisputes.length} test-question disputes, ${errs2.length} remaining format problems`)
  const out = { id: tag, report }
  if (mode === 'lesson') out.blocks = unit.blocks; else out.problems = unit.problems
  return out
}

// ---------------------------------------------------------------- main
const mode = args.mode
const items = mode === 'lesson' ? args.ids.map(id => ({ id })) : args.batches.map((types, i) => ({ id: 'x' + (i + 1), types }))
phase('Write')
const results = await parallel(items.map(it => () => runUnit(mode, it)))
return { mode, results: results.map((r, i) => r || { id: items[i].id, error: 'unit failed' }) }
