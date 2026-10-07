export const meta = {
  name: 'huikao-variants',
  description: 'For every question in the bank, write 2 sibling questions (same skill, different numbers or source material), blind-solve verify, keep only confirmed ones',
  phases: [
    { title: 'Generate', detail: 'one agent per batch of units, 2 siblings per original' },
    { title: 'Verify', detail: 'blind solver per batch' },
  ],
}

const META = {
  M01: { num: 1, name: '整數的運算', tier: 'A' }, M02: { num: 2, name: '分數的運算', tier: 'A' }, M03: { num: 3, name: '一元一次方程式', tier: 'B' }, M04: { num: 4, name: '二元一次聯立方程式', tier: 'A' },
  M05: { num: 5, name: '二元一次方程式的圖形', tier: 'B' }, M06: { num: 6, name: '比與比例式', tier: 'C' }, M07: { num: 7, name: '一元一次不等式', tier: 'A' }, M08: { num: 8, name: '線對稱與三視圖', tier: 'C' },
  M09: { num: 9, name: '統計圖表與統計量', tier: 'B' }, M10: { num: 10, name: '乘法公式與多項式', tier: 'B' }, M11: { num: 11, name: '平方根與畢氏定理', tier: 'A' }, M12: { num: 12, name: '因式分解與一元二次方程式', tier: 'A' },
  M13: { num: 13, name: '數列與級數', tier: 'A' }, M14: { num: 14, name: '函數', tier: 'B' }, M15: { num: 15, name: '三角形的基本性質', tier: 'A' }, M16: { num: 16, name: '平行與四邊形', tier: 'B' },
  M17: { num: 17, name: '連比例與相似形', tier: 'A' }, M18: { num: 18, name: '圓', tier: 'A' }, M19: { num: 19, name: '幾何與證明', tier: 'A' }, M20: { num: 20, name: '二次函數', tier: 'A' }, M21: { num: 21, name: '統計與機率、立體圖形', tier: 'A' },
  H01: { area: '歷史', name: '台灣史前文化與原住民族' }, H02: { area: '歷史', name: '荷西時期與鄭氏時期' }, H03: { area: '歷史', name: '清領前期的台灣' }, H04: { area: '歷史', name: '清領後期的台灣' }, H05: { area: '歷史', name: '日治時期的政治與經濟' }, H06: { area: '歷史', name: '日治時期的社會與文化' }, H07: { area: '歷史', name: '戰後台灣的政治發展' }, H08: { area: '歷史', name: '戰後台灣的經濟與社會' }, H09: { area: '歷史', name: '先秦與秦漢' }, H10: { area: '歷史', name: '魏晉南北朝與隋唐' }, H11: { area: '歷史', name: '宋元明清' }, H12: { area: '歷史', name: '晚清變局' }, H13: { area: '歷史', name: '民國成立至中共建政' }, H14: { area: '歷史', name: '中華人民共和國與兩岸關係' }, H15: { area: '歷史', name: '古文明與古典時代' }, H16: { area: '歷史', name: '中世紀歐洲與伊斯蘭世界' }, H17: { area: '歷史', name: '文藝復興、宗教改革與地理大發現' }, H18: { area: '歷史', name: '科學革命、啟蒙運動與民主革命' }, H19: { area: '歷史', name: '工業革命、民族主義與帝國主義' }, H20: { area: '歷史', name: '兩次世界大戰' }, H21: { area: '歷史', name: '冷戰與當代世界' },
  G01: { area: '地理', name: '地理技能' }, G02: { area: '地理', name: '台灣的位置、地形與地質' }, G03: { area: '地理', name: '台灣的氣候與水文' }, G04: { area: '地理', name: '台灣的人口與聚落' }, G05: { area: '地理', name: '台灣的產業與區域發展' }, G06: { area: '地理', name: '台灣的環境問題與災害' }, G07: { area: '地理', name: '中國的地形與氣候' }, G08: { area: '地理', name: '中國的人口、產業與區域' }, G09: { area: '地理', name: '東北亞' }, G10: { area: '地理', name: '東南亞與南亞' }, G11: { area: '地理', name: '西亞與中亞' }, G12: { area: '地理', name: '歐洲' }, G13: { area: '地理', name: '俄羅斯與獨立國協' }, G14: { area: '地理', name: '非洲' }, G15: { area: '地理', name: '北美洲' }, G16: { area: '地理', name: '中南美洲' }, G17: { area: '地理', name: '大洋洲與兩極' }, G18: { area: '地理', name: '全球議題' },
  C01: { area: '公民', name: '自我、家庭與性別平等' }, C02: { area: '公民', name: '學校、社區與社會團體' }, C03: { area: '公民', name: '社會規範與多元文化' }, C04: { area: '公民', name: '人權與憲法' }, C05: { area: '公民', name: '民主政治與政府組織' }, C06: { area: '公民', name: '選舉、政黨與公民參與' }, C07: { area: '公民', name: '法律基本概念與民法' }, C08: { area: '公民', name: '刑法、少年事件與法律救濟' }, C09: { area: '公民', name: '經濟基本概念' }, C10: { area: '公民', name: '市場、貨幣與金融' }, C11: { area: '公民', name: '政府的經濟角色' }, C12: { area: '公民', name: '國際關係與全球化' },
}

const BANK_FILE = '/home/user/tetris/huikao-daily/questions.json'
const subject = args.subject
const subjectLabel = subject === 'math' ? '國中數學' : '國中社會科'

const MATH_RULES = `每題替身必須考「同一個觀念、同一種解法步驟」，但換掉數字與情境（例如換物品、人名、單位、數值），難度維持一樣。數字要重新設計成答案乾淨，且替身的正確答案數值不能和原題一樣。四個選項重新寫，錯誤選項同樣來自常見錯誤。
數學式只用純文字與 Unicode，絕對不用 LaTeX、不用 $：x²、√3、3/4、×、÷、≤、≥、π、°、∠ABC、△ABC、∥、⊥、負數 −3。換行用 \\n。
原題若有 figure_svg（圖），替身優先改寫成不需要圖、用文字把條件說清楚的版本；真的需要圖才給新的 figure_svg（<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">，只用 line、polyline、polygon、circle、path、text，stroke="currentColor" fill="none"，text 用 fill="currentColor"，font-size="12"，不可有 script、style、href），一批最多 3 題有圖。
不出 108 課綱已刪的內容（絕對值方程式、兩個不等號的不等式、f(x) 函數符號題、圓內角圓外角、高次多項式、二次函數一般式配方法）。`

const SOCIAL_RULES = `每題替身必須考「同一個知識點、同一個正確事實或概念」，但換掉題目的資料（換一段文獻、報導、對話、表格數據、情境人物），並重新寫四個選項；錯誤選項要是同類概念的合理混淆，難度維持一樣。不要只是把原題換句話說，資料情境要真的不同。
內容必須是國中教科書公認的事實；有爭議或政治敏感的評價不出。全部用繁體中文（台灣用語），換行用 \\n。表格用「項目｜甲｜乙」這種每行一列、以｜分隔的寫法。不需要圖。`

const RULES = subject === 'math' ? MATH_RULES : SOCIAL_RULES

const GEN_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          variant_of: { type: 'string', description: '原題的 id，例如 M12-03' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['中', '難'] },
          stem: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          answer: { type: 'integer', minimum: 0, maximum: 3 },
          explanation: { type: 'string' },
          figure_svg: { type: 'string' },
        },
        required: ['variant_of', 'topic', 'difficulty', 'stem', 'options', 'answer', 'explanation'],
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
          id: { type: 'string' }, answer: { type: 'integer', minimum: 0, maximum: 3 },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, too_easy: { type: 'boolean' }, broken: { type: 'boolean' }, note: { type: 'string' },
        },
        required: ['id', 'answer', 'confidence', 'too_easy', 'broken'],
      },
    },
  },
  required: ['results'],
}

function genPrompt(units) {
  return `你是台灣的${subjectLabel}老師。題庫檔案在 ${BANK_FILE}（JSON 陣列，每題有 id、unit、unit_name、topic、difficulty、stem、options、answer、explanation，部分有 figure_svg）。
先用 Read 工具讀這個檔案（檔案很大，可以分段讀，或用 Grep 找出需要的題目），只取 unit 等於 ${units.map(u => `「${u}」`).join('或')} 的題目（共約 ${units.length * 8} 題）。

對每一題原題，各寫 2 題「替身題」：學生之後複習時會看到替身而不是原題，所以替身要能驗證他是不是真的會同一個觀念，而不是記得答案。
${RULES}
每題替身：variant_of 填原題 id；topic 抄原題的 topic；difficulty 與原題相同；explanation 寫完整步驟，最後一句簡短說明其他選項為何錯。
寫完逐題自己重算或重新查核，確認 answer 索引（0～3）對應的選項是唯一正確答案。一題原題都不能漏，每題原題都要有 2 題替身。`
}
function solvePrompt(stripped) {
  return `你是嚴格的${subjectLabel}閱卷老師。下面是一批四選一的練習題，沒有附答案。請逐題獨立作答，一題都不能跳過：
- ${subject === 'math' ? '數學題要完整計算出結果再選，不可以用猜的；' : '社會題依國中教科書的公認內容判斷；'}
- answer 填你認為正確的選項索引（0～3）；confidence：high / medium / low；
- too_easy：一步就能答、純背誦或純代入公式，填 true；
- broken：沒有正確選項、兩個以上正確選項、條件不足、題意不清、數字算不出乾淨答案、選項重複、數學式無法理解、超出國中範圍，填 true，note 寫一句原因。
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
    const parent = String(q.variant_of || '').trim()
    const unit = parent.slice(0, 3)
    if (!/^[MHGC]\d{2}-\d{2}$/.test(parent) || !units.includes(unit) || !META[unit]) continue
    if (/\$|\\\(|\\frac|\\sqrt/.test(q.stem + q.options.join('') + q.explanation)) continue
    const opts = q.options.map(o => String(o).trim())
    if (new Set(opts).size !== 4 || opts.some(o => !o)) continue
    let svg = q.figure_svg ? String(q.figure_svg).trim() : ''
    if (svg && (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg) || /<script|<style|href|url\(|<image|<foreignObject|on\w+=/i.test(svg))) svg = ''
    counters[parent] = (counters[parent] || 0) + 1
    const m = META[unit]
    const item = {
      id: `${parent}v${counters[parent]}`, variant_of: parent, subject, unit, unit_name: m.name,
      topic: String(q.topic || '').trim(), difficulty: q.difficulty === '難' ? '難' : '中',
      stem: q.stem.trim(), options: opts, answer: q.answer, explanation: q.explanation.trim(),
    }
    if (m.num) item.unit_num = m.num
    if (m.tier) item.tier = m.tier
    if (m.area) item.area = m.area
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
const batches = args.batches.map(units => ({ key: units.join('+'), units }))
phase('Generate')
const results = await pipeline(
  batches,
  b => agent(genPrompt(b.units), { label: `gen:${b.key}`, phase: 'Generate', schema: GEN_SCHEMA, effort: 'high' }),
  (gen, b) => normalize(gen, b.units, counters),
  (qs, b) => verifyBatch(qs, b.key),
)
const kept = [], dropped = []
for (const r of results.filter(Boolean)) { kept.push(...r.kept); dropped.push(...r.dropped) }
const perParent = {}
for (const q of kept) perParent[q.variant_of] = (perParent[q.variant_of] || 0) + 1
log(`done: kept ${kept.length} siblings for ${Object.keys(perParent).length} originals, dropped ${dropped.length}`)
return { subject, kept, dropped, perParent }
