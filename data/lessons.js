const HIRA = [
  // a-row
  {ch:'あ',ro:'a'},{ch:'い',ro:'i'},{ch:'う',ro:'u'},{ch:'え',ro:'e'},{ch:'お',ro:'o'},
  // ka-row
  {ch:'か',ro:'ka'},{ch:'き',ro:'ki'},{ch:'く',ro:'ku'},{ch:'け',ro:'ke'},{ch:'こ',ro:'ko'},
  // sa-row
  {ch:'さ',ro:'sa'},{ch:'し',ro:'shi'},{ch:'す',ro:'su'},{ch:'せ',ro:'se'},{ch:'そ',ro:'so'},
  // ta-row
  {ch:'た',ro:'ta'},{ch:'ち',ro:'chi'},{ch:'つ',ro:'tsu'},{ch:'て',ro:'te'},{ch:'と',ro:'to'},
  // na-row
  {ch:'な',ro:'na'},{ch:'に',ro:'ni'},{ch:'ぬ',ro:'nu'},{ch:'ね',ro:'ne'},{ch:'の',ro:'no'},
  // ha-row
  {ch:'は',ro:'ha'},{ch:'ひ',ro:'hi'},{ch:'ふ',ro:'fu'},{ch:'へ',ro:'he'},{ch:'ほ',ro:'ho'},
  // ma-row
  {ch:'ま',ro:'ma'},{ch:'み',ro:'mi'},{ch:'む',ro:'mu'},{ch:'め',ro:'me'},{ch:'も',ro:'mo'},
  // ya-row
  {ch:'や',ro:'ya'},{ch:'ゆ',ro:'yu'},{ch:'よ',ro:'yo'},
  // ra-row
  {ch:'ら',ro:'ra'},{ch:'り',ro:'ri'},{ch:'る',ro:'ru'},{ch:'れ',ro:'re'},{ch:'ろ',ro:'ro'},
  // wa-row
  {ch:'わ',ro:'wa'},{ch:'を',ro:'wo'},{ch:'ん',ro:'n'},
];
const KATA = [
  {ch:'ア',ro:'a'},{ch:'イ',ro:'i'},{ch:'ウ',ro:'u'},{ch:'エ',ro:'e'},{ch:'オ',ro:'o'},
  {ch:'カ',ro:'ka'},{ch:'キ',ro:'ki'},{ch:'ク',ro:'ku'},{ch:'ケ',ro:'ke'},{ch:'コ',ro:'ko'},
  {ch:'サ',ro:'sa'},{ch:'シ',ro:'shi'},{ch:'ス',ro:'su'},{ch:'セ',ro:'se'},{ch:'ソ',ro:'so'},
  {ch:'タ',ro:'ta'},{ch:'チ',ro:'chi'},{ch:'ツ',ro:'tsu'},{ch:'テ',ro:'te'},{ch:'ト',ro:'to'},
  {ch:'ナ',ro:'na'},{ch:'ニ',ro:'ni'},{ch:'ヌ',ro:'nu'},{ch:'ネ',ro:'ne'},{ch:'ノ',ro:'no'},
  {ch:'ハ',ro:'ha'},{ch:'ヒ',ro:'hi'},{ch:'フ',ro:'fu'},{ch:'ヘ',ro:'he'},{ch:'ホ',ro:'ho'},
  {ch:'マ',ro:'ma'},{ch:'ミ',ro:'mi'},{ch:'ム',ro:'mu'},{ch:'メ',ro:'me'},{ch:'モ',ro:'mo'},
  {ch:'ヤ',ro:'ya'},{ch:'ユ',ro:'yu'},{ch:'ヨ',ro:'yo'},
  {ch:'ラ',ro:'ra'},{ch:'リ',ro:'ri'},{ch:'ル',ro:'ru'},{ch:'レ',ro:'re'},{ch:'ロ',ro:'ro'},
  {ch:'ワ',ro:'wa'},{ch:'ヲ',ro:'wo'},{ch:'ン',ro:'n'},
];

// 五十音教學編排：Day 1-15 平假名（每天 3 個音，含複習）
// Day 1-9: 平假名 a/ka/sa/ta/na/ha/ma/ya+ra/wa+n（9 天）
// Day 10-12: 平假名綜合複習
// Day 13-21: 片假名（同節奏）
// Day 22-25: 片假名綜合複習
// Day 26-30: 濁音、半濁音、拗音、長音、促音
const KANA_LESSONS = [
  // Day 1
  {topicJp:'あ行',topicEn:'First five vowels',kind:'hira',rows:[0],
   text:'歡迎來到日文世界。日文有兩套字母——<b>平假名（ひらがな）</b>跟<b>片假名（カタカナ）</b>，加起來各 46 個。<br><br>今天先學平假名的<b>あ行</b>：<b>あ・い・う・え・お</b>。發音就是 a、i、u、e、o，跟中文注音的「ㄚ ㄧ ㄨ ㄝ ㄛ」很像。<br><br>這五個是所有日文發音的基礎，後面所有的字都從這五個母音變化而來。',
   examples:[{jp:'あい',ro:'ai',tw:'愛'},{jp:'いえ',ro:'ie',tw:'家'},{jp:'うえ',ro:'ue',tw:'上面'}]},
  // Day 2
  {topicJp:'か行',topicEn:'K-row',kind:'hira',rows:[0,1],
   text:'今天學<b>か行</b>：<b>か・き・く・け・こ</b>。發音是 ka、ki、ku、ke、ko。<br><br>規則很簡單——「k 子音 + 五個母音」。後面所有「行」都是這個模式。',
   examples:[{jp:'かお',ro:'kao',tw:'臉'},{jp:'きく',ro:'kiku',tw:'聽 / 菊花'},{jp:'こえ',ro:'koe',tw:'聲音'}]},
  // Day 3
  {topicJp:'さ行',topicEn:'S-row',kind:'hira',rows:[0,1,2],
   text:'<b>さ・し・す・せ・そ</b>。注意：<b>し</b> 不是「si」，是 <b>shi</b>（ㄒㄧ）。這是日文發音的特殊變化，要記住。',
   examples:[{jp:'すし',ro:'sushi',tw:'壽司'},{jp:'あさ',ro:'asa',tw:'早上'},{jp:'いす',ro:'isu',tw:'椅子'}]},
  // Day 4
  {topicJp:'た行',topicEn:'T-row',kind:'hira',rows:[0,1,2,3],
   text:'<b>た・ち・つ・て・と</b>。兩個特殊發音要記：<br><b>ち</b> = chi（不是 ti）<br><b>つ</b> = tsu（介於 ㄘ 跟 ㄗ 之間，舌尖頂上排牙齒後面）',
   examples:[{jp:'うた',ro:'uta',tw:'歌'},{jp:'ちち',ro:'chichi',tw:'爸爸'},{jp:'つき',ro:'tsuki',tw:'月亮'}]},
  // Day 5
  {topicJp:'な行',topicEn:'N-row',kind:'hira',rows:[0,1,2,3,4],
   text:'<b>な・に・ぬ・ね・の</b>。發音規則的「n 子音 + 母音」，沒有特殊變化，今天比較輕鬆。',
   examples:[{jp:'なに',ro:'nani',tw:'什麼'},{jp:'いぬ',ro:'inu',tw:'狗'},{jp:'ねこ',ro:'neko',tw:'貓'}]},
  // Day 6
  {topicJp:'は行',topicEn:'H-row',kind:'hira',rows:[0,1,2,3,4,5],
   text:'<b>は・ひ・ふ・へ・ほ</b>。注意：<b>ふ</b> 是 <b>fu</b>，不是 hu，發音時嘴唇輕輕靠近但不碰到。',
   examples:[{jp:'はな',ro:'hana',tw:'花 / 鼻子'},{jp:'ふね',ro:'fune',tw:'船'},{jp:'ほし',ro:'hoshi',tw:'星星'}]},
  // Day 7
  {topicJp:'ま行',topicEn:'M-row',kind:'hira',rows:[0,1,2,3,4,5,6],
   text:'<b>ま・み・む・め・も</b>。M 子音 + 母音，規則。<br><br>注意 <b>む</b> 跟 <b>す</b> 長得有點像，但 む 多一個彎彎的尾巴。',
   examples:[{jp:'まめ',ro:'mame',tw:'豆子'},{jp:'みみ',ro:'mimi',tw:'耳朵'},{jp:'もも',ro:'momo',tw:'桃子'}]},
  // Day 8
  {topicJp:'や・ら行',topicEn:'Y-row + R-row',kind:'hira',rows:[0,1,2,3,4,5,6,7,8],
   text:'今天兩個一起：<br><b>や行</b>只有三個：<b>や・ゆ・よ</b>（ya、yu、yo）<br><b>ら行</b>：<b>ら・り・る・れ・ろ</b>。日文的 r 不是英文的 r——它介於 r 跟 l 之間，比較像中文「ㄌ」。',
   examples:[{jp:'やま',ro:'yama',tw:'山'},{jp:'ゆめ',ro:'yume',tw:'夢'},{jp:'さくら',ro:'sakura',tw:'櫻花'}]},
  // Day 9
  {topicJp:'わ行 + ん',topicEn:'W-row + N',kind:'hira',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'平假名最後一組：<b>わ・を・ん</b>。<br><br><b>を</b> 發音是 <b>o</b>，不是 wo。它幾乎只用來當受詞助詞。<br><b>ん</b> 是日文唯一的單獨子音 n，可以放在字尾。<br><br>恭喜——平假名 46 個全部學完了！',
   examples:[{jp:'わたし',ro:'watashi',tw:'我'},{jp:'ほん',ro:'hon',tw:'書'},{jp:'おんがく',ro:'ongaku',tw:'音樂'}]},
  // Day 10-12 平假名複習
  {topicJp:'復習①',topicEn:'Hiragana review 1',kind:'hira',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'今天<b>沒有新內容</b>，全部是複習。<br><br>把前面 9 天學的 46 個平假名，從頭認一次。練習題會多一點，認得越快越好。',
   examples:[]},
  {topicJp:'復習②',topicEn:'Hiragana review 2',kind:'hira',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'第二次複習。今天的練習題會打亂順序，看你是不是真的記得，不是靠順序背的。',
   examples:[]},
  {topicJp:'復習③',topicEn:'Hiragana review 3',kind:'hira',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'第三次複習。如果今天認得很順，平假名就過關了，明天開始學片假名。<br><br>如果還會卡——沒關係，多看幾天再往前。<b>慢慢來，比較快</b>。',
   examples:[]},
  // Day 13-21 片假名
  {topicJp:'ア行（カタカナ）',topicEn:'Katakana A-row',kind:'kata',rows:[0],
   text:'從今天開始學<b>片假名</b>。一樣是 46 個，發音跟平假名完全一樣，只是寫法不同。<br><br>片假名主要用來寫<b>外來語</b>（コーヒー = coffee）和<b>強調</b>。<br><br>今天：<b>ア・イ・ウ・エ・オ</b>。',
   examples:[{jp:'アイス',ro:'aisu',tw:'冰（ice）'},{jp:'オイル',ro:'oiru',tw:'油（oil）'}]},
  {topicJp:'カ行（カタカナ）',topicEn:'Katakana K-row',kind:'kata',rows:[0,1],
   text:'<b>カ・キ・ク・ケ・コ</b>。<br><br>注意 <b>ク</b> 跟 <b>ケ</b> 長得有點像，要分清楚。',
   examples:[{jp:'ケーキ',ro:'kēki',tw:'蛋糕（cake）'},{jp:'カメラ',ro:'kamera',tw:'相機'}]},
  {topicJp:'サ行（カタカナ）',topicEn:'Katakana S-row',kind:'kata',rows:[0,1,2],
   text:'<b>サ・シ・ス・セ・ソ</b>。<br><br>陷阱題：<b>シ</b>（shi）跟 <b>ツ</b>（tsu）長得超像，但 シ 是兩點偏左、橫劃； ツ 是兩點偏上、豎劃。',
   examples:[{jp:'スシ',ro:'sushi',tw:'壽司'},{jp:'ソース',ro:'sōsu',tw:'醬汁（sauce）'}]},
  {topicJp:'タ行（カタカナ）',topicEn:'Katakana T-row',kind:'kata',rows:[0,1,2,3],
   text:'<b>タ・チ・ツ・テ・ト</b>。<br><br>另一個陷阱：<b>ツ</b>（tsu）跟 <b>シ</b>（shi）、<b>ソ</b>（so）跟 <b>ン</b>（n）都長得很像，要看點的方向跟筆畫角度。',
   examples:[{jp:'タクシー',ro:'takushī',tw:'計程車（taxi）'},{jp:'チーズ',ro:'chīzu',tw:'起司（cheese）'}]},
  {topicJp:'ナ行（カタカナ）',topicEn:'Katakana N-row',kind:'kata',rows:[0,1,2,3,4],
   text:'<b>ナ・ニ・ヌ・ネ・ノ</b>。<br><br>提示：<b>ヌ</b> 跟 <b>ス</b> 長得像，<b>ネ</b> 比較複雜要多寫幾次。',
   examples:[{jp:'テニス',ro:'tenisu',tw:'網球（tennis）'},{jp:'ナイフ',ro:'naifu',tw:'刀子（knife）'}]},
  {topicJp:'ハ行（カタカナ）',topicEn:'Katakana H-row',kind:'kata',rows:[0,1,2,3,4,5],
   text:'<b>ハ・ヒ・フ・ヘ・ホ</b>。<br><br><b>ヘ</b> 跟平假名 <b>へ</b> 幾乎一模一樣，這個算佛心。',
   examples:[{jp:'ホテル',ro:'hoteru',tw:'飯店（hotel）'},{jp:'コーヒー',ro:'kōhī',tw:'咖啡（coffee）'}]},
  {topicJp:'マ行（カタカナ）',topicEn:'Katakana M-row',kind:'kata',rows:[0,1,2,3,4,5,6],
   text:'<b>マ・ミ・ム・メ・モ</b>。<br><br>注意 <b>ム</b> 跟 <b>マ</b> 都有 ㄥ 形狀，但 ム 比較尖。',
   examples:[{jp:'メモ',ro:'memo',tw:'便條（memo）'},{jp:'カメラ',ro:'kamera',tw:'相機'}]},
  {topicJp:'ヤ・ラ行（カタカナ）',topicEn:'Katakana Y + R',kind:'kata',rows:[0,1,2,3,4,5,6,7,8],
   text:'<b>ヤ・ユ・ヨ</b>、<b>ラ・リ・ル・レ・ロ</b>。<br><br>外來語裡面這幾個超常出現，例如：<b>レストラン</b>（restaurant）、<b>ロボット</b>（robot）。',
   examples:[{jp:'タイヤ',ro:'taiya',tw:'輪胎（tire）'},{jp:'ロビー',ro:'robī',tw:'大廳（lobby）'}]},
  {topicJp:'ワ行 + ン（カタカナ）',topicEn:'Katakana W + N',kind:'kata',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'最後一組：<b>ワ・ヲ・ン</b>。<br><br>恭喜！46 + 46 = <b>92 個</b>假名全部學完。<br><br>注意：<b>ン</b>（n）跟 <b>ソ</b>（so）長很像，記住——ン 的點往右下、ソ 的點往左下。',
   examples:[{jp:'ワイン',ro:'wain',tw:'葡萄酒（wine）'},{jp:'パン',ro:'pan',tw:'麵包'}]},
  // Day 22-25 片假名複習
  {topicJp:'カタカナ復習①',topicEn:'Katakana review 1',kind:'kata',rows:[0,1,2,3,4,5,6,7,8,9],text:'片假名第一次複習。',examples:[]},
  {topicJp:'カタカナ復習②',topicEn:'Katakana review 2',kind:'kata',rows:[0,1,2,3,4,5,6,7,8,9],text:'第二次。重點放在容易搞混的：<b>シ・ツ・ソ・ン</b>。',examples:[]},
  {topicJp:'カタカナ復習③',topicEn:'Katakana review 3',kind:'kata',rows:[0,1,2,3,4,5,6,7,8,9],text:'第三次。',examples:[]},
  {topicJp:'平 + 片 総復習',topicEn:'All-kana review',kind:'both',rows:[0,1,2,3,4,5,6,7,8,9],
   text:'今天平假名片假名全部混在一起出題。<br><br>92 個都要認得。',examples:[]},
  // Day 26-30 進階
  {topicJp:'濁音・半濁音',topicEn:'Dakuten / Handakuten',kind:'special',rows:[],
   text:'學會 92 個假名後，今天學<b>變音</b>。<br><br>在假名右上角加兩點「<b>゛</b>」變濁音：<br>か→が（ga）、さ→ざ（za）、た→だ（da）、は→ば（ba）<br><br>加圈圈「<b>゜</b>」變半濁音（只有は行）：<br>は→ぱ（pa）、ひ→ぴ（pi）、ふ→ぷ（pu）、へ→ぺ（pe）、ほ→ぽ（po）',
   examples:[{jp:'ぎんこう',ro:'ginkō',tw:'銀行'},{jp:'パン',ro:'pan',tw:'麵包'},{jp:'でんわ',ro:'denwa',tw:'電話'}]},
  {topicJp:'拗音',topicEn:'Combined sounds',kind:'special',rows:[],
   text:'<b>拗音</b>：用「い段」假名 + 小寫的 や/ゆ/よ 拼出來。<br><br>き + ゃ = <b>きゃ</b>（kya）<br>し + ゅ = <b>しゅ</b>（shu）<br>ち + ょ = <b>ちょ</b>（cho）<br><br>看到小寫的 ゃゅょ 不要當成獨立的字，要跟前面那個合起來唸。',
   examples:[{jp:'きょう',ro:'kyō',tw:'今天'},{jp:'しゃしん',ro:'shashin',tw:'照片'},{jp:'ちょっと',ro:'chotto',tw:'一下下'}]},
  {topicJp:'長音',topicEn:'Long vowels',kind:'special',rows:[],
   text:'<b>長音</b>：把母音拉長兩拍。<br><br>平假名用<b>多寫一個母音</b>表示：おかあさん（媽媽）、おにいさん（哥哥）<br>片假名用<b>橫線「ー」</b>表示：コーヒー、ビール<br><br>長音有沒有發出來，意思會差很多。<br>おばさん（阿姨）≠ おばあさん（奶奶）。',
   examples:[{jp:'おかあさん',ro:'okāsan',tw:'媽媽'},{jp:'コーヒー',ro:'kōhī',tw:'咖啡'},{jp:'がくせい',ro:'gakusei',tw:'學生'}]},
  {topicJp:'促音',topicEn:'Small tsu',kind:'special',rows:[],
   text:'<b>促音</b>：小寫的 <b>っ</b>（片假名：<b>ッ</b>）。<br><br>它本身不發音，但會讓後面那個子音<b>停一拍</b>，像中文的「叫」跟「叫聲」中間那個停頓。<br><br>がっこう（gakkō，學校）——「k」要憋一下再發出來。<br><br>記住：小寫 っ ≠ 一般的 つ。',
   examples:[{jp:'がっこう',ro:'gakkō',tw:'學校'},{jp:'きって',ro:'kitte',tw:'郵票'},{jp:'カップ',ro:'kappu',tw:'杯子（cup）'}]},
  {topicJp:'仮名総まとめ',topicEn:'Final kana review',kind:'special',rows:[],
   text:'<b>30 天到了。假名全部結束。</b><br><br>今天是最後一天的綜合複習。<br><br>濁音、半濁音、拗音、長音、促音——全部混在一起。<br><br>這一關過了，明天開始學<b>單字跟句型</b>，真正的日文開始了。<br><br>慢慢來，沒問題的。',
   examples:[]},
];

// Day 31-300 框架（後續慢慢補完整內容）
function buildFutureLessons(){
  const out = [];
  // Day 31-90: 基礎單字 + 句型
  for(let i=31;i<=90;i++){
    out.push({
      topicJp:`基礎単語 Day ${i-30}`,
      topicEn:`Basic vocabulary & grammar`,
      kind:'placeholder',
      stage:'N5 基礎',
      text:`今天的內容還沒上線。<br><br>媽媽會慢慢補。如果到這天內容還沒準備好，跟媽媽講一聲。`,
      examples:[]
    });
  }
  for(let i=91;i<=180;i++){
    out.push({topicJp:`N5 範囲 Day ${i-90}`,topicEn:'JLPT N5 prep',kind:'placeholder',stage:'N5',text:'內容準備中。',examples:[]});
  }
  for(let i=181;i<=270;i++){
    out.push({topicJp:`N4 範囲 Day ${i-180}`,topicEn:'JLPT N4 prep',kind:'placeholder',stage:'N4',text:'內容準備中。',examples:[]});
  }
  for(let i=271;i<=300;i++){
    out.push({topicJp:`総復習 Day ${i-270}`,topicEn:'Final review',kind:'placeholder',stage:'考試衝刺',text:'總複習階段。',examples:[]});
  }
  return out;
}
const ALL_LESSONS = [...KANA_LESSONS, ...buildFutureLessons()];
