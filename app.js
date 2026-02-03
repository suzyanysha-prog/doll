// Simple multi-timer + trackers for Beauty Study app
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

/* ---------- Study Timer ---------- */
class Timer {
  constructor(displayEl, seconds=1500){
    this.displayEl = displayEl;
    this.initial = seconds;
    this.remaining = seconds;
    this.interval = null;
  }
  start(cb){
    if(this.interval) return;
    const tick = () => {
      if(this.remaining<=0){ clearInterval(this.interval); this.interval=null; if(cb) cb(); return; }
      this.remaining--;
      this.updateDisplay();
    };
    this.interval = setInterval(tick,1000);
  }
  pause(){ if(this.interval){ clearInterval(this.interval); this.interval=null }}
  reset(){ this.remaining=this.initial; this.updateDisplay() }
  set(seconds){ this.initial = seconds; this.remaining = seconds; this.updateDisplay() }
  updateDisplay(){ const m=Math.floor(this.remaining/60).toString().padStart(2,'0'); const s=(this.remaining%60).toString().padStart(2,'0'); this.displayEl.textContent = `${m}:${s}` }
}

// Study timer setup
const studyDisplay = qs('#studyDisplay');
const studyTimer = new Timer(studyDisplay, 25*60);
qsa('.preset').forEach(btn=>btn.addEventListener('click', e=>{
  qsa('.preset').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  const mins = parseInt(e.target.dataset.min,10);
  studyTimer.set(mins*60);
}));
qs('#studyStart').addEventListener('click', ()=> studyTimer.start(()=> alert('Study session complete! 🌸')));
qs('#studyPause').addEventListener('click', ()=> studyTimer.pause());
qs('#studyReset').addEventListener('click', ()=> studyTimer.reset());

/* ---------- Small timers: skincare & sleep ---------- */
const skincareDisplay = qs('#skincareDisplay');
const sleepDisplay = qs('#sleepDisplay');
const smallTimers = {
  skincare: new Timer(skincareDisplay, 180),
  sleep: new Timer(sleepDisplay, 1200)
};
qsa('.startSmall').forEach(btn=> btn.addEventListener('click', e=>{
  const t = e.target.dataset.target;
  const sec = parseInt(e.target.dataset.t,10);
  smallTimers[t].set(sec);
  smallTimers[t].start(()=> alert(`${t} timer done ✨`));
}));

/* ---------- Water tracker ---------- */
const waterKey = 'beauty_water_count';
const waterCount = qs('#waterCount');
let water = parseInt(localStorage.getItem(waterKey) || '0',10);
const renderWater = ()=> waterCount.textContent = water;
qs('#waterInc').addEventListener('click', ()=>{ water++; localStorage.setItem(waterKey,water); renderWater() });
qs('#waterDec').addEventListener('click', ()=>{ if(water>0) water--; localStorage.setItem(waterKey,water); renderWater() });
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
  qsa('.del').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks.splice(i,1); saveTasks(); renderTasks(); }));
  qsa('.done').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks[i].done = !tasks[i].done; saveTasks(); renderTasks(); }));
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
