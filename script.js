// ============================================================
// AUDIO ENGINE (Web Speech API)
// ============================================================
const Audio = {
  jpVoice: null,
  ready: false,
  supported: 'speechSynthesis' in window,
  pending: null,

  init(){
    if(!this.supported){
      this.showWarn('這個瀏覽器不支援語音播放。建議用 Chrome 或 Safari 打開。');
      return;
    }
    const pickVoice = ()=>{
      const voices = speechSynthesis.getVoices();
      if(voices.length === 0) return false;
      // 找日文語音，偏好品質高的
      this.jpVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google'))
                  || voices.find(v => v.lang === 'ja-JP' && v.name.includes('Kyoko'))
                  || voices.find(v => v.lang === 'ja-JP')
                  || voices.find(v => v.lang.startsWith('ja'));
      if(this.jpVoice){
        this.ready = true;
        return true;
      }
      this.showWarn('這個裝置目前沒有日文語音。<br>iPhone：設定 → 一般 → 語言與地區 → 加入「日文」鍵盤即可。<br>Android：設定 → 語言 → 加入日文。');
      return false;
    };
    if(!pickVoice()){
      // voices 可能還沒載入，等一下
      speechSynthesis.onvoiceschanged = pickVoice;
    }
  },

  showWarn(msg){
    const el = document.getElementById('audioWarn');
    if(el){ el.innerHTML = msg; el.classList.add('show'); }
  },

  speak(text, opts={}){
    if(!this.supported || !this.ready) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this.jpVoice;
      u.lang = 'ja-JP';
      u.rate = opts.rate || 0.85;
      u.pitch = 1;
      if(opts.onend) u.onend = opts.onend;
      speechSynthesis.speak(u);
    }catch(e){ console.warn('speak failed', e); }
  },

  // 假名格子點擊：播放並做動畫
  speakKana(ch, cellEl){
    // 如果正在連讀，先停掉
    if(this.sequenceCancel === false && speechSynthesis.speaking){
      this.stopSequence();
      const btn = document.getElementById('readerBtn');
      if(btn && btn.classList.contains('playing')){
        btn.classList.remove('playing');
        btn.innerHTML = '▶ 連讀本課假名';
        document.querySelectorAll('.kana-cell.now').forEach(el=>el.classList.remove('now'));
      }
    }
    if(cellEl){
      cellEl.classList.add('playing');
      setTimeout(()=>cellEl.classList.remove('playing'), 600);
    }
    this.speak(ch);
    // 記錄關卡進度
    trackListened(ch);
  },

  // 連讀一串假名，每個字拍滿一拍，中間停頓
  // chars: 陣列字串 ['あ','い','う','え','お']
  // onProgress: callback(currentIdx, ch) - 用來高亮當前字
  // onComplete: callback() - 全部唸完
  sequenceCancel:false,
  speakSequence(chars, onProgress, onComplete){
    if(!this.supported || !this.ready) return;
    this.sequenceCancel = false;
    speechSynthesis.cancel();
    let i = 0;
    const speakNext = ()=>{
      if(this.sequenceCancel || i >= chars.length){
        if(onComplete) onComplete();
        return;
      }
      const ch = chars[i];
      if(onProgress) onProgress(i, ch);
      trackListened(ch);
      const u = new SpeechSynthesisUtterance(ch);
      u.voice = this.jpVoice;
      u.lang = 'ja-JP';
      u.rate = 0.75;       // 連讀時更慢，讓每個音拍滿
      u.pitch = 1;
      u.onend = ()=>{
        i++;
        // 每個字之間停 350ms（一拍的感覺）
        setTimeout(speakNext, 350);
      };
      speechSynthesis.speak(u);
    };
    speakNext();
  },

  stopSequence(){
    this.sequenceCancel = true;
    speechSynthesis.cancel();
  },
};


// ============================================================
// REAL STROKE PATHS (from KanjiVG, CC-BY-SA 3.0)
// 真實筆畫路徑資料 — viewBox 109x109
// ============================================================

// ============================================================
// WRITE ENGINE
// ============================================================
const Write = {
  current:null, currentRo:'',
  paths:[],          // 真實 SVG path strings (KanjiVG)
  targets:[],        // 從 paths 解析的起點 [{x,y}]
  nextIdx:0,
  drawing:false, drawnPath:[], allPaths:[],
  state:'idle',     // 'demo' | 'idle' | 'drawing' | 'complete'
  demoTimers:[],    // 用來取消正在播放的示範
  hitRadius:8,      // 109 viewBox 下的 hit 範圍

  open(ch, ro){
    if(!STROKE_PATHS[ch]){ alert('這個字還沒有筆順資料'); return; }
    this.current = ch;
    this.currentRo = ro || '';
    this.paths = STROKE_PATHS[ch];
    this.targets = this.paths.map((d,i)=>{
      const m = d.match(/^M\s*([0-9.\-]+)[,\s]+([0-9.\-]+)/);
      return m ? {x:parseFloat(m[1]), y:parseFloat(m[2]), idx:i, done:false} : {x:50, y:50, idx:i, done:false};
    });
    this.nextIdx = 0;
    this.drawing = false;
    this.drawnPath = []; this.allPaths = [];
    this.cancelDemo();

    document.getElementById('wCh').textContent = ch;
    document.getElementById('wRo').textContent = ro || '';
    document.getElementById('wOk').textContent = '—';
    document.getElementById('wOk').style.color = '';
    const wp = S.writeProgress[ch] || {};
    const today = todayISO();
    document.getElementById('wTimes').textContent = (wp.lastDate === today ? wp.todayCount : 0) || 0;
    document.getElementById('wTotal').textContent = wp.totalCount || 0;

    document.getElementById('writeModal').classList.add('show');
    if(Audio.ready) setTimeout(()=>Audio.speak(ch), 200);

    // 自動播一次示範
    this.playDemo();
  },

  close(){
    document.getElementById('writeModal').classList.remove('show');
    this.cancelDemo();
    this.current = null;
  },

  cancelDemo(){
    this.demoTimers.forEach(t=>clearTimeout(t));
    this.demoTimers = [];
  },

  // 用 SVG 動畫播一次示範
  playDemo(){
    this.cancelDemo();
    this.state = 'demo';
    document.getElementById('writeMsg').textContent = '示範中... 看怎麼寫';
    document.getElementById('writeMsg').className = 'write-msg';

    const svg = document.getElementById('writeSvg');
    let html = `<text class="guide-ch" x="54.5" y="58">${this.current}</text>`;
    // 半透明灰色底圖（讓使用者看到字的形狀）
    this.paths.forEach((d,i)=>{
      html += `<path class="guide-strokes" d="${d}"/>`;
    });
    // 動畫筆畫，先隱藏
    this.paths.forEach((d,i)=>{
      html += `<path id="demo-${i}" class="demo-stroke" d="${d}" style="opacity:0"/>`;
    });
    svg.innerHTML = html;

    // 必須等 SVG 渲染後才能 getTotalLength()
    requestAnimationFrame(()=>{
      // 預先計算每筆畫的長度 + 持續時間
      const strokeInfo = this.paths.map((d, i)=>{
        const el = document.getElementById(`demo-${i}`);
        if(!el) return null;
        const len = el.getTotalLength();
        const duration = Math.max(600, len * 30); // 每單位 30ms，最少 600ms
        return {el, len, duration};
      });

      let acc = 200; // 啟動延遲
      strokeInfo.forEach((info, i)=>{
        if(!info) return;
        const t = setTimeout(()=>{
          if(this.state !== 'demo' || !this.current) return;
          const {el, len, duration} = info;
          el.style.opacity = '1';
          el.style.strokeDasharray = len + ' ' + len;
          el.style.strokeDashoffset = len;
          el.classList.add('demo-current');
          el.getBoundingClientRect();
          el.style.transition = `stroke-dashoffset ${duration}ms linear`;
          el.style.strokeDashoffset = '0';
          const t2 = setTimeout(()=>{
            if(this.state !== 'demo') return;
            el.classList.remove('demo-current');
            el.classList.add('done');
          }, duration);
          this.demoTimers.push(t2);
        }, acc);
        this.demoTimers.push(t);
        acc += info.duration + 250; // 筆畫間隔 250ms
      });

      // 全部播完
      const totalT = setTimeout(()=>{
        if(this.state !== 'demo') return;
        this.state = 'idle';
        document.getElementById('writeMsg').textContent = '換你寫，照 ①②③ 順序';
        this.render();
      }, acc + 200);
      this.demoTimers.push(totalT);
    });
  },

  render(){
    if(this.state === 'demo') return;
    const svg = document.getElementById('writeSvg');
    let html = `<text class="guide-ch" x="54.5" y="58">${this.current}</text>`;
    // 半透明的引導筆畫（灰色，淡淡的）
    this.paths.forEach((d,i)=>{
      const fadeClass = this.targets[i] && this.targets[i].done ? 'demo-stroke done' : 'guide-strokes';
      html += `<path class="${fadeClass}" d="${d}" style="opacity:.35"/>`;
    });
    // 已完成的描寫軌跡
    for(const path of this.allPaths){
      if(path.length < 2) continue;
      const d = 'M '+path.map(p=>`${p.x} ${p.y}`).join(' L ');
      html += `<path class="draw-line" d="${d}" style="opacity:.5"/>`;
    }
    if(this.drawnPath.length >= 2){
      const d = 'M '+this.drawnPath.map(p=>`${p.x} ${p.y}`).join(' L ');
      html += `<path class="draw-line" d="${d}"/>`;
    }
    // 起點圓圈
    this.targets.forEach((t,i)=>{
      let cls = 'stroke-target';
      if(t.done) cls += ' done';
      else if(i === this.nextIdx) cls += ' active';
      html += `<circle class="${cls}" cx="${t.x}" cy="${t.y}" r="5"/>`;
      html += `<text class="stroke-num" x="${t.x}" y="${t.y+0.3}">${i+1}</text>`;
    });
    svg.innerHTML = html;
  },

  // 讓使用者按按鈕重看示範
  replayDemo(){ if(this.current) this.playDemo(); },

  getPoint(e){
    const svg = document.getElementById('writeSvg');
    const rect = svg.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: (t.clientX - rect.left) / rect.width * 109,
      y: (t.clientY - rect.top) / rect.height * 109,
    };
  },

  start(e){
    if(!this.current || this.state === 'demo') return;
    e.preventDefault();
    this.drawing = true;
    this.state = 'drawing';
    const p = this.getPoint(e);
    this.drawnPath = [p];
    this.checkPoint(p);
    this.render();
  },

  move(e){
    if(!this.drawing) return;
    e.preventDefault();
    const p = this.getPoint(e);
    const last = this.drawnPath[this.drawnPath.length-1];
    if(!last || Math.hypot(p.x-last.x, p.y-last.y) > 1.5){
      this.drawnPath.push(p);
      this.checkPoint(p);
      this.render();
    }
  },

  end(e){
    if(!this.drawing) return;
    if(e) e.preventDefault();
    this.drawing = false;
    if(this.drawnPath.length >= 2) this.allPaths.push(this.drawnPath);
    this.drawnPath = [];
    this.render();
  },

  checkPoint(p){
    if(this.nextIdx >= this.targets.length) return;
    // 檢查跳過後面的點
    for(let i=this.nextIdx+1; i<this.targets.length; i++){
      const ft = this.targets[i];
      if(Math.hypot(p.x-ft.x, p.y-ft.y) < this.hitRadius){
        this.wrongOrder();
        return;
      }
    }
    const t = this.targets[this.nextIdx];
    if(Math.hypot(p.x-t.x, p.y-t.y) < this.hitRadius){
      t.done = true;
      this.nextIdx++;
      if(this.nextIdx >= this.targets.length) this.complete();
    }
  },

  complete(){
    this.state = 'complete';
    document.getElementById('writeMsg').textContent = '✓ 完成！筆順正確';
    document.getElementById('writeMsg').className = 'write-msg good';
    document.getElementById('wOk').textContent = '✓';
    document.getElementById('wOk').style.color = 'var(--good)';
    if(!S.writeProgress[this.current]){
      S.writeProgress[this.current] = {todayCount:0, totalCount:0, lastDate:null};
    }
    const today = todayISO();
    const wp = S.writeProgress[this.current];
    if(wp.lastDate !== today){ wp.todayCount = 0; wp.lastDate = today; }
    wp.todayCount++;
    wp.totalCount++;
    saveState();
    document.getElementById('wTimes').textContent = wp.todayCount;
    document.getElementById('wTotal').textContent = wp.totalCount;
    document.querySelectorAll(`.kana-cell[data-ch="${this.current}"]`).forEach(el=>el.classList.add('written'));
    if(wp.todayCount >= 5) trackWroteEnough(this.current);
    if(wp.todayCount === 5){
      setTimeout(()=>{
        document.getElementById('writeMsg').textContent = `🎉 「${this.current}」今天寫滿 5 次了！`;
        document.getElementById('writeMsg').className = 'write-msg good';
      }, 800);
    }
  },

  wrongOrder(){
    document.getElementById('writeMsg').textContent = '× 筆順錯了，自動清掉';
    document.getElementById('writeMsg').className = 'write-msg bad';
    document.getElementById('wOk').textContent = '×';
    document.getElementById('wOk').style.color = 'var(--accent)';
    setTimeout(()=>this.clear(), 700);
  },

  clear(){
    this.targets.forEach(t=>t.done=false);
    this.nextIdx = 0;
    this.drawing = false;
    this.drawnPath = []; this.allPaths = [];
    this.state = 'idle';
    document.getElementById('writeMsg').textContent = '換你寫，照 ①②③ 順序';
    document.getElementById('writeMsg').className = 'write-msg';
    document.getElementById('wOk').textContent = '—';
    document.getElementById('wOk').style.color = '';
    this.render();
  },

  init(){
    const wrap = document.getElementById('canvasWrap');
    wrap.addEventListener('touchstart', e=>this.start(e), {passive:false});
    wrap.addEventListener('touchmove', e=>this.move(e), {passive:false});
    wrap.addEventListener('touchend', e=>this.end(e), {passive:false});
    wrap.addEventListener('touchcancel', e=>this.end(e), {passive:false});
    wrap.addEventListener('mousedown', e=>this.start(e));
    wrap.addEventListener('mousemove', e=>this.move(e));
    wrap.addEventListener('mouseup', e=>this.end(e));
    wrap.addEventListener('mouseleave', e=>this.end(e));
  },
};

function openWrite(ch, ro){ Write.open(ch, ro); }
function closeWrite(){ Write.close(); }
function clearWrite(){ Write.clear(); }
function speakAndNextWrite(){ if(Write.current) Audio.speak(Write.current); }
function replayWriteDemo(){ Write.replayDemo(); }


const STORAGE_KEY = 'jp300';
const DEFAULT_STATE = {
  startDate:null,
  completedDays:[],
  lastCompleteDate:null,
  restDaysUsed:[],
  kanaProgress:{hira:[], kata:[]},
  writeProgress:{},        // { 'あ': {todayCount, totalCount, lastDate} }
  dismissedHints:[],
  // 闖關系統
  questProgress:{},        // { '2026-05-09': { listened:['あ',...], wroteEnough:['あ',...], quizPassed:false, quizBest:0 } }
  badges:[],               // ['hira-half', 'hira-full', 'kata-full', 'all-kana', 'graduate']
};
let S = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    const parsed = JSON.parse(raw);
    const merged = {...DEFAULT_STATE, ...parsed};
    if(!merged.writeProgress) merged.writeProgress = {};
    if(!merged.dismissedHints) merged.dismissedHints = [];
    if(!merged.kanaProgress) merged.kanaProgress = {hira:[], kata:[]};
    if(!merged.questProgress) merged.questProgress = {};
    if(!merged.badges) merged.badges = [];
    return merged;
  }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
  catch(e){ console.warn('save failed', e); }
}

// 取得今日關卡狀態（沒有就建一個）
function getTodayQuest(){
  const today = todayISO();
  if(!S.questProgress[today]){
    S.questProgress[today] = { listened:[], wroteEnough:[], quizPassed:false, quizBest:0 };
  }
  return S.questProgress[today];
}

// ============================================================
// DATE HELPERS
// ============================================================
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysBetween(iso1, iso2){
  const a = new Date(iso1+'T00:00:00');
  const b = new Date(iso2+'T00:00:00');
  return Math.round((b-a)/86400000);
}

// 今天應該是第幾天（從 startDate 算）
function currentDayNumber(){
  if(!S.startDate){
    S.startDate = todayISO();
    saveState();
    return 1;
  }
  const diff = daysBetween(S.startDate, todayISO());
  return Math.max(1, Math.min(300, diff + 1));
}

// 連續打卡天數
function calcStreak(){
  if(S.completedDays.length === 0) return 0;
  if(!S.lastCompleteDate) return 0;
  const today = todayISO();
  const diff = daysBetween(S.lastCompleteDate, today);
  if(diff > 1) return 0; // 已經斷了
  // 從最後一天往回數連續
  const sorted = [...S.completedDays].sort((a,b)=>b-a);
  let streak = 1;
  for(let i=1;i<sorted.length;i++){
    if(sorted[i-1] - sorted[i] === 1) streak++;
    else break;
  }
  return streak;
}

// 是否今天已打卡
function isTodayDone(){
  const dn = currentDayNumber();
  return S.completedDays.includes(dn) || S.restDaysUsed.includes(todayISO());
}

// 是否斷線（昨天沒打卡且不是請假）
function checkMiss(){
  if(!S.lastCompleteDate) return null;
  const today = todayISO();
  const diff = daysBetween(S.lastCompleteDate, today);
  if(diff <= 1) return null;
  // 確認中間的日期是否都用了 rest day
  let actualMissed = 0;
  for(let i=1;i<diff;i++){
    const d = new Date(S.lastCompleteDate+'T00:00:00');
    d.setDate(d.getDate()+i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(!S.restDaysUsed.includes(iso)) actualMissed++;
  }
  return actualMissed > 0 ? actualMissed : null;
}

// ============================================================
// UI: KANA GRID
// ============================================================
function renderKanaCells(kind, rowsLearned, opts){
  opts = opts || {};
  const SET = kind === 'kata' ? KATA : HIRA;
  const ROWS = [
    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
    [25,26,27,28,29],[30,31,32,33,34],[35,-1,36,-1,37],[38,39,40,41,42],[43,-1,-1,-1,44],
  ];
  const clickable = opts.clickable !== false;
  const allowWrite = opts.allowWrite !== false;
  let html = '';
  const buildCell = (k, learned)=>{
    const written = (S.writeProgress[k.ch]?.totalCount || 0) > 0;
    const speakClick = clickable ? `onclick="event.stopPropagation();Audio.speakKana('${k.ch}', this)"` : '';
    const writeBtn = (clickable && allowWrite && STROKE_PATHS[k.ch])
      ? `<button class="act-btn" onclick="event.stopPropagation();openWrite('${k.ch}','${k.ro}')">寫</button>`
      : '';
    return `<div class="kana-cell ${learned?'learned':''} ${written?'written':''}" data-ch="${k.ch}" ${speakClick}>
      <span class="ch">${k.ch}</span>
      <span class="ro">${k.ro}</span>
      <span class="write-mark">✓</span>
      <div class="actions">${writeBtn}</div>
    </div>`;
  };
  for(const r of ROWS){
    for(const idx of r){
      if(idx < 0){ html += '<div class="kana-cell empty"></div>'; continue; }
      const k = SET[idx];
      const rowIdx = ROWS.findIndex(row=>row.includes(idx));
      const learned = rowsLearned.includes(rowIdx);
      html += buildCell(k, learned);
    }
  }
  // ん row
  html += '<div class="kana-cell empty"></div><div class="kana-cell empty"></div>';
  const nLearned = rowsLearned.includes(9);
  html += buildCell(SET[45], nLearned);
  html += '<div class="kana-cell empty"></div><div class="kana-cell empty"></div>';
  return html;
}

// ============================================================
// QUIZ ENGINE
// ============================================================
let quizState = null;

function buildQuizPool(lesson){
  const pool = [];
  if(lesson.kind === 'hira' || lesson.kind === 'kata'){
    const SET = lesson.kind === 'kata' ? KATA : HIRA;
    const ROWS = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [25,26,27,28,29],[30,31,32,33,34],[35,36,37],[38,39,40,41,42],[43,44,45]
    ];
    for(const rowIdx of lesson.rows){
      for(const idx of ROWS[rowIdx]){
        pool.push(SET[idx]);
      }
    }
  } else if(lesson.kind === 'both'){
    pool.push(...HIRA, ...KATA);
  } else {
    return null; // special / placeholder: no quiz
  }
  return pool;
}

function startQuiz(lesson){
  const pool = buildQuizPool(lesson);
  if(!pool || pool.length === 0){
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('completeBtn').disabled = isTodayDone();
    return;
  }
  document.getElementById('quizSection').style.display = '';
  // shuffle and pick up to 10
  const shuffled = [...pool].sort(()=>Math.random()-0.5);
  const questions = shuffled.slice(0, Math.min(10, pool.length));
  quizState = {
    pool, questions, idx:0, correct:0, wrong:0,
    locked:false,
  };
  renderQuiz();
}

function renderQuiz(){
  if(!quizState){return}
  const {questions, idx, correct, pool} = quizState;
  if(idx >= questions.length){
    // done
    const pct = Math.round(correct/questions.length*100);
    const msg = pct >= 80 ? 'よくできました！' : pct >= 60 ? 'もう少し！' : 'ファイト！';
    const sub = pct >= 80 ? '今天的內容你已經掌握了。' : '今天先這樣，明天再加強。';
    document.getElementById('quizBox').innerHTML = `
      <div class="quiz-done">
        <div class="big">${pct >= 80 ? '🎌' : pct >= 60 ? '✨' : '💪'}</div>
        <div class="msg">${msg}</div>
        <div class="sub">${correct} / ${questions.length} 答對 · ${pct}%</div>
        <button class="quiz-opt" style="display:inline-block;width:auto;padding:10px 20px;margin-top:8px" onclick="startQuiz(getCurrentLesson())">再練一次</button>
      </div>`;
    document.getElementById('quizCount').textContent = `${questions.length} / ${questions.length}`;
    // 完成練習就解鎖完成按鈕
    if(!isTodayDone()) document.getElementById('completeBtn').disabled = false;
    return;
  }
  const q = questions[idx];
  // 4 options: 1 correct + 3 wrong
  const wrongs = [...pool].filter(x=>x.ro !== q.ro).sort(()=>Math.random()-0.5).slice(0,3);
  const opts = [q, ...wrongs].sort(()=>Math.random()-0.5);
  document.getElementById('quizCount').textContent = `${idx+1} / ${questions.length}`;
  document.getElementById('quizBox').innerHTML = `
    <div class="quiz-q">
      ${q.ch}
      <button class="quiz-play" onclick="Audio.speak('${q.ch}')">🔊</button>
    </div>
    <div class="quiz-opts">
      ${opts.map(o=>`<button class="quiz-opt" onclick="answerQuiz('${o.ro}','${q.ro}',this)">${o.ro}</button>`).join('')}
    </div>
    <div class="quiz-meta"><span>選羅馬拼音</span><span>正解 ${quizState.correct} · 錯 ${quizState.wrong}</span></div>
  `;
  // 自動唸出來
  if(Audio.ready) setTimeout(()=>Audio.speak(q.ch), 200);
}

function answerQuiz(picked, correct, btn){
  if(quizState.locked) return;
  quizState.locked = true;
  const allBtns = document.querySelectorAll('.quiz-opt');
  const q = quizState.questions[quizState.idx];
  if(picked === correct){
    btn.classList.add('correct');
    quizState.correct++;
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b=>{ if(b.textContent === correct) b.classList.add('correct'); });
    quizState.wrong++;
    // 答錯時再唸一次正確發音，加深印象
    if(Audio.ready && q) setTimeout(()=>Audio.speak(q.ch), 300);
  }
  setTimeout(()=>{
    quizState.idx++;
    quizState.locked = false;
    renderQuiz();
  }, picked === correct ? 600 : 1200);
}

// ============================================================
// RENDER TODAY
// ============================================================
function getCurrentLesson(){
  const dn = currentDayNumber();
  return ALL_LESSONS[dn-1];
}

// ============================================================
// QUEST TRACKING
// ============================================================
function trackListened(ch){
  const lesson = getCurrentLesson();
  const todayChars = collectLessonKana(lesson);
  if(!todayChars.includes(ch)) return; // 不是今天該學的不算
  const q = getTodayQuest();
  if(!q.listened.includes(ch)){
    q.listened.push(ch);
    saveState();
    refreshQuestUI();
  }
}

function trackWroteEnough(ch){
  const lesson = getCurrentLesson();
  const todayChars = collectLessonKana(lesson);
  if(!todayChars.includes(ch)) return;
  const q = getTodayQuest();
  if(!q.wroteEnough.includes(ch)){
    q.wroteEnough.push(ch);
    saveState();
    refreshQuestUI();
  }
}

function trackQuizPassed(score, total){
  const q = getTodayQuest();
  q.quizBest = Math.max(q.quizBest || 0, score);
  // 80% 以上算過關
  if(score / total >= 0.8){
    q.quizPassed = true;
  }
  saveState();
  refreshQuestUI();
}

// 計算三關完成度
function getQuestStatus(){
  const lesson = getCurrentLesson();
  const todayChars = collectLessonKana(lesson);
  const q = getTodayQuest();

  // placeholder / 純文字課（沒有假名）→ 三關都當作不適用
  if(todayChars.length === 0){
    return {
      hasQuests:false,
      listenDone:true, listenN:0, listenTotal:0,
      writeDone:true,  writeN:0,  writeTotal:0,
      quizDone:true,   quizBest:0, quizPassed:true,
      allDone:true,
    };
  }

  const listenN = q.listened.filter(c=>todayChars.includes(c)).length;
  const writeN  = q.wroteEnough.filter(c=>todayChars.includes(c)).length;
  return {
    hasQuests:true,
    listenDone: listenN >= todayChars.length,
    listenN, listenTotal:todayChars.length,
    writeDone: writeN >= todayChars.length,
    writeN, writeTotal:todayChars.length,
    quizDone: q.quizPassed === true,
    quizBest: q.quizBest || 0,
    quizPassed: q.quizPassed === true,
    allDone: (listenN >= todayChars.length) && (writeN >= todayChars.length) && (q.quizPassed === true),
  };
}

// 更新關卡 UI（動態刷新分數）
function refreshQuestUI(){
  const st = getQuestStatus();
  if(!st.hasQuests) return;

  const el1 = document.getElementById('q1-stat');
  const el2 = document.getElementById('q2-stat');
  const el3 = document.getElementById('q3-stat');
  if(el1) el1.textContent = `${st.listenN} / ${st.listenTotal}`;
  if(el2) el2.textContent = `${st.writeN} / ${st.writeTotal}`;
  if(el3) el3.textContent = st.quizPassed ? '✓ 通過' : (st.quizBest > 0 ? `最佳 ${st.quizBest}/${st.quizTotal||5}` : '待挑戰');

  const c1 = document.getElementById('quest-1');
  const c2 = document.getElementById('quest-2');
  const c3 = document.getElementById('quest-3');
  if(c1) c1.classList.toggle('done', st.listenDone);
  if(c2) c2.classList.toggle('done', st.writeDone);
  if(c3) c3.classList.toggle('done', st.quizDone);

  // 完成按鈕
  const btn = document.getElementById('completeBtn');
  if(btn && !isTodayDone()){
    btn.disabled = !st.allDone;
    btn.textContent = st.allDone ? '🎌 完成今日進度' : '三關全過才能打卡';
  }
}

// ============================================================
// LISTENING QUIZ (聲音 → 選字)
// ============================================================
const ListenQuiz = {
  questions:[],
  idx:0,
  correct:0,
  active:false,

  start(){
    const lesson = getCurrentLesson();
    const chars = collectLessonKana(lesson);
    if(chars.length === 0) return;
    if(!Audio.ready){
      alert('語音還沒準備好，等一下再試。\n\n如果一直沒準備好，看看頁面頂端有沒有橘色提醒。');
      return;
    }
    // 為每個字出一題（順序打亂）
    this.questions = [...chars].sort(()=>Math.random()-0.5).map(ch=>{
      const SET = (lesson.kind === 'kata') ? KATA : HIRA;
      const allChars = lesson.kind === 'both'
        ? [...HIRA.map(k=>k.ch), ...KATA.map(k=>k.ch)]
        : SET.map(k=>k.ch);
      // 3 個錯誤選項
      const wrongs = allChars.filter(c=>c!==ch).sort(()=>Math.random()-0.5).slice(0,3);
      const opts = [ch, ...wrongs].sort(()=>Math.random()-0.5);
      return {answer:ch, options:opts};
    });
    this.idx = 0;
    this.correct = 0;
    this.active = true;
    document.getElementById('listenQuizModal').classList.add('show');
    this.render();
  },

  render(){
    if(this.idx >= this.questions.length){
      // 結束
      const total = this.questions.length;
      const passed = this.correct/total >= 0.8;
      const pct = Math.round(this.correct/total*100);
      document.getElementById('lqBox').innerHTML = `
        <div class="lq-done">
          <div class="big">${passed ? '🎌' : '💪'}</div>
          <div class="msg">${passed ? '通過！' : '再來一次'}</div>
          <div class="sub">${this.correct} / ${total} 答對 · ${pct}%</div>
          <div class="lq-actions">
            <button class="lq-btn-primary" onclick="ListenQuiz.start()">${passed ? '再考一次' : '重考'}</button>
            <button class="lq-btn-secondary" onclick="ListenQuiz.close()">${passed ? '收工' : '稍後再來'}</button>
          </div>
          ${!passed ? '<div class="lq-tip">小提示：先回去多按幾次假名聽發音，再回來考</div>' : ''}
        </div>`;
      // 記錄
      const q = getTodayQuest();
      q.quizTotal = total;
      saveState();
      trackQuizPassed(this.correct, total);
      return;
    }
    const q = this.questions[this.idx];
    document.getElementById('lqBox').innerHTML = `
      <div class="lq-prog">第 ${this.idx+1} / ${this.questions.length} 題</div>
      <div class="lq-q">
        <button class="lq-play" onclick="ListenQuiz.replay()">🔊</button>
        <div class="lq-prompt">聽聲音，選出對的字</div>
      </div>
      <div class="lq-opts">
        ${q.options.map(c=>`<button class="lq-opt" onclick="ListenQuiz.answer('${c}',this)">${c}</button>`).join('')}
      </div>
      <div class="lq-meta">正解 ${this.correct} · 錯 ${this.idx - this.correct}</div>
    `;
    // 自動唸題目
    setTimeout(()=>Audio.speak(q.answer), 250);
  },

  replay(){
    if(this.idx >= this.questions.length) return;
    Audio.speak(this.questions[this.idx].answer);
  },

  answer(picked, btn){
    if(!this.active) return;
    this.active = false;
    const q = this.questions[this.idx];
    const allBtns = document.querySelectorAll('.lq-opt');
    if(picked === q.answer){
      btn.classList.add('correct');
      this.correct++;
    } else {
      btn.classList.add('wrong');
      allBtns.forEach(b=>{ if(b.textContent === q.answer) b.classList.add('correct'); });
      // 答錯再唸一次
      setTimeout(()=>Audio.speak(q.answer), 200);
    }
    setTimeout(()=>{
      this.idx++;
      this.active = true;
      this.render();
    }, picked === q.answer ? 700 : 1300);
  },

  close(){
    document.getElementById('listenQuizModal').classList.remove('show');
    Audio.stopSequence();
    refreshQuestUI();
  },
};

function startListenQuiz(){ ListenQuiz.start(); }

// 把這一課該連讀的假名收集成陣列（按五十音順序）
function collectLessonKana(lesson){
  if(lesson.kind === 'placeholder' || lesson.kind === 'special') return [];
  const SET = lesson.kind === 'kata' ? KATA : HIRA;
  const ROWS_IDX = [
    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
    [25,26,27,28,29],[30,31,32,33,34],[35,36,37],[38,39,40,41,42],[43,44,45]
  ];
  const chars = [];
  if(lesson.kind === 'both'){
    // 平假名整套接片假名整套
    for(let i=0;i<46;i++) chars.push(HIRA[i].ch);
    for(let i=0;i<46;i++) chars.push(KATA[i].ch);
  } else {
    for(const rowIdx of lesson.rows){
      for(const charIdx of ROWS_IDX[rowIdx]){
        chars.push(SET[charIdx].ch);
      }
    }
  }
  return chars;
}

// 連讀按鈕切換
function toggleSequence(){
  const btn = document.getElementById('readerBtn');
  if(!btn) return;
  if(btn.classList.contains('playing')){
    // 正在播 → 停
    Audio.stopSequence();
    btn.classList.remove('playing');
    btn.innerHTML = '▶ 連讀本課假名';
    document.querySelectorAll('.kana-cell.now').forEach(el=>el.classList.remove('now'));
    return;
  }
  const chars = window._currentLessonChars || [];
  if(chars.length === 0) return;
  if(!Audio.ready){
    alert('語音還沒準備好，等一下再試。');
    return;
  }
  btn.classList.add('playing');
  btn.innerHTML = '⏸ 停止';
  Audio.speakSequence(chars,
    (idx, ch)=>{
      // 高亮當前格子
      document.querySelectorAll('.kana-cell.now').forEach(el=>el.classList.remove('now'));
      const cell = document.querySelector(`.kana-cell[data-ch="${ch}"]`);
      if(cell){
        cell.classList.add('now');
        // 滾到視野內
        cell.scrollIntoView({behavior:'smooth', block:'center'});
      }
    },
    ()=>{
      // 結束
      btn.classList.remove('playing');
      btn.innerHTML = '▶ 連讀本課假名';
      document.querySelectorAll('.kana-cell.now').forEach(el=>el.classList.remove('now'));
    }
  );
}

function renderToday(){
  const dn = currentDayNumber();
  const lesson = ALL_LESSONS[dn-1];
  document.getElementById('logoDay').textContent = String(dn).padStart(3,'0');
  document.getElementById('dayNum').textContent = dn;
  document.getElementById('topicJp').textContent = lesson.topicJp;
  document.getElementById('topicEn').textContent = lesson.topicEn;

  const pct = Math.round(S.completedDays.length / 300 * 100);
  document.getElementById('progBar').style.width = pct + '%';
  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('progDays').textContent = `${S.completedDays.length} / 300 日`;
  document.getElementById('streakNum').textContent = calcStreak();

  // miss banner
  const missed = checkMiss();
  const banner = document.getElementById('missBanner');
  if(missed){
    banner.classList.add('show');
    if(missed === 1){
      banner.innerHTML = `<b>昨天斷掉了。</b><br>沒關係，今天回來就好。連續紀錄重新計算。`;
    } else if(missed === 2){
      banner.innerHTML = `<b>連續斷 ${missed} 天了。</b><br>狀態還好嗎？要不要跟媽媽講一下？`;
    } else {
      banner.innerHTML = `<b>已經 ${missed} 天沒打卡了。</b><br>媽媽說過——斷三天網站要關掉。記得今天打開來看看。`;
    }
  } else {
    banner.classList.remove('show');
  }

  // done state
  if(isTodayDone()){
    document.getElementById('doneStamp').classList.add('show');
    document.getElementById('completeBtn').textContent = '今天已完成';
    document.getElementById('completeBtn').disabled = true;
  } else {
    document.getElementById('doneStamp').classList.remove('show');
  }

  // lesson content
  const ls = document.getElementById('lessonSection');
  const lc = document.getElementById('lessonContent');
  document.getElementById('lessonLabel').textContent = `Day ${dn}`;

  if(lesson.kind === 'placeholder'){
    lc.innerHTML = `
      <div class="lesson-card">
        <div class="lesson-text">${lesson.text}</div>
        <div style="text-align:center;padding:20px;color:var(--ink-3);font-family:var(--jp-display);font-size:32px">準備中</div>
      </div>`;
  } else if(lesson.kind === 'special'){
    lc.innerHTML = `
      <div class="lesson-card">
        <div class="lesson-text">${lesson.text}</div>
        ${lesson.examples.length > 0 ? '<div class="speaker-hint"><span class="dot"></span>點下面的字會發音</div>' : ''}
        ${lesson.examples.map(e=>`
          <div class="example" onclick="Audio.speak('${e.jp}'); this.classList.add('playing'); setTimeout(()=>this.classList.remove('playing'),800);">
            <div class="jp">${e.jp}</div>
            <div class="ro">${e.ro}</div>
            <div class="tw">${e.tw}</div>
            <div class="play-ic">▶</div>
          </div>`).join('')}
      </div>`;
  } else {
    const grid = renderKanaCells(lesson.kind === 'both' ? 'hira' : lesson.kind, lesson.rows);
    const chars = collectLessonKana(lesson);
    lc.innerHTML = `
      <div class="lesson-card">
        <div class="lesson-text">${lesson.text}</div>
        <div class="row-reader">
          <button class="reader-btn" id="readerBtn" onclick="toggleSequence()">▶ 連讀本課假名</button>
          <span class="reader-hint">每個音拍滿一拍</span>
        </div>
        <div class="speaker-hint"><span class="dot"></span>點單一格子聽單音</div>
        <div class="kana-grid">${grid}</div>
        ${lesson.examples.map(e=>`
          <div class="example" onclick="Audio.speak('${e.jp}'); this.classList.add('playing'); setTimeout(()=>this.classList.remove('playing'),800);">
            <div class="jp">${e.jp}</div>
            <div class="ro">${e.ro}</div>
            <div class="tw">${e.tw}</div>
            <div class="play-ic">▶</div>
          </div>`).join('')}
      </div>`;
    window._currentLessonChars = chars;
  }

  // 顯示/隱藏關卡
  const questsBox = document.getElementById('questsBox');
  const lessonChars = collectLessonKana(lesson);
  if(lessonChars.length === 0){
    // 純文字課（特殊規則、placeholder）—— 沒有關卡，直接讓打卡
    questsBox.style.display = 'none';
    if(!isTodayDone()){
      document.getElementById('completeBtn').disabled = false;
      document.getElementById('completeBtn').textContent = '完成今日進度';
    }
  } else {
    questsBox.style.display = 'flex';
    refreshQuestUI();
  }
}

// ============================================================
// COMPLETE DAY
// ============================================================
function completeDay(){
  const dn = currentDayNumber();
  if(S.completedDays.includes(dn)) return;
  // 檢查關卡
  const st = getQuestStatus();
  if(st.hasQuests && !st.allDone){
    alert('還有關卡沒過喔，三關全過才能打卡。');
    return;
  }
  S.completedDays.push(dn);
  S.lastCompleteDate = todayISO();
  // 更新假名進度
  const lesson = ALL_LESSONS[dn-1];
  if(lesson.kind === 'hira' || lesson.kind === 'kata'){
    const target = lesson.kind === 'kata' ? S.kanaProgress.kata : S.kanaProgress.hira;
    for(const r of lesson.rows){
      if(!target.includes(r)) target.push(r);
    }
  } else if(lesson.kind === 'both'){
    [0,1,2,3,4,5,6,7,8,9].forEach(r=>{
      if(!S.kanaProgress.hira.includes(r)) S.kanaProgress.hira.push(r);
      if(!S.kanaProgress.kata.includes(r)) S.kanaProgress.kata.push(r);
    });
  }
  // 檢查獎章
  const newBadges = checkAndAwardBadges(dn);
  saveState();

  // 慶祝動畫
  fireConfetti();
  const btn = document.getElementById('completeBtn');
  btn.textContent = '✓ よくやった！';
  btn.style.background = 'linear-gradient(135deg, var(--good), var(--accent-2))';

  setTimeout(()=>{
    btn.style.background = '';
    if(newBadges.length > 0){
      showBadgeAward(newBadges);
    } else {
      renderToday();
      renderProgress();
    }
  }, 1500);
}

// ============================================================
// BADGES
// ============================================================
const BADGE_DEFS = {
  'hira-half':   { day:7,  emoji:'🌱', title:'平假名前半', desc:'學完 35 個平假名' },
  'hira-full':   { day:9,  emoji:'🌸', title:'平假名通關', desc:'46 個平假名全認得' },
  'hira-master': { day:12, emoji:'🎋', title:'平假名熟練', desc:'平假名複習完成' },
  'kata-full':   { day:21, emoji:'⛩️', title:'片假名通關', desc:'46 個片假名全認得' },
  'all-kana':    { day:25, emoji:'🗾', title:'92 全收', desc:'平假名 + 片假名混合通過' },
  'graduate':    { day:30, emoji:'🎌', title:'五十音畢業', desc:'濁音、拗音、長音、促音全部完成' },
};

function checkAndAwardBadges(dn){
  const newOnes = [];
  for(const [id, def] of Object.entries(BADGE_DEFS)){
    if(dn >= def.day && !S.badges.includes(id)){
      S.badges.push(id);
      newOnes.push({id, ...def});
    }
  }
  return newOnes;
}

function showBadgeAward(badges){
  const b = badges[0];
  const remaining = badges.slice(1);
  // 把 remaining 存到全域變數，由 close handler 用
  window._pendingBadges = remaining;
  const overlay = document.createElement('div');
  overlay.className = 'badge-overlay';
  overlay.innerHTML = `
    <div class="badge-card">
      <div class="badge-emoji">${b.emoji}</div>
      <div class="badge-title">${b.title}</div>
      <div class="badge-desc">${b.desc}</div>
      <div class="badge-tag">獎章解鎖</div>
      <button class="badge-close" onclick="closeBadgeAward()">繼續</button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('show'), 50);
  fireConfetti();
}

function closeBadgeAward(){
  const overlay = document.querySelector('.badge-overlay');
  if(overlay) overlay.remove();
  const remaining = window._pendingBadges || [];
  if(remaining.length > 0){
    window._pendingBadges = [];
    showBadgeAward(remaining);
  } else {
    renderToday();
    renderProgress();
  }
}

function fireConfetti(){
  const box = document.getElementById('celebrate');
  box.classList.add('show');
  box.innerHTML = '';
  const colors = ['#ff3366','#ffd93d','#4ade80','#ff8c42','#a8a8ff'];
  for(let i=0;i<60;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDuration = (1.5 + Math.random()*1.5) + 's';
    c.style.animationDelay = (Math.random()*0.5) + 's';
    if(Math.random() > 0.5) c.style.borderRadius = '50%';
    box.appendChild(c);
  }
  setTimeout(()=>{ box.classList.remove('show'); box.innerHTML=''; }, 3500);
}

// ============================================================
// REST DAY
// ============================================================
function useRestDay(){
  const today = todayISO();
  if(S.restDaysUsed.includes(today)){
    alert('今天已經請假過了。');
    return;
  }
  // 計算這個月用過幾次
  const thisMonth = today.slice(0,7);
  const usedThisMonth = S.restDaysUsed.filter(d=>d.startsWith(thisMonth)).length;
  if(usedThisMonth >= 4){
    alert('這個月的請假已經用完（4 次）。下個月再來。');
    return;
  }
  if(!confirm('確定今天請假？這個月還剩 ' + (4 - usedThisMonth - 1) + ' 次。')){
    return;
  }
  S.restDaysUsed.push(today);
  S.lastCompleteDate = today; // 算進連續，但不算進度
  saveState();
  renderToday();
  renderProgress();
  alert('今天就好好休息。明天回來。');
}

// ============================================================
// PROGRESS VIEW
// ============================================================
function renderProgress(){
  document.getElementById('s-streak').textContent = calcStreak();
  document.getElementById('s-total').textContent = S.completedDays.length;
  const kanaCount = countLearnedKana();
  document.getElementById('s-kana').textContent = kanaCount;
  document.getElementById('s-pct').textContent = Math.round(S.completedDays.length/300*100) + '%';

  // calendar - last 30 days
  const cal = document.getElementById('calGrid');
  const dn = currentDayNumber();
  const start = Math.max(1, dn - 19);
  const end = Math.min(300, start + 29);
  let html = '';
  for(let d=start; d<=end; d++){
    let cls = 'cal-cell';
    if(S.completedDays.includes(d)) cls += ' done';
    if(d === dn) cls += ' today';
    if(d > dn) cls += ' future';
    html += `<div class="${cls}">${d}</div>`;
  }
  cal.innerHTML = html;

  // kana progress grid
  document.getElementById('kanaProgGrid').innerHTML = renderKanaCells('hira', S.kanaProgress.hira);
  document.getElementById('kanaProgLbl').textContent = `${kanaCount} / 92`;

  // badges
  const bg = document.getElementById('badgeGrid');
  if(bg){
    let bhtml = '';
    for(const [id, def] of Object.entries(BADGE_DEFS)){
      const earned = S.badges.includes(id);
      bhtml += `<div class="badge-item ${earned?'':'locked'}">
        <div class="em">${def.emoji}</div>
        <div class="nm">${def.title}</div>
      </div>`;
    }
    bg.innerHTML = bhtml;
    document.getElementById('badgeCount').textContent = `${S.badges.length} / ${Object.keys(BADGE_DEFS).length}`;
  }

  // rest left
  const today = todayISO();
  const thisMonth = today.slice(0,7);
  const used = S.restDaysUsed.filter(d=>d.startsWith(thisMonth)).length;
  const restEl = document.getElementById('restLeft');
  if(restEl) restEl.textContent = Math.max(0, 4 - used);
}

function countLearnedKana(){
  // 每個 row 對應的字數
  const ROW_COUNT = [5,5,5,5,5,5,5,3,5,3]; // a/k/s/t/n/h/m/y/r/wa(wa+wo+n)
  let n = 0;
  for(const r of S.kanaProgress.hira) n += ROW_COUNT[r];
  for(const r of S.kanaProgress.kata) n += ROW_COUNT[r];
  return n;
}

// ============================================================
// MOM VIEW
// ============================================================
// 取得某個日期 + 第幾天的關卡狀態
function getDayQuestSummary(isoDate, dayNumber){
  const q = S.questProgress[isoDate];
  const lesson = ALL_LESSONS[dayNumber-1];
  const lessonChars = lesson ? collectLessonKana(lesson) : [];
  const total = lessonChars.length;

  // 是否完成打卡
  const completed = S.completedDays.includes(dayNumber);
  // 是否請假
  const rested = S.restDaysUsed.includes(isoDate);
  // 是否有任何活動
  const hasActivity = !!q && (q.listened?.length > 0 || q.wroteEnough?.length > 0 || q.quizBest > 0);

  if(!q && !completed && !rested){
    return { state:'none', completed, rested, hasActivity:false };
  }

  if(total === 0){
    // 純文字日（複習日、進階日等等）
    return { state: completed ? 'completed' : (rested ? 'rested' : (hasActivity ? 'partial' : 'none')),
             completed, rested, hasActivity, isText:true };
  }

  const listenN = (q?.listened || []).filter(c=>lessonChars.includes(c)).length;
  const writeN  = (q?.wroteEnough || []).filter(c=>lessonChars.includes(c)).length;
  const quizPassed = q?.quizPassed === true;
  const quizBest = q?.quizBest || 0;

  return {
    state: completed ? 'completed' : (rested ? 'rested' : (hasActivity ? 'partial' : 'none')),
    completed, rested, hasActivity,
    listenN, writeN, quizPassed, quizBest,
    listenDone: listenN >= total,
    writeDone: writeN >= total,
    quizDone: quizPassed,
    total,
  };
}

// 把 day number 轉成 ISO 日期
function dayNumberToISO(dayNumber){
  if(!S.startDate) return null;
  const d = new Date(S.startDate + 'T00:00:00');
  d.setDate(d.getDate() + (dayNumber - 1));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

let momSelectedDay = null;

function renderMomView(){
  const dn = currentDayNumber();
  const today = todayISO();

  // === 今天總覽 ===
  const lesson = ALL_LESSONS[dn-1];
  const sum = getDayQuestSummary(today, dn);
  let todayHtml = `
    <div class="mom-today-day">
      <span class="n">Day ${dn}</span>
      <span class="topic">${lesson.topicJp} · ${lesson.topicEn}</span>
    </div>`;

  if(sum.isText && sum.total === 0){
    // 純文字課（沒有關卡）
    todayHtml += `<div style="color:var(--ink-2);font-size:13px;line-height:1.6;text-align:center;padding:14px 0">
      今天是純內容課（複習 / 進階規則），<br>沒有關卡，看完內容打卡即可。
    </div>`;
    todayHtml += sum.completed
      ? `<div class="mom-summary all-ok">✓ 今天已打卡</div>`
      : (sum.rested ? `<div class="mom-summary partial">😴 今天請假</div>`
                   : `<div class="mom-summary none">尚未打卡</div>`);
  } else if(sum.total === 0){
    todayHtml += `<div style="color:var(--ink-3);font-size:13px;text-align:center;padding:14px">準備中</div>`;
  } else {
    todayHtml += `
      <div class="mom-quest-row ${sum.listenDone?'ok':(sum.listenN>0?'fail':'')}">
        <span class="icn">🎧</span>
        <span class="name">關 1：聽 + 認</span>
        <span class="stat">${sum.listenN} / ${sum.total} ${sum.listenDone?'✓':''}</span>
      </div>
      <div class="mom-quest-row ${sum.writeDone?'ok':(sum.writeN>0?'fail':'')}">
        <span class="icn">✍️</span>
        <span class="name">關 2：寫（每字 5 次）</span>
        <span class="stat">${sum.writeN} / ${sum.total} ${sum.writeDone?'✓':''}</span>
      </div>
      <div class="mom-quest-row ${sum.quizDone?'ok':(sum.quizBest>0?'fail':'')}">
        <span class="icn">🎯</span>
        <span class="name">關 3：聽音小考</span>
        <span class="stat">${sum.quizDone ? '✓ 通過' : (sum.quizBest > 0 ? `最佳 ${sum.quizBest}/${sum.total}` : '尚未挑戰')}</span>
      </div>`;

    const passedN = (sum.listenDone?1:0) + (sum.writeDone?1:0) + (sum.quizDone?1:0);
    if(sum.completed){
      todayHtml += `<div class="mom-summary all-ok">🎌 今天三關全過 + 已打卡</div>`;
    } else if(sum.rested){
      todayHtml += `<div class="mom-summary partial">😴 今天請假</div>`;
    } else if(passedN === 3){
      todayHtml += `<div class="mom-summary all-ok">三關全過，等她按打卡</div>`;
    } else if(passedN > 0){
      todayHtml += `<div class="mom-summary partial">${passedN} / 3 關完成（半途）</div>`;
    } else if(sum.hasActivity){
      todayHtml += `<div class="mom-summary partial">有打開但都沒過關</div>`;
    } else {
      todayHtml += `<div class="mom-summary none">今天還沒打開過</div>`;
    }
  }
  document.getElementById('momToday').innerHTML = todayHtml;

  // === 總體數字 ===
  document.getElementById('mv-streak').textContent = calcStreak();
  document.getElementById('mv-done').textContent = S.completedDays.length;
  document.getElementById('mv-kana').textContent = countLearnedKana();
  const writtenAll = Object.keys(S.writeProgress).filter(k => (S.writeProgress[k]?.totalCount || 0) > 0).length;
  document.getElementById('mv-written').textContent = writtenAll;

  // === 30 天日曆 ===
  const cal = document.getElementById('dayCal');
  const start = Math.max(1, dn - 23);
  const end = Math.min(300, start + 29);
  let calHtml = '';
  for(let d=start; d<=end; d++){
    const iso = dayNumberToISO(d);
    const sumD = iso ? getDayQuestSummary(iso, d) : {state:'none'};
    let cls = 'day-row-wrap';
    if(d === dn) cls += ' today';
    if(d > dn) cls += ' future';
    if(momSelectedDay === d) cls += ' selected';

    // 三個小燈號
    let lights = '';
    if(d <= dn && sumD.total > 0){
      lights += `<span class="lt ${sumD.listenDone?'on':(sumD.listenN>0?'partial':'')}"></span>`;
      lights += `<span class="lt ${sumD.writeDone?'on':(sumD.writeN>0?'partial':'')}"></span>`;
      lights += `<span class="lt ${sumD.quizDone?'on':(sumD.quizBest>0?'partial':'')}"></span>`;
      lights += `<span class="lt ${sumD.completed?'on':''}"></span>`;
    } else if(d <= dn && sumD.completed){
      // 純文字課完成
      lights = `<span class="lt on"></span><span class="lt on"></span><span class="lt on"></span><span class="lt on"></span>`;
    } else {
      lights = `<span class="lt"></span><span class="lt"></span><span class="lt"></span><span class="lt"></span>`;
    }

    calHtml += `<div class="${cls}" onclick="momSelectDay(${d})">
      <div class="day-n">${d}</div>
      <div class="lights">${lights}</div>
    </div>`;
  }
  cal.innerHTML = calHtml;

  // === 詳情 ===
  if(momSelectedDay){
    renderMomDayDetail(momSelectedDay);
  }
}

function momSelectDay(d){
  momSelectedDay = d;
  renderMomView();
  // 滾到詳情
  setTimeout(()=>{
    const el = document.getElementById('dayDetailWrap');
    if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }, 100);
}

function renderMomDayDetail(d){
  const iso = dayNumberToISO(d);
  if(!iso) return;
  const lesson = ALL_LESSONS[d-1];
  const sum = getDayQuestSummary(iso, d);
  const wrap = document.getElementById('dayDetailWrap');
  const det = document.getElementById('dayDetail');
  const h = document.getElementById('dayDetailH');
  wrap.style.display = '';

  const dateStr = new Date(iso + 'T00:00:00').toLocaleDateString('zh-TW', {month:'numeric', day:'numeric', weekday:'short'});
  h.textContent = `Day ${d} · ${dateStr}`;

  let html = `<div class="summary"><b>${lesson.topicJp}</b> · ${lesson.topicEn}</div>`;

  if(sum.completed){
    html += `<div class="summary" style="color:var(--good)">✓ 三關全過，已打卡</div>`;
  } else if(sum.rested){
    html += `<div class="summary" style="color:var(--warn)">😴 這天她按了請假</div>`;
  } else if(sum.hasActivity){
    html += `<div class="summary" style="color:var(--warn)">⚠️ 有打開但沒打卡</div>`;
  } else if(d > currentDayNumber()){
    html += `<div class="summary" style="color:var(--ink-3)">未來的日子</div>`;
  } else if(d === currentDayNumber()){
    html += `<div class="summary" style="color:var(--ink-2)">今天</div>`;
  } else {
    html += `<div class="summary" style="color:var(--accent)">✗ 那天根本沒打開</div>`;
  }

  if(sum.total > 0){
    html += `<div class="ql-row"><span>🎧 聽 + 認</span><span>${sum.listenN || 0} / ${sum.total} ${sum.listenDone?'✓':''}</span></div>`;
    html += `<div class="ql-row"><span>✍️ 寫（5 次）</span><span>${sum.writeN || 0} / ${sum.total} ${sum.writeDone?'✓':''}</span></div>`;
    html += `<div class="ql-row"><span>🎯 聽音小考</span><span>${sum.quizDone ? '✓ 通過' : (sum.quizBest > 0 ? `最佳 ${sum.quizBest}/${sum.total}` : '未挑戰')}</span></div>`;
  } else {
    html += `<div class="summary" style="color:var(--ink-3);font-size:12px">這天是純文字課（複習日／進階規則），沒有關卡。</div>`;
  }

  det.innerHTML = html;
}

// ============================================================
// VIEW SWITCHING
// ============================================================
function switchView(name){
  // 切換 view 時，停掉連讀
  if(typeof Audio !== 'undefined' && Audio.stopSequence) Audio.stopSequence();
  const readerBtn = document.getElementById('readerBtn');
  if(readerBtn && readerBtn.classList.contains('playing')){
    readerBtn.classList.remove('playing');
    readerBtn.innerHTML = '▶ 連讀本課假名';
    document.querySelectorAll('.kana-cell.now').forEach(el=>el.classList.remove('now'));
  }
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  if(name === 'progress') renderProgress();
  if(name === 'mom') renderMomView();
  window.scrollTo(0,0);
}

function resetAll(){
  if(!confirm('確定要全部清空嗎？所有進度都會不見。')) return;
  if(!confirm('真的確定？這個動作沒辦法還原。')) return;
  localStorage.removeItem(STORAGE_KEY);
  S = {...DEFAULT_STATE};
  location.reload();
}

// ============================================================
// RESOURCE HINTS (按進度漸進推薦免費資源)
// ============================================================
const RESOURCE_HINTS = [
  {
    id:'week2',  // Day 8 起出現
    triggerDay:8,
    title:'第 2 週：可以加一個練習網站',
    body:`五十音認得起來了，可以開始多練。<br>
          推薦：<a href="https://realkana.com" target="_blank">Real Kana</a>（真的免費，不用註冊）。每天 5 分鐘打亂順序考你。<br>
          <i style="color:var(--ink-3);font-size:11px">不是要取代這個網站。是補練習量。</i>`
  },
  {
    id:'week3',
    triggerDay:15,
    title:'第 3 週：加首日文歌當背景',
    body:`YouTube 搜尋「<b>NHK にほんごであそぼ</b>」或「<b>Hiragana Song</b>」。<br>
          洗澡、走路、做作業時放著聽就好。耳朵習慣日文節奏，發音自然會變準。`
  },
  {
    id:'week4',
    triggerDay:22,
    title:'第 4 週：圖像聯想記得更牢',
    body:`如果有些假名一直記不起來，試試看：<a href="https://www.tofugu.com/japanese/learn-hiragana/" target="_blank">Tofugu Hiragana Mnemonics</a>。<br>
          每個假名有一個圖像故事，例如「あ」想成一個「安」字。視覺型的人特別有效。`
  },
  {
    id:'kana-done',
    triggerDay:31,
    title:'🎌 五十音通關！下一階段資源',
    body:`恭喜走完 30 天五十音。下一階段要學單字跟句型，這些工具開始派上用場：<br>
          • <a href="https://jisho.org" target="_blank">Jisho.org</a>（線上字典，查單字漢字筆順）<br>
          • <a href="https://www3.nhk.or.jp/news/easy/" target="_blank">NHK Easy News</a>（簡單日語新聞）<br>
          • <a href="https://jlptsensei.com" target="_blank">JLPT Sensei</a>（N5 文法整理）`
  },
];

function checkResourceHint(){
  const day = currentDayNumber();
  // 找最新的、還沒被關掉的、已觸發的提示
  const hint = [...RESOURCE_HINTS].reverse().find(h =>
    day >= h.triggerDay && !S.dismissedHints.includes(h.id)
  );
  if(!hint) return;
  const el = document.getElementById('resHint');
  document.getElementById('resHintContent').innerHTML =
    `<h4>${hint.title}</h4><div>${hint.body}</div>`;
  el.dataset.hintId = hint.id;
  el.classList.add('show');
}

function dismissResHint(){
  const el = document.getElementById('resHint');
  const id = el.dataset.hintId;
  if(id && !S.dismissedHints.includes(id)){
    S.dismissedHints.push(id);
    saveState();
  }
  el.classList.remove('show');
}

// ============================================================
// INIT
// ============================================================
Audio.init();
Write.init();
checkResourceHint();
renderToday();
renderProgress();
