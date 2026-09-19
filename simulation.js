const simulationDefaults={
  simVersion:2,worldTurn:1,legitimacy:72,failedTerms:0,rulerStatus:'حاكم فعلي',totalCasualties:0,
  warLog:[{text:'العالم يراقب توازن القوى بحذر.',turn:1}],
  aiKingdoms:[
    {id:'falcons',name:'مملكة الصقور',ruler:'الملك سيف',trait:'هجومي',population:820000,soldiers:36000,power:86,medicine:66,stability:71,relation:-10,casualties:0},
    {id:'light',name:'إمبراطورية النور',ruler:'الملكة ليان',trait:'دبلوماسي',population:910000,soldiers:31000,power:79,medicine:82,stability:80,relation:24,casualties:0},
    {id:'oasis',name:'اتحاد الواحات',ruler:'الأمير راشد',trait:'تجاري',population:740000,soldiers:27000,power:67,medicine:73,stability:76,relation:18,casualties:0},
    {id:'sea',name:'جمهورية البحر',ruler:'الحاكم مالك',trait:'صناعي',population:680000,soldiers:29000,power:61,medicine:70,stability:68,relation:5,casualties:0},
    {id:'mountain',name:'حصون الجبل',ruler:'الملكة نور',trait:'دفاعي',population:520000,soldiers:24000,power:55,medicine:60,stability:83,relation:10,casualties:0}
  ],
  pharma:[
    {id:'hayat',name:'مختبرات الحياة',specialty:'اللقاحات',stock:76,reputation:72,price:18},
    {id:'shifa',name:'شركة الشفاء الملكية',specialty:'أدوية الطوارئ',stock:64,reputation:68,price:15},
    {id:'aman',name:'مصانع أمان',specialty:'المستلزمات الطبية',stock:81,reputation:61,price:11}
  ],
  peopleAgency:[
    {name:'نقابة العمال',need:'الأجور وفرص العمل',action:'تفاوض الحكومة',influence:68},
    {name:'اتحاد الأطباء',need:'الدواء والمستشفيات',action:'يراقب المخزون',influence:73},
    {name:'مجلس التجار',need:'الاستقرار والأسواق',action:'يفتح طرق تجارة',influence:64},
    {name:'رابطة المزارعين',need:'المياه والأسعار',action:'ينظم الإنتاج',influence:59}
  ]
};

function ensureSimulationState(){
  for(const [key,value] of Object.entries(simulationDefaults)){
    if(state[key]===undefined)state[key]=structuredClone(value);
  }
  if(!Array.isArray(state.aiKingdoms)||state.aiKingdoms.length!==5)state.aiKingdoms=structuredClone(simulationDefaults.aiKingdoms);
  if(!Array.isArray(state.pharma)||!state.pharma.length)state.pharma=structuredClone(simulationDefaults.pharma);
  if(!Array.isArray(state.peopleAgency)||!state.peopleAgency.length)state.peopleAgency=structuredClone(simulationDefaults.peopleAgency);
  state.army.soldiers=Math.max(1000,state.army.soldiers||42000);
  state.population=Math.max(100000,state.population||1000000);
}

function worldDate(){return `السنة ${state.year} · الدور ${state.worldTurn}`}
function logWar(text){state.warLog.unshift({text,turn:state.worldTurn});state.warLog=state.warLog.slice(0,12);state.log.unshift({text,date:worldDate()})}
function casualtyEstimate(soldiers,intensity=.03){return Math.max(20,Math.round(soldiers*intensity*(.65+Math.random()*.7)))}

function aiDecision(ai){
  const roll=Math.random();
  if((ai.trait==='هجومي'||ai.relation<-20)&&roll<.28){
    const theirLoss=casualtyEstimate(ai.soldiers,.018),ourLoss=casualtyEstimate(state.army.soldiers,.012);
    ai.soldiers=Math.max(1000,ai.soldiers-theirLoss);ai.population=Math.max(100000,ai.population-Math.round(theirLoss*.35));ai.casualties+=theirLoss;
    state.army.soldiers=Math.max(1000,state.army.soldiers-ourLoss);state.population=Math.max(100000,state.population-Math.round(ourLoss*.35));state.totalCasualties+=ourLoss;
    state.stability-=2;state.approval-=1;ai.relation-=8;
    logWar(`${ai.name} شنّت غارة حدودية: ${ourLoss} ضحية لدينا و${theirLoss} لديها.`);
  }else if(ai.medicine<55||roll<.18){
    ai.medicine=Math.min(100,ai.medicine+5);ai.stability=Math.min(100,ai.stability+2);logWar(`${ai.name} استثمرت في المستشفيات ومخزون الدواء.`);
  }else if(ai.trait==='تجاري'||roll<.52){
    ai.power+=1;ai.relation+=2;logWar(`${ai.name} وقّعت صفقة مستقلة وعززت اقتصادها.`);
  }else{
    ai.soldiers+=500;ai.power+=2;ai.relation-=1;logWar(`${ai.name} وسّعت جيشها ورفعت الجاهزية.`);
  }
  ai.power=Math.max(35,Math.round(ai.power+(ai.soldiers/50000)-.4));
  ai.relation=Math.max(-100,Math.min(100,ai.relation));
}

function autonomousSociety(){
  state.peopleAgency.forEach((group,i)=>{
    const mood=Object.values(state.groups)[i]?.approval??state.approval;
    if(mood<48){group.action=i===0?'ينظم إضرابًا محدودًا':i===1?'يطالب بميزانية طوارئ':i===2?'يجمّد استثمارات جديدة':'يخفض توريد المحاصيل';group.influence=Math.min(100,group.influence+2)}
    else{group.action=i===0?'يفاوض على عقود جديدة':i===1?'يدير حملات وقاية':i===2?'يفتح أسواقًا جديدة':'يزيد إنتاج الغذاء';group.influence=Math.max(35,group.influence-1)}
  });
  state.pharma.forEach(company=>{company.stock=Math.max(15,Math.min(100,company.stock+Math.floor(Math.random()*9)-4));company.price=Math.max(7,Math.min(30,company.price+(company.stock<40?2:company.stock>80?-1:0)))});
}

function updateLegitimacy(){
  const casualtiesPenalty=Math.min(25,state.totalCasualties/900);
  state.legitimacy=Math.round(Math.max(0,Math.min(100,state.approval*.42+state.stability*.38+Math.min(100,state.treasury/9)*.2-casualtiesPenalty)));
  if(state.legitimacy<28)state.failedTerms++;else state.failedTerms=Math.max(0,state.failedTerms-1);
  if(state.failedTerms>=3){state.rulerStatus='رئيس مؤقت تحت رقابة مجلس المملكة';state.coins=Math.max(0,state.coins-10)}
  else if(state.legitimacy<45)state.rulerStatus='حاكم مهدد بسحب الثقة';
  else state.rulerStatus='حاكم فعلي';
}

window.progressSeason=function(reason='تحرك عالمي'){
  ensureSimulationState();state.worldTurn++;state.season++;
  if(state.season>3){state.season=0;state.year++;const revenue=26+state.gdp*.7,expense=Object.values(state.ministries).reduce((a,m)=>a+m.fund,0)/28;state.treasury+=revenue-expense;state.gdp=Math.max(2,state.gdp+(state.stability-55)/700);state.inflation=Math.max(.5,state.inflation+(Math.random()*.25-.12))}
  const acting=state.aiKingdoms[(state.worldTurn-1)%state.aiKingdoms.length];aiDecision(acting);autonomousSociety();updateLegitimacy();clamp();
};

function attackAi(id){
  ensureSimulationState();const ai=state.aiKingdoms.find(x=>x.id===id);if(!ai)return;
  if(state.rulerStatus.includes('مؤقت'))return toast('مجلس المملكة جمّد صلاحية إعلان الحرب');
  const ourPower=playerPower()+state.army.soldiers/1800,theirPower=ai.power+ai.soldiers/1800;
  const win=Math.random()<ourPower/(ourPower+theirPower),ourLoss=casualtyEstimate(state.army.soldiers,win?.018:.036),theirLoss=casualtyEstimate(ai.soldiers,win?.04:.019);
  state.army.soldiers=Math.max(1000,state.army.soldiers-ourLoss);ai.soldiers=Math.max(1000,ai.soldiers-theirLoss);state.population-=Math.round(ourLoss*.3);ai.population-=Math.round(theirLoss*.3);state.totalCasualties+=ourLoss;ai.casualties+=theirLoss;ai.relation-=25;
  if(win){const gain=12+Math.floor(Math.random()*15);state.treasury+=gain;state.approval+=2;state.xp+=25;logWar(`انتصرت قواتك على ${ai.name}. ضحايانا ${ourLoss} وضحاياهم ${theirLoss}.`)}
  else{state.treasury-=18;state.stability-=4;state.approval-=3;logWar(`خسرت الحملة أمام ${ai.name}. ضحايانا ${ourLoss} وضحاياهم ${theirLoss}.`)}
  progressSeason('حرب');save();renderAll();toast(win?'انتصار عسكري':'هزيمة عسكرية')
}

function negotiateAi(id){const ai=state.aiKingdoms.find(x=>x.id===id);if(!ai)return;state.treasury-=5;ai.relation=Math.min(100,ai.relation+14);state.stability+=1;logWar(`أرسل مجلس الحكم وفد سلام إلى ${ai.name}.`);progressSeason('دبلوماسية');save();renderAll();toast('بدأت المفاوضات')}
function investPharma(id){const company=state.pharma.find(x=>x.id===id);if(!company||state.treasury<20)return toast('الخزانة لا تسمح');state.treasury-=20;company.stock=Math.min(100,company.stock+16);company.reputation=Math.min(100,company.reputation+4);state.ministries.health.performance=Math.min(100,state.ministries.health.performance+3);state.approval+=1;progressSeason('استثمار دوائي');save();renderAll();toast(`تم دعم ${company.name}`)}
function rebuildMandate(){if(state.treasury<35)return toast('تحتاج الخطة إلى 35 مليون');state.treasury-=35;state.approval+=5;state.stability+=4;state.failedTerms=Math.max(0,state.failedTerms-1);updateLegitimacy();progressSeason('إصلاح حكومي');save();renderAll();toast('بدأ برنامج استعادة الثقة')}

function renderSimulation(){
  ensureSimulationState();const turn=document.querySelector('#turnLabel');if(turn)turn.textContent=`الدور ${state.worldTurn}`;
  const summary=document.querySelector('#warSummary');if(summary)summary.innerHTML=`<small>إجمالي ضحايا مملكتك</small><b>${fmt(state.totalCasualties)}</b>`;
  const kingdoms=document.querySelector('#warKingdoms');if(kingdoms)kingdoms.innerHTML=state.aiKingdoms.map(ai=>`<div class="war-card"><div><b>${ai.name}</b><small>${ai.ruler} · ${ai.trait}</small></div><div class="war-numbers"><span>جيش ${fmt(ai.soldiers)}</span><span>سكان ${fmt(ai.population)}</span><span class="${ai.relation<0?'hostile':'friendly'}">علاقة ${ai.relation}</span></div><div class="war-actions"><button onclick="attackAi('${ai.id}')">هجوم</button><button onclick="negotiateAi('${ai.id}')">تفاوض</button></div></div>`).join('');
  const log=document.querySelector('#warLog');if(log)log.innerHTML=state.warLog.map(x=>`<div class="sim-log"><span></span><p>${x.text}<small>الدور ${x.turn}</small></p></div>`).join('');
  const legitimacy=document.querySelector('#legitimacyCard');if(legitimacy)legitimacy.innerHTML=`<small>شرعية الحكم</small><b>${state.legitimacy}%</b><span>${state.rulerStatus}</span>`;
  const council=document.querySelector('#royalCouncil');if(council)council.innerHTML=`<div class="council-message"><b>${state.legitimacy<45?'تحذير من مجلس المملكة':'تقرير المستشار الأول'}</b><p>${state.legitimacy<45?'ثقة المؤسسات تتراجع. أصلح الخدمات وتجنب الحروب غير الضرورية.':'المؤسسات تعمل باستقلال، وقراراتك تحدد الاتجاه العام لا كل حركة في المملكة.'}</p></div>`;
  const pharma=document.querySelector('#pharmaWorld');if(pharma)pharma.innerHTML=state.pharma.map(c=>`<div class="company-row"><div><b>${c.name}</b><small>${c.specialty} · السمعة ${c.reputation}%</small></div><span>المخزون ${c.stock}%</span><button onclick="investPharma('${c.id}')">دعم 20م</button></div>`).join('');
  const people=document.querySelector('#autonomousPeople');if(people)people.innerHTML=state.peopleAgency.map(g=>`<div class="agency-row"><div><b>${g.name}</b><small>تأثير ${g.influence}% · ${g.need}</small></div><span>${g.action}</span></div>`).join('');
  const gov=document.querySelector('#governmentStatus');if(gov)gov.innerHTML=`<div class="mandate"><b>${state.rulerStatus}</b><p>إذا بقيت الشرعية أقل من 28% لثلاثة أدوار، تنتقل السلطة إلى رئيس مؤقت وتُجمّد صلاحية إعلان الحرب.</p><button onclick="rebuildMandate()">برنامج إصلاح الحكم — 35 مليون</button><button class="reset-reign" onclick="resetReign()">بدء عهد جديد</button></div>`;
}

function resetReign(){
  if(!confirm('سيتم تصفير السنة والاقتصاد والضحايا مع الاحتفاظ باسم الملك والمملكة والتحالف. هل تريد المتابعة؟'))return;
  const identity={kingName:state.kingName,kingdomName:state.kingdomName,alliance:state.alliance,lastDaily:state.lastDaily,inventory:state.inventory,coins:state.coins,level:state.level,xp:state.xp};
  state=structuredClone(baseState);Object.assign(state,identity,structuredClone(simulationDefaults));localStorage.setItem('kingdomState',JSON.stringify(state));save();renderAll();toast('بدأ عهد جديد بقواعد متوازنة')
}

const renderAllWithWorld=renderAll;renderAll=function(){ensureSimulationState();updateLegitimacy();renderAllWithWorld();renderSimulation()};ensureSimulationState();renderSimulation();
