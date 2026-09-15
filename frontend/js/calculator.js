/**
 * calculator.js v2 — CALC GPA/CGPA Calculator
 * NEW: 11 chart types, feedback/rating, history+restore,
 *      smart PDF (results only), trendlines, colour schemes
 */
'use strict';

const GRADING_SCALES = {
  '4.0': {
    label: '4.0 scale',
    grades: [
      { min:75, max:100, grade:'A', creditPoint:4.00 }, { min:70, max:74, grade:'AB', creditPoint:3.50 },
      { min:65, max:69, grade:'B', creditPoint:3.25 }, { min:60, max:64, grade:'BC', creditPoint:3.00 },
      { min:56, max:59, grade:'C', creditPoint:2.75 }, { min:50, max:55, grade:'CD', creditPoint:2.50 },
      { min:45, max:49, grade:'D', creditPoint:2.25 }, { min:40, max:44, grade:'E', creditPoint:2.00 },
      { min:0, max:39, grade:'F', creditPoint:0.00 },
    ],
    classification: [[3.50,'First Class'],[3.00,'Second Class Upper'],[2.50,'Second Class Lower'],[2.00,'Third Class'],[1.00,'Pass']],
  },
  '5.0': {
    label: '5.0 scale',
    grades: [
      { min:70, max:100, grade:'A', creditPoint:5.00 }, { min:60, max:69, grade:'B', creditPoint:4.00 },
      { min:50, max:59, grade:'C', creditPoint:3.00 }, { min:45, max:49, grade:'D', creditPoint:2.00 },
      { min:40, max:44, grade:'E', creditPoint:1.00 }, { min:0, max:39, grade:'F', creditPoint:0.00 },
    ],
    classification: [[4.50,'First Class'],[3.50,'Second Class Upper'],[2.40,'Second Class Lower'],[1.50,'Third Class'],[1.00,'Pass']],
  },
};

const CHART_TYPES = {
  basic:      [{ value:'bar', label:'Bar Chart' },{ value:'horizontalBar', label:'Horizontal Bar' },{ value:'line', label:'Line Chart' },{ value:'pie', label:'Pie Chart' },{ value:'doughnut', label:'Doughnut Chart' }],
  advanced:   [{ value:'scatter', label:'Scatter Plot' },{ value:'bubble', label:'Bubble Chart' },{ value:'radar', label:'Radar / Spider' },{ value:'polarArea', label:'Polar Area' },{ value:'area', label:'Area Chart' }],
  comparison: [{ value:'stackedBar', label:'Stacked Bar' },{ value:'multiLine', label:'Multi-Semester Line' },{ value:'gpaSummaryBar', label:'GPA Summary Bar' }],
};

const COLOR_SCHEMES = {
  gold:  ['#f5c842','#e6a817','#fad96b','#c8860d','#ffe082','#b8730a','#ffecb3','#a05c00'],
  rainbow: ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6'],
  cool:  ['#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#bfdbfe','#dbeafe'],
  warm:  ['#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#fecaca','#fee2e2','#fff1f2'],
  green: ['#86efac','#4ade80','#22c55e','#16a34a','#15803d','#bbf7d0','#dcfce7','#f0fdf4'],
  mono:  ['#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#f8fafc'],
};

const STAR_LABELS = ['','Poor','Fair','Good','Very Good','Excellent'];

const $ = id => document.getElementById(id);
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeStorage = {
  get(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  },
};
const getScaleKey = () => $('gradingScale')?.value || '4.0';
const getActiveScale = () => GRADING_SCALES[getScaleKey()] || GRADING_SCALES['4.0'];
const getGradeInfo = score => getActiveScale().grades.find(g => score >= g.min && score <= g.max) || null;
const getClassification = cgpa => getActiveScale().classification.find(([threshold]) => cgpa >= threshold)?.[1] || 'Fail';
const getGradeBadgeClass = grade => ({A:'a',AB:'ab',B:'b',BC:'bc',C:'c',CD:'cd',D:'d',E:'e',F:'f'}[grade]||'');
const getColors = (scheme, n) => { const p=COLOR_SCHEMES[scheme]||COLOR_SCHEMES.gold; return Array.from({length:n},(_,i)=>p[i%p.length]); };

let numSemesters = 2, activeChart = null, lastCalculatedCGPA = null, selectedStars = 0;
const rowCounters = {};
const semSelect = () => $('semesterSelect');
const activeSem = () => {
  const select = semSelect();
  if (!select) return 1;
  return Number.parseInt(select.value, 10) || 1;
};

/* ── Toast ────────────────────────────────────────────── */
function showToast(msg, type='info') {
  const t=$('toast'); t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(t._tid); t._tid=setTimeout(()=>{t.className='toast';},3400);
}

/* ── Row / Table ──────────────────────────────────────── */
function buildRow(semNum) {
  if(!rowCounters[semNum]) rowCounters[semNum]=0;
  const tr=document.createElement('tr');
  tr.id=`s${semNum}_r${++rowCounters[semNum]}`;
  tr.innerHTML=`
    <td><input type="text"   class="course-name"  placeholder="e.g. Mathematics" aria-label="Course name"/></td>
    <td><input type="number" class="credit-unit"  min="1" max="10" placeholder="3" aria-label="Credit unit"/></td>
    <td><input type="number" class="score-input"  min="0" max="100" placeholder="0–100" aria-label="Score"/></td>
    <td><span class="grade-cell" aria-label="Grade">—</span></td>
    <td><span class="credit-point-cell" aria-label="Credit point">—</span></td>
    <td><span class="grade-point-cell gp-cell" aria-label="Grade point">—</span></td>
    <td class="td-remove"><button class="remove-row-btn" aria-label="Remove course"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></td>`;
  const scoreEl=tr.querySelector('.score-input'), creditEl=tr.querySelector('.credit-unit');
  const gradeEl=tr.querySelector('.grade-cell'), cpEl=tr.querySelector('.credit-point-cell'), gpEl=tr.querySelector('.grade-point-cell');
  const recalc=()=>{
    lastCalculatedCGPA=null;
    const score=parseFloat(scoreEl.value), credit=parseFloat(creditEl.value);
    if(scoreEl.value===''||isNaN(score)){gradeEl.textContent='—';cpEl.textContent='—';gpEl.textContent='—';gradeEl.className='grade-cell';scoreEl.classList.remove('error');updateLiveGPA();return;}
    if(score<0||score>100){scoreEl.classList.add('error');gradeEl.textContent='—';cpEl.textContent='—';gpEl.textContent='—';updateLiveGPA();return;}
    scoreEl.classList.remove('error');
    const info=getGradeInfo(score); if(!info) return;
    gradeEl.textContent=info.grade; gradeEl.className=`grade-cell grade-badge ${getGradeBadgeClass(info.grade)}`;
    cpEl.textContent=info.creditPoint.toFixed(2);
    gpEl.textContent=(!isNaN(credit)&&credit>0)?(credit*info.creditPoint).toFixed(2):'—';
    updateSemesterTotals(semNum); updateLiveGPA();
  };
  scoreEl.addEventListener('input',recalc); creditEl.addEventListener('input',recalc);
  tr.querySelector('.remove-row-btn').addEventListener('click',()=>{
    const tbody=tr.closest('tbody');
    if(tbody.querySelectorAll('tr').length<=1){showToast('Each semester needs at least one course.','error');return;}
    tr.remove(); lastCalculatedCGPA=null; updateSemesterTotals(semNum); updateLiveGPA();
  });
  return tr;
}

function buildSemesterBlock(semNum, initialRows=10) {
  const wrap=document.createElement('div');
  wrap.className=`semester-table-wrap ${semNum===1?'active':''}`;
  wrap.id=`sem-block-${semNum}`;
  const header=document.createElement('div'); header.className='semester-table-header';
  const title=document.createElement('span'); title.className='semester-table-title'; title.textContent=`Semester ${semNum}`;
  const badge=document.createElement('span'); badge.className='semester-gpa-badge'; badge.id=`sem-gpa-badge-${semNum}`; badge.textContent='GPA: —';
  header.appendChild(title); header.appendChild(badge);
  const tw=document.createElement('div'); tw.className='table-wrapper';
  const table=document.createElement('table'); table.className='course-table'; table.id=`sem-table-${semNum}`;
  table.innerHTML=`<thead><tr><th scope="col">Course</th><th scope="col">Credit Unit</th><th scope="col">Score</th><th scope="col">Grade</th><th scope="col">Credit Point</th><th scope="col">Grade Point</th><th scope="col"><span class="sr-only">Remove</span></th></tr></thead><tbody id="sem-tbody-${semNum}"></tbody><tfoot><tr><td colspan="7" id="sem-footer-${semNum}">—</td></tr></tfoot>`;
  tw.appendChild(table); wrap.appendChild(header); wrap.appendChild(tw);
  $('semesterTablesContainer').appendChild(wrap);
  const tbody=$(`sem-tbody-${semNum}`);
  for(let i=0;i<initialRows;i++) tbody.appendChild(buildRow(semNum));
  return wrap;
}

function showSemester(semNum) {
  document.querySelectorAll('.semester-table-wrap').forEach(el=>el.classList.toggle('active',el.id===`sem-block-${semNum}`));
  $('liveSemNum').textContent=semNum; updateLiveGPA(); syncChartSemSelect();
}

function addSemester(){numSemesters++;const opt=document.createElement('option');opt.value=numSemesters;opt.textContent=`Semester ${numSemesters}`;semSelect().appendChild(opt);buildSemesterBlock(numSemesters);semSelect().value=numSemesters;showSemester(numSemesters);showToast(`Semester ${numSemesters} added.`,'success');}
function removeSemester(){if(numSemesters<=1){showToast('You need at least one semester.','error');return;}$(`sem-block-${numSemesters}`)?.remove();semSelect().querySelector(`option[value="${numSemesters}"]`)?.remove();numSemesters--;semSelect().value=numSemesters;showSemester(numSemesters);}
function addCourse(){const sem=activeSem();const tbody=$(`sem-tbody-${sem}`);if(!tbody)return;tbody.appendChild(buildRow(sem));showToast('Course row added.','success');}

function getSemesterData(semNum){
  const tbody=$(`sem-tbody-${semNum}`); if(!tbody) return{courses:[],totalCU:0,totalGP:0};
  const courses=[];let totalCU=0,totalGP=0;
  tbody.querySelectorAll('tr').forEach(row=>{
    const name=row.querySelector('.course-name')?.value.trim()||'';
    const credit=parseFloat(row.querySelector('.credit-unit')?.value)||0;
    const score=parseFloat(row.querySelector('.score-input')?.value);
    const gp=parseFloat(row.querySelector('.grade-point-cell')?.textContent)||0;
    if(credit>0&&!isNaN(score)&&score>=0&&score<=100){const info=getGradeInfo(score);courses.push({name,credit,score,grade:info?.grade||'F',cp:info?.creditPoint||0,gp});totalCU+=credit;totalGP+=gp;}
  });
  return{courses,totalCU,totalGP};
}

function updateSemesterTotals(semNum){
  const{totalCU,totalGP}=getSemesterData(semNum);
  const footer=$(`sem-footer-${semNum}`); if(!footer) return;
  if(totalCU>0){const gpa=totalGP/totalCU;footer.innerHTML=`<strong>Total CU: ${totalCU} &nbsp;·&nbsp; Total GP: ${totalGP.toFixed(2)} &nbsp;·&nbsp; GPA: ${gpa.toFixed(2)}</strong>`;const badge=$(`sem-gpa-badge-${semNum}`);if(badge)badge.textContent=`GPA: ${gpa.toFixed(2)}`;}
  else footer.textContent='—';
}

function updateLiveGPA(){
  const sem=activeSem();const{totalCU,totalGP}=getSemesterData(sem);
  $('liveSemGPA').textContent=totalCU>0?(totalGP/totalCU).toFixed(2):'—';
  let allCU=0,allGP=0;
  for(let i=1;i<=numSemesters;i++){const d=getSemesterData(i);allCU+=d.totalCU;allGP+=d.totalGP;}
  if(allCU>0){const cgpa=allGP/allCU;$('liveCGPA').textContent=cgpa.toFixed(2);$('liveClass').textContent=getClassification(cgpa);}
  else{$('liveCGPA').textContent='—';$('liveClass').textContent='—';}
}

function refreshGradeCalculations(){
  document.querySelectorAll('.score-input').forEach(input=>input.dispatchEvent(new Event('input')));
  for(let s=1;s<=numSemesters;s++) updateSemesterTotals(s);
  updateLiveGPA();
}

/* ── Calculate ────────────────────────────────────────── */
function calculateGPA(){
  const grid=$('resultsGrid'); grid.innerHTML=''; let hasData=false;
  for(let s=1;s<=numSemesters;s++){
    const{totalCU,totalGP}=getSemesterData(s);
    if(totalCU>0){hasData=true;const gpa=totalGP/totalCU;const card=document.createElement('div');card.className='result-card';card.setAttribute('data-sem',s);
    const lbl=document.createElement('span');lbl.className='result-card-label';lbl.textContent=`Semester ${s} GPA`;
    const val=document.createElement('span');val.className='result-card-value';val.textContent=gpa.toFixed(2);
    const sub=document.createElement('span');sub.className='result-card-sub';sub.textContent=`${totalCU} CU · ${totalGP.toFixed(2)} GP`;
    card.appendChild(lbl);card.appendChild(val);card.appendChild(sub);grid.appendChild(card);}
  }
  const panel=$('resultsPanel');
  if(hasData){panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'nearest'});showToast('GPA calculated.','success');}
  else showToast('Enter course data first.','error');
}

function calculateCGPA(){
  let allCU=0,allGP=0;
  for(let s=1;s<=numSemesters;s++){const d=getSemesterData(s);allCU+=d.totalCU;allGP+=d.totalGP;}
  if(allCU===0){showToast('Enter course data before calculating CGPA.','error');return;}
  const cgpa=allGP/allCU,klass=getClassification(cgpa); lastCalculatedCGPA=cgpa;
  const grid=$('resultsGrid');
  let cgpaCard=grid.querySelector('.cgpa-result-card');
  if(!cgpaCard){cgpaCard=document.createElement('div');cgpaCard.className='result-card cgpa-result-card';grid.appendChild(cgpaCard);}
  cgpaCard.innerHTML='';
  const lbl=document.createElement('span');lbl.className='result-card-label';lbl.textContent='Cumulative CGPA';
  const val=document.createElement('span');val.className='result-card-value';val.textContent=cgpa.toFixed(2);
  const sub=document.createElement('span');sub.className='result-card-sub';sub.textContent=klass;
  cgpaCard.appendChild(lbl);cgpaCard.appendChild(val);cgpaCard.appendChild(sub);
  let msgClass='improve',icon='fa-circle-exclamation';
  let msg=`CGPA ${cgpa.toFixed(2)} — Needs improvement. Keep going!`;
  const excellentThreshold=getActiveScale().classification[0][0];
  const goodThreshold=getActiveScale().classification[2][0];
  if(cgpa>=excellentThreshold){msgClass='excellent';icon='fa-trophy';msg=`CGPA ${cgpa.toFixed(2)} (${klass}) — Outstanding! Keep it up.`;}
  else if(cgpa>=goodThreshold){msgClass='good';icon='fa-circle-check';msg=`CGPA ${cgpa.toFixed(2)} (${klass}) — Good work! Push for higher.`;}
  const msgBox=$('cgpaMessage');
  msgBox.className=`cgpa-message ${msgClass}`;
  msgBox.innerHTML=`<i class="fa-solid ${icon}" aria-hidden="true"></i> `;
  msgBox.appendChild(document.createTextNode(msg));
  msgBox.hidden=false;
  $('resultsPanel').hidden=false;
  $('resultsPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
  showToast(`CGPA: ${cgpa.toFixed(2)} — ${klass}`,'success');
  saveSnapshot();
}

/* ── History ──────────────────────────────────────────── */
const HISTORY_KEY='calc_history_v1';
const getHistory=()=> safeStorage.get(HISTORY_KEY, []);
const saveHistory=arr=> safeStorage.set(HISTORY_KEY, arr);

function buildSnapshotData(){
  const semesters=[];
  for(let s=1;s<=numSemesters;s++){
    const tbody=$(`sem-tbody-${s}`); if(!tbody) continue;
    const courses=[];
    tbody.querySelectorAll('tr').forEach(row=>{courses.push({name:row.querySelector('.course-name')?.value.trim()||'',credit:row.querySelector('.credit-unit')?.value||'',score:row.querySelector('.score-input')?.value||''});});
    semesters.push({num:s,courses});
  }
  let allCU=0,allGP=0;
  for(let s=1;s<=numSemesters;s++){const d=getSemesterData(s);allCU+=d.totalCU;allGP+=d.totalGP;}
  const cgpa=allCU>0?allGP/allCU:0;
  return{semesters,cgpa:cgpa.toFixed(2),class:getClassification(cgpa),scale:getScaleKey(),ts:Date.now()};
}

function saveSnapshot(){const snap=buildSnapshotData();const history=getHistory();history.unshift(snap);if(history.length>20)history.length=20;saveHistory(history);renderHistoryList();}

function restoreSnapshot(snap){
  if(snap.scale && GRADING_SCALES[snap.scale]) $('gradingScale').value=snap.scale;
  $('semesterTablesContainer').innerHTML='';
  const sel=semSelect(); sel.innerHTML='';
  Object.keys(rowCounters).forEach(k=>delete rowCounters[k]);
  numSemesters=0;
  snap.semesters.forEach(sem=>{
    numSemesters++;
    const opt=document.createElement('option');opt.value=numSemesters;opt.textContent=`Semester ${numSemesters}`;sel.appendChild(opt);
    buildSemesterBlock(numSemesters,0);
    const tbody=$(`sem-tbody-${numSemesters}`);
    sem.courses.forEach(c=>{
      const row=buildRow(numSemesters);
      row.querySelector('.course-name').value=c.name;
      row.querySelector('.credit-unit').value=c.credit;
      const si=row.querySelector('.score-input');si.value=c.score;si.dispatchEvent(new Event('input'));
      tbody.appendChild(row);
    });
    if(!sem.courses.length) tbody.appendChild(buildRow(numSemesters));
  });
  if(numSemesters===0){numSemesters=2;['1','2'].forEach(n=>{const opt=document.createElement('option');opt.value=n;opt.textContent=`Semester ${n}`;sel.appendChild(opt);buildSemesterBlock(Number(n));});}
  sel.value='1';showSemester(1);closeHistoryDrawer();
  showToast('Session restored.','success');
  calculateGPA();calculateCGPA();syncChartSemSelect();
}

function renderHistoryList(){
  const history=getHistory(),list=$('historyList'),empty=$('historyEmpty');
  list.innerHTML='';
  if(!history.length){empty.hidden=false;return;}
  empty.hidden=true;
  history.forEach((snap,idx)=>{
    const d=new Date(snap.ts);
    const date=d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const time=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const item=document.createElement('div');item.className='history-item';item.setAttribute('role','listitem');
    const meta=document.createElement('div');meta.className='history-meta';
    const cgpaSpan=document.createElement('span');cgpaSpan.className='history-cgpa';cgpaSpan.textContent=`CGPA ${snap.cgpa}`;
    const classSpan=document.createElement('span');classSpan.className='history-class';classSpan.textContent=snap.class;
    meta.appendChild(cgpaSpan);meta.appendChild(classSpan);
    const dateSpan=document.createElement('span');dateSpan.className='history-date';dateSpan.textContent=`${date} at ${time} · ${snap.semesters.length} semester${snap.semesters.length>1?'s':''}`;
    const restoreBtn=document.createElement('button');restoreBtn.className='btn btn-outline btn-sm history-restore';
    restoreBtn.innerHTML='<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Restore';
    restoreBtn.addEventListener('click',()=>{if(confirm('Restore this session? Unsaved data will be replaced.'))restoreSnapshot(snap);});
    const delBtn=document.createElement('button');delBtn.className='history-del-btn';delBtn.setAttribute('aria-label','Delete entry');
    delBtn.innerHTML='<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    delBtn.addEventListener('click',()=>{const h=getHistory();h.splice(idx,1);saveHistory(h);renderHistoryList();});
    const actions=document.createElement('div');actions.className='history-actions';
    actions.appendChild(restoreBtn);actions.appendChild(delBtn);
    item.appendChild(meta);item.appendChild(dateSpan);item.appendChild(actions);
    list.appendChild(item);
  });
}

function openHistoryDrawer(){$('historyDrawer').hidden=false;$('drawerOverlay').hidden=false;renderHistoryList();document.body.style.overflow='hidden';}
function closeHistoryDrawer(){$('historyDrawer').hidden=true;$('drawerOverlay').hidden=true;document.body.style.overflow='';}

/* ── Smart PDF ────────────────────────────────────────── */
function exportPDF(){
  if(!lastCalculatedCGPA){
    showToast('Calculate your CGPA first — then export to PDF.','error');
    const btn=$('calcCGPABtn');btn.classList.add('btn-pulse');
    setTimeout(()=>btn.classList.remove('btn-pulse'),1800);
    return;
  }
  const pz=$('printZone'); pz.innerHTML='';

  const header=document.createElement('div');
  header.className='print-header';
  header.innerHTML=`
    <div class="print-topline">
      <span class="print-brand">CALC</span>
      <span class="print-meta">Academic Performance Report</span>
    </div>
    <h1 class="print-title">GPA &amp; CGPA Results Report</h1>
    <p class="print-date">${getActiveScale().label} &middot; Generated: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
  `;
  pz.appendChild(header);

  for(let s=1;s<=numSemesters;s++){
    const { courses, totalCU, totalGP } = getSemesterData(s);
    if (!courses.length) continue;

    const gpa = totalCU > 0 ? totalGP / totalCU : 0;
    const section = document.createElement('div');
    section.className = 'print-section';

    const heading = document.createElement('h2');
    heading.className = 'print-sem-heading';
    heading.textContent = `Semester ${s} — GPA: ${gpa.toFixed(2)}`;
    section.appendChild(heading);

    const table = document.createElement('table');
    table.className = 'print-table';
    table.innerHTML = '<thead><tr><th>Course</th><th>CU</th><th>Score</th><th>Grade</th><th>CP</th><th>GP</th></tr></thead>';

    const tbody = document.createElement('tbody');
    courses.forEach(c => {
      const tr = document.createElement('tr');
      [c.name, c.credit, c.score, c.grade, c.cp.toFixed(2), c.gp.toFixed(2)].forEach(v => {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const tfootTr = document.createElement('tr');
    tfootTr.className = 'print-totals';
    tfootTr.innerHTML = `<td colspan="3"><strong>Semester Totals</strong></td><td><strong>${totalCU}</strong></td><td><strong>${totalGP.toFixed(2)}</strong></td><td><strong>${gpa.toFixed(2)}</strong></td>`;

    const tfoot = document.createElement('tfoot');
    tfoot.appendChild(tfootTr);
    table.appendChild(tbody);
    table.appendChild(tfoot);
    section.appendChild(table);
    pz.appendChild(section);
  }

  const allData = Array.from({ length: numSemesters }, (_, i) => getSemesterData(i + 1));
  const allCU = allData.reduce((a, d) => a + d.totalCU, 0);
  const allGP = allData.reduce((a, d) => a + d.totalGP, 0);
  const cgpa = allCU > 0 ? allGP / allCU : 0;

  const summary = document.createElement('div');
  summary.className = 'print-summary';

  const summaryTable = document.createElement('table');
  summaryTable.className = 'print-summary-table';
  summaryTable.innerHTML = `
    <thead>
      <tr>
        <th colspan="2">Cumulative Summary</th>
      </tr>
    </thead>
    <tbody>
      <tr><th>Total Credit Units</th><td>${allCU}</td></tr>
      <tr><th>Total Grade Points</th><td>${allGP.toFixed(2)}</td></tr>
      <tr><th>CGPA</th><td>${cgpa.toFixed(2)}</td></tr>
      <tr><th>Classification</th><td>${getClassification(cgpa)}</td></tr>
    </tbody>
  `;

  summary.appendChild(summaryTable);
  pz.appendChild(summary);

  document.body.classList.add('printing');
  window.print();
  document.body.classList.remove('printing');
}

/* ── Advanced Charts ──────────────────────────────────── */
function syncChartSemSelect(){
  const sel=$('chartSemSelect'),current=sel.value;sel.innerHTML='';
  for(let i=1;i<=numSemesters;i++){const opt=document.createElement('option');opt.value=i;opt.textContent=`Semester ${i}`;if(String(i)===current)opt.selected=true;sel.appendChild(opt);}
}

function populateChartTypeSelect(){
  const group=$('chartTypeGroup').value,sel=$('chartType');sel.innerHTML='';
  (CHART_TYPES[group]||CHART_TYPES.basic).forEach(t=>{const opt=document.createElement('option');opt.value=t.value;opt.textContent=t.label;sel.appendChild(opt);});
  onChartTypeChange();
}

function onChartTypeChange(){
  const type=$('chartType').value;
  $('scatterAxisGroup').style.display=['scatter','bubble'].includes(type)?'flex':'none';
  $('trendlineGroup').style.display=['scatter','line','area'].includes(type)?'flex':'none';
  $('smoothGroup').style.display=['line','area','multiLine'].includes(type)?'flex':'none';
}

function linearRegression(pts){
  const n=pts.length;if(n<2)return null;
  let sx=0,sy=0,sxy=0,sx2=0;
  pts.forEach(p=>{sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sx2+=p.x*p.x;});
  const denominator=n*sx2-sx*sx;
  if(denominator===0)return null;
  const slope=(n*sxy-sx*sy)/denominator,inter=(sy-slope*sx)/n;
  const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
  return[{x:minX,y:slope*minX+inter},{x:maxX,y:slope*maxX+inter}];
}

function generateChart(){
  const chartSemSelect = $('chartSemSelect');
  const chartTypeEl = $('chartType');
  const canvas = $('chartCanvas');
  const placeholder = $('chartPlaceholder');

  if (!chartSemSelect || !chartTypeEl || !canvas || !placeholder) {
    showToast('Charting is unavailable on this page.', 'error');
    return;
  }
  if (typeof Chart !== 'function') {
    showToast('Charts are unavailable. Check your internet connection and reload the page.', 'error');
    return;
  }

  const semNum = Number.parseInt(chartSemSelect.value, 10) || 1;
  const chartType = chartTypeEl.value;
  const scheme = $('chartColorScheme').value;
  const smooth = $('smoothLine').checked;
  const showTrend = $('showTrendline').checked;
  const { courses } = getSemesterData(semNum);
  const valid = courses.filter(c => c.name && c.name.trim());
  const isComparison = ['stackedBar', 'multiLine', 'gpaSummaryBar'].includes(chartType);

  if (!isComparison && valid.length === 0) {
    showToast('Enter course names and scores first.', 'error');
    return;
  }

  if (isComparison) {
    let any = false;
    for (let s = 1; s <= numSemesters; s++) {
      if (getSemesterData(s).totalCU > 0) {
        any = true;
        break;
      }
    }
    if (!any) {
      showToast('Enter course data first.', 'error');
      return;
    }
  }

  const labels = valid.map((c, i) => c.name || `Course ${i + 1}`);
  const scores = valid.map(c => safeNumber(c.score, 0));
  const n = Math.max(labels.length, numSemesters);
  const colors = getColors(scheme, n);
  const borders = getColors('mono', n);

  placeholder.style.display = 'none';
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    showToast('Canvas rendering is unsupported in this browser.', 'error');
    return;
  }
  if (activeChart) activeChart.destroy();

  const bOpts={responsive:true,maintainAspectRatio:true,animation:{duration:600,easing:'easeInOutQuart'},
    plugins:{legend:{display:false,labels:{color:'#d4d8f0',font:{family:'Inter',size:12}}},
    tooltip:{backgroundColor:'#0d1540',borderColor:'rgba(245,200,66,0.3)',borderWidth:1,titleColor:'#f5c842',bodyColor:'#d4d8f0'}}};
  const scDef={x:{ticks:{color:'#8a91b8'},grid:{color:'rgba(255,255,255,0.06)'}},y:{beginAtZero:true,ticks:{color:'#8a91b8'},grid:{color:'rgba(255,255,255,0.06)'}}};

  let config;
  switch(chartType){
    case 'bar':
      config={type:'bar',data:{labels,datasets:[{label:'Score',data:scores,backgroundColor:colors,borderColor:borders,borderWidth:1.5,borderRadius:6}]},
        options:{...bOpts,scales:{...scDef,y:{...scDef.y,max:100,title:{display:true,text:'Score /100',color:'#8a91b8'}}}}};break;
    case 'horizontalBar':
      config={type:'bar',data:{labels,datasets:[{label:'Score',data:scores,backgroundColor:colors,borderColor:borders,borderWidth:1.5,borderRadius:4}]},
        options:{...bOpts,indexAxis:'y',scales:{x:{...scDef.x,max:100,beginAtZero:true},y:{...scDef.y}}}};break;
    case 'line':{
      const ds=[{label:'Score',data:scores,borderColor:colors[0],backgroundColor:'rgba(245,200,66,0.08)',pointBackgroundColor:colors[0],fill:false,tension:smooth?0.4:0}];
      if(showTrend&&scores.length>=2){const reg=linearRegression(scores.map((s,i)=>({x:i,y:s})));if(reg)ds.push({label:'Trend',data:reg.map(p=>p.y),borderColor:'#ef4444',borderDash:[6,3],pointRadius:0,fill:false,tension:0});}
      config={type:'line',data:{labels,datasets:ds},options:{...bOpts,scales:{...scDef,y:{...scDef.y,max:100}}}};break;}
    case 'pie':
      config={type:'pie',data:{labels,datasets:[{data:scores,backgroundColor:colors,borderColor:'#0a0f2e',borderWidth:2}]},
        options:{...bOpts,plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0'}}}}};break;
    case 'doughnut':
      config={type:'doughnut',data:{labels,datasets:[{data:scores,backgroundColor:colors,borderColor:'#0a0f2e',borderWidth:2,hoverOffset:12}]},
        options:{...bOpts,cutout:'62%',plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0'}}}}};break;
    case 'scatter':{
      const xF=$('scatterXAxis').value;
      const pts=valid.map(c=>({x:xF==='credit'?c.credit:c.gp,y:c.score}));
      const ds=[{label:'Courses',data:pts,backgroundColor:colors,pointRadius:8,pointHoverRadius:11}];
      if(showTrend&&pts.length>=2){const reg=linearRegression(pts);if(reg)ds.push({type:'line',label:'Trend',data:reg,borderColor:'#ef4444',borderDash:[5,3],pointRadius:0,fill:false});}
      config={type:'scatter',data:{datasets:ds},options:{...bOpts,scales:{
        x:{...scDef.x,title:{display:true,text:xF==='credit'?'Credit Unit':'Grade Point',color:'#8a91b8'}},
        y:{...scDef.y,max:100,title:{display:true,text:'Score /100',color:'#8a91b8'}}}}};break;}
    case 'bubble':{
      const bData=valid.map(c => ({ x: c.credit, y: c.score, r: Math.max(c.cp * 5, 4) }));
      config={type:'bubble',data:{datasets:bData.map((d, i) => ({ label: valid[i].name, data: [d], backgroundColor: colors[i] + 'bb', borderColor: colors[i], borderWidth: 1.5 }))},
        options:{...bOpts,plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0',boxWidth:12}}},
        scales:{x:{...scDef.x,title:{display:true,text:'Credit Unit',color:'#8a91b8'}},y:{...scDef.y,max:100,title:{display:true,text:'Score /100',color:'#8a91b8'}}}}};break;}
    case 'radar':
      config={type:'radar',data:{labels,datasets:[{label:`Semester ${semNum}`,data:scores,backgroundColor:colors[0]+'33',borderColor:colors[0],pointBackgroundColor:colors[0],borderWidth:2}]},
        options:{...bOpts,scales:{r:{suggestedMin:0,suggestedMax:100,ticks:{color:'#8a91b8',backdropColor:'transparent',stepSize:25},grid:{color:'rgba(255,255,255,0.08)'},angleLines:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:'#d4d8f0',font:{size:11}}}}}};break;
    case 'polarArea':
      config={type:'polarArea',data:{labels,datasets:[{data:scores,backgroundColor:colors.map(c=>c+'bb'),borderColor:colors,borderWidth:1.5}]},
        options:{...bOpts,scales:{r:{ticks:{color:'#8a91b8',backdropColor:'transparent'},grid:{color:'rgba(255,255,255,0.08)'}}},plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0'}}}}};break;
    case 'area':{
      const ads=[{label:'Score',data:scores,borderColor:colors[0],backgroundColor:colors[0]+'28',fill:true,tension:smooth?0.4:0,pointBackgroundColor:colors[0]}];
      if(showTrend&&scores.length>=2){const reg=linearRegression(scores.map((s,i)=>({x:i,y:s})));if(reg)ads.push({label:'Trend',data:reg.map(p=>p.y),borderColor:'#ef4444',borderDash:[6,3],pointRadius:0,fill:false,tension:0});}
      config={type:'line',data:{labels,datasets:ads},options:{...bOpts,scales:{...scDef,y:{...scDef.y,max:100}}}};break;}
    case 'stackedBar':{
      const allL=new Set();for(let s=1;s<=numSemesters;s++)getSemesterData(s).courses.forEach(c=>{if(c.name)allL.add(c.name);});
      const lbl2=[...allL];
      const ds=Array.from({length:numSemesters},(_,idx)=>{const s=idx+1,d=getSemesterData(s),map={};d.courses.forEach(c=>{if(c.name)map[c.name]=c.score;});
        return{label:`Semester ${s}`,data:lbl2.map(nm=>map[nm]??0),backgroundColor:colors[idx]+'bb',borderColor:colors[idx],borderWidth:1,borderRadius:3};});
      const stackedMax=Math.max(...lbl2.map((_,index)=>ds.reduce((sum,dataset)=>sum+(dataset.data[index]||0),0)),100);
      config={type:'bar',data:{labels:lbl2,datasets:ds},options:{...bOpts,scales:{x:{...scDef.x,stacked:true},y:{...scDef.y,stacked:true,max:Math.ceil(stackedMax/10)*10}},plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0'}}}}};break;}
    case 'multiLine':{
      const allL2=new Set();for(let s=1;s<=numSemesters;s++)getSemesterData(s).courses.forEach(c=>{if(c.name)allL2.add(c.name);});
      const lbl3=[...allL2];
      const ds2=Array.from({length:numSemesters},(_,idx)=>{const s=idx+1,d=getSemesterData(s),map={};d.courses.forEach(c=>{if(c.name)map[c.name]=c.score;});
        return{label:`Semester ${s}`,data:lbl3.map(nm=>map[nm]??null),borderColor:colors[idx],backgroundColor:colors[idx]+'22',fill:false,tension:smooth?0.4:0,pointBackgroundColor:colors[idx],spanGaps:true};});
      config={type:'line',data:{labels:lbl3,datasets:ds2},options:{...bOpts,scales:{...scDef,y:{...scDef.y,max:100}},plugins:{...bOpts.plugins,legend:{display:true,labels:{color:'#d4d8f0'}}}}};break;}
    case 'gpaSummaryBar':{
      const gL=[],gV=[];
      for(let s=1;s<=numSemesters;s++){const{totalCU,totalGP}=getSemesterData(s);if(totalCU>0){gL.push(`Sem ${s}`);gV.push(parseFloat((totalGP/totalCU).toFixed(2)));}}
      const scaleMax=Math.max(...getActiveScale().grades.map(g=>g.creditPoint));
      config={type:'bar',data:{labels:gL,datasets:[{label:'GPA',data:gV,backgroundColor:colors,borderColor:borders,borderWidth:1.5,borderRadius:8}]},
        options:{...bOpts,scales:{...scDef,y:{...scDef.y,max:scaleMax,title:{display:true,text:`GPA (max ${scaleMax.toFixed(1)})`,color:'#8a91b8'}}}}};break;}
    default:showToast('Unknown chart type.','error');return;
  }
  activeChart=new Chart(ctx,config);
  showToast('Chart generated.','success');
}

/* ── Feedback ─────────────────────────────────────────── */
const REVIEWS_KEY='calc_reviews_v1';
const getReviews=()=> safeStorage.get(REVIEWS_KEY, []);
const saveReviews=arr=> safeStorage.set(REVIEWS_KEY, arr);

function initFeedback(){
  const stars=document.querySelectorAll('.star-btn'),submit=$('feedbackSubmit'),comment=$('feedbackComment'),charCnt=$('feedbackCharCount');
  stars.forEach(btn=>{
    btn.addEventListener('click',()=>{
      selectedStars=parseInt(btn.dataset.value);
      stars.forEach(s=>{const v=parseInt(s.dataset.value);s.classList.toggle('active',v<=selectedStars);s.classList.toggle('dim',v>selectedStars);});
      $('starLabelText').textContent=STAR_LABELS[selectedStars]||'';
      submit.disabled=false;
    });
    btn.addEventListener('mouseenter',()=>{const v=parseInt(btn.dataset.value);stars.forEach(s=>s.classList.toggle('hover',parseInt(s.dataset.value)<=v));});
    btn.addEventListener('mouseleave',()=>{stars.forEach(s=>s.classList.remove('hover'));});
  });
  comment.addEventListener('input',()=>{charCnt.textContent=`${comment.value.length} / 500`;});
  $('feedbackSubmit').addEventListener('click',()=>{
    if(!selectedStars)return;
    const review={stars:selectedStars,comment:comment.value.trim().slice(0,500),name:$('feedbackName').value.trim().slice(0,60)||'Anonymous',ts:Date.now()};
    const reviews=getReviews();reviews.unshift(review);if(reviews.length>50)reviews.length=50;saveReviews(reviews);
    ['feedbackStep1','feedbackStep2','feedbackStep3'].forEach(id=>{$(id).style.display='none';});
    $('feedbackSubmit').style.display='none';
    $('feedbackSuccess').hidden=false;
    renderReviews();
  });
  $('feedbackDone').addEventListener('click',closeFeedback);
  renderReviews();
}

function renderReviews(){
  const reviews=getReviews(),list=$('reviewsList'),empty=$('reviewsEmpty'),avgEl=$('reviewsAvg');
  list.innerHTML='';
  if(!reviews.length){empty.hidden=false;avgEl.textContent='';return;}
  empty.hidden=true;
  const avg=reviews.reduce((a,r)=>a+r.stars,0)/reviews.length;
  avgEl.textContent=`★ ${avg.toFixed(1)} (${reviews.length})`;
  reviews.slice(0,10).forEach(r=>{
    const item=document.createElement('div');item.className='review-item';item.setAttribute('role','listitem');
    const top=document.createElement('div');top.className='review-top';
    const nameSpan=document.createElement('span');nameSpan.className='review-name';nameSpan.textContent=r.name;
    const starsSpan=document.createElement('span');starsSpan.className='review-stars';starsSpan.textContent='★'.repeat(r.stars)+'☆'.repeat(5-r.stars);
    top.appendChild(nameSpan);top.appendChild(starsSpan);item.appendChild(top);
    if(r.comment){const p=document.createElement('p');p.className='review-comment';p.textContent=r.comment;item.appendChild(p);}
    const dt=document.createElement('span');dt.className='review-date';dt.textContent=new Date(r.ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    item.appendChild(dt);list.appendChild(item);
  });
}

function openFeedback(){$('feedbackPanel').hidden=false;$('feedbackOverlay').hidden=false;document.body.style.overflow='hidden';}
function closeFeedback(){$('feedbackPanel').hidden=true;$('feedbackOverlay').hidden=true;document.body.style.overflow='';}

/* ── CSV ──────────────────────────────────────────────── */
function exportCSV(){
  let csv='Semester,Course,Credit Unit,Score,Grade,Credit Point,Grade Point\n';
  for (let s = 1; s <= numSemesters; s++) {
    const { courses } = getSemesterData(s);
    courses.forEach(c => {
      const courseName = String(c.name || '').replace(/"/g, '""');
      const safeCourseName = /^[=+\-@]/.test(courseName) ? `'${courseName}` : courseName;
      csv += `${s},"${safeCourseName}",${safeNumber(c.credit, 0)},${safeNumber(c.score, 0)},${c.grade || 'F'},${safeNumber(c.cp, 0).toFixed(2)},${safeNumber(c.gp, 0).toFixed(2)}\n`;
    });
  }
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gpa_results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported.', 'success');
  } catch (_error) {
    showToast('CSV export failed in this browser.', 'error');
  }
}

/* ── Reset ────────────────────────────────────────────── */
function showResetModal(){$('modalOverlay').hidden=false;$('modalConfirm').focus();}
function hideResetModal(){$('modalOverlay').hidden=true;}
function doReset(){
  if(lastCalculatedCGPA)saveSnapshot();hideResetModal();
  $('semesterTablesContainer').innerHTML='';
  const sel=semSelect();sel.innerHTML='<option value="1">Semester 1</option><option value="2">Semester 2</option>';sel.value='1';
  numSemesters=2;lastCalculatedCGPA=null;
  Object.keys(rowCounters).forEach(k=>delete rowCounters[k]);
  buildSemesterBlock(1);buildSemesterBlock(2);showSemester(1);
  $('resultsPanel').hidden=true;$('cgpaMessage').hidden=true;$('resultsGrid').innerHTML='';
  if(activeChart){activeChart.destroy();activeChart=null;}
  $('chartCanvas').style.display='none';$('chartPlaceholder').style.display='flex';
  syncChartSemSelect();
  showToast('Reset complete. Snapshot saved to History.','success');
}

/* ── INIT ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  buildSemesterBlock(1);buildSemesterBlock(2);
  syncChartSemSelect();populateChartTypeSelect();
  const navToggle=$('navToggle'),navMenu=$('navMenu');
  navToggle?.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')==='true';navToggle.setAttribute('aria-expanded',String(!open));navMenu.classList.toggle('open',!open);});
  semSelect().addEventListener('change',()=>showSemester(activeSem()));
  $('gradingScale').addEventListener('change',()=>{
    safeStorage.set('calc_grading_scale', getScaleKey());
    refreshGradeCalculations();
    showToast(`${getActiveScale().label} selected. Existing courses recalculated.`, 'success');
  });
  $('addSemesterBtn').addEventListener('click',addSemester);
  $('removeSemesterBtn').addEventListener('click',removeSemester);
  $('addCourseBtn').addEventListener('click',addCourse);
  $('calcGPABtn').addEventListener('click',calculateGPA);
  $('calcCGPABtn').addEventListener('click',calculateCGPA);
  $('chartTypeGroup').addEventListener('change',populateChartTypeSelect);
  $('chartType').addEventListener('change',onChartTypeChange);
  $('analyzeBtn').addEventListener('click',generateChart);
  $('exportCSV').addEventListener('click',exportCSV);
  $('exportPDF').addEventListener('click',exportPDF);
  $('resetAll').addEventListener('click',showResetModal);
  $('modalCancel').addEventListener('click',hideResetModal);
  $('modalConfirm').addEventListener('click',doReset);
  $('modalOverlay').addEventListener('click',e=>{if(e.target===$('modalOverlay'))hideResetModal();});
  $('historyBtn').addEventListener('click',openHistoryDrawer);
  $('historyClose').addEventListener('click',closeHistoryDrawer);
  $('drawerOverlay').addEventListener('click',closeHistoryDrawer);
  $('clearHistoryBtn').addEventListener('click',()=>{if(confirm('Clear all saved history?')){saveHistory([]);renderHistoryList();showToast('History cleared.');}});
  initFeedback();
  const fab=$('feedbackFab');
  fab.addEventListener('click',openFeedback);
  fab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openFeedback();});
  $('feedbackClose').addEventListener('click',closeFeedback);
  $('feedbackOverlay').addEventListener('click',closeFeedback);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideResetModal();closeHistoryDrawer();closeFeedback();}});
  const savedScale=safeStorage.get('calc_grading_scale', '4.0');
  if(GRADING_SCALES[savedScale]) $('gradingScale').value=savedScale;
});
