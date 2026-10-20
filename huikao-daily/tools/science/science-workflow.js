export const meta = {
  name: 'science-bank',
  description: 'Write 會考 自然 (生物、理化) questions per unit, blind-solve, review (science teacher + weak-student lenses), fix, re-solve, top up thin units',
  phases: [
    { title: 'Write', detail: 'one author per batch of units' },
    { title: 'Verify', detail: 'blind solver + science reviewer + weak-student reviewer + diagram checks' },
    { title: 'Fix', detail: 'author revises with every finding' },
    { title: 'Recheck', detail: 'fresh blind solve; disputed or too-easy questions dropped' },
    { title: 'Top-up', detail: 'more questions for units that kept fewer than 5' },
  ],
}

// ---------------------------------------------------------------- shared rules
const STYLE = `寫作對象與規則：
- 對象：台灣國三學生，數學基礎不穩（國一、國二的比例和方程式都沒學好），用手機自己讀。他說過「講得太專業我看不懂」。
- 繁體中文、台灣國中課本用語、全形標點。
- 句子短，一句只講一件事；一個段落最多三句。
- 每個計算步驟都寫出來，不跳步；不要用「顯然」「易知」「同理可得」「故得證」。
- 先講「長什麼樣子、怎麼認出來」，再講規則，最後才講為什麼。
- 可以用老師常用的說法（「A 字型」「X 字型（沙漏型）」「上 : 下」「上 : 全」「母子相似」），第一次出現時說清楚指哪幾段。
- 數學符號只用 Unicode，絕對不用 LaTeX、不用 $：線段寫 AB，∠ABC、△ABC、∥、⊥、∼（相似，例如 △ADE ∼ △ABC）、x²、√3、×、÷、°；等號用「＝」；比寫成「AD : DB ＝ 2 : 1」（冒號兩邊各空一格）。
- 要寫成上下排的分數，在文字裡用 [[分子/分母]]，例如 [[AD/AB]] ＝ [[DE/BC]]、[[3/5]]，網頁會畫成直式分數；簡單的分數也可以直接寫 3/5。
- 重點詞可以用 **粗體**。不要用 emoji。
- 選擇題的選項會被打亂順序，所以 why、hints、solution 都不可以用「(A)」「選項一」「第二個選項」這種說法指稱選項，要直接說選項的內容。`

const DIAGRAM_RULES = `圖（diagram）用座標描述，網頁會把它畫出來，程式也會檢查座標是否真的符合宣告，所以要先計算再填：
{ "w": 240, "h": 180,
  "points": [{"id":"A","x":120,"y":24,"label":"A","pos":"n"}],
  "segments": [{"a":"A","b":"B","style":"solid"}],
  "lengths": [{"a":"A","b":"D","text":"6","side":"l"}],
  "fills": [{"pts":["A","D","E"],"tone":"accent"}],
  "rightAngles": [{"at":"C","a":"A","b":"B"}],
  "arcs": [{"at":"B","a":"A","b":"C","n":1}],
  "ticks": [{"a":"A","b":"D","n":1}],
  "parallel": [["D","E","B","C"]],
  "on": [["D","A","B"]],
  "grid": {"step":20,"x0":20,"y0":20,"cols":10,"rows":7},
  "axes": {"ox":40,"oy":160,"unit":20},
  "scale": true }
欄位說明：
- w、h：畫布寬高（像素），用 240×180、240×200 或 260×200。y 往下變大。
- points：label 是顯示的字（省略＝同 id，空字串＝不顯示）；pos 是標籤放在點的哪一側：n s e w ne nw se sw。
- segments：style 可用 solid（實線）、dashed（虛線，輔助線）、accent（藍色粗線，強調）、faint（淡線）。
- lengths：在線段中間標文字（長度、x、?）；side 是 l 或 r，指沿 a→b 方向看的左側或右側，請標在圖形外側。
- fills：塗色區域，tone 用 accent（藍）、warn（黃）、ok（綠）。
- rightAngles：在 at 點畫直角記號（at→a 與 at→b 垂直）。
- arcs：角的弧線記號；n（1、2、3）相同代表角度相等。不同大小的角要用不同的 n。
- ticks：等長記號；n 相同代表等長。
- parallel：宣告兩線段平行，會畫上平行箭頭。
- on：宣告點在線段上，例如 ["D","A","B"] 表示 D 在線段 AB 上（延長線上的點，請改宣告「另一個點在線段上」）。
- grid（可省略）：方格紙，從 (x0,y0) 開始，每格 step 像素，cols×rows 格。點要放在格點上。
- axes（可省略）：坐標軸，原點在像素 (ox,oy)，每 1 單位 unit 像素。
- scale：true 表示標了數字的長度是按比例畫的（程式會檢查誤差在 15% 內）；故意示意不按比例才填 false。
規則：
- 所有點離畫布邊界至少 16 像素。
- 題目說平行，座標就要真的平行，並寫在 parallel；說某點在某線段上，座標就要真的在上面，並寫在 on；直角要真的是 90°，並寫在 rightAngles。
- 先決定比例（例如 1 單位＝12 像素）再算座標，讓 scale 可以填 true。
- 圖只是幫助理解：題目文字必須寫出所有條件，不看圖也能做。`

const DEMOS = `可用的互動小工具（demo），只有這三個：
- slide：△ABC 中 DE ∥ BC，學生拖動 D 點，畫面即時顯示 AD、DB、AE、EC、DE、BC 的長度和各組比值。mode "A"：D 只能在 AB 上（A 字型）；mode "AX"：D 可以拖過 A 點到延長線上，變成 X 字型。
- scale：相似比 k 可選 1～4，大三角形被切成 k² 個小三角形，畫面列出邊長比、周長比、面積比。
- mother：直角三角形 ABC（∠C ＝ 90°）與斜邊上的高 CD，可以切換標示三個相似三角形並列出對應邊。`

const OUTLINE = `全份教學「相似形・比例線段」的節次：
s0 暖身：比例式三招
s1 A 字型：平行線截出成比例的線段
s2 X 字型與三條平行線
s3 反過來用：比例相等就平行；中點連線
s4 相似形：形狀一樣、大小可以不同
s5 三角形相似的判定：AA、SAS、SSS
s6 相似比帶出的周長比、高比、面積比
s7 直角三角形：母子相似與特殊直角三角形
s8 生活應用：影子、鏡子與測量
s9 會考實戰（綜合題）`

const SECTIONS = {
  s0: { title: '暖身：比例式三招', need: '例題 3 題、check 2 個', brief: `目的：讓基礎不穩的學生先把後面一直會用到的比例計算練熟。這節不是重點，要短，大約 6～9 個 block。
1. 比 a : b 和比值 [[a/b]]；比的前項、後項可以同乘或同除一個不是 0 的數（化簡比）。
2. 比例式 a : b ＝ c : d 時，「外項乘積＝內項乘積」：a × d ＝ b × c（交叉相乘）。例題：x : 6 ＝ 4 : 3 → 3x ＝ 24 → x ＝ 8。也示範把比寫成兩個分數相等再交叉相乘。
3. 「設 k」：a : b ＝ 2 : 3 時，可以設 a ＝ 2k、b ＝ 3k。例題：a : b ＝ 2 : 3 且 a ＋ b ＝ 20，求 a。
4. 連比（簡短）：a : b ＝ 2 : 3、b : c ＝ 4 : 5 → 把 b 化成相同（3 和 4 的最小公倍數 12）→ a : b : c ＝ 8 : 12 : 15。
trap：交叉相乘時乘錯對角（寫成 a × c ＝ b × d）。
check 2 個：(1) 含 x 的比例式求解，例如 (x ＋ 1) : 4 ＝ 3 : 2 這類，答案整數；(2) 連比加總分配：給 a : b、b : c 和 a ＋ b ＋ c，求其中一個。` },
  s1: { title: 'A 字型：平行線截出成比例的線段', need: '例題 3 題、check 3 個', brief: `這是整份教學最重要的一節，要寫得最仔細，大約 14～18 個 block。
情境：△ABC 中，D 在 AB 上、E 在 AC 上，DE ∥ BC。這個圖形叫「A 字型」（像字母 A：頂點 A 在上，DE 是中間那一橫，BC 是底）。
1. 先教怎麼認出 A 字型：一個三角形裡，有一條線和底邊平行，切過另外兩邊。附圖（fig），把小三角形 ADE 塗色。
2. 核心想法：小三角形 ADE 是大三角形 ABC 縮小後的樣子（形狀一樣），所以對應的邊會成比例。
3. 兩組比例（用 key 寫清楚，並說明「上」「下」「全」各指哪一段：上＝AD 或 AE（頂點到平行線），下＝DB 或 EC（平行線到底邊），全＝AB 或 AC）：
   第一組「上 : 下 ＝ 上 : 下」：AD : DB ＝ AE : EC
   第二組「上 : 全 ＝ 上 : 全 ＝ 小底 : 大底」：AD : AB ＝ AE : AC ＝ DE : BC
4. 放互動小工具 {"type":"demo","name":"slide","mode":"A"}，前面一句話說明：「拖動 D 點，看看哪些比永遠相等。」
5. trap：DE : BC 不能配「上 : 下」。例如 AD ＝ 6、DB ＝ 3、BC ＝ 12。錯：DE : 12 ＝ 6 : 3 → DE ＝ 24（比底邊還長，一看就不對）；對：DE : 12 ＝ 6 : 9 → DE ＝ 8。
6. 例題 3 個（steps 每步一行，附圖）：
   (1) AD ＝ 6、DB ＝ 3、AE ＝ 8，求 EC（第一組）。
   (2) AD ＝ 6、DB ＝ 3、BC ＝ 12，求 DE（第二組，強調先算 AB ＝ 9）。
   (3) AD ＝ x、DB ＝ 4、AE ＝ 6、EC ＝ 8，求 x（列比例式、交叉相乘）。
7. why（想知道為什麼？）：用「同高的三角形，面積比＝底邊比」說明 AD : DB ＝ AE : EC：△ADE 與 △BDE 同高 → 面積比是 AD : DB；△ADE 與 △CED 同高 → 面積比是 AE : EC；△BDE 和 △CED 有同一條底 DE，又因為 DE ∥ BC 所以高相等 → 面積相等。所以兩個比相等。寫得淺白，附圖。
8. check 3 個：
   (1) 給上、下、上，求另一個下（可以用含 x 的版本）。
   (2) 求 DE（給 AD、DB、BC），錯誤選項要包含用「上 : 下」算出的答案。
   (3) 反向：給 DE、BC、AD，求 DB 或 AB（要先用上 : 全，再算下）。` },
  s2: { title: 'X 字型與三條平行線', need: '例題 3 題、check 3 個', brief: `大約 12～16 個 block。
1. X 字型（沙漏型）：AB ∥ CD，AD 和 BC 交於 O（O 在兩條平行線中間）。兩個三角形 OAB 和 ODC 在 O 點上下相對，像沙漏。
   規則（key）：OA : OD ＝ OB : OC ＝ AB : DC。強調「對應」：和 A 在同一條直線上的是 D（A、O、D 共線），所以 OA 對 OD。
2. 放互動小工具 {"type":"demo","name":"slide","mode":"AX"}：說明「把 D 點拖過 A 點，A 字型就變成 X 字型，比例關係不變」。
3. 例題：X 字型求邊長（例如 OA ＝ 4、OD ＝ 6、AB ＝ 5，求 CD）。
4. 三條平行線：L₁ ∥ L₂ ∥ L₃，兩條直線 m、n 被它們截出線段；m 依序交於 A、B、C，n 依序交於 D、E、F，則 AB : BC ＝ DE : EF（也可以寫 AB : AC ＝ DE : DF）。m、n 不必平行。附圖。
   trap：成比例的是 m、n 上被截出的線段；平行線上的線段（AD、BE、CF）不一定是這個比。
5. 例題：三條平行線，含 x 的比例式。
6. 梯形中的平行線：梯形 ABCD（AD ∥ BC，AD 是上底、BC 是下底），E 在 AB 上、F 在 CD 上，EF ∥ BC。方法：畫對角線 AC 交 EF 於 G，EF 被分成 EG 和 GF，各在一個 A 字型裡算（△ABC 中 EG ∥ BC；△CDA 中 GF ∥ AD）。附圖（對角線畫虛線）。例題一題（數字不要用 AD ＝ 6、BC ＝ 14、AE : EB ＝ 3 : 1）。
   補一句：E、F 是兩腰中點時，EF ＝（上底 ＋ 下底）÷ 2（梯形中線），是這個方法的特例。
7. check 3 個：(1) X 字型求邊；(2) 三條平行線含 x；(3) 梯形中平行線段長。` },
  s3: { title: '反過來用：比例相等就平行；中點連線', need: '例題 3 題、check 3 個', brief: `大約 12～15 個 block。
1. 反過來用：如果 AD : DB ＝ AE : EC（或 AD : AB ＝ AE : AC），那麼 DE ∥ BC。用來判斷兩條線有沒有平行。例題：給四個長度，判斷 DE 是否平行 BC（一組平行、一組不平行，都要算給學生看）。
2. trap：只知道 AD : AB ＝ DE : BC，不能說 DE ∥ BC。用淺白的話加圖說明：以 D 為圓心、DE 長為半徑畫弧，可能和 AC 交在兩個點，只有其中一個點會讓 DE ∥ BC。（學生只要記住：判斷平行要用兩條邊上的線段，不能用底邊。）
3. 中點連線：D、E 分別是 AB、AC 的中點，則 DE ∥ BC，而且 DE ＝ [[1/2]] BC。說明由來：AD : DB ＝ 1 : 1 ＝ AE : EC → 平行；AD : AB ＝ 1 : 2 → DE 是 BC 的一半。附圖（用 ticks 標等長）。
4. 例題：三邊中點連成的小三角形，周長是原三角形周長的一半（例：原三角形三邊 8、10、12）。
5. 例題或說明：任意四邊形四邊中點連成的四邊形是平行四邊形，它的周長＝兩條對角線長的和（每一邊都是某條對角線的一半）。附圖（對角線用虛線）。
6. check 3 個：(1) 給數字判斷哪一組線段平行（四個選項是四種說法）；(2) 中點連線求長度或周長；(3) 中點四邊形的周長（給對角線長）或相關。` },
  s4: { title: '相似形：形狀一樣、大小可以不同', need: '例題 2 題、check 3 個', brief: `大約 10～14 個 block。
1. 相似的意思：一個圖形放大或縮小後，能和另一個圖形完全疊合，就說它們相似（形狀一樣，大小可以不同）。生活例子：影印放大 150%、地圖、照片縮放。
2. 多邊形相似要同時滿足兩件事（key）：對應角都相等；對應邊都成比例。缺一不可。
   用圖說明兩個反例：長方形 4 × 2 和正方形 3 × 3（角都是 90°，但邊不成比例 → 不相似）；邊長都是 3 的菱形和正方形（邊成比例，但角不相等 → 不相似）。
3. 一定相似的圖形：所有正方形、所有正三角形、所有圓、邊數相同的正多邊形。
4. 記號與對應：四邊形 ABCD ∼ 四邊形 EFGH 表示 A 對 E、B 對 F、C 對 G、D 對 H，寫的順序就是對應的順序。相似比＝對應邊的比，例如 AB : EF。
   trap：用「圖上看起來的位置」配對，而不是用字母順序配對，會配錯邊。
5. 例題：四邊形 ABCD ∼ 四邊形 EFGH，給 AB、BC、EF，求 FG；並指出哪兩個角相等（∠B ＝ ∠F）。
6. check 3 個：(1) 下列哪一組圖形一定相似（含長方形、菱形這類陷阱）；(2) 由相似記號找對應邊求長度（三角形或四邊形，故意讓兩個圖形擺放方向不同）；(3) 放大縮小或比例尺的應用（例：照片放大後的長寬、地圖上的距離）。` },
  s5: { title: '三角形相似的判定：AA、SAS、SSS', need: '例題 2 題、check 3 個', brief: `大約 14～18 個 block。
1. 三角形比較特別：不用把三個角、三個邊都檢查完，只要下面任一條就相似（key）：
   AA：兩個角對應相等（第三個角自動相等，因為內角和是 180°）。最常用！
   SAS：兩邊成比例，而且這兩邊的「夾角」相等。
   SSS：三邊都成比例。
   「夾角」要解釋：兩條邊相交形成的那個角。
2. 怎麼找對應：先找相等的角，相等的角就是對應頂點；對應頂點寫在相同位置（△ABC ∼ △DEF 表示 ∠A ＝ ∠D …）。
3. 常見圖形（每個配小圖）：
   A 字型：DE ∥ BC → 同位角相等 → △ADE ∼ △ABC（AA）。
   X 字型：對頂角相等＋平行線的內錯角相等 → AA。
   斜 A 字型（反 A 字型）：△ABC 中 D 在 AB 上、E 在 AC 上，DE 不平行 BC，但 ∠ADE ＝ ∠C。共用 ∠A ＋ ∠ADE ＝ ∠ACB → △ADE ∼ △ACB（注意順序：D 對 C、E 對 B）。所以 AD : AC ＝ AE : AB ＝ DE : CB，也就是 AD × AB ＝ AE × AC。
4. trap：「兩邊成比例＋其中一邊的對角相等」（不是夾角）不能判定相似；也提醒斜 A 字型最容易把對應寫反（寫成 AD : AB ＝ AE : AC）。
5. 例題：斜 A 字型求長度（數字不要用 AD ＝ 3、AE ＝ 4、AC ＝ 6）；SAS 判定的例題（兩個三角形給兩邊與夾角，算比例判斷是否相似，再求第三邊）。
6. check 3 個：(1) 下列哪一個條件不能保證兩個三角形相似；(2) 斜 A 字型求長度（錯誤選項要包含把對應寫反的答案）；(3) 給兩個三角形的三邊（順序打亂），判斷是否相似並找出對應、求相似比或某個對應角。` },
  s6: { title: '相似比帶出的周長比、高比、面積比', need: '例題 3 題、check 3 個', brief: `大約 12～16 個 block。
1. 若兩個三角形相似，相似比（邊長比）是 a : b，則（key）：周長比 ＝ a : b；對應高、對應中線的比 ＝ a : b；面積比 ＝ a² : b²。
2. 為什麼面積是平方：底和高都變成 k 倍，面積變成 k × k ＝ k² 倍。放互動小工具 {"type":"demo","name":"scale"}，說明「k ＝ 2 時，大三角形剛好可以切成 4 個小三角形」。
3. A 字型的面積：AD : AB ＝ 2 : 3 → △ADE : △ABC ＝ 4 : 9 → △ADE : 四邊形 DBCE ＝ 4 : 5。例題：給 △ABC 面積，求四邊形 DBCE 的面積。
   trap：面積比要用「上 : 全」平方，不是「上 : 下」平方；四邊形 DBCE 的面積要用「全」減「上」。
4. 反過來：面積比 9 : 16 → 邊長比 3 : 4（開根號）。例題一題。
5. 梯形的兩條對角線：梯形 ABCD，AD ∥ BC，對角線交於 O，AD : BC ＝ 1 : 2。△AOD ∼ △COB（X 字型）→ 面積比 1 : 4。再用「同高的三角形面積比＝底邊比」：△AOD : △AOB ＝ OD : OB ＝ 1 : 2，所以四塊面積比是 1 : 2 : 2 : 4（△AOB 和 △COD 一樣大）。附圖、例題（給一塊面積求整個梯形）。
6. check 3 個：(1) A 字型中求四邊形 DBCE 的面積；(2) 由面積比反求邊長或周長；(3) 梯形對角線分成的四塊面積。` },
  s7: { title: '直角三角形：母子相似與特殊直角三角形', need: '例題 3 題、check 3 個', brief: `大約 12～16 個 block。
1. 母子相似：△ABC 中 ∠ACB ＝ 90°，CD ⊥ AB 於 D（CD 是斜邊上的高）。圖中有三個直角三角形：大的 △ACB、左邊的 △ADC、右邊的 △CDB，三個都相似（每個都有一個直角，又兩兩共用一個銳角 → AA）。放互動小工具 {"type":"demo","name":"mother"}。
2. 由相似推出的三個常用結果（key），每個都示範怎麼從相似比推出來，不要只叫學生背：
   CD² ＝ AD × DB（由 △ADC ∼ △CDB：AD : CD ＝ CD : DB）
   AC² ＝ AD × AB（由 △ADC ∼ △ACB）
   BC² ＝ BD × BA（由 △CDB ∼ △ACB）
   另外，面積算兩次：AC × BC ＝ AB × CD（求斜邊上的高最快）。
3. 例題：AD ＝ 4、DB ＝ 9，求 CD，再求 AC。
4. 特殊直角三角形（108 課綱九年級）：所有 30°－60°－90° 的三角形都相似，所以邊長比固定：短股（對 30° 的邊）: 長股 : 斜邊 ＝ 1 : √3 : 2；所有 45°－45°－90° 的三角形邊長比是 1 : 1 : √2。附圖。例題：30°－60°－90° 三角形斜邊 10，求兩股。
   trap：對 30° 的邊才是最短的「1」，不要把 √3 和 2 的位置放錯。
5. check 3 個：(1) 母子相似求 CD 或 AD；(2) 母子相似求股長（AC² ＝ AD × AB 型，或結合畢氏定理）；(3) 特殊直角三角形求邊長。` },
  s8: { title: '生活應用：影子、鏡子與測量', need: '例題 3 題、check 3 個', brief: `大約 12～15 個 block。
1. 同一時間的影子：陽光可以看成平行光，所以同一時間、同一地點，直立物體的「高 : 影長」都一樣（兩個直角三角形 AA 相似）。例題：竹竿 1.5 公尺、影長 2 公尺，同時大樓影長 24 公尺，求樓高。附圖。
2. 路燈下的人影：光從一個點（燈）發出，燈桿、人、影子形成 A 字型。例題：路燈高 6 公尺，身高 1.5 公尺的人站在離燈桿 9 公尺處，求影長。附圖（燈頂、人頭、影子末端在同一直線上）。
3. 鏡子反射：入射角＝反射角，所以兩個直角三角形相似（AA）。例題：把鏡子平放在地上，人退到剛好從鏡子裡看到樹頂的位置，求樹高。附圖。
4. 測量不能直接量的距離（池塘、河寬）：用 X 字型或 A 字型。簡單說明一種。
5. 解應用題三步驟（key）：畫圖 → 找出相似的兩個三角形並寫對應 → 列比例式計算。
6. check 3 個：(1) 同時刻的影子（可含兩個物體或單位換算）；(2) 路燈人影（例如求人走到某處時影子多長，或求燈高）；(3) 鏡子或測量池塘寬（X 字型）。` },
}

const EXAM_TYPES = {
  e01: { section: 's1', desc: 'A 字型含代數：DE ∥ BC，邊長用含 x 的式子表示，列比例式解出 x 再求某一段。' },
  e02: { section: 's6', desc: 'A 字型＋面積：DE ∥ BC，給線段比與某一塊面積，求四邊形 DBCE 或其他部分面積。' },
  e03: { section: 's2', desc: '平行四邊形中的 X 字型：平行四邊形 ABCD，E 在 CD 上，BE 與對角線 AC 交於 F，給 DE : EC，求 AF : FC、某段長或某塊面積。' },
  e04: { section: 's2', desc: '梯形內的平行線段：EF ∥ 兩底，E、F 不是中點，求 EF（要畫對角線拆成兩個 A 字型）。' },
  e05: { section: 's2', desc: '三條平行線截兩直線：含 x，或給部分長度求另一段，再求總長。' },
  e06: { section: 's3', desc: '中點連線綜合：三角形或四邊形的中點連線，求周長、某邊長，或判斷中點四邊形的形狀（例如原四邊形對角線相等 → 中點四邊形是菱形）。' },
  e07: { section: 's3', desc: '用比例判斷平行：一個三角形中有幾組點，給各段長度，判斷哪一條線段平行於某邊。' },
  e08: { section: 's5', desc: '斜 A 字型：∠ADE ＝ ∠C（或 ∠AED ＝ ∠B），求某一段長，或用 AD × AB ＝ AE × AC。' },
  e09: { section: 's5', desc: '相似判定：下列哪一個條件不能保證兩個三角形相似，或哪一組三角形相似（含 SSA 陷阱或對應錯誤）。' },
  e10: { section: 's6', desc: '由面積比反推：兩個相似三角形的面積比，求周長、對應邊或對應高。' },
  e11: { section: 's6', desc: '梯形對角線分出的四塊面積：給兩底比或其中一塊面積，求其他塊或整個梯形面積。' },
  e12: { section: 's7', desc: '母子相似＋畢氏定理：直角三角形斜邊上的高，求高、線段或面積。' },
  e13: { section: 's5', desc: '三角形內接正方形或長方形：正方形一邊在三角形的底邊上，或放在直角三角形的直角處，用相似求邊長。' },
  e14: { section: 's8', desc: '影子與測量：同時刻影子（含部分影子落在牆上），或路燈下人影長度的變化。' },
  e15: { section: 's5', desc: '摺紙：長方形紙摺疊後產生相似三角形，求某段長。' },
  e16: { section: 's4', desc: '方格紙或坐標平面上的相似三角形：判斷哪兩個三角形相似，或求相似比、對應點坐標（用 grid 或 axes 畫圖）。' },
}

const BANK_TOPICS = {
  b01: '平行線截比例線段（A 字型）：給線段比與一段長，要先求全長或另一段再求所求（兩步以上）。',
  b02: 'A 字型＋面積比：求四邊形 DBCE 或其他部分的面積。',
  b03: '平行四邊形中的 X 字型：求線段比或某個三角形的面積。',
  b04: '梯形內的平行線段長（E、F 不是中點）。',
  b05: '三條平行線截兩直線（含代數式）。',
  b06: '中點連線：周長、邊長或中點四邊形的形狀。',
  b07: '斜 A 字型（∠ADE ＝ ∠C）：求線段長。',
  b08: '母子相似（直角三角形斜邊上的高）：求高或線段。',
  b09: '相似三角形的面積比反推邊長或周長。',
  b10: '梯形兩條對角線分成的四個三角形面積。',
  b11: '路燈下的人影，或同時刻影子（含落在牆上的影子）。',
  b12: '三角形內接正方形，或摺紙產生的相似三角形。',
}

// ---------------------------------------------------------------- schemas
const S = { type: 'string' }
const PT = { type: 'object', properties: { id: S, x: { type: 'number' }, y: { type: 'number' }, label: S, pos: S }, required: ['id', 'x', 'y'] }
const AB = { type: 'object', properties: { a: S, b: S, style: S }, required: ['a', 'b'] }
const DIAGRAM = { type: 'object', properties: {
  w: { type: 'number' }, h: { type: 'number' },
  points: { type: 'array', items: PT },
  segments: { type: 'array', items: AB },
  lengths: { type: 'array', items: { type: 'object', properties: { a: S, b: S, text: S, side: S }, required: ['a', 'b', 'text'] } },
  fills: { type: 'array', items: { type: 'object', properties: { pts: { type: 'array', items: S }, tone: S }, required: ['pts'] } },
  rightAngles: { type: 'array', items: { type: 'object', properties: { at: S, a: S, b: S }, required: ['at', 'a', 'b'] } },
  arcs: { type: 'array', items: { type: 'object', properties: { at: S, a: S, b: S, n: { type: 'integer' } }, required: ['at', 'a', 'b'] } },
  ticks: { type: 'array', items: { type: 'object', properties: { a: S, b: S, n: { type: 'integer' } }, required: ['a', 'b'] } },
  parallel: { type: 'array', items: { type: 'array', items: S } },
  on: { type: 'array', items: { type: 'array', items: S } },
  grid: { type: 'object', properties: { step: { type: 'number' }, x0: { type: 'number' }, y0: { type: 'number' }, cols: { type: 'integer' }, rows: { type: 'integer' } } },
  axes: { type: 'object', properties: { ox: { type: 'number' }, oy: { type: 'number' }, unit: { type: 'number' } } },
  scale: { type: 'boolean' },
}, required: ['points'] }
const MCQ = { type: 'object', properties: {
  stem: S, diagram: DIAGRAM,
  options: { type: 'array', items: S, minItems: 4, maxItems: 4 },
  answer: { type: 'integer', minimum: 0, maximum: 3 },
  why: { type: 'array', items: S, minItems: 4, maxItems: 4 },
  hints: { type: 'array', items: S, minItems: 2, maxItems: 2 },
  solution: { type: 'array', items: S, minItems: 1 },
}, required: ['stem', 'options', 'answer', 'why', 'hints', 'solution'] }
const BLOCK = { type: 'object', properties: {
  type: { type: 'string', enum: ['p', 'key', 'fig', 'demo', 'example', 'trap', 'why', 'check'] },
  text: S, title: S, lines: { type: 'array', items: S },
  diagram: DIAGRAM, caption: S,
  name: S, mode: S,
  stem: S, steps: { type: 'array', items: S }, final: S, value: { type: 'number' },
  wrong: S, right: S, reason: S,
  skill: S, variants: { type: 'array', items: MCQ },
}, required: ['type'] }
const SECTION_SCHEMA = { type: 'object', properties: { blocks: { type: 'array', items: BLOCK, minItems: 4 } }, required: ['blocks'] }
const EXAM_SCHEMA = { type: 'object', properties: { problems: { type: 'array', items: { type: 'object', properties: { type: S, title: S, variants: { type: 'array', items: MCQ, minItems: 1 } }, required: ['type', 'variants'] } } }, required: ['problems'] }
const BQ = { type: 'object', properties: { stem: S, diagram: DIAGRAM, options: { type: 'array', items: S, minItems: 4, maxItems: 4 }, answer: { type: 'integer', minimum: 0, maximum: 3 }, explanation: S }, required: ['stem', 'options', 'answer', 'explanation'] }
const BANK_SCHEMA = { type: 'object', properties: { families: { type: 'array', items: { type: 'object', properties: { key: S, topic: S, difficulty: { type: 'string', enum: ['中', '難'] }, members: { type: 'array', items: BQ, minItems: 1 } }, required: ['key', 'topic', 'difficulty', 'members'] } } }, required: ['families'] }
const SOLVE_SCHEMA = { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: {
  id: S, answer: { type: 'integer' }, final: S, value: { type: 'number' },
  confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, broken: { type: 'boolean' }, too_easy: { type: 'boolean' }, note: S,
}, required: ['id', 'confidence', 'broken'] } } }, required: ['results'] }
const REVIEW_SCHEMA = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: {
  where: S, severity: { type: 'string', enum: ['must', 'should'] }, problem: S, fix: S,
}, required: ['where', 'severity', 'problem', 'fix'] } } }, required: ['issues'] }
const DFIX_SCHEMA = { type: 'object', properties: { fixes: { type: 'array', items: { type: 'object', properties: { where: S, diagram: DIAGRAM }, required: ['where', 'diagram'] } } }, required: ['fixes'] }

// ---------------------------------------------------------------- helpers (plain JS; no Date/Math.random)
const clone = x => JSON.parse(JSON.stringify(x))
const txt = s => (typeof s === 'string' ? s.trim() : '')
const r1 = x => Math.round(x * 10) / 10
const hasDiagram = b => !!(b && b.diagram && Array.isArray(b.diagram.points) && b.diagram.points.length >= 2)
function parseNum(t) {
  const s = String(t).replace(/\s/g, '')
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const m = /^(\d+)\/(\d+)$/.exec(s)
  return m ? Number(m[1]) / Number(m[2]) : NaN
}

function validateDiagram(d, where) {
  const errs = []
  const w = Number(d.w) || 240, h = Number(d.h) || 180
  const P = {}
  for (const p of d.points || []) {
    if (!p || typeof p.id !== 'string' || !isFinite(p.x) || !isFinite(p.y)) { errs.push(`${where}：有一個點的格式不對`); continue }
    P[p.id] = p
    if (p.x < 12 || p.x > w - 12 || p.y < 12 || p.y > h - 12) errs.push(`${where}：點 ${p.id}（${r1(p.x)}, ${r1(p.y)}）太靠近畫布邊界或超出 ${w}×${h}`)
  }
  const okIds = (ids, what) => { const m = (ids || []).filter(id => !P[id]); if (m.length) { errs.push(`${where}：${what}用到不存在的點 ${m.join('、')}`); return false } return true }
  const V = (a, b) => [P[b].x - P[a].x, P[b].y - P[a].y]
  const L = v => Math.hypot(v[0], v[1])
  const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / ((L(u) * L(v)) || 1)))) * 180 / Math.PI
  for (const s of d.segments || []) okIds([s.a, s.b], `線段 ${s.a}${s.b} `)
  for (const s of d.lengths || []) okIds([s.a, s.b], `長度標示 ${s.a}${s.b} `)
  for (const f of d.fills || []) okIds(f.pts, '塗色區域')
  for (const q of d.parallel || []) {
    if (!Array.isArray(q) || q.length !== 4) { errs.push(`${where}：parallel 每組要 4 個點`); continue }
    if (!okIds(q, '平行宣告')) continue
    const a = ang(V(q[0], q[1]), V(q[2], q[3])), off = Math.min(a, 180 - a)
    if (off > 0.8) errs.push(`${where}：宣告 ${q[0]}${q[1]} ∥ ${q[2]}${q[3]}，但座標的夾角是 ${r1(off)}°`)
  }
  for (const q of d.on || []) {
    if (!Array.isArray(q) || q.length !== 3) { errs.push(`${where}：on 每組要 3 個點`); continue }
    if (!okIds(q, '在線段上宣告')) continue
    const ab = V(q[1], q[2]), ap = V(q[1], q[0]), l = L(ab) || 1
    const dist = Math.abs(ab[0] * ap[1] - ab[1] * ap[0]) / l, t = (ab[0] * ap[0] + ab[1] * ap[1]) / (l * l)
    if (dist > 1.5 || t < -0.01 || t > 1.01) errs.push(`${where}：宣告 ${q[0]} 在線段 ${q[1]}${q[2]} 上，但座標離線段 ${r1(dist)} 像素（位置參數 ${t.toFixed(2)}，應在 0～1）`)
  }
  for (const r of d.rightAngles || []) {
    if (!okIds([r.at, r.a, r.b], '直角記號')) continue
    const a = ang(V(r.at, r.a), V(r.at, r.b))
    if (Math.abs(a - 90) > 0.8) errs.push(`${where}：∠${r.a}${r.at}${r.b} 標成直角，但座標算出 ${r1(a)}°`)
  }
  const group = arr => { const g = {}; for (const x of arr) { const n = Number.isInteger(x.n) ? x.n : 1; (g[n] = g[n] || []).push(x) } return g }
  const ag = group((d.arcs || []).filter(x => okIds([x.at, x.a, x.b], '角記號')))
  for (const n of Object.keys(ag)) {
    if (ag[n].length < 2) continue
    const vals = ag[n].map(x => ang(V(x.at, x.a), V(x.at, x.b)))
    if (Math.max(...vals) - Math.min(...vals) > 1.5) errs.push(`${where}：n=${n} 的角記號代表相等的角，但座標算出 ${vals.map(r1).join('°、')}°`)
  }
  const tg = group((d.ticks || []).filter(x => okIds([x.a, x.b], '等長記號')))
  for (const n of Object.keys(tg)) {
    if (tg[n].length < 2) continue
    const vals = tg[n].map(x => L(V(x.a, x.b)))
    if ((Math.max(...vals) - Math.min(...vals)) / Math.max(...vals) > 0.03) errs.push(`${where}：n=${n} 的等長記號，線段像素長卻是 ${vals.map(r1).join('、')}`)
  }
  if (d.scale !== false) {
    const rs = []
    for (const s of d.lengths || []) { if (!P[s.a] || !P[s.b]) continue; const v = parseNum(s.text); if (v > 0) rs.push({ k: `${s.a}${s.b}＝${s.text}`, r: L(V(s.a, s.b)) / v }) }
    if (rs.length >= 2) {
      const mx = Math.max(...rs.map(x => x.r)), mn = Math.min(...rs.map(x => x.r))
      if (mx / mn > 1.15) errs.push(`${where}：標了數字的長度沒有按比例（每單位像素：${rs.map(x => x.k + ' → ' + r1(x.r)).join('；')}）；請重算座標，若確定是示意圖就把 scale 設為 false`)
    }
  }
  return errs
}

// every object that carries a diagram, with a path like blocks[3].variants[1]
function diagramSlots(root) {
  const out = []
  const visit = (node, path) => {
    if (Array.isArray(node)) { node.forEach((x, i) => visit(x, `${path}[${i}]`)); return }
    if (!node || typeof node !== 'object') return
    for (const k of Object.keys(node)) {
      if (k === 'diagram') { if (node.diagram && typeof node.diagram === 'object') out.push({ where: path || '(root)', node }) }
      else if (node[k] && typeof node[k] === 'object') visit(node[k], path ? `${path}.${k}` : k)
    }
  }
  visit(root, '')
  return out
}
function textProblems(root) {
  const out = []
  const visit = (node, path) => {
    if (typeof node === 'string') {
      if (/\$|\\frac|\\sqrt|\\\(|\\cdot|\\times|\\angle|\\triangle/.test(node)) out.push(`${path}：用了 LaTeX 或 $，請改成 Unicode 純文字`)
      if (/(why|hints|solution|explanation|steps)/.test(path) && /\([A-D]\)|（[A-D]）|選項\s*[一二三四ABCD]|第[一二三四]個選項|[A-D]\s*選項/.test(node)) out.push(`${path}：用選項位置指稱選項（選項會被打亂），請改成直接說內容`)
      return
    }
    if (Array.isArray(node)) { node.forEach((x, i) => visit(x, `${path}[${i}]`)); return }
    if (node && typeof node === 'object') for (const k of Object.keys(node)) if (k !== 'diagram') visit(node[k], path ? `${path}.${k}` : k)
  }
  visit(root, '')
  return out
}
function checkAll(root) {
  const errs = textProblems(root)
  for (const s of diagramSlots(root)) errs.push(...validateDiagram(s.node.diagram, s.where))
  return errs
}

function cleanMCQ(q) {
  if (!q || !txt(q.stem) || !Array.isArray(q.options) || q.options.length !== 4) return null
  const opts = q.options.map(txt)
  if (opts.some(o => !o) || new Set(opts).size !== 4) return null
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return null
  if (!Array.isArray(q.why) || q.why.length !== 4) return null
  const hints = (q.hints || []).map(txt).filter(Boolean).slice(0, 2), solution = (q.solution || []).map(txt).filter(Boolean)
  if (hints.length < 2 || !solution.length) return null
  const out = { stem: txt(q.stem), options: opts, answer: q.answer, why: q.why.map(txt), hints, solution }
  if (hasDiagram(q)) out.diagram = q.diagram
  return out
}
function cleanLesson(sec, sid) {
  const blocks = [], dropped = []
  let ci = 0, ei = 0
  for (const b0 of (sec && sec.blocks) || []) {
    const b = clone(b0), t = b.type
    if (t === 'p') { if (txt(b.text)) blocks.push({ type: t, text: txt(b.text) }); else dropped.push('empty p'); continue }
    if (t === 'key' || t === 'why') {
      const lines = (b.lines || []).map(txt).filter(Boolean)
      if (!lines.length) { dropped.push(t + ' without lines'); continue }
      const o = { type: t, title: txt(b.title), lines }; if (hasDiagram(b)) o.diagram = b.diagram; blocks.push(o); continue
    }
    if (t === 'fig') { if (!hasDiagram(b)) { dropped.push('fig without diagram'); continue } blocks.push({ type: t, diagram: b.diagram, caption: txt(b.caption) }); continue }
    if (t === 'demo') {
      if (!['slide', 'scale', 'mother'].includes(b.name)) { dropped.push('unknown demo ' + b.name); continue }
      const o = { type: t, name: b.name }; if (b.name === 'slide') o.mode = b.mode === 'AX' ? 'AX' : 'A'; blocks.push(o); continue
    }
    if (t === 'example') {
      const steps = (b.steps || []).map(txt).filter(Boolean)
      if (!txt(b.stem) || !steps.length) { dropped.push('example without stem/steps'); continue }
      const o = { type: t, id: `${sid}e${++ei}`, stem: txt(b.stem), steps, final: txt(b.final) }
      if (typeof b.value === 'number' && isFinite(b.value)) o.value = b.value
      if (hasDiagram(b)) o.diagram = b.diagram
      blocks.push(o); continue
    }
    if (t === 'trap') { if (!txt(b.wrong) || !txt(b.right)) { dropped.push('trap incomplete'); continue } blocks.push({ type: t, wrong: txt(b.wrong), right: txt(b.right), reason: txt(b.reason) }); continue }
    if (t === 'check') {
      const vs = (b.variants || []).map(cleanMCQ).filter(Boolean)
      if (!vs.length) { dropped.push('check with no usable variant'); continue }
      const id = `${sid}c${++ci}`
      vs.forEach((v, j) => { v.id = `${id}v${j + 1}` })
      blocks.push({ type: t, id, skill: txt(b.skill), variants: vs }); continue
    }
    dropped.push('unknown block type ' + t)
  }
  return { blocks, dropped }
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
function cleanBank(res, keys) {
  const families = [], dropped = [], seen = {}
  for (const f of (res && res.families) || []) {
    const key = txt(f.key)
    if (!keys.includes(key) || seen[key]) { dropped.push('bad or duplicate family key ' + key); continue }
    const members = []
    for (const m of f.members || []) {
      if (!m || !txt(m.stem) || !Array.isArray(m.options) || m.options.length !== 4 || !Number.isInteger(m.answer) || m.answer < 0 || m.answer > 3 || !txt(m.explanation)) continue
      const opts = m.options.map(txt); if (opts.some(o => !o) || new Set(opts).size !== 4) continue
      const o = { stem: txt(m.stem), options: opts, answer: m.answer, explanation: txt(m.explanation) }
      if (hasDiagram(m)) o.diagram = m.diagram
      members.push(o)
    }
    if (!members.length) { dropped.push(key + ' has no usable member'); continue }
    seen[key] = true
    members.forEach((m, j) => { m.id = `${key}m${j}` })
    families.push({ key, topic: txt(f.topic), difficulty: f.difficulty === '中' ? '中' : '難', members })
  }
  return { families, dropped }
}

// items for a blind solver, and a map id -> answer key
function solverView(mode, unit) {
  const items = [], key = {}
  if (mode === 'lesson') {
    for (const b of unit.blocks) {
      if (b.type === 'example') { items.push({ id: b.id, kind: 'free', stem: b.stem }); key[b.id] = { kind: 'free', final: b.final, value: b.value } }
      if (b.type === 'check') for (const v of b.variants) { items.push({ id: v.id, kind: 'mc', stem: v.stem, options: v.options }); key[v.id] = { kind: 'mc', answer: v.answer, options: v.options } }
    }
  } else if (mode === 'exam') {
    for (const p of unit.problems) for (const v of p.variants) { items.push({ id: v.id, kind: 'mc', stem: v.stem, options: v.options }); key[v.id] = { kind: 'mc', answer: v.answer, options: v.options } }
  } else {
    for (const f of unit.families) for (const m of f.members) { items.push({ id: m.id, kind: 'mc', stem: m.stem, options: m.options }); key[m.id] = { kind: 'mc', answer: m.answer, options: m.options } }
  }
  return { items, key }
}
function normFinal(s) {
  let t = String(s || '').replace(/\s/g, '').replace(/＝/g, '=').replace(/：/g, ':').replace(/，/g, ',')
  const i = t.lastIndexOf('='); if (i >= 0) t = t.slice(i + 1)
  return t.replace(/(公分|公尺|平方公分|平方公尺|cm|m)$/g, '')
}
function judge(view, solved, mode) {
  const by = new Map(((solved && solved.results) || []).map(r => [r.id, r]))
  const bad = []
  for (const it of view.items) {
    const r = by.get(it.id), k = view.key[it.id]
    if (!r) { bad.push({ id: it.id, why: 'solver gave no answer' }); continue }
    if (r.broken) { bad.push({ id: it.id, why: 'solver marked broken: ' + (r.note || '') }); continue }
    if (mode === 'bank' && r.too_easy) { bad.push({ id: it.id, why: 'solver: too easy (one step)' }); continue }
    if (k.kind === 'mc') {
      if (r.answer !== k.answer) bad.push({ id: it.id, why: `答案不同：答案鍵 ${k.answer}「${k.options[k.answer]}」，解題者 ${r.answer}「${k.options[r.answer] || '?'}」（${r.confidence}）${r.note ? '；' + r.note : ''}` })
    } else {
      const sameNum = typeof k.value === 'number' && typeof r.value === 'number' && Math.abs(k.value - r.value) <= 1e-6 * Math.max(1, Math.abs(k.value))
      if (!sameNum && normFinal(k.final) !== normFinal(r.final)) bad.push({ id: it.id, why: `例題答案不同：寫的是「${k.final}」${typeof k.value === 'number' ? '（' + k.value + '）' : ''}，解題者算出「${r.final || ''}」${typeof r.value === 'number' ? '（' + r.value + '）' : ''}${r.note ? '；' + r.note : ''}`, example: true })
    }
  }
  return bad
}
// strip what failed the recheck
function finalize(mode, unit, bad) {
  const badMc = new Set(bad.filter(b => !b.example).map(b => b.id))
  const report = { droppedVariants: [], droppedItems: [], exampleMismatch: bad.filter(b => b.example) }
  if (mode === 'lesson') {
    unit.blocks = unit.blocks.filter(b => {
      if (b.type !== 'check') return true
      const keep = b.variants.filter(v => !badMc.has(v.id))
      for (const v of b.variants) if (badMc.has(v.id)) report.droppedVariants.push(v.id)
      b.variants = keep
      if (!keep.length) { report.droppedItems.push(b.id); return false }
      return true
    })
  } else if (mode === 'exam') {
    unit.problems = unit.problems.filter(p => {
      const keep = p.variants.filter(v => !badMc.has(v.id))
      for (const v of p.variants) if (badMc.has(v.id)) report.droppedVariants.push(v.id)
      p.variants = keep
      if (!keep.length) { report.droppedItems.push(p.type); return false }
      return true
    })
  } else {
    unit.families = unit.families.filter(f => {
      const keep = f.members.filter(m => !badMc.has(m.id))
      for (const m of f.members) if (badMc.has(m.id)) report.droppedVariants.push(m.id)
      f.members = keep
      if (!keep.length) { report.droppedItems.push(f.key); return false }
      return true
    })
  }
  return report
}
// annotate indices so reviewers can point at blocks[i].variants[j]
function indexed(mode, unit) {
  if (mode === 'lesson') return { blocks: unit.blocks.map((b, i) => Object.assign({ i }, b, b.variants ? { variants: b.variants.map((v, j) => Object.assign({ j }, v)) } : {})) }
  if (mode === 'exam') return { problems: unit.problems.map((p, i) => Object.assign({ i }, p, { variants: p.variants.map((v, j) => Object.assign({ j }, v)) })) }
  return { families: unit.families.map((f, i) => Object.assign({ i }, f, { members: f.members.map((m, j) => Object.assign({ j }, m)) })) }
}

// ---------------------------------------------------------------- prompts
const MCQ_FORMAT = `選擇題格式：{"stem":"...","diagram":{...}（可省略）,"options":["","","",""],"answer":正確選項索引0-3,"why":["","","",""],"hints":["",""],"solution":["",""]}
- why：每個選項各一句。錯的選項寫「選這個通常是……（哪裡想錯）」，正確的寫一句肯定加理由。
- hints：提示 1 只點出要找什麼圖形或用哪個規則；提示 2 列出式子但不算出答案。
- solution：完整步驟，每步一個字串。
- 錯誤選項要來自真實常見錯誤（例如把「上 : 下」拿去比底邊、對應寫反、面積比忘了平方）。
- 數字設計成答案乾淨（整數或簡單分數）。`

function writePrompt(mode, item) {
  if (mode === 'lesson') {
    const s = SECTIONS[item.id]
    return `你是台灣國中數學老師，正在為一位學生寫手機上的互動教學頁「相似形・比例線段」。這次只寫其中一節。

${STYLE}

${OUTLINE}

這一節：${item.id} ${s.title}
這一節要教的內容與順序：
${s.brief}

這一節需要：${s.need}；每個 check 要有 3 個 variants（同一個觀念、同樣難度，但數字或圖形不同；學生按「換一題」會換到下一個）。

輸出 blocks 陣列，照畫面由上到下的順序。可用的 block：
- {"type":"p","text":"..."}：一段講解（最多三句）。
- {"type":"key","title":"...","lines":["...","..."]}：重點框（規則、口訣），每行一條。
- {"type":"fig","diagram":{...},"caption":"..."}：一張圖。
- {"type":"demo","name":"...","mode":"..."}：互動小工具。
- {"type":"example","stem":"...","diagram":{...},"steps":["...","..."],"final":"...","value":數字}：例題。學生會一步一步按「下一步」看 steps。final 是最後答案的簡短寫法（例：「EC ＝ 4」），value 是答案的數值（答案不是單一數值就不要填 value）。
- {"type":"trap","wrong":"...","right":"...","reason":"..."}：常見錯誤：錯的做法、對的做法、為什麼。
- {"type":"why","title":"想知道為什麼？","lines":["...","..."],"diagram":{...}}：折疊的原理說明（圖可省略）。
- {"type":"check","skill":"這題練什麼（一句）","variants":[題,題,題]}：「你試試」選擇題。
${MCQ_FORMAT}

${DEMOS}

${DIAGRAM_RULES}

寫完逐題自己重算一次：每個 check 的 answer 指向唯一正確的選項，每個例題的 final 與 value 正確，每張圖的座標符合宣告。`
  }
  if (mode === 'exam') {
    return `你是台灣國中數學老師，正在為互動教學頁「相似形・比例線段」的最後一節「會考實戰」出題。學生學完前面各節後，用這些題目檢驗自己。

${STYLE}

${OUTLINE}

請出下列題型，每個題型 3 個 variants（同觀念、同難度，數字或情境不同，答案數值也不同）。難度接近國中教育會考的中、難題：要兩步以上推理，不是直接套一個公式。
${item.types.map(t => `${t}（對應 ${EXAM_TYPES[t].section}）：${EXAM_TYPES[t].desc}`).join('\n')}

輸出 problems 陣列，每個元素 {"type":"題型代號（例如 ${item.types[0]}）","title":"題型名稱（10 字內）","variants":[題,題,題]}。
${MCQ_FORMAT}

${DIAGRAM_RULES}

寫完逐題自己重算一次，確認 answer 指向唯一正確的選項、每張圖的座標符合宣告。`
  }
  return `你是台灣的國中數學老師，要為一個依遺忘曲線出題的國中會考練習網站，補充「連比例與相似形」單元中「比例線段與相似三角形」的題目。學生學完這單元後，這些題目會在隔天、三天、一週……之後反覆出現。

${STYLE.replace('- 要寫成上下排的分數，在文字裡用 [[分子/分母]]，例如 [[AD/AB]] ＝ [[DE/BC]]、[[3/5]]，網頁會畫成直式分數；簡單的分數也可以直接寫 3/5。', '- 分數直接寫 3/5、AD/AB（這個網站不支援直式分數）。').replace('- 重點詞可以用 **粗體**。不要用 emoji。', '- 不要用 **粗體**、不要用 emoji。')}

每個主題寫一個 family：一題原題＋2 題替身（同觀念、同解法，換數字與情境，答案數值不同）。學生複習時會看到替身而不是原題，所以三題都要能單獨成立。
主題（key：內容）：
${item.keys.map(k => `${k}：${BANK_TOPICS[k]}`).join('\n')}

輸出 families 陣列，每個元素 {"key":"主題 key","topic":"細目名稱（10 字內，例如「平行線截比例線段」）","difficulty":"中或難","members":[原題, 替身1, 替身2]}。
每題格式：{"stem":"...","diagram":{...}（可省略，幾何題最好有）,"options":["","","",""],"answer":正確選項索引0-3,"explanation":"完整步驟，每步一行（換行分隔），最後一句說明其他選項錯在哪裡"}。
- 難度：會考中、難題，要兩步以上；不要出一步就能答的題。
- 錯誤選項要來自真實常見錯誤；數字設計成答案乾淨。

${DIAGRAM_RULES}

寫完逐題自己重算一次，確認 answer 指向唯一正確的選項、每張圖的座標符合宣告。`
}

function solvePrompt(items) {
  return `你是嚴格的國中數學閱卷老師。下面是一批題目，沒有附答案。請逐題獨立完整計算，一題都不能跳過：
- 選擇題（kind ＝ "mc"）：answer 填你算出的正確選項索引（0～3）。
- 計算題（kind ＝ "free"）：answer 填 -1，final 填最後答案的簡短寫法，value 填數值（答案不是單一數值就不要填 value）。
- 只依題目文字作答；文字沒寫的條件不能自己假設（不會附圖）。
- broken：條件不足、有矛盾、看不懂、沒有正確選項或不只一個正確選項、超出國中範圍 → true，note 寫原因。
- too_easy：一步就能答、純背誦或直接代一個公式 → true。
- confidence：high / medium / low。
題目（JSON）：
${JSON.stringify(items)}`
}

function mathReviewPrompt(mode, unit, errs) {
  const what = mode === 'lesson' ? '一節教學內容' : mode === 'exam' ? '「會考實戰」題組' : '題庫新題（每個 family 是原題＋替身）'
  return `你是審稿的資深國中數學老師（台灣 108 課綱），請嚴格審查下面這份${what}（JSON）。只回報真的有問題的地方，每個問題寫出具體的修改方式。
檢查：
1. 每個數學敘述、每個計算步驟是否正確；比例的對應是否正確（特別是「上 : 下」與「上 : 全」、相似三角形頂點的對應順序）。
2. 每個選擇題：answer 指向的選項是否唯一正確，其他三個是否真的錯；why／explanation 的說法是否正確；hints 會不會誤導；solution 是否完整。
3. 例題的 steps 每步是否正確，final 與 value 是否正確。
4. 圖：座標和文字是否一致（哪個點在哪條邊上、平行、直角、長度比例），標籤會不會讓人誤解。程式檢查發現的問題：
${errs.length ? errs.map(e => '  - ' + e).join('\n') : '  （沒有）'}
5. 是否超出 108 課綱國中範圍，或用到國中沒教的東西（三角函數 sin、cos、向量等）。
6. 同一組的 variants／替身是否真的是同一個觀念、同樣難度，又不是只換一個數字的重複題。
7. 題目文字是否完整到不看圖也能做。
severity：must（錯誤，一定要改）或 should（建議）。where 用 JSON 路徑，例如 blocks[5].variants[2]、problems[1].variants[0]、families[0].members[2]（索引從 0 開始，物件裡的 i、j 就是索引）。
內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

function studentReviewPrompt(mode, unit) {
  return `請你扮演一個台灣國三學生：數學基礎不穩，國一、國二的比例、方程式都學得不好，現在要靠這份教學自己學會「相似形・比例線段」。你說過：「講得太專業我看不懂」。
請像真的學生一樣從頭讀下面這份${mode === 'lesson' ? '教學（其中一節）' : '「會考實戰」題組'}（JSON），然後回報：
- 哪一句看不懂、哪個詞沒解釋過（例如「對應」「夾角」「截」「共線」）；
- 哪裡跳步，讓你不知道數字從哪裡來；
- 哪裡句子太長、一次塞太多；
- 哪裡需要一張圖或更具體的例子；
- 你實際試做每個選擇題的第一個 variant：寫下你直覺會選哪個、卡在哪裡；提示 1、提示 2 有沒有幫上忙；選錯時 why 說的原因你看不看得懂。
每個問題都要給「改成這樣比較好懂」的具體寫法。severity：must（不改就學不會）或 should。where 用 JSON 路徑，例如 blocks[5].variants[0]（物件裡的 i、j 就是索引）。
不要回報數學正確性（另一位老師會查），專心在「看不看得懂、學不學得會」。
內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

function fixPrompt(mode, item, unit, info) {
  const fmt = mode === 'lesson' ? '同樣的 blocks 格式，回傳完整的一節（所有 blocks）' : mode === 'exam' ? '同樣的 problems 格式，回傳完整的題組（所有題型、所有 variants）' : '同樣的 families 格式，回傳完整的所有 family（key 不變）'
  return `你是這份內容的作者。下面是你寫的內容（JSON）、審稿意見、獨立解題者和你答案不同的題目，以及程式檢查出的問題。請改出最終版。
${mode === 'lesson' ? `這一節：${item.id} ${SECTIONS[item.id].title}\n要教的內容：\n${SECTIONS[item.id].brief}\n` : ''}
處理原則：
- must 的問題全部處理；should 的問題，在能讓學生更好懂、又不會讓內容變太長時採用。
- 解題者答案和你不同的題：自己再仔細完整算一次決定誰對。你的答案錯，就改 answer、why、solution（或 explanation）；題目會讓人誤解（條件不足、可以有兩種解讀、要看圖才知道）就改題目文字。解題者標 broken 或 too_easy 的題一定要修。
- 程式檢查的圖形與格式問題全部修好（圖要重新計算座標）。
- 輸出${fmt}；不要只回傳修改的部分，也不要附上 i、j、id 欄位。
- 改完再逐題驗算一次。

${STYLE}

${mode === 'lesson' ? MCQ_FORMAT + '\n\n' + DEMOS + '\n\n' : mode === 'exam' ? MCQ_FORMAT + '\n\n' : ''}${DIAGRAM_RULES}

數學審稿意見：
${JSON.stringify((info.math && info.math.issues) || [])}
${mode !== 'bank' ? `學生視角審稿意見：\n${JSON.stringify((info.student && info.student.issues) || [])}\n` : ''}獨立解題者和你不同的地方：
${JSON.stringify(info.bad)}
程式檢查出的問題：
${JSON.stringify(info.errs)}

你寫的內容（JSON）：
${JSON.stringify(indexed(mode, unit))}`
}

function diagramFixPrompt(slots, errs) {
  return `下面這些圖的座標和宣告不一致（程式檢查結果附在後面）。請逐張重新計算座標，讓所有宣告都成立：平行就真的平行、在線段上就真的在線段上、直角就是 90°、等長記號真的等長、標了數字的長度按比例（或確定是示意圖時把 scale 設為 false）。保持圖的樣子和題意一致（點的相對位置不要大改），其他欄位照原樣保留。
${DIAGRAM_RULES}
回傳 fixes：每張要改的圖一個 {"where": 原本的路徑, "diagram": 修好的完整 diagram}。
程式檢查結果：
${errs.map(e => '- ' + e).join('\n')}
圖（JSON）：
${JSON.stringify(slots.map(s => ({ where: s.where, diagram: s.node.diagram })))}`
}


// ---------------------------------------------------------------- science bank
const SCI = {
  B01: { area: '生物', name: '生命的特性與科學方法', topics: ['生物的特徵', '科學方法與實驗設計（操作變因、控制變因、應變變因、對照組）'] },
  B02: { area: '生物', name: '細胞的構造', topics: ['顯微鏡的使用與放大倍率', '動植物細胞的構造與功能', '單細胞與多細胞、生物體的組成層次'] },
  B03: { area: '生物', name: '物質進出細胞與酵素', topics: ['擴散與滲透', '酵素的作用與影響因素（溫度、酸鹼）'] },
  B04: { area: '生物', name: '植物的養分與光合作用', topics: ['光合作用的原料與產物', '光合作用的實驗（澱粉檢驗、氣泡、對照）', '葉的構造與氣孔'] },
  B05: { area: '生物', name: '人體的消化與吸收', topics: ['消化器官與消化液', '養分的消化與吸收'] },
  B06: { area: '生物', name: '生物體內的運輸', topics: ['植物的運輸（維管束、蒸散作用）', '人體的循環系統（心臟、血管、血液）', '淋巴系統與免疫'] },
  B07: { area: '生物', name: '協調作用', topics: ['神經系統與反射', '內分泌系統與激素', '植物的感應（向性）'] },
  B08: { area: '生物', name: '恆定性', topics: ['呼吸運動與氣體交換', '排泄與腎臟', '體溫與血糖的恆定'] },
  B09: { area: '生物', name: '生殖', topics: ['細胞分裂與減數分裂', '無性生殖', '植物與動物的有性生殖'] },
  B10: { area: '生物', name: '遺傳', topics: ['孟德爾遺傳與棋盤方格', '人類的遺傳（ABO 血型、性別決定）', '突變與生物技術'] },
  B11: { area: '生物', name: '演化與分類', topics: ['化石與演化的證據', '天擇', '分類階層、二名法與生物的分界'] },
  B12: { area: '生物', name: '生態與環境', topics: ['族群與群集', '食物網、能量流動與物質循環', '生物多樣性與環境保育'] },
  P01: { area: '理化', name: '基本測量與密度', topics: ['測量的準確值、估計值與單位換算', '密度的計算與應用（體積排水法）'] },
  P02: { area: '理化', name: '物質的組成與溶液', topics: ['純物質與混合物、分離方法', '溶液的濃度（重量百分濃度、ppm）', '溶解度與飽和溶液'] },
  P03: { area: '理化', name: '波動與聲音', topics: ['波的種類與性質（週期、頻率、波長、波速）', '聲音的三要素、聲速與回聲'] },
  P04: { area: '理化', name: '光', topics: ['光的直進與反射、平面鏡成像', '光的折射與透鏡成像', '色光與物體的顏色'] },
  P05: { area: '理化', name: '溫度與熱', topics: ['溫度與溫度計', '熱量與比熱（H ＝ M × S × ΔT）、熱平衡', '熱的傳播與物質三態變化'] },
  P06: { area: '理化', name: '物質的基本結構', topics: ['原子結構（質子、中子、電子）', '元素與週期表', '分子與化學式'] },
  P07: { area: '理化', name: '化學反應', topics: ['質量守恆定律', '化學反應式與係數平衡', '原子量、分子量（與莫耳，若屬於 108 課綱）'] },
  P08: { area: '理化', name: '氧化與還原', topics: ['氧化反應與元素的活性', '還原反應與煉鐵'] },
  P09: { area: '理化', name: '電解質與酸鹼鹽', topics: ['電解質與解離', '酸鹼的性質與 pH 值', '酸鹼中和與鹽類'] },
  P10: { area: '理化', name: '反應速率與化學平衡', topics: ['影響反應速率的因素', '可逆反應與化學平衡'] },
  P11: { area: '理化', name: '有機化合物', topics: ['有機化合物與烴', '醇、酸、酯與酯化反應', '聚合物、肥皂與清潔劑'] },
  P12: { area: '理化', name: '力與壓力', topics: ['力的測量、合力與摩擦力', '壓力、液體壓力與大氣壓力', '浮力（阿基米德原理）'] },
  P13: { area: '理化', name: '直線運動', topics: ['距離與位移、速率與速度', '加速度', 'x－t 圖與 v－t 圖'] },
  P14: { area: '理化', name: '力與運動', topics: ['牛頓第一、二、三運動定律', '圓周運動與萬有引力（若屬於 108 課綱）'] },
  P15: { area: '理化', name: '功與能', topics: ['功與功率', '動能、位能與力學能守恆', '槓桿、滑輪與輪軸'] },
  P16: { area: '理化', name: '電的基本概念', topics: ['靜電', '電流、電壓、電阻與歐姆定律', '串聯與並聯電路'] },
  P17: { area: '理化', name: '電流的熱效應與化學效應', topics: ['電功率與電能（度）', '電池', '電解與電鍍'] },
  P18: { area: '理化', name: '電與磁', topics: ['磁場與磁力線', '電流的磁效應', '電磁感應'] },
}

const SCI_STYLE = `寫作規則：
- 讀者是台灣國三學生，基礎不穩，用手機作答。他說過「講得太專業我看不懂」。
- 繁體中文、台灣國中自然課本用語（108 課綱，康軒、翰林、南一共同的內容）、全形標點。
- 難度：國中教育會考的中、難題。要有情境、實驗、數據表或圖表判讀，需要兩步以上推理；不要出一步就能答的純背誦題。
- 題目文字要完整，不看圖也能作答。
- 符號用 Unicode，不用 LaTeX、不用 $：化學式 H₂O、CO₂、Na⁺、Cl⁻、SO₄²⁻；單位 g、kg、cm³、g/cm³、°C、N、J、W、V、A、Ω、Hz、m/s、m/s²；等號用「＝」，乘號 ×，除號 ÷，ΔT。
- 需要表格時，每一列寫成一行，格子之間用「｜」分隔，第一列是標題，例如：
  組別｜溫度（°C）｜氣泡數（個/分）
  甲｜20｜12
  乙｜30｜25
- 四個選項的錯誤選項要來自真實常見的迷思或算錯。
- explanation 用網站的格式：每一步一行，開頭寫「第 1 步：」「第 2 步：」…；用淺白的話，專有名詞第一次出現要用一句話解釋；最後一行寫「常見錯誤：」說明其他選項為什麼錯。不可以用「(A)」「選項一」指稱選項（選項會被打亂），要直接說選項內容。
- 不要用 emoji、不要用 **粗體**。`

const SCI_DIAGRAM = `圖（diagram，可省略）：只在題目真的需要看圖表時使用，主要是坐標圖（x－t 圖、v－t 圖、溫度－時間圖、溶解度曲線等）。用下面的格式畫：axes 給原點位置與每 1 單位的像素；資料點用 points（label 可以是空字串），折線用 segments 連起來；軸的名稱用沒有被線段用到的點當文字標籤（例如放在軸的末端，label 寫「時間（s）」）。電路、實驗裝置請用文字描述，不要畫。
${DIAGRAM_RULES}`

const S_SCHEMA = { type: 'object', properties: { questions: { type: 'array', items: { type: 'object', properties: {
  unit: S, topic: S, difficulty: { type: 'string', enum: ['中', '難'] }, stem: S, diagram: DIAGRAM,
  options: { type: 'array', items: S, minItems: 4, maxItems: 4 }, answer: { type: 'integer', minimum: 0, maximum: 3 }, explanation: S,
}, required: ['unit', 'topic', 'difficulty', 'stem', 'options', 'answer', 'explanation'] } } }, required: ['questions'] }

function cleanSci(res, units, tag) {
  const out = [], dropped = [], count = {}
  for (const q of (res && res.questions) || []) {
    const unit = txt(q.unit)
    if (!units.includes(unit)) { dropped.push('unexpected unit ' + unit); continue }
    if (!txt(q.stem) || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 || !txt(q.explanation)) { dropped.push('malformed'); continue }
    const opts = q.options.map(txt)
    if (opts.some(o => !o) || new Set(opts).size !== 4) { dropped.push('empty or duplicate options'); continue }
    count[unit] = (count[unit] || 0) + 1
    const o = { id: `${unit}-${tag}${count[unit]}`, unit, topic: txt(q.topic), difficulty: q.difficulty === '中' ? '中' : '難', stem: txt(q.stem), options: opts, answer: q.answer, explanation: txt(q.explanation) }
    if (hasDiagram(q)) o.diagram = q.diagram
    out.push(o)
  }
  return { questions: out, dropped }
}
const sciView = qs => ({ items: qs.map(q => ({ id: q.id, kind: 'mc', stem: q.stem, options: q.options })), key: Object.fromEntries(qs.map(q => [q.id, { kind: 'mc', answer: q.answer, options: q.options }])) })
const sciIndexed = qs => ({ questions: qs.map((q, i) => Object.assign({ i }, q)) })
const unitList = units => units.map(u => `${u}「${SCI[u].area}・${SCI[u].name}」：${SCI[u].topics.join('；')}`).join('\n')

function sciWritePrompt(units, n) {
  return `你是台灣資深國中自然科老師，要為一個依遺忘曲線出題的國中會考練習網站出「自然」的題目。學生答對後，這題會在隔天、三天、一週……後再出現。
請為下面每個單元各出 ${n} 題四選一選擇題，平均分配到該單元的各個主題；難度「中」和「難」大約各半：
${unitList(units)}
如果某個主題不在 108 課綱國中範圍內，就改出同單元其他主題，不要出超綱題。

${SCI_STYLE}

${SCI_DIAGRAM}

輸出 questions 陣列，每題 {"unit":"單元代號（例如 ${units[0]}）","topic":"細目（10 字內）","difficulty":"中或難","stem":"...","diagram":{...}（可省略）,"options":["","","",""],"answer":正確選項索引 0～3,"explanation":"第 1 步：…\\n第 2 步：…\\n常見錯誤：…"}。
寫完逐題自己重新作答一次，確認 answer 指向唯一正確的選項，數字計算正確，用詞符合國中課本。`
}
function sciReviewPrompt(units, qs, errs) {
  return `你是審題的資深國中自然科老師（台灣 108 課綱）。請嚴格審查下面這批會考練習題（JSON），只回報真的有問題的地方，每個問題寫出具體的改法。
這批題目的單元：
${unitList(units)}
檢查：
1. 科學內容是否正確、和國中課本說法一致；計算與單位是否正確。
2. answer 指向的選項是否唯一正確，其他三個是否真的錯（特別注意「下列何者正確／錯誤」題的每個選項）。
3. explanation 每一步是否正確，「常見錯誤」說的原因是否正確。
4. 是否超出 108 課綱國中範圍，或用到國中沒教的東西。
5. 是否太簡單（一步就能答、純背誦）；同一單元的題目是否重複。
6. 題目文字是否完整到不看圖也能作答；表格格式（每列一行、「｜」分隔）是否正確。
程式檢查發現的格式／圖形問題：
${errs.length ? errs.map(e => '  - ' + e).join('\n') : '  （沒有）'}
severity：must（錯誤，一定要改）或 should（建議）。where 用 JSON 路徑，例如 questions[3]（物件裡的 i 就是索引）。
題目（JSON）：
${JSON.stringify(sciIndexed(qs))}`
}
function sciStudentPrompt(qs) {
  return `請你扮演一個台灣國三學生：自然科基礎不穩，說過「講得太專業我看不懂」。下面是一批自然選擇題（JSON），每題有 explanation（做完後看的解析）。
請你先自己試做幾題，然後專心讀每一題的 explanation，回報：哪一步看不懂、哪個詞沒解釋、哪裡跳步、哪裡句子太長；題目本身有沒有讀不懂的地方。
每個問題給具體的「改成這樣比較好懂」的寫法。severity：must（不改就看不懂）或 should。where 用 JSON 路徑，例如 questions[3]。不要回報科學內容對不對（另一位老師會查）。
題目（JSON）：
${JSON.stringify(sciIndexed(qs))}`
}
function sciFixPrompt(units, qs, info) {
  return `你是這批自然題目的作者。下面是你寫的題目（JSON）、審題意見、獨立作答者和你答案不同的題，以及程式檢查出的問題。請改出最終版。
單元：
${unitList(units)}
- must 全部處理；should 在能讓學生更好懂、又不會讓內容變太長時採用。
- 作答者和你答案不同的題：自己再完整做一次決定誰對；你錯就改 answer 和 explanation；題目會讓人誤解就改題目文字。作答者標 broken 或 too_easy 的題一定要修（太簡單就改成需要兩步推理）。
- 圖形與格式問題全部修好。
- 輸出同樣格式的 questions 陣列，回傳全部題目（不要只回傳改過的），不要附上 i、id 欄位。改完逐題再作答一次。

${SCI_STYLE}

${SCI_DIAGRAM}

科學老師審題意見：
${JSON.stringify((info.review && info.review.issues) || [])}
學生視角意見：
${JSON.stringify((info.student && info.student.issues) || [])}
獨立作答者和你不同的地方：
${JSON.stringify(info.bad)}
程式檢查出的問題：
${JSON.stringify(info.errs)}

你寫的題目（JSON）：
${JSON.stringify(sciIndexed(qs))}`
}
function sciTopupPrompt(unit, n, have) {
  return `你是台灣資深國中自然科老師。單元 ${unit}「${SCI[unit].area}・${SCI[unit].name}」（主題：${SCI[unit].topics.join('；')}）還需要 ${n} 題會考練習題。已經有的題目開頭如下，新題不要和它們重複：
${have.map(s => '- ' + s.slice(0, 60).replace(/\n/g, ' ')).join('\n')}

${SCI_STYLE}

${SCI_DIAGRAM}

輸出 questions 陣列，每題的 unit 都填 ${unit}。寫完逐題自己重新作答一次。`
}

async function runSci(batch) {
  const units = batch.units, tag = batch.id
  const report = { id: tag }
  const written = await agent(sciWritePrompt(units, batch.n), { label: `write:${tag}`, phase: 'Write', schema: S_SCHEMA, effort: 'high' })
  if (!written) return { id: tag, error: 'writer returned nothing', questions: [] }
  let c = cleanSci(written, units, 'w'); report.writeDropped = c.dropped
  let qs = c.questions
  const errs = checkAll({ questions: qs })
  const view = sciView(qs)
  const [solved, review, student] = await parallel([
    () => agent(solvePrompt(view.items).replace('國中數學閱卷老師', '國中自然科閱卷老師'), { label: `solve:${tag}`, phase: 'Verify', schema: SOLVE_SCHEMA, effort: 'high' }),
    () => agent(sciReviewPrompt(units, qs, errs), { label: `review:${tag}`, phase: 'Verify', schema: REVIEW_SCHEMA, effort: 'high' }),
    () => agent(sciStudentPrompt(qs), { label: `student:${tag}`, phase: 'Verify', schema: REVIEW_SCHEMA, effort: 'medium' }),
  ])
  const bad = judge(view, solved, 'bank')
  report.firstPass = { written: qs.length, solverDisagreements: bad.length, reviewIssues: ((review && review.issues) || []).length, studentIssues: ((student && student.issues) || []).length, diagramOrFormat: errs.length }
  log(`${tag}: ${qs.length} written; ${bad.length} solver disagreements, ${report.firstPass.reviewIssues} review issues, ${report.firstPass.studentIssues} student issues`)
  const fixed = await agent(sciFixPrompt(units, qs, { review, student, bad, errs }), { label: `fix:${tag}`, phase: 'Fix', schema: S_SCHEMA, effort: 'high' })
  if (fixed) {
    c = cleanSci(fixed, units, 'f'); report.fixDropped = c.dropped
    if (c.questions.length >= Math.ceil(qs.length * 0.7)) qs = c.questions
    else log(`${tag}: fixer output lost too much (${c.questions.length}/${qs.length}); keeping the first draft`)
  }
  let root = { questions: qs }, errs2 = checkAll(root)
  const slots = diagramSlots(root), badWhere = new Set(errs2.map(e => e.split('：')[0])), toFix = slots.filter(s => badWhere.has(s.where))
  if (toFix.length) {
    const df = await agent(diagramFixPrompt(toFix, errs2.filter(e => toFix.some(s => e.startsWith(s.where + '：')))), { label: `diagrams:${tag}`, phase: 'Fix', schema: DFIX_SCHEMA, effort: 'medium' })
    for (const f of (df && df.fixes) || []) { const s = toFix.find(x => x.where === f.where); if (s && f.diagram && Array.isArray(f.diagram.points) && validateDiagram(f.diagram, s.where).length < validateDiagram(s.node.diagram, s.where).length) s.node.diagram = f.diagram }
    for (const s of slots) if (validateDiagram(s.node.diagram, s.where).some(e => e.includes('沒有按比例'))) s.node.diagram.scale = false
    errs2 = checkAll(root)
  }
  // a question whose figure still breaks a declared constraint loses the figure only if its text stands alone (it must by the rules)
  const brokenFig = new Set(errs2.filter(e => /^questions\[\d+\]：/.test(e) && !/LaTeX|指稱選項/.test(e)).map(e => +/^questions\[(\d+)\]/.exec(e)[1]))
  qs.forEach((q, i) => { if (brokenFig.has(i)) delete q.diagram })
  const view2 = sciView(qs)
  const solved2 = await agent(solvePrompt(view2.items).replace('國中數學閱卷老師', '國中自然科閱卷老師'), { label: `recheck:${tag}`, phase: 'Recheck', schema: SOLVE_SCHEMA, effort: 'high' })
  const bad2 = judge(view2, solved2, 'bank'), badIds = new Set(bad2.map(b => b.id))
  report.recheckDropped = bad2
  let kept = qs.filter(q => !badIds.has(q.id))
  // top up thin units
  const per = {}; for (const u of units) per[u] = kept.filter(q => q.unit === u).length
  const thin = units.filter(u => per[u] < 5)
  report.beforeTopup = per
  for (const u of thin) {
    const need = batch.n - per[u]
    const more = await agent(sciTopupPrompt(u, need, kept.filter(q => q.unit === u).map(q => q.stem)), { label: `topup:${u}`, phase: 'Top-up', schema: S_SCHEMA, effort: 'high' })
    let mq = cleanSci(more, [u], 't').questions
    mq = mq.filter((q, i) => checkAll({ questions: [q] }).length === 0)
    if (!mq.length) continue
    const v3 = sciView(mq)
    const s3 = await agent(solvePrompt(v3.items).replace('國中數學閱卷老師', '國中自然科閱卷老師'), { label: `topup-solve:${u}`, phase: 'Top-up', schema: SOLVE_SCHEMA, effort: 'high' })
    const b3 = new Set(judge(v3, s3, 'bank').map(b => b.id))
    kept = kept.concat(mq.filter(q => !b3.has(q.id)))
  }
  const final = {}; for (const u of units) final[u] = kept.filter(q => q.unit === u).length
  report.final = final
  log(`${tag}: kept ${kept.length} (${units.map(u => u + ' ' + final[u]).join(', ')})`)
  return { id: tag, report, questions: kept }
}

phase('Write')
const batches = args.batches.map((units, i) => ({ id: (args.prefix || 'x') + (i + 1), units, n: args.n || 8 }))
const results = await parallel(batches.map(b => () => runSci(b)))
return { results: results.map((r, i) => r || { id: batches[i].id, error: 'batch failed', questions: [] }) }
