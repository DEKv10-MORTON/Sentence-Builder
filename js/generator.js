// Global Tracker ป้องกันโจทย์ซ้ำ
const usedQuestionKeys = new Set();
let currentLevelData = [];
let currentQuestion = null;

// ฟังก์ชันสร้างคู่คำติดกันอัตโนมัติ (Adjacent Chunks) สำหรับทุกประโยค เพื่อป้องกันการจับคู่แล้วขึ้นสีแดง
function generateChunksFromSentence(sentence) {
  if (!sentence) return [];
  const cleanWords = sentence.replace(/[.,?!;:"]/g, '').split(/\s+/);
  const chunks = [];
  for (let i = 0; i < cleanWords.length - 1; i++) {
    chunks.push([cleanWords[i], cleanWords[i + 1]]);
  }
  return chunks;
}

// คลังวัตถุดิบไวยากรณ์สำหรับ Combinatorial Engine (ทุกระดับชั้น)
const dynamicGrammarPools = {
  // 🟢 BEGINNER
  beginner: {
    requests: {
      modals: ["Could", "Would", "Can", "Will"],
      subjects: ["you", "he", "she", "they", "we", "Tom", "Lisa"],
      verbsObject: [
        { v: "pass me", obj: "the salt", thObj: "เกลือ" },
        { v: "bring us", obj: "some water", thObj: "น้ำเปล่า" },
        { v: "give her", obj: "the book", thObj: "หนังสือ" },
        { v: "send him", obj: "the message", thObj: "ข้อความ" },
        { v: "show me", obj: "the picture", thObj: "รูปภาพ" }
      ],
      politeEnds: ["please?", "right now?"]
    },
    presentSimple: {
      subjects: [
        { en: "He", th: "เขา", s: true },
        { en: "She", th: "เธอ", s: true },
        { en: "Tom", th: "ทอม", s: true },
        { en: "They", th: "พวกเขา", s: false },
        { en: "We", th: "พวกเรา", s: false }
      ],
      actions: [
        { vSingular: "plays", vPlural: "play", obj: "football", thObj: "ฟุตบอล", time: "every day.", thTime: "ทุกวัน" },
        { vSingular: "drinks", vPlural: "drink", obj: "coffee", thObj: "กาแฟ", time: "every morning.", thTime: "ทุกเช้า" },
        { vSingular: "reads", vPlural: "read", obj: "books", thObj: "หนังสือ", time: "in the evening.", thTime: "ในตอนเย็น" },
        { vSingular: "likes", vPlural: "like", obj: "ice cream", thObj: "ไอศกรีม", time: "very much.", thTime: "มาก" }
      ]
    },
    presentContinuous: {
      subjects: [
        { en: "I", be: "am", th: "ฉัน" },
        { en: "He", be: "is", th: "เขา" },
        { en: "She", be: "is", th: "เธอ" },
        { en: "They", be: "are", th: "พวกเขา" },
        { en: "We", be: "are", th: "พวกเรา" }
      ],
      actions: [
        { v: "eating", obj: "lunch", th: "กินมื้อเที่ยง" },
        { v: "watching", obj: "TV", th: "ดูทีวี" },
        { v: "studying", obj: "English", th: "เรียนภาษาอังกฤษ" },
        { v: "cleaning", obj: "the room", th: "ทำความสะอาดห้อง" }
      ],
      time: "at the moment.",
      thTime: "ในตอนนี้"
    },
    pastSimple: {
      subjects: ["I", "He", "She", "They", "We", "Tom", "Lisa"],
      subMap: { I: "ฉัน", He: "เขา", She: "เธอ", They: "พวกเขา", We: "พวกเรา", Tom: "ทอม", Lisa: "ลิซ่า" },
      actions: [
        { v: "visited", obj: "the museum", th: "ไปเยี่ยมชมพิพิธภัณฑ์", time: "yesterday.", thTime: "เมื่อวานนี้" },
        { v: "bought", obj: "a new car", th: "ซื้อรถใหม่", time: "last week.", thTime: "เมื่อสัปดาห์ที่แล้ว" },
        { v: "cooked", obj: "dinner", th: "ทำอาหารเย็น", time: "last night.", thTime: "เมื่อคืนนี้" },
        { v: "found", obj: "the key", th: "พบกุญแจ", time: "this morning.", thTime: "เมื่อเช้านี้" }
      ]
    }
  },

  // 🟡 INTERMEDIATE (ม.ปลาย)
  intermediate: {
    pastContinuous: [
      { sub: "The teacher", action: "was explaining the lesson", interrupter: "when the electricity went off", th: "คุณครูกำลังอธิบายบทเรียนอยู่ตอนที่ไฟฟ้าดับลง" },
      { sub: "The students", action: "were playing football", interrupter: "when it started to rain heavily", th: "นักเรียนกำลังเล่นฟุตบอลกันอยู่ตอนที่ฝนเริ่มตกหนัก" },
      { sub: "My parents", action: "were watching news", interrupter: "when someone knocked on the door", th: "พ่อแม่กำลังดูข่าวอยู่ตอนที่มีคนมาเคาะประตู" }
    ],
    conditionals: [
      { ifClause: "If you study hard", mainClause: "you will pass the final examination", th: "ถ้าคุณขยันเรียน คุณจะสอบปลายภาคผ่าน" },
      { ifClause: "If it rains tomorrow", mainClause: "we will cancel the outdoor concert", th: "ถ้าฝนตกในวันพรุ่งนี้ พวกเราจะยกเลิกคอนเสิร์ตกลางแจ้ง" },
      { ifClause: "If she saves enough money", mainClause: "she will buy a new laptop", th: "ถ้าเธอเก็บเงินได้มากพอ เธอจะซื้อโน้ตบุ๊กเครื่องใหม่" }
    ],
    passiveVoice: [
      { sub: "The new bridge", action: "was constructed by local workers", time: "last month", th: "สะพานแห่งใหม่ถูกสร้างขึ้นโดยคนงานในท้องถิ่นเมื่อเดือนที่แล้ว" },
      { sub: "This famous report", action: "was written by professional journalists", time: "yesterday", th: "รายงานที่มีชื่อเสียงนี้ถูกเขียนขึ้นโดยผู้สื่อข่าวมืออาชีพเมื่อวานนี้" }
    ]
  },

  // 🔴 ADVANCED (IELTS)
  advanced: {
    contexts: [
      {
        text: "Although renewable energy adoption is accelerating dependence on fossil fuels remains significant",
        words: ["Although", "renewable", "energy", "adoption", "is", "accelerating", "dependence", "on", "fossil", "fuels", "remains", "significant"],
        th: "แม้ว่าการใช้พลังงานหมุนเวียนกำลังเร่งตัวขึ้น แต่การพึ่งพาเชื้อเพลิงฟอสซิลยังคงมีอยู่อย่างมีนัยสำคัญ",
        exp: "โครงสร้าง Complex Sentence (IELTS Academic): Concession Clause (Although) + Prepositional Noun Phrase (dependence on)"
      },
      {
        text: "It is essential to adopt sustainable practices in order to mitigate climate change globally",
        words: ["It", "is", "essential", "to", "adopt", "sustainable", "practices", "in", "order", "to", "mitigate", "climate", "change", "globally"],
        th: "มันเป็นสิ่งจำเป็นที่จะต้องใช้วิธีการที่ยั่งยืนเพื่อบรรเทาการเปลี่ยนแปลงสภาพภูมิอากาศทั่วโลก",
        exp: "โครงสร้าง Formal Purpose Clause (IELTS Writing Task 2): Infinitive of Purpose (in order to + V.1) + Collocation (climate change)"
      },
      {
        text: "Not only does education reduce poverty but it also empowers future generations to thrive",
        words: ["Not", "only", "does", "education", "reduce", "poverty", "but", "it", "also", "empowers", "future", "generations", "to", "thrive"],
        th: "การศึกษาไม่เพียงแต่ช่วยลดความยากจนเท่านั้น แต่ยังเพิ่มพลังให้แก่คนรุ่นหลังในการเจริญเติบโตอีกด้วย",
        exp: "โครงสร้าง Advanced Inversion (IELTS Band 8.0+): Inverted Auxiliary (Not only does + S + V) สำหรับเน้นน้ำหนักประโยค"
      }
    ]
  }
};

// ฟังก์ชั่นสร้างโจทย์แบบไดนามิก (Combinatorial Generator)
function generateDynamicQuestion(level) {
  let q = null;

  if (level === 'beginner') {
    const pool = dynamicGrammarPools.beginner;
    const patternType = Math.floor(Math.random() * 4);

    if (patternType === 0) {
      const p = pool.requests;
      const modal = p.modals[Math.floor(Math.random() * p.modals.length)];
      const sub = p.subjects[Math.floor(Math.random() * p.subjects.length)];
      const item = p.verbsObject[Math.floor(Math.random() * p.verbsObject.length)];
      const end = p.politeEnds[Math.floor(Math.random() * p.politeEnds.length)];

      const verbWords = item.v.split(' ');
      const objWords = item.obj.split(' ');

      const fullSentence = `${modal} ${sub} ${item.v} ${item.obj} ${end}`;
      const words = [modal, sub, ...verbWords, ...objWords, end];
      const key = `beg_req_${modal}_${sub}_${item.v.replace(/\s+/g, '_')}_${end.replace(/[^a-zA-Z]/g, '')}`;

      const subMap = { you: "คุณ", he: "เขา", she: "เธอ", they: "พวกเขา", we: "พวกเรา", Tom: "ทอม", Lisa: "ลิซ่า" };
      const verbMap = { pass: "ส่ง", bring: "นำ", give: "ให้", send: "ส่ง", show: "แสดง" };
      const indirectObjMap = { me: "ฉัน", us: "พวกเรา", her: "เธอ", him: "เขา" };

      const subTh = subMap[sub] || sub;
      const verbTh = verbMap[verbWords[0]] || "ช่วย";
      const targetPersonTh = indirectObjMap[verbWords[1]] || "";

      q = {
        id: key,
        translation: `${subTh}ช่วย${verbTh}${item.thObj}ให้${targetPersonTh}หน่อยได้ไหม`,
        words: words,
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: `โครงสร้างประโยคขอร้องอย่างสุภาพ [Modal (${modal}) + Subject (${sub})] + [Verb Phrase (${item.v})]`
      };

    } else if (patternType === 1) {
      const p = pool.presentSimple;
      const subObj = p.subjects[Math.floor(Math.random() * p.subjects.length)];
      const actObj = p.actions[Math.floor(Math.random() * p.actions.length)];

      const verb = subObj.s ? actObj.vSingular : actObj.vPlural;
      const objWords = actObj.obj.split(' ');
      const timeWords = actObj.time.split(' ');

      const fullSentence = `${subObj.en} ${verb} ${actObj.obj} ${actObj.time}`;
      const words = [subObj.en, verb, ...objWords, ...timeWords];
      const key = `beg_ps_${subObj.en}_${verb}_${actObj.obj.replace(/\s+/g, '_')}`;

      q = {
        id: key,
        translation: `${subObj.th}${actObj.thObj === 'หนังสือ' ? 'อ่าน' : actObj.thObj === 'ไอศกรีม' ? 'ชอบ' : 'ดื่ม'}${actObj.thObj}${actObj.thTime}`,
        words: words,
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: `โครงสร้าง Present Simple Tense [Subject (${subObj.en}) + Verb (${verb})] (ประธานเอกพจน์ กริยาเติม s/es)`
      };

    } else if (patternType === 2) {
      const p = pool.presentContinuous;
      const subObj = p.subjects[Math.floor(Math.random() * p.subjects.length)];
      const actObj = p.actions[Math.floor(Math.random() * p.actions.length)];

      const objWords = actObj.obj.split(' ');
      const timeWords = p.time.split(' ');

      const fullSentence = `${subObj.en} ${subObj.be} ${actObj.v} ${actObj.obj} ${p.time}`;
      const words = [subObj.en, subObj.be, actObj.v, ...objWords, ...timeWords];
      const key = `beg_pcont_${subObj.en}_${actObj.v}`;

      q = {
        id: key,
        translation: `${subObj.th}กำลัง${actObj.th}${p.thTime}`,
        words: words,
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: `โครงสร้าง Present Continuous Tense [Subject + Verb to be (${subObj.be}) + V.ing (${actObj.v})] (เหตุการณ์ที่กำลังทำอยู่)`
      };

    } else {
      const p = pool.pastSimple;
      const sub = p.subjects[Math.floor(Math.random() * p.subjects.length)];
      const actObj = p.actions[Math.floor(Math.random() * p.actions.length)];

      const objWords = actObj.obj.split(' ');
      const timeWords = actObj.time.split(' ');

      const fullSentence = `${sub} ${actObj.v} ${actObj.obj} ${actObj.time}`;
      const words = [sub, actObj.v, ...objWords, ...timeWords];
      const key = `beg_past_${sub}_${actObj.v}`;

      q = {
        id: key,
        translation: `${p.subMap[sub]}${actObj.th}${actObj.thTime}`,
        words: words,
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: `โครงสร้าง Past Simple Tense [Subject (${sub}) + V.2 (${actObj.v})] (เหตุการณ์ที่เกิดขึ้นในอดีต)`
      };
    }

  } else if (level === 'intermediate') {
    const pool = dynamicGrammarPools.intermediate;
    const patternType = Math.floor(Math.random() * 3);

    if (patternType === 0) {
      const item = pool.pastContinuous[Math.floor(Math.random() * pool.pastContinuous.length)];
      const actWords = item.action.split(' ');
      const intWords = item.interrupter.split(' ');
      const fullSentence = `${item.sub} ${item.action} ${item.interrupter}`;

      q = {
        id: `int_pcont_${item.sub.replace(/\s+/g, '_')}`,
        translation: item.th,
        words: [item.sub, ...actWords, ...intWords],
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: "โครงสร้าง Past Continuous (เหตุการณ์กำลังดำเนินอยู่) + Past Simple (เหตุการณ์แทรกซ้อน)"
      };

    } else if (patternType === 1) {
      const item = pool.conditionals[Math.floor(Math.random() * pool.conditionals.length)];
      const ifWords = item.ifClause.split(' ');
      const mainWords = item.mainClause.split(' ');
      const fullSentence = `${item.ifClause} ${item.mainClause}`;

      q = {
        id: `int_cond_${ifWords[0]}_${ifWords[1]}`,
        translation: item.th,
        words: [...ifWords, ...mainWords],
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: "โครงสร้าง First Conditional: If + Present Simple, Subject + Future Simple (Will + V.1)"
      };

    } else {
      const item = pool.passiveVoice[Math.floor(Math.random() * pool.passiveVoice.length)];
      const subWords = item.sub.split(' ');
      const actWords = item.action.split(' ');
      const timeWords = item.time.split(' ');
      const fullSentence = `${item.sub} ${item.action} ${item.time}`;

      q = {
        id: `int_pass_${subWords[0]}_${actWords[0]}`,
        translation: item.th,
        words: [...subWords, ...actWords, ...timeWords],
        correct_sentence: fullSentence,
        valid_chunks: generateChunksFromSentence(fullSentence),
        explanation: "โครงสร้าง Passive Voice: Subject + Verb to be (was/were) + V.3 + by + Agent"
      };
    }

  } else {
    // 🔴 ADVANCED / IELTS
    const pool = dynamicGrammarPools.advanced.contexts;
    const item = pool[Math.floor(Math.random() * pool.length)];

    q = {
      id: `adv_${item.text.substring(0, 15).replace(/\s+/g, '_')}`,
      translation: item.th,
      words: item.words,
      correct_sentence: item.text,
      valid_chunks: generateChunksFromSentence(item.text),
      explanation: item.exp
    };
  }

  return q;
}

async function loadLevelData(level = 'beginner') {
  return true;
}

// สุ่มโจทย์ใหม่โดยการันตีว่าไม่ซ้ำข้อเดิม
function getRandomQuestion() {
  let attempts = 0;
  let q = null;

  do {
    q = generateDynamicQuestion(currentLevel);
    attempts++;
  } while (usedQuestionKeys.has(q.id) && attempts < 100);

  usedQuestionKeys.add(q.id);

  const shuffledWords = [...q.words].sort(() => Math.random() - 0.5);

  currentQuestion = {
    ...q,
    shuffledWords: shuffledWords
  };

  return currentQuestion;
}