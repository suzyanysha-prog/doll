// Simple multi-timer + trackers for Beauty Study app
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

/* ---------- Study Timer ---------- */
class Timer {
  constructor(displayEl, seconds=1500, storageKey=null){
    this.displayEl = displayEl;
    this.initial = seconds;
    this.remaining = seconds;
    this.interval = null;
    this.storageKey = storageKey;
  }
  start(cb){
    if(this.interval) return;
    const tick = () => {
      if(this.remaining<=0){ clearInterval(this.interval); this.interval=null; this.saveState(); if(cb) cb(); return; }
      this.remaining--;
      this.updateDisplay();
      this.saveState();
    };
    this.interval = setInterval(tick,1000);
  }
  pause(){ if(this.interval){ clearInterval(this.interval); this.interval=null; this.saveState() }}
  reset(){ this.remaining=this.initial; this.updateDisplay(); this.saveState() }
  set(seconds){ this.initial = seconds; this.remaining = seconds; this.updateDisplay(); this.saveState() }
  saveState(){ if(this.storageKey) localStorage.setItem(this.storageKey, JSON.stringify({initial:this.initial, remaining:this.remaining})); }
  restoreState(){ if(this.storageKey){ const data=JSON.parse(localStorage.getItem(this.storageKey)||'null'); if(data){ this.initial=data.initial; this.remaining=data.remaining; this.updateDisplay(); } } }
  updateDisplay(){ const m=Math.floor(this.remaining/60).toString().padStart(2,'0'); const s=(this.remaining%60).toString().padStart(2,'0'); this.displayEl.textContent = `${m}:${s}` }
}

// Study timer setup
const studyDisplay = qs('#studyDisplay');
const studyTimer = new Timer(studyDisplay, 25*60, 'beauty_study_timer');
studyTimer.restoreState();
qsa('.preset').forEach(btn=>btn.addEventListener('click', e=>{
  qsa('.preset').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  const mins = parseInt(e.target.dataset.min,10);
  studyTimer.set(mins*60);
}));
qs('#studyStart').addEventListener('click', ()=> {
  const initialMinutes = Math.floor(studyTimer.initial / 60);
  studyTimer.start(()=> {
    recordStudySession(initialMinutes);
    alert('Study session complete! 🌸');
  });
});
qs('#studyPause').addEventListener('click', ()=> studyTimer.pause());
qs('#studyReset').addEventListener('click', ()=> studyTimer.reset());

/* ---------- Small timers: skincare & sleep ---------- */
const skincareDisplay = qs('#skincareDisplay');
const sleepDisplay = qs('#sleepDisplay');
const smallTimers = {
  skincare: new Timer(skincareDisplay, 180, 'beauty_skincare_timer'),
  sleep: new Timer(sleepDisplay, 1200, 'beauty_sleep_timer')
};
smallTimers.skincare.restoreState();
smallTimers.sleep.restoreState();
/* Skincare timer controls */
const skincareKey = 'beauty_skincare_settings';
let skincareMinutes = 3;
let skincareRoutineName = 'Timed Skincare';
const saveSkincare = () => localStorage.setItem(skincareKey, JSON.stringify({minutes: skincareMinutes, routine: skincareRoutineName}));
const restoreSkincare = () => {
  const data = JSON.parse(localStorage.getItem(skincareKey) || 'null');
  if(data){
    skincareMinutes = data.minutes || 3;
    skincareRoutineName = data.routine || 'Timed Skincare';
    qs('#skincareMinutes').value = skincareMinutes;
    qs('#skincareRoutine').value = skincareRoutineName;
    qs('#skincareTitle').textContent = skincareRoutineName;
    updateSkincareDisplay();
  }
};
restoreSkincare();
const updateSkincareDisplay = () => {
  const totalSec = skincareMinutes * 60;
  smallTimers.skincare.set(totalSec);
};
qs('#skincareMinutes').addEventListener('change', e => {
  skincareMinutes = parseInt(e.target.value, 10) || 3;
  updateSkincareDisplay();
  saveSkincare();
});
qs('#skincareRoutine').addEventListener('input', e => {
  skincareRoutineName = e.target.value || 'Timed Skincare';
  qs('#skincareTitle').textContent = skincareRoutineName;
  saveSkincare();
});
qs('#startSkincare').addEventListener('click', () => {
  const routine = qs('#skincareRoutine').value || 'Skincare';
  smallTimers.skincare.start(() => alert(`${routine} routine complete! ✨`));
});
qs('#skincareEditBtn').addEventListener('click', e => {
  const editDiv = qs('.skincare-edit');
  editDiv.classList.toggle('show');
  e.target.textContent = editDiv.classList.contains('show') ? '✓ Done' : '✏️ Edit';
});

qsa('.startSmall').forEach(btn=> {
  if(btn.id !== 'startSkincare') {
    btn.addEventListener('click', e=>{
      const t = e.target.dataset.target;
      const sec = parseInt(e.target.dataset.t,10);
      smallTimers[t].set(sec);
      smallTimers[t].start(()=> alert(`${t} timer done ✨`));
    });
  }
});

/* ---------- Water tracker ---------- */
const waterKey = 'beauty_water_count';
const waterCount = qs('#waterCount');
let water = parseInt(localStorage.getItem(waterKey) || '0',10);
const renderWater = ()=> waterCount.textContent = water;
qs('#waterInc').addEventListener('click', ()=>{ water++; localStorage.setItem(waterKey,water); renderWater(); updateProgressDashboard(); });
qs('#waterDec').addEventListener('click', ()=>{ if(water>0) water--; localStorage.setItem(waterKey,water); renderWater(); updateProgressDashboard(); });
renderWater();

/* ---------- Workout generator ---------- */
const workouts = {
  warmup: ['Jumping jacks 1m','Arm circles 1m','Leg swings 1m'],
  main: ['Push-ups 3x10','Squats 3x15','Plank 60s','Lunges 3x12'],
  cool: ['Stretch shoulders 2m','Child pose 2m']
};
qs('#genWorkout').addEventListener('click', ()=>{
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const out = `${pick(workouts.warmup)} • ${pick(workouts.main)} • ${pick(workouts.cool)}`;
  qs('#workoutOut').textContent = out;
});

/* ---------- Tasks & persistence ---------- */
const taskForm = qs('#taskForm');
const taskListEl = qs('#taskList');
const tasksKey = 'beauty_tasks_v1';
let tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
function renderTasks(){ taskListEl.innerHTML=''; tasks.forEach((t,idx)=>{
  const li = document.createElement('li');
  li.innerHTML = `<div><strong>${t.text}</strong>${t.due?` • ${t.due}`:''}</div><div><button data-i="${idx}" class="done">✓</button> <button data-i="${idx}" class="del">✕</button></div>`;
  taskListEl.appendChild(li);
});
  qsa('.del').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks.splice(i,1); saveTasks(); renderTasks(); updateProgressDashboard(); }));
  qsa('.done').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks[i].done = !tasks[i].done; saveTasks(); renderTasks(); updateProgressDashboard(); }));
}
function saveTasks(){ localStorage.setItem(tasksKey, JSON.stringify(tasks)); }
taskForm.addEventListener('submit', e=>{ e.preventDefault(); const text = qs('#taskText').value.trim(); const due = qs('#taskDue').value; if(!text) return; tasks.push({text,due,done:false}); saveTasks(); renderTasks(); taskForm.reset(); });
renderTasks();

/* ---------- Exam prep sample ---------- */
const examListEl = qs('#examList');
const addExamSample = qs('#addExamSample');
addExamSample.addEventListener('click', ()=>{
  examListEl.innerHTML = '';
  const items = ['Syllabus map','Create flashcards','Practice past papers','Timed mock exam','Review weak topics'];
  items.forEach((it,i)=>{
    const row = document.createElement('div'); row.className='examRow'; row.style.padding='8px'; row.style.background='rgba(255,255,255,0.6)'; row.style.marginBottom='8px'; row.style.borderRadius='8px';
    row.innerHTML = `<label><input type="checkbox" ${i===0?'checked':''}/> ${it}</label>`;
    examListEl.appendChild(row);
  });
});

/* ---------- Theme toggle (cute) ---------- */
qs('#themeToggle').addEventListener('click', ()=>{
  document.documentElement.style.setProperty('--accent', document.documentElement.style.getPropertyValue('--accent')? '#ffb6d5' : '#ffd1e8');
});

// initial displays
studyTimer.updateDisplay(); smallTimers.skincare.updateDisplay(); smallTimers.sleep.updateDisplay();

// Reset water count daily
const waterDateKey = 'beauty_water_date';
const today = new Date().toDateString();
if(localStorage.getItem(waterDateKey) !== today){
  localStorage.setItem(waterDateKey, today);
  localStorage.setItem('beauty_water_count', '0');
  water = 0;
  renderWater();
}

/* ---------- Daily Streaks ---------- */
const streaksKey = 'beauty_streaks_v1';
let streaks = JSON.parse(localStorage.getItem(streaksKey) || '{"skincare":{"count":0,"lastDate":""},"water":{"count":0,"lastDate":""}}');

const saveStreaks = () => localStorage.setItem(streaksKey, JSON.stringify(streaks));

const updateStreak = (streakType) => {
  const today = new Date().toDateString();
  const streak = streaks[streakType];
  
  if(streak.lastDate === today) return; // Already completed today
  
  const lastDate = new Date(streak.lastDate);
  const todayDate = new Date();
  const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  if(daysDiff === 1) {
    streak.count++;
  } else if(daysDiff > 1 || !streak.lastDate) {
    streak.count = 1;
  }
  
  streak.lastDate = today;
  saveStreaks();
  renderStreaks();
};

const renderStreaks = () => {
  const streaksEl = qs('#streaksList');
  streaksEl.innerHTML = '';
  
  Object.keys(streaks).forEach(key => {
    const s = streaks[key];
    const label = key === 'skincare' ? '🧴 Skincare' : '💧 Water (8+ glasses)';
    const div = document.createElement('div');
    div.className = 'streak-item';
    div.innerHTML = `
      <div class="streak-info">
        <span class="streak-name">${label}</span>
        <div class="streak-count">🔥 ${s.count} days</div>
      </div>
      <button class="streak-btn" data-type="${key}">Log Today</button>
    `;
    streaksEl.appendChild(div);
  });
  
  qsa('.streak-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = e.target.dataset.type;
      updateStreak(type);
      e.target.textContent = '✓ Done';
      setTimeout(() => { renderStreaks(); }, 500);
    });
  });
};

// Auto-log skincare completion
const originalStartSkincare = qs('#startSkincare').onclick;
qs('#startSkincare').addEventListener('click', function() {
  if(this.__originalHandler) this.__originalHandler();
  // Will log on completion via alert callback
});

// Hook into water tracker
const originalWaterInc = qs('#waterInc').onclick;
const waterGoal = 8;
qs('#waterInc').addEventListener('click', function() {
  if(water >= waterGoal && water < waterGoal + 1) {
    updateStreak('water');
  }
});

renderStreaks();

/* ---------- Study Session Tracking ---------- */
const studyKey = 'beauty_study_sessions_v1';
let studySessions = JSON.parse(localStorage.getItem(studyKey) || '[]');

const recordStudySession = (minutes) => {
  const week = getWeekStart();
  studySessions.push({date: new Date().toDateString(), minutes: minutes, week: week});
  localStorage.setItem(studyKey, JSON.stringify(studySessions));
  updateProgressDashboard();
};

const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toDateString();
};

const getWeekStudyHours = () => {
  const week = getWeekStart();
  const hours = studySessions
    .filter(s => s.week === week)
    .reduce((total, s) => total + s.minutes, 0) / 60;
  return Math.round(hours * 10) / 10;
};

const getWeekTasksCompleted = () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  return tasks.filter(t => {
    if(!t.due) return false;
    const dueDate = new Date(t.due);
    return dueDate >= weekStart && dueDate <= today && t.done;
  }).length;
};

const updateProgressDashboard = () => {
  const studyHrs = getWeekStudyHours();
  const tasksCompleted = getWeekTasksCompleted();
  
  // Update study hours
  qs('#studyHours').textContent = `${studyHrs} hrs`;
  const studyPercent = Math.min(Math.round((studyHrs / 20) * 100), 100);
  qs('#studyBar').style.width = `${studyPercent}%`;
  qs('#studyBar span').textContent = `${studyPercent}%`;
  
  // Update tasks circle
  const tasksGoal = 15;
  const tasksPercent = Math.min(Math.round((tasksCompleted / tasksGoal) * 100), 100);
  qs('#tasksCount').textContent = tasksCompleted;
  const circumference = 283; // 2 * PI * 45
  const offset = circumference - (tasksPercent / 100) * circumference;
  qs('#tasksProgress').style.strokeDasharray = circumference;
  qs('#tasksProgress').style.strokeDashoffset = offset;
  qs('#tasksPercent').textContent = `${tasksPercent}%`;
  
  // Update water circle (per day tracking)
  const waterToday = parseInt(localStorage.getItem('beauty_water_count') || '0', 10);
  const waterPercent = Math.min(Math.round((waterToday / 8) * 100), 100);
  qs('#waterGlasses').textContent = `${waterToday}/8`;
  const circumference2 = 283;
  const offset2 = circumference2 - (waterPercent / 100) * circumference2;
  qs('#waterProgress').style.strokeDasharray = circumference2;
  qs('#waterProgress').style.strokeDashoffset = offset2;
  qs('#waterPercent').textContent = `${waterPercent}%`;
};

updateProgressDashboard();

