export const meta = {
  name: 'huikao-question-bank',
  description: 'Generate 會考 practice questions per batch of units, then blind-solve each batch and keep only questions whose answer is independently confirmed',
  phases: [
    { title: 'Generate', detail: 'one agent per batch of units' },
    { title: 'Verify', detail: 'blind solver per batch; keep only agreed, non-trivial questions' },
    { title: 'Top-up', detail: 'regenerate for units that lost too many questions' },
  ],
}

const MATH_UNITS = {
  M01: { id: 'M01', num: 1, name: '整數的運算', tier: 'A', n: 12, topics: ['正負數、數線與絕對值', '整數的四則運算', '乘方、指數律與科學記號'] },
  M02: { id: 'M02', num: 2, name: '分數的運算', tier: 'A', n: 12, topics: ['因數、倍數與質因數分解', '最大公因數與最小公倍數', '分數的四則運算'] },
  M03: { id: 'M03', num: 3, name: '一元一次方程式', tier: 'B', n: 10, topics: ['文字符號的列式與運算', '解一元一次方程式與應用問題'] },
  M04: { id: 'M04', num: 4, name: '二元一次聯立方程式', tier: 'A', n: 12, topics: ['二元一次方程式', '解二元一次聯立方程式與應用問題'] },
  M05: { id: 'M05', num: 5, name: '二元一次方程式的圖形', tier: 'B', n: 10, topics: ['直角坐標平面', '二元一次方程式的圖形'] },
  M06: { id: 'M06', num: 6, name: '比與比例式', tier: 'C', n: 8, topics: ['比與比例式', '正比與反比'] },
  M07: { id: 'M07', num: 7, name: '一元一次不等式', tier: 'A', n: 12, topics: ['認識一元一次不等式', '解一元一次不等式與應用問題'] },
  M08: { id: 'M08', num: 8, name: '線對稱與三視圖', tier: 'C', n: 8, topics: ['垂直平分與線對稱', '三視圖'] },
  M09: { id: 'M09', num: 9, name: '統計圖表與統計量', tier: 'B', n: 10, topics: ['統計圖表與統計量', '資料整理與分析'] },
  M10: { id: 'M10', num: 10, name: '乘法公式與多項式', tier: 'B', n: 10, topics: ['乘法公式', '多項式'] },
  M11: { id: 'M11', num: 11, name: '平方根與畢氏定理', tier: 'A', n: 12, topics: ['√a 與平方根', '根式的運算', '畢氏定理'] },
  M12: { id: 'M12', num: 12, name: '因式分解與一元二次方程式', tier: 'A', n: 12, topics: ['因式、倍式與因式分解', '解一元二次方程式與應用問題'] },
  M13: { id: 'M13', num: 13, name: '數列與級數', tier: 'A', n: 12, topics: ['數列與等差數列', '等差級數', '等比數列'] },
  M14: { id: 'M14', num: 14, name: '函數', tier: 'B', n: 10, topics: ['函數與函數圖形（一次函數為主）'] },
  M15: { id: 'M15', num: 15, name: '三角形的基本性質', tier: 'A', n: 12, topics: ['內角與外角、尺規作圖', '三角形的全等性質', '三角形的邊角關係'] },
  M16: { id: 'M16', num: 16, name: '平行與四邊形', tier: 'B', n: 10, topics: ['平行', '平行四邊形', '特殊四邊形'] },
  M17: { id: 'M17', num: 17, name: '連比例與相似形', tier: 'A', n: 12, topics: ['連比例', '平行線截比例線段性質', '縮放與相似', '相似三角形的應用'] },
  M18: { id: 'M18', num: 18, name: '圓', tier: 'A', n: 12, topics: ['圓', '點、直線與圓的位置關係', '圓心角、圓周角與弧的關係'] },
  M19: { id: 'M19', num: 19, name: '幾何與證明', tier: 'A', n: 12, topics: ['證明與推理', '三角形的外心、內心與重心'] },
  M20: { id: 'M20', num: 20, name: '二次函數', tier: 'A', n: 12, topics: ['二次函數的圖形', '二次函數的最大值或最小值'] },
  M21: { id: 'M21', num: 21, name: '統計與機率、立體圖形', tier: 'A', n: 12, topics: ['資料的分析（四分位數、盒狀圖）', '機率', '生活中的立體圖形'] },
}

const SOCIAL_UNITS = {
  H01: { id: 'H01', area: '歷史', name: '台灣史前文化與原住民族', n: 6, topics: ['長濱、大坌坑、十三行等文化', '原住民族分布與社會', '南島語族'] },
  H02: { id: 'H02', area: '歷史', name: '荷西時期與鄭氏時期', n: 6, topics: ['荷蘭東印度公司統治與西班牙北部', '郭懷一事件', '鄭成功驅荷、鄭氏屯田與對外貿易'] },
  H03: { id: 'H03', area: '歷史', name: '清領前期的台灣', n: 6, topics: ['渡台禁令與移墾社會', '械鬥與民變（朱一貴、林爽文）', '一府二鹿三艋舺、土地開墾與水利'] },
  H04: { id: 'H04', area: '歷史', name: '清領後期的台灣', n: 6, topics: ['開港通商（茶、糖、樟腦）', '牡丹社事件與沈葆楨', '台灣建省與劉銘傳新政、傳教士'] },
  H05: { id: 'H05', area: '歷史', name: '日治時期的政治與經濟', n: 6, topics: ['台灣民主國與武裝抗日', '總督府、六三法、警察與保甲', '土地與人口調查、米糖經濟、縱貫鐵路、嘉南大圳'] },
  H06: { id: 'H06', area: '歷史', name: '日治時期的社會與文化', n: 6, topics: ['殖民教育', '台灣文化協會、議會設置請願運動、新文學', '皇民化運動與戰時動員'] },
  H07: { id: 'H07', area: '歷史', name: '戰後台灣的政治發展', n: 6, topics: ['接收與二二八事件', '戒嚴、白色恐怖與地方自治', '黨外運動、解嚴、民主化與總統直選'] },
  H08: { id: 'H08', area: '歷史', name: '戰後台灣的經濟與社會', n: 6, topics: ['土地改革', '進口替代、出口擴張、加工出口區、十大建設', '高科技產業與社會變遷'] },
  H09: { id: 'H09', area: '歷史', name: '先秦與秦漢', n: 6, topics: ['商周封建宗法與春秋戰國變局', '諸子百家', '秦統一制度、漢代儒術與絲路'] },
  H10: { id: 'H10', area: '歷史', name: '魏晉南北朝與隋唐', n: 6, topics: ['九品官人法與民族融合', '佛教傳播', '科舉、三省制、安史之亂、唐代對外交流'] },
  H11: { id: 'H11', area: '歷史', name: '宋元明清', n: 6, topics: ['宋代文治、商業與科技', '元朝統治', '明代海禁與鄭和、清代疆域與對外貿易'] },
  H12: { id: 'H12', area: '歷史', name: '晚清變局', n: 6, topics: ['鴉片戰爭與不平等條約、太平天國', '自強運動、甲午戰爭與馬關條約', '戊戌變法、義和團與辛丑條約'] },
  H13: { id: 'H13', area: '歷史', name: '民國成立至中共建政', n: 6, topics: ['辛亥革命、袁世凱與軍閥', '新文化運動與五四、北伐', '對日抗戰與國共內戰'] },
  H14: { id: 'H14', area: '歷史', name: '中華人民共和國與兩岸關係', n: 6, topics: ['大躍進與文化大革命', '改革開放', '兩岸關係變遷'] },
  H15: { id: 'H15', area: '歷史', name: '古文明與古典時代', n: 6, topics: ['兩河、埃及、印度古文明', '希臘城邦與民主、希臘化', '羅馬共和到帝國、基督教興起'] },
  H16: { id: 'H16', area: '歷史', name: '中世紀歐洲與伊斯蘭世界', n: 6, topics: ['封建制度與莊園', '基督教會、十字軍、拜占庭', '伊斯蘭教興起與擴張'] },
  H17: { id: 'H17', area: '歷史', name: '文藝復興、宗教改革與地理大發現', n: 6, topics: ['人文主義與文藝復興', '馬丁路德、喀爾文與宗教改革', '新航路、殖民與哥倫布大交換'] },
  H18: { id: 'H18', area: '歷史', name: '科學革命、啟蒙運動與民主革命', n: 6, topics: ['科學革命與啟蒙思想家', '美國獨立', '法國大革命與拿破崙'] },
  H19: { id: 'H19', area: '歷史', name: '工業革命、民族主義與帝國主義', n: 6, topics: ['工業革命的影響與社會主義', '民族主義與德義統一', '帝國主義瓜分、日本明治維新'] },
  H20: { id: 'H20', area: '歷史', name: '兩次世界大戰', n: 6, topics: ['一戰原因、結果與凡爾賽體系、俄國革命', '經濟大恐慌與極權政權', '二戰與聯合國成立'] },
  H21: { id: 'H21', area: '歷史', name: '冷戰與當代世界', n: 6, topics: ['冷戰對峙、韓戰與越戰', '去殖民化、歐洲整合、蘇聯解體', '全球化與當代議題'] },
  G01: { id: 'G01', area: '地理', name: '地理技能', n: 6, topics: ['地圖要素與比例尺計算', '經緯度與時區', '等高線判讀、GIS 與遙測'] },
  G02: { id: 'G02', area: '地理', name: '台灣的位置、地形與地質', n: 6, topics: ['位置與範圍', '板塊與地震', '五大地形與人類活動'] },
  G03: { id: 'G03', area: '地理', name: '台灣的氣候與水文', n: 6, topics: ['季風、颱風、梅雨與降水分布', '河川特性', '水資源利用'] },
  G04: { id: 'G04', area: '地理', name: '台灣的人口與聚落', n: 6, topics: ['人口成長與結構、少子化高齡化', '人口分布', '聚落類型與都市化'] },
  G05: { id: 'G05', area: '地理', name: '台灣的產業與區域發展', n: 6, topics: ['農業轉型', '工業與服務業', '區域發展差異'] },
  G06: { id: 'G06', area: '地理', name: '台灣的環境問題與災害', n: 6, topics: ['土石流與地層下陷', '空氣污染', '國家公園與保育'] },
  G07: { id: 'G07', area: '地理', name: '中國的地形與氣候', n: 6, topics: ['三級階梯地形', '季風氣候與乾濕分區', '主要河川'] },
  G08: { id: 'G08', area: '地理', name: '中國的人口、產業與區域', n: 6, topics: ['人口分布與人口政策', '農業分區、工業與經濟特區', '區域差異與環境問題'] },
  G09: { id: 'G09', area: '地理', name: '東北亞', n: 6, topics: ['日本的地形與災害', '日本的工業與貿易', '韓國'] },
  G10: { id: 'G10', area: '地理', name: '東南亞與南亞', n: 6, topics: ['熱帶季風氣候', '華人與東協', '印度的人口、宗教與資訊產業'] },
  G11: { id: 'G11', area: '地理', name: '西亞與中亞', n: 6, topics: ['乾燥氣候與水資源', '石油經濟', '伊斯蘭文化與區域衝突'] },
  G12: { id: 'G12', area: '地理', name: '歐洲', n: 6, topics: ['地形與氣候', '歐盟與區域整合', '工業、觀光、人口老化與移民'] },
  G13: { id: 'G13', area: '地理', name: '俄羅斯與獨立國協', n: 6, topics: ['高緯氣候與自然環境', '資源與經濟', '人口分布'] },
  G14: { id: 'G14', area: '地理', name: '非洲', n: 6, topics: ['氣候帶分布', '殖民影響與國界', '人口、糧食與經濟'] },
  G15: { id: 'G15', area: '地理', name: '北美洲', n: 6, topics: ['地形與氣候', '農業帶與工業', '高科技產業與移民'] },
  G16: { id: 'G16', area: '地理', name: '中南美洲', n: 6, topics: ['安地斯山與亞馬遜', '殖民歷史與文化', '都市化問題'] },
  G17: { id: 'G17', area: '地理', name: '大洋洲與兩極', n: 6, topics: ['澳洲與紐西蘭', '太平洋島嶼', '極地環境與氣候變遷'] },
  G18: { id: 'G18', area: '地理', name: '全球議題', n: 6, topics: ['氣候變遷', '全球化與國際分工', '人口遷移與永續發展'] },
  C01: { id: 'C01', area: '公民', name: '自我、家庭與性別平等', n: 6, topics: ['自我認同', '家庭型態與功能', '性別平等與性別刻板印象'] },
  C02: { id: 'C02', area: '公民', name: '學校、社區與社會團體', n: 6, topics: ['學生權利與義務', '社區參與', '志工與非營利組織'] },
  C03: { id: 'C03', area: '公民', name: '社會規範與多元文化', n: 6, topics: ['社會規範的類型', '文化與多元文化、次文化', '全球化與文化'] },
  C04: { id: 'C04', area: '公民', name: '人權與憲法', n: 6, topics: ['憲法的地位', '基本人權（平等、自由、受益、參政）', '人權的保障與限制'] },
  C05: { id: 'C05', area: '公民', name: '民主政治與政府組織', n: 6, topics: ['民主原則與權力分立', '總統與五院職權', '地方自治、中央與地方'] },
  C06: { id: 'C06', area: '公民', name: '選舉、政黨與公民參與', n: 6, topics: ['選舉原則與投票制度', '政黨功能與利益團體', '公民不服從與社會運動'] },
  C07: { id: 'C07', area: '公民', name: '法律基本概念與民法', n: 6, topics: ['法律位階與功能', '行為能力與契約', '侵權行為與監護'] },
  C08: { id: 'C08', area: '公民', name: '刑法、少年事件與法律救濟', n: 6, topics: ['犯罪要件與罪刑法定', '少年事件處理法', '訴訟程序與調解'] },
  C09: { id: 'C09', area: '公民', name: '經濟基本概念', n: 6, topics: ['稀少性與機會成本', '生產要素', '需求、供給與市場均衡'] },
  C10: { id: 'C10', area: '公民', name: '市場、貨幣與金融', n: 6, topics: ['貨幣功能與通貨膨脹', '儲蓄、投資與利率', '金融機構與消費者保護'] },
  C11: { id: 'C11', area: '公民', name: '政府的經濟角色', n: 6, topics: ['公共財與外部性', '租稅', '社會福利與勞動權益'] },
  C12: { id: 'C12', area: '公民', name: '國際關係與全球化', n: 6, topics: ['國際組織與區域整合', '兩岸關係', '全球化的影響與永續發展'] },
}

const MATH_RULES = `你是台灣的國中數學老師，要為國三生出「國中教育會考」風格的練習題。
【範圍與風格】
- 依 108 課綱國中數學範圍。題目像會考：一部分是純計算或觀念題，一部分是生活情境題（要先把文字轉成式子）。
- 難度只出「中」與「難」兩種（大約 6:4）。「中」＝會考第 10～20 題程度，要用到兩個以上的步驟或觀念；「難」＝會考第 21～25 題程度。不要出一步就能答、只是代公式的題。
- 不出 108 課綱已刪除或非重點的內容：絕對值方程式、兩個不等號的不等式、f(x) 函數符號題、圓內角與圓外角、高次多項式、二次函數一般式配方法化頂點式。
- 數字要設計成答案乾淨；每題自己完整算過，確認唯一正確答案。
- 四個選項互不相同、長度相近，錯誤選項要來自常見錯誤（忘記變號、少乘公分母、公式記錯、算錯一步）。
【格式】
- 全部用繁體中文（台灣用語）。
- 數學式只用純文字與 Unicode，絕對不用 LaTeX、不用 $ 符號：平方寫 x²、立方 x³、根號 √3、分數寫 3/4 或 (2x+1)/3、乘號 ×、除號 ÷、不等號 ≤ ≥ ≠、圓周率 π、角度 ∠ABC＝60°、三角形 △ABC、平行 ∥、垂直 ⊥、線段 AB 直接寫 AB、負數寫 −3。
- 換行用 \\n。題幹若有一段情境資料，先寫資料再寫問題。
- 需要圖形的題目盡量用文字把條件說清楚（例如「△ABC 中，∠C＝90°，AC＝6，BC＝8」）；真的需要圖才放 figure_svg，一個批次最多 3 題有圖。figure_svg 必須是完整的 <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg"> 字串，只能用 line、polyline、polygon、circle、path、text 元素，stroke="currentColor"、fill="none"（text 用 fill="currentColor"），font-size="12"，不可含 script、style、href、外部資源。
- explanation 要寫出完整步驟，最後一句簡短說明其他選項為什麼錯。`

const SOCIAL_RULES = `你是台灣的國中社會科老師，要為國三生出「國中教育會考」社會科風格的練習題。
【範圍與風格】
- 依 108 課綱國中社會（歷史、地理、公民）範圍，以各版本教科書的共同內容為準，避免版本之間說法不一致的細節。
- 會考社會重視「素養」：多數題目先給一小段資料（文獻摘錄、報導、對話、用文字排的表格、時間軸、地圖或統計圖的文字描述），再問「由資料可知」「最可能」「下列何者正確」。至少 2/3 的題目要有資料情境，不要只問單一年份或人名。
- 難度只出「中」與「難」（大約 6:4）：「中」要連結兩個概念或由資料推論；「難」要跨概念比較或排除相近的干擾選項。不出一步就能答的純背誦題。
- 四個選項互不相同、長度相近，錯誤選項要是同類概念的合理混淆。
- 歷史：注意時序與因果；地理：注意區域特徵、氣候成因、人口與產業、地圖判讀；公民：注意法律概念的要件、政府職權、經濟概念（機會成本、供需、貨幣）。
- 內容必須是教科書公認的事實；有爭議或政治敏感的評價不出。
【格式】
- 全部用繁體中文（台灣用語），換行用 \\n。
- explanation 說明正確答案的理由，並簡短說明其他選項為何不對。
- 不需要圖，不填 figure_svg。`

const GEN_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          unit: { type: 'string', description: '單元代號，例如 M12 或 H05' },
          unit_name: { type: 'string' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['中', '難'] },
          stem: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          answer: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
          figure_svg: { type: 'string' },
        },
        required: ['id', 'unit', 'unit_name', 'topic', 'difficulty', 'stem', 'options', 'answer', 'explanation'],
      },
    },
  },
  required: ['questions'],
}

const SOLVE_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          answer: { type: 'integer', minimum: 0, maximum: 3 },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          too_easy: { type: 'boolean' },
          broken: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['id', 'answer', 'confidence', 'too_easy', 'broken'],
      },
    },
  },
  required: ['results'],
}

const subject = args.subject
const UNITS = subject === 'math' ? MATH_UNITS : SOCIAL_UNITS
const RULES = subject === 'math' ? MATH_RULES : SOCIAL_RULES
const subjectLabel = subject === 'math' ? '國中數學' : '國中社會科'

function genPrompt(units, avoid) {
  const lines = units.map(u => `- 單元代號 ${u.id}「${u.name}」${u.area ? `（${u.area}）` : ''}：出 ${u.n} 題，主題要平均涵蓋：${u.topics.join('、')}`)
  let p = `${RULES}

【這一批要出的單元】
${lines.join('\n')}

每題的 unit 欄位填單元代號、unit_name 填單元名稱、topic 填該題的主要主題、id 填「單元代號-兩位數流水號」例如 ${units[0].id}-01。
出完後逐題自己重算或重新查核一次，確認 answer 索引（0～3）對應的選項確實是唯一正確答案。`
  if (avoid && avoid.length) {
    p += `\n\n【已經有的題目，不要出重複或只改數字的題】\n${avoid.map(s => '· ' + s.slice(0, 80)).join('\n')}`
  }
  return p
}

function solvePrompt(stripped) {
  return `你是嚴格的${subjectLabel}閱卷老師。下面是一批四選一的練習題，沒有附答案。請逐題獨立作答，一題都不能跳過：
- ${subject === 'math' ? '數學題要完整計算出結果再選，不可以用猜的；' : '社會題依國中教科書的公認內容判斷；'}
- answer 填你認為正確的選項索引（0～3）；
- confidence：high / medium / low；
- too_easy：如果這題一步就能答、只是純背誦或純代入公式，填 true；
- broken：題目有瑕疵時填 true，例如沒有正確選項、有兩個以上正確選項、條件不足、題意不清、數字算不出乾淨答案、選項重複、數學式無法理解、內容超出國中範圍；note 用一句話寫原因。
題目（JSON）：
${JSON.stringify(stripped)}`
}

function normalize(gen, units, counters) {
  const out = []
  const raw = (gen && Array.isArray(gen.questions)) ? gen.questions : []
  for (const q of raw) {
    if (!q || typeof q.stem !== 'string' || !q.stem.trim()) continue
    if (!Array.isArray(q.options) || q.options.length !== 4) continue
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) continue
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) continue
    const u = UNITS[q.unit] || units.find(x => x.name === q.unit_name)
    if (!u || !units.some(x => x.id === u.id)) continue
    if (/\$|\\\(|\\frac|\\sqrt/.test(q.stem + q.options.join('') + q.explanation)) continue
    const opts = q.options.map(o => String(o).trim())
    if (new Set(opts).size !== 4 || opts.some(o => !o)) continue
    let svg = q.figure_svg ? String(q.figure_svg).trim() : ''
    if (svg && (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg) || /<script|<style|href|url\(|<image|<foreignObject|on\w+=/i.test(svg))) svg = ''
    counters[u.id] = (counters[u.id] || 0) + 1
    const item = {
      id: `${u.id}-${String(counters[u.id]).padStart(2, '0')}`,
      subject,
      unit: u.id,
      unit_name: u.name,
      topic: String(q.topic || '').trim(),
      difficulty: q.difficulty === '難' ? '難' : '中',
      stem: q.stem.trim(),
      options: opts,
      answer: q.answer,
      explanation: q.explanation.trim(),
    }
    if (u.num) item.unit_num = u.num
    if (u.tier) item.tier = u.tier
    if (u.area) item.area = u.area
    if (svg) item.figure_svg = svg
    out.push(item)
  }
  return out
}

async function verifyBatch(qs, key) {
  if (!qs.length) return { key, kept: [], dropped: [{ id: key, why: 'generator returned nothing usable' }] }
  const stripped = qs.map(q => ({ id: q.id, stem: q.stem, options: q.options, figure_svg: q.figure_svg }))
  const ver = await agent(solvePrompt(stripped), { label: `verify:${key}`, phase: 'Verify', schema: SOLVE_SCHEMA, effort: 'high' })
  const byId = new Map(((ver && ver.results) || []).map(r => [r.id, r]))
  const kept = [], dropped = []
  for (const q of qs) {
    const r = byId.get(q.id)
    if (!r) { dropped.push({ id: q.id, why: 'no verdict' }); continue }
    if (r.broken) { dropped.push({ id: q.id, why: 'broken: ' + (r.note || '') }); continue }
    if (r.answer !== q.answer) { dropped.push({ id: q.id, why: `answer mismatch gen=${q.answer} solver=${r.answer} (${r.confidence})` }); continue }
    if (r.too_easy) { dropped.push({ id: q.id, why: 'too easy' }); continue }
    kept.push(q)
  }
  log(`${key}: kept ${kept.length}/${qs.length}`)
  return { key, kept, dropped }
}

const counters = {}
const batches = args.batches.map(ids => ({ key: ids.join('+'), units: ids.map(id => UNITS[id]).filter(Boolean) }))

phase('Generate')
const round1 = await pipeline(
  batches,
  b => agent(genPrompt(b.units), { label: `gen:${b.key}`, phase: 'Generate', schema: GEN_SCHEMA, effort: 'high' }),
  (gen, b) => normalize(gen, b.units, counters),
  (qs, b) => verifyBatch(qs, b.key),
)

const kept = [], dropped = []
for (const r of round1.filter(Boolean)) { kept.push(...r.kept); dropped.push(...r.dropped) }

// Top-up: units that lost too many questions get one more single-unit round.
phase('Top-up')
const perUnit = {}
for (const q of kept) perUnit[q.unit] = (perUnit[q.unit] || 0) + 1
const topups = []
for (const b of batches) for (const u of b.units) {
  const have = perUnit[u.id] || 0
  const target = u.n
  if (have < Math.ceil(target * 0.6)) topups.push({ ...u, n: Math.max(4, target - have), have })
}
log(`top-up needed for ${topups.length} unit(s): ${topups.map(u => `${u.id}(${u.have}/${UNITS[u.id].n})`).join(', ') || 'none'}`)
if (topups.length) {
  const round2 = await pipeline(
    topups,
    u => agent(genPrompt([u], kept.filter(q => q.unit === u.id).map(q => q.stem)), { label: `gen2:${u.id}`, phase: 'Top-up', schema: GEN_SCHEMA, effort: 'high' }),
    (gen, u) => normalize(gen, [u], counters),
    (qs, u) => verifyBatch(qs, `topup:${u.id}`),
  )
  for (const r of round2.filter(Boolean)) { kept.push(...r.kept); dropped.push(...r.dropped) }
}

const finalPerUnit = {}
for (const q of kept) finalPerUnit[q.unit] = (finalPerUnit[q.unit] || 0) + 1
log(`done: kept ${kept.length}, dropped ${dropped.length}`)
return { subject, kept, dropped, perUnit: finalPerUnit }
