// Simple multi-timer + trackers for Beauty Study app
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  console.log('Initializing dolludy app...');

/* ---------- Timer Class ---------- */
class Timer {
  constructor(displayEl, seconds=1500, storageKey=null){
    this.displayEl = displayEl;
    this.initial = seconds;
    this.remaining = seconds;
    this.interval = null;
    this.storageKey = storageKey;
    this.onTick = null; // Callback for each tick
  }
  start(cb){
    if(this.interval) return;
    const tick = () => {
      if(this.remaining<=0){ clearInterval(this.interval); this.interval=null; this.saveState(); if(cb) cb(); return; }
      this.remaining--;
      this.updateDisplay();
      this.saveState();
      if(this.onTick) this.onTick(); // Call tick callback
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

/* ---------- Advanced Pomodoro System ---------- */
const pomodoroKey = 'beauty_pomodoro_v1';
const pomodoroTaskKey = 'beauty_pomodoro_task';
const pomodoroSessionsKey = 'beauty_pomodoro_sessions';

let pomodoroState = {
  task: null,
  taskIndex: null,
  sessionCount: 0,
  isWorkSession: true,
  totalFocusSeconds: 0,
  totalBreakSeconds: 0,
  sessionsToday: 0
};

const loadPomodoroState = () => {
  const saved = localStorage.getItem(pomodoroKey);
  const savedTask = localStorage.getItem(pomodoroTaskKey);
  if(saved) pomodoroState = JSON.parse(saved);
  if(savedTask) pomodoroState.task = savedTask;
  updatePomodoroDisplay();
};

const savePomodoroState = () => {
  localStorage.setItem(pomodoroKey, JSON.stringify(pomodoroState));
  if(pomodoroState.task) localStorage.setItem(pomodoroTaskKey, pomodoroState.task);
};

// Initialize main study timer for pomodoro
const studyDisplay = qs('#studyDisplay');
const studyTimer = new Timer(studyDisplay, 25*60, 'beauty_study_timer'); // 25 min work
studyTimer.restoreState();

// Track total time for progress bar
let pomodoroTotalTime = 25 * 60;

const catEl = qs('#studyCat');

const updatePomodoroDisplay = () => {
  const taskDisplay = qs('#pomodoroTaskDisplay');
  const phaseLabel = qs('#pomodoroPhase');
  const sessionCount = qs('#pomodoroSessionCount');
  const timerCircle = qs('#timerCircle');
  const timerLabel = qs('#timerLabel');
  
  if(pomodoroState.task) {
    taskDisplay.textContent = `📋 ${pomodoroState.task}`;
  } else {
    taskDisplay.textContent = 'No task selected';
  }
  
  const isWork = pomodoroState.isWorkSession;
  phaseLabel.textContent = isWork ? '🎯 Work Session (25 min)' : '☕ Break Time (5 min)';
  phaseLabel.style.color = isWork ? '#ff6b9d' : '#00bcd4';
  
  // Update timer circle styling
  if(isWork) {
    timerCircle.classList.remove('break-mode');
    timerLabel.textContent = 'Focus Time';
  } else {
    timerCircle.classList.add('break-mode');
    timerLabel.textContent = 'Break Time';
  }
  
  sessionCount.textContent = `Session ${pomodoroState.sessionCount + 1}`;
  
  updatePomodoroStats();
};

// bow removed: no-op removed
const updatePomodoroStats = () => {
  const today = new Date().toDateString();
  const sessionsStorage = localStorage.getItem(pomodoroSessionsKey);
  const sessions = sessionsStorage ? JSON.parse(sessionsStorage) : [];
  const todaySessions = sessions.filter(s => s.date === today);
  
  const sessionsCount = todaySessions.length;
  const focusHours = todaySessions.reduce((t, s) => t + (s.isWork ? s.minutes : 0), 0) / 60;
  const breakMinutes = todaySessions.reduce((t, s) => t + (!s.isWork ? s.minutes : 0), 0);
  
  qs('#pomodoroSessionsToday').textContent = sessionsCount;
  qs('#pomodoroFocusTime').textContent = focusHours >= 1 ? `${focusHours.toFixed(1)}h` : `${Math.round(focusHours * 60)}m`;
  qs('#pomodoroBreakTime').textContent = `${breakMinutes}m`;
};

const recordPomodoroSession = (isWorkSession, minutes) => {
  const today = new Date().toDateString();
  let sessions = [];
  const stored = localStorage.getItem(pomodoroSessionsKey);
  if(stored) sessions = JSON.parse(stored);
  
  sessions.push({
    date: today,
    isWork: isWorkSession,
    minutes: minutes,
    task: pomodoroState.task || 'Unnamed Task'
  });
  
  localStorage.setItem(pomodoroSessionsKey, JSON.stringify(sessions));
  updatePomodoroStats();
};

const transitionToNextPhase = () => {
  const currentMinutes = Math.floor(studyTimer.initial / 60);
  recordPomodoroSession(pomodoroState.isWorkSession, currentMinutes);
  
  if(pomodoroState.isWorkSession) {
    // Transitioning to break
    pomodoroState.isWorkSession = false;
    studyTimer.set(5 * 60); // 5 min break
    pomodoroTotalTime = 5 * 60; // Update total time for progress bar
    updatePomodoroDisplay();
    catEl.classList.remove('studying');
    catEl.classList.add('dancing');
    showNotification(`✨ Work session complete! Enjoy your 5-minute break! ☕`);
  } else {
    // After break, go back to work
    pomodoroState.sessionCount++;
    pomodoroState.isWorkSession = true;
    studyTimer.set(25 * 60); // 25 min work
    pomodoroTotalTime = 25 * 60; // Update total time for progress bar
    updatePomodoroDisplay();
    catEl.classList.remove('dancing');
    catEl.classList.add('studying');
    showNotification(`🎯 Break over! Ready for session ${pomodoroState.sessionCount + 1}? Let's go! 💪`);
  }
  
  savePomodoroState();
};

// Task input
const selectedTaskIndex = () => {
  const selected = qs('.pomo-task-item.selected');
  return selected ? parseInt(selected.dataset.taskIdx) : null;
};

const renderPomodoroTaskList = () => {
  const listEl = qs('#pomodoroTaskList');
  listEl.innerHTML = '';
  
  if(tasks.length === 0) {
    listEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #8a5169; font-size: 13px;">No tasks yet. Create one below!</p>';
    return;
  }
  
  tasks.forEach((task, idx) => {
    const btn = document.createElement('button');
    btn.className = `pomo-task-item ${task.done ? 'completed' : ''} ${pomodoroState.taskIndex === idx ? 'selected' : ''}`;
    btn.dataset.taskIdx = idx;
    btn.textContent = task.text.substring(0, 20) + (task.text.length > 20 ? '...' : '');
    btn.title = task.text;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectTaskForPomodoro(idx);
    });
    listEl.appendChild(btn);
  });
};

const selectTaskForPomodoro = (taskIdx) => {
  if (!tasks || !tasks[taskIdx]) {
    showNotification('Task not found!', 'error');
    return;
  }
  pomodoroState.taskIndex = taskIdx;
  const task = tasks[taskIdx];
  pomodoroState.task = task.text;
  pomodoroState.sessionCount = 0;
  pomodoroState.isWorkSession = true;
  studyTimer.set(25 * 60); // Reset to 25 min work session
  savePomodoroState();
  updatePomodoroDisplay();
  renderPomodoroTaskList();
  showNotification(`✨ Selected: "${task.text}". Ready to start?`);
};

qs('#pomodoroTaskBtn').addEventListener('click', () => {
  const taskInput = qs('#pomodoroTaskInput');
  const taskText = taskInput.value.trim();
  if(!taskText) {
    alert('Please enter a task name');
    return;
  }
  
  // Add to tasks array if not already there
  const existingIdx = tasks.findIndex(t => t.text.toLowerCase() === taskText.toLowerCase());
  let taskIdx;
  if(existingIdx >= 0) {
    taskIdx = existingIdx;
  } else {
    tasks.push({text: taskText, done: false, due: ''});
    saveTasks();
    taskIdx = tasks.length - 1;
  }
  
  pomodoroState.task = taskText;
  pomodoroState.taskIndex = taskIdx;
  pomodoroState.sessionCount = 0;
  pomodoroState.isWorkSession = true;
  studyTimer.set(25 * 60); // Reset to 25 min work session
  pomodoroTotalTime = 25 * 60; // Ensure bow progress tracking is correct
  savePomodoroState();
  updatePomodoroDisplay();
  renderPomodoroTaskList();
  taskInput.value = '';
  showNotification(`Task "${taskText}" set! ✨ Ready to start?`);
});

// Allow Enter key in task input
qs('#pomodoroTaskInput').addEventListener('keypress', (e) => {
  if(e.key === 'Enter') qs('#pomodoroTaskBtn').click();
});

// Task done button (gives 30 min break)
qs('#pomodoroTaskDone').addEventListener('click', () => {
  if(!pomodoroState.task) {
    showNotification('Please set a task first!', 'error');
    return;
  }
  studyTimer.pause();
  if(pomodoroState.isWorkSession) {
    recordPomodoroSession(true, Math.floor(studyTimer.initial / 60));
  }
  
  // Mark task as done in the task list if it's from the list
  const taskIdx = pomodoroState.taskIndex;
  if(taskIdx !== null && tasks && tasks[taskIdx]) {
    tasks[taskIdx].done = true;
    saveTasks();
    renderTasks();
    renderPomodoroTaskList();
  }
  
  pomodoroState.isWorkSession = false;
  studyTimer.set(30 * 60); // 30 min break
  updatePomodoroDisplay();
  catEl.classList.add('dancing');
  savePomodoroState();
});

// Main timer controls
const updateCatState = () => {
  const isRunning = studyTimer.interval !== null;
  if(isRunning) {
    if(pomodoroState.isWorkSession) {
      catEl.classList.remove('dancing');
      catEl.classList.add('studying');
    } else {
      catEl.classList.remove('studying');
      catEl.classList.add('dancing');
    }
  }
};

qs('#studyStart').addEventListener('click', () => {
  if(!pomodoroState.task) {
    showNotification('Please set a task first!', 'error');
    return;
  }
  // Ensure pomodoroTotalTime is set correctly for progress bar
  pomodoroTotalTime = pomodoroState.isWorkSession ? 25 * 60 : 5 * 60;
  studyTimer.start(() => {
    transitionToNextPhase();
  });
  updateCatState();
  showNotification(`Timer started! Focus for ${pomodoroState.isWorkSession ? 25 : 5} minutes 🎯`);
});

qs('#studyPause').addEventListener('click', () => {
  if(studyTimer.interval) {
    // Timer is running, pause it
    studyTimer.pause();
    catEl.classList.remove('studying', 'dancing');
    showNotification('Timer paused ⏸');
  } else {
    // Timer is paused, resume it
    studyTimer.start(() => {
      transitionToNextPhase();
    });
    updateCatState();
    showNotification('Timer resumed! ▶️');
  }
});

qs('#studyReset').addEventListener('click', () => {
  studyTimer.pause();
  if(pomodoroState.isWorkSession) {
    studyTimer.set(25 * 60); // Reset to 25 min
    pomodoroTotalTime = 25 * 60;
  } else {
    studyTimer.set(5 * 60); // Reset to 5 min
    pomodoroTotalTime = 5 * 60;
  }
  studyTimer.updateDisplay();
  catEl.classList.remove('studying', 'dancing');
  showNotification('Timer reset! 🔄');
});

loadPomodoroState();
studyTimer.updateDisplay();

// Initialize tasks early so renderPomodoroTaskList can be called
const tasksKey = 'beauty_tasks_v1';
let tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
renderPomodoroTaskList();

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
  console.log('skincareMinutes changed:', skincareMinutes);
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
qs('#waterInc').addEventListener('click', ()=>{
  water++;
  localStorage.setItem(waterKey, water);
  console.log('waterInc clicked, new water:', water);
  renderWater();
  updateProgressDashboard();
});
qs('#waterDec').addEventListener('click', ()=>{
  if(water>0) water--;
  localStorage.setItem(waterKey, water);
  console.log('waterDec clicked, new water:', water);
  renderWater();
  updateProgressDashboard();
});
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
// tasks and tasksKey already initialized earlier
function renderTasks(){
  taskListEl.innerHTML='';
  tasks.forEach((t,idx)=>{
    const li = document.createElement('li');
    li.className = t.done ? 'completed' : '';
    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" class="task-complete" data-i="${idx}" ${t.done ? 'checked' : ''} aria-label="Mark task complete" />
        <div style="flex:1">
          <strong>${t.text}</strong>${t.due?` • ${t.due}`:''}
        </div>
      </div>
      <div>
        <button data-i="${idx}" class="del">✕</button>
      </div>
    `;
    taskListEl.appendChild(li);
  });

  // Attach listeners after rendering
  qsa('.del').forEach(b=>{
    b.addEventListener('click', e=>{
      const i = parseInt(e.target.dataset.i, 10);
      if (isNaN(i)) return;
      tasks.splice(i,1);
      saveTasks();
      renderTasks();
      renderPomodoroTaskList();
      updateProgressDashboard();
    });
  });

  qsa('.task-complete').forEach(chk=>{
    chk.addEventListener('change', e=>{
      const i = parseInt(e.target.dataset.i, 10);
      if (isNaN(i) || !tasks[i]) return;
      tasks[i].done = e.target.checked;
      saveTasks();
      renderTasks();
      renderPomodoroTaskList();
      updateProgressDashboard();
    });
  });

  renderPomodoroTaskList();
}
function saveTasks(){ localStorage.setItem(tasksKey, JSON.stringify(tasks)); }
taskForm.addEventListener('submit', e=>{
  e.preventDefault();
  const text = qs('#taskText').value.trim();
  const due = qs('#taskDue').value;
  console.log('taskForm submit:', {text, due});
  if(!text) return;
  tasks.push({text,due,done:false});
  saveTasks();
  renderTasks();
  taskForm.reset();
});
renderTasks();

/* ---------- Exam Prep Checklist ---------- */
const examChecklistKey = 'dolludy_exam_checklist';

const initializeExamChecklist = () => {
  const saved = localStorage.getItem(examChecklistKey);
  if (saved) {
    const checkboxes = qsa('.exam-checkbox');
    const states = JSON.parse(saved);
    checkboxes.forEach((checkbox, idx) => {
      if (states[idx]) checkbox.checked = true;
    });
  }
};

const saveExamChecklist = () => {
  const checkboxes = qsa('.exam-checkbox');
  const states = Array.from(checkboxes).map(cb => cb.checked);
  localStorage.setItem(examChecklistKey, JSON.stringify(states));
};

const updateExamProgress = () => {
  const checkboxes = qsa('.exam-checkbox');
  const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
  const total = checkboxes.length;
  const percentage = Math.round((checked / total) * 100);
  
  qs('#examProgressText').textContent = `${percentage}% Complete (${checked}/${total})`;
  qs('#examProgressBar').style.width = `${percentage}%`;
};

// Add event listeners to all exam checkboxes
qsa('.exam-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    saveExamChecklist();
    updateExamProgress();
  });
});

// Reset button
qs('#resetExamChecklistBtn').addEventListener('click', () => {
  if (confirm('Reset all exam prep items?')) {
    qsa('.exam-checkbox').forEach(checkbox => checkbox.checked = false);
    saveExamChecklist();
    updateExamProgress();
    qs('#examProgress').style.display = 'none';
    showNotification('Exam checklist reset! 🔄');
  }
});

// Show progress button
qs('#showExamProgressBtn').addEventListener('click', () => {
  const progress = qs('#examProgress');
  if (progress.style.display === 'none') {
    updateExamProgress();
    progress.style.display = 'block';
    showNotification('Progress shown! Keep going! 💪');
  } else {
    progress.style.display = 'none';
  }
});

// Initialize exam checklist on load
initializeExamChecklist();
updateExamProgress();

/* ---------- Exam Prep Checklist ---------- */
qs('#themeToggle').addEventListener('click', ()=>{
  document.documentElement.style.setProperty('--accent', document.documentElement.style.getPropertyValue('--accent')? '#ffb6d5' : '#ffd1e8');
});

// initial displays
studyTimer.updateDisplay(); smallTimers.skincare.updateDisplay(); smallTimers.sleep.updateDisplay();

/* ---------- Data Export/Import ---------- */
const exportAppData = () => {
  const appData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    data: {}
  };

  // Collect all app-related localStorage keys
  const keysToExport = [
    'beauty_tasks_v1',
    'beauty_pomodoro_v1',
    'beauty_pomodoro_task',
    'beauty_pomodoro_sessions',
    'beauty_water_count',
    'beauty_water_date',
    'beauty_streaks_v1',
    'beauty_study_sessions_v1',
    'beautyStudyUser',
    'beauty_study_timer',
    'dolludy_exam_checklist',
    'beautySmallTimers',
    'beautyTheme'
  ];

  keysToExport.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      appData.data[key] = value;
    }
  });

  return appData;
};

const downloadAppData = () => {
  const appData = exportAppData();
  const jsonString = JSON.stringify(appData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dolludy_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification('✅ Data exported successfully!');
};

const importAppData = (jsonString) => {
  try {
    const appData = JSON.parse(jsonString);
    
    if (!appData.data) {
      showNotification('❌ Invalid backup file format', 'error');
      return false;
    }

    Object.entries(appData.data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    showNotification('✅ Data imported successfully! Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
    return true;
  } catch (e) {
    showNotification('❌ Error importing data: ' + e.message, 'error');
    return false;
  }
};

// Add export button event listener
const exportBtnEl = qs('#exportDataBtn');
if (exportBtnEl) {
  exportBtnEl.addEventListener('click', downloadAppData);
}

// Add import handler
const importFileInput = qs('#importFileInput');
if (importFileInput) {
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      importAppData(event.target.result);
    };
    reader.readAsText(file);
  });
}

// Add import button click handler
const importBtnEl = qs('#importDataBtn');
if (importBtnEl) {
  importBtnEl.addEventListener('click', () => {
    qs('#importFileInput').click();
  });
}

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
// Initialize study-focused streaks with proper structure
const initializeStreaks = () => {
  const defaults = {
    study: { count: 0, lastDate: "" },
    anki_make: { count: 0, lastDate: "" },
    anki_review: { count: 0, lastDate: "" }
  };
  
  let saved = JSON.parse(localStorage.getItem(streaksKey) || '{}');
  
  // Ensure all streak types exist
  Object.keys(defaults).forEach(key => {
    if(!saved[key]) {
      saved[key] = defaults[key];
    }
  });
  
  localStorage.setItem(streaksKey, JSON.stringify(saved));
  return saved;
};

let streaks = initializeStreaks();

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

  const labelMap = {
    study: '📚 Study',
    anki_make: '🧩 Anki: Make Cards',
    anki_review: '🔁 Anki: Review Cards'
  };

  // order we want to show streaks
  const order = ['study', 'anki_make', 'anki_review'];

  order.forEach(key => {
    if (!streaks[key]) return;
    const s = streaks[key];

    const item = document.createElement('div');
    item.className = 'streak-item';

    const info = document.createElement('div');
    info.className = 'streak-info';

    const name = document.createElement('span');
    name.className = 'streak-name';
    name.textContent = labelMap[key] || key;

    const count = document.createElement('div');
    count.className = 'streak-count';
    count.textContent = `${s.count} day${s.count === 1 ? '' : 's'}`;

    const last = document.createElement('div');
    last.className = 'streak-last';
    last.textContent = s.lastDate || '—';

    info.appendChild(name);
    info.appendChild(count);
    info.appendChild(last);

    const action = document.createElement('div');
    const btn = document.createElement('button');
    btn.className = 'streak-btn';
    btn.dataset.type = key;
    btn.textContent = 'Log Today';
    action.appendChild(btn);

    item.appendChild(info);
    item.appendChild(action);

    streaksEl.appendChild(item);
  });

  // Attach listeners
  qsa('.streak-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = e.currentTarget.dataset.type;
      updateStreak(type);
      e.currentTarget.textContent = '✓ Done';
      setTimeout(() => { renderStreaks(); }, 500);
    });
  });
};

// water/skincare removed from streaks — now study-focused

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

/* ---------- User Auth & Settings System ---------- */
const userKey = 'beauty_user_v1';
const settingsKey = 'beauty_settings_v1';
let currentUser = JSON.parse(localStorage.getItem('beautyStudyUser')) || { id: null, name: null };

const defaultSettings = {
  workDuration: 30,
  breakDuration: 5,
  longBreakDuration: 30,
  weeklyGoal: 20,
  dailyTaskGoal: 5,
  theme: 'light',
  soundEnabled: true
};

const loadUser = () => {
  const saved = localStorage.getItem(userKey);
  if(saved) currentUser = JSON.parse(saved);
  return currentUser;
};

const saveUser = (user) => {
  currentUser = user;
  localStorage.setItem(userKey, JSON.stringify(user));
};

const loadSettings = () => {
  const saved = localStorage.getItem(settingsKey);
  return saved ? JSON.parse(saved) : defaultSettings;
};

const saveSettings = (settings) => {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
};

const getCurrentSettings = () => {
  return loadSettings();
};

// Modal Management
const openModal = (modalId) => {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  qs(`#${modalId}`).classList.add('active');
};

const closeModal = (modalId) => {
  qs(`#${modalId}`).classList.remove('active');
};

// Modal Switching
const switchTab = (tabName) => {
  document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
  qs(`#${tabName}Tab`).classList.add('active');
  qs(`[data-tab="${tabName}"]`).classList.add('active');
};

// Login Form
qs('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = qs('#loginEmail').value;
  const password = qs('#loginPassword').value;
  
  const users = JSON.parse(localStorage.getItem('beauty_users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  
  if(user) {
    saveUser(user);
    updateUIAfterLogin();
    closeModal('loginModal');
    alert(`Welcome back, ${user.name}! 🌸`);
  } else {
    alert('Invalid email or password');
  }
});

// Signup Form
qs('#signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = qs('#signupName').value;
  const email = qs('#signupEmail').value;
  const password = qs('#signupPassword').value;
  const weeklyGoal = parseInt(qs('#signupGoal').value) || 20;
  
  const users = JSON.parse(localStorage.getItem('beauty_users') || '[]');
  if(users.find(u => u.email === email)) {
    alert('Email already registered');
    return;
  }
  
  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    weeklyGoal,
    createdAt: new Date().toDateString(),
    stats: {
      totalSessions: 0,
      totalFocusTime: 0,
      tasksCompleted: 0
    }
  };
  
  users.push(newUser);
  localStorage.setItem('beauty_users', JSON.stringify(users));
  saveUser(newUser);
  updateUIAfterLogin();
  closeModal('loginModal');
  alert(`Welcome to Beauty Study, ${name}! 🎉`);
  qs('#loginForm').reset();
  qs('#signupForm').reset();
});

const updateUIAfterLogin = () => {
  if(currentUser) {
    qs('#userProfileBtn').textContent = '👤 ' + currentUser.name.split(' ')[0];
    qs('#currentUserDisplay').textContent = currentUser.name;
    qs('#profileName').textContent = currentUser.name;
    qs('#profileEmail').textContent = currentUser.email;
  }
};

// Settings Management
const loadSettingsUI = () => {
  const settings = getCurrentSettings();
  qs('#workDuration').value = settings.workDuration;
  qs('#breakDuration').value = settings.breakDuration;
  qs('#longBreakDuration').value = settings.longBreakDuration;
  qs('#weeklyGoal').value = settings.weeklyGoal;
  qs('#dailyTaskGoal').value = settings.dailyTaskGoal;
  qs('#theme').value = settings.theme;
  qs('#soundEnabled').checked = settings.soundEnabled;
};

qs('#savSettingsBtn').addEventListener('click', () => {
  const settings = {
    workDuration: parseInt(qs('#workDuration').value),
    breakDuration: parseInt(qs('#breakDuration').value),
    longBreakDuration: parseInt(qs('#longBreakDuration').value),
    weeklyGoal: parseInt(qs('#weeklyGoal').value),
    dailyTaskGoal: parseInt(qs('#dailyTaskGoal').value),
    theme: qs('#theme').value,
    soundEnabled: qs('#soundEnabled').checked
  };
  
  saveSettings(settings);
  applyTheme(settings.theme);
  alert('Settings saved! 💾');
});

qs('#resetSettingsBtn').addEventListener('click', () => {
  if(confirm('Reset all settings to defaults?')) {
    saveSettings(defaultSettings);
    loadSettingsUI();
    applyTheme('light');
    alert('Settings reset! 🔄');
  }
});

const applyTheme = (theme) => {
  const root = document.documentElement;
  switch(theme) {
    case 'dark':
      root.style.setProperty('--bg', '#2a1f2e');
      root.style.setProperty('--card', '#3d2a3f');
      root.style.setProperty('--text', '#f5f5f5');
      break;
    case 'pink':
      root.style.setProperty('--bg', '#ffe8f0');
      root.style.setProperty('--card', '#ffcce5');
      root.style.setProperty('--accent', '#ff6b9d');
      break;
    default:
      root.style.setProperty('--bg', '#fff6fb');
      root.style.setProperty('--card', '#ffeef6');
      root.style.setProperty('--text', '#4b2a3a');
  }
};

// Profile Updates
const updateUserStats = () => {
  if(!currentUser) return;
  
  const todaySessions = JSON.parse(localStorage.getItem('beauty_pomodoro_sessions') || '[]')
    .filter(s => s.date === new Date().toDateString()).length;
  const tasksCompleted = tasks.filter(t => t.done).length;
  const focusTime = getWeekStudyHours();
  
  qs('#profileSessions').textContent = todaySessions;
  qs('#profileFocusTime').textContent = `${focusTime}h`;
  qs('#profileTasksCompleted').textContent = tasksCompleted;
  
  generateAchievements(focusTime, tasksCompleted);
};

const generateAchievements = (focusTime, tasksCompleted) => {
  const achievements = [];
  
  if(focusTime >= 1) achievements.push({icon: '🔥', name: 'On Fire', desc: '1h+ focus'});
  if(focusTime >= 5) achievements.push({icon: '⚡', name: 'Energizer', desc: '5h+ focus'});
  if(focusTime >= 10) achievements.push({icon: '🏆', name: 'Champion', desc: '10h+ focus'});
  if(tasksCompleted >= 5) achievements.push({icon: '✅', name: 'Achiever', desc: '5 tasks'});
  if(tasksCompleted >= 20) achievements.push({icon: '⭐', name: 'Legend', desc: '20 tasks'});
  if(new Date().getHours() >= 22) achievements.push({icon: '🌙', name: 'Night Owl', desc: 'Late night'});
  
  const achievementsList = qs('#achievementsList');
  achievementsList.innerHTML = achievements.length ? 
    achievements.map(a => `<div class="achievement"><span class="achievement-icon">${a.icon}</span><span class="achievement-name">${a.name}</span></div>`).join('') :
    '<p style="grid-column: 1/-1; text-align: center; color: #8a5169;">No achievements yet. Keep studying!</p>';
};

// Button Event Listeners
qs('#settingsMenuBtn').addEventListener('click', () => {
  loadSettingsUI();
  openModal('settingsModal');
});

qs('#userProfileBtn').addEventListener('click', () => {
  if(!currentUser) {
    openModal('loginModal');
  } else {
    updateUserStats();
    openModal('profileModal');
  }
});

qs('#closeLoginModal').addEventListener('click', () => closeModal('loginModal'));
qs('#closeSettingsModal').addEventListener('click', () => closeModal('settingsModal'));
qs('#closeProfileModal').addEventListener('click', () => closeModal('profileModal'));

// Modal Tab Switching
qs('.modal-tabs').addEventListener('click', (e) => {
  if(e.target.classList.contains('modal-tab-btn')) {
    switchTab(e.target.dataset.tab);
  }
});

qs('#logoutBtn').addEventListener('click', () => {
  if(confirm('Logout?')) {
    currentUser = null;
    localStorage.removeItem(userKey);
    alert('Logged out! See you soon 👋');
    closeModal('settingsModal');
    location.reload();
  }
});

qs('#editProfileBtn').addEventListener('click', () => {
  alert('Profile editing coming soon! 🚀');
});

// Initialize
loadUser();
if(currentUser) {
  updateUIAfterLogin();
} else {
  openModal('loginModal');
}

/* ============ LIVE STUDY ROOMS - Socket.io Integration ============ */

// Load Socket.io library
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
document.head.appendChild(script);

let socket = null;
// currentUser already declared earlier
let currentRoomId = null;
let roomTimerInterval = null;

script.onload = () => {
  socket = io('http://localhost:3000');
  
  // Initialize user on connection
  socket.on('connect', () => {
    console.log('Connected to Beauty Study Live');
    if (!currentUser.id) {
      currentUser.id = 'user_' + Date.now();
      localStorage.setItem('beautyStudyUser', JSON.stringify(currentUser));
    }
    socket.emit('user:init', {
      userId: currentUser.id,
      name: currentUser.name || 'Anonymous'
    });
  });

  // Receive user ready confirmation
  socket.on('user:ready', (data) => {
    currentUser.id = data.userId;
    localStorage.setItem('beautyStudyUser', JSON.stringify(currentUser));
    console.log('User ID assigned:', data.userId);
  });

  // Room created
  socket.on('room:created', (data) => {
    currentRoomId = data.roomId;
    updateCurrentRoomDisplay(data.room);
    showRoomPanel();
  });

  // Room joined
  socket.on('room:joined', (data) => {
    currentRoomId = data.roomId;
    updateCurrentRoomDisplay(data.room);
    showRoomPanel();
  });

  // Member joined
  socket.on('member:joined', (data) => {
    updateCurrentRoomDisplay({ ...data, id: currentRoomId });
    showNotification(`${data.member.name} joined the room! 👋`);
  });

  // Member left
  socket.on('member:left', (data) => {
    updateCurrentRoomDisplay({ members: data.members, id: currentRoomId });
  });

  // Member status update
  socket.on('member:status', (data) => {
    updateCurrentRoomDisplay({ members: data.members, id: currentRoomId });
  });

  // Timer events
  socket.on('timer:started', (data) => {
    showNotification(`${data.startedBy} started studying! 🎯`);
    syncTimerWithRoom(data.timerState);
  });

  socket.on('timer:paused', (data) => {
    if (roomTimerInterval) clearInterval(roomTimerInterval);
  });

  socket.on('timer:update', (data) => {
    updateRoomTimer(data.timerState);
  });

  socket.on('timer:finished', (data) => {
    showNotification('Session finished! Great work! 🎉');
  });

  // Room list
  socket.on('room:list', (data) => {
    updateRoomsList(data.rooms);
  });

  socket.on('room:list:updated', (data) => {
    updateRoomsList(data.rooms);
  });

  // Error handling
  socket.on('error', (data) => {
    showNotification(`Error: ${data.message}`, 'error');
  });
};

// UI Functions for Rooms Panel
const roomsPanel = qs('#roomsPanel');
const roomsToggle = qs('#roomsToggle');
const closeRoomsBtn = qs('#closeRoomsBtn');

roomsToggle.addEventListener('click', () => {
  roomsPanel.classList.toggle('active');
});

closeRoomsBtn.addEventListener('click', () => {
  roomsPanel.classList.remove('active');
});

// Set user name
qs('#setUserBtn').addEventListener('click', () => {
  const nameInput = qs('#userNameInput');
  if (nameInput.value.trim()) {
    currentUser.name = nameInput.value.trim();
    localStorage.setItem('beautyStudyUser', JSON.stringify(currentUser));
    if (socket) {
      socket.emit('user:init', { userId: currentUser.id, name: currentUser.name });
    }
    showNotification(`Welcome, ${currentUser.name}! 🌸`);
    nameInput.value = '';
  }
});

// Create room
qs('#createRoomBtn').addEventListener('click', () => {
  const roomName = qs('#roomNameInput').value.trim();
  if (roomName && socket) {
    socket.emit('room:create', { roomName });
    qs('#roomNameInput').value = '';
  } else {
    showNotification('Please enter a room name', 'error');
  }
});

// Join room by code
qs('#joinRoomBtn').addEventListener('click', () => {
  const inviteCode = qs('#inviteCodeInput').value.trim().toUpperCase();
  if (inviteCode && socket) {
    socket.emit('room:join', { inviteCode });
    qs('#inviteCodeInput').value = '';
  } else {
    showNotification('Please enter an invite code', 'error');
  }
});

// Leave room
qs('#leaveRoomBtn').addEventListener('click', () => {
  if (socket && currentRoomId) {
    socket.emit('room:leave');
    currentRoomId = null;
    qs('#currentRoomSection').style.display = 'none';
    showNotification('You left the room');
  }
});

function updateCurrentRoomDisplay(room) {
  const section = qs('#currentRoomSection');
  const nameEl = qs('#currentRoomName');
  const codeEl = qs('#inviteCodeDisplay');
  const membersEl = qs('#membersInfo');

  if (room.name) {
    nameEl.textContent = room.name;
  }
  
  if (room.inviteCode) {
    codeEl.innerHTML = `<strong>Invite Code:</strong> <code style="background:white; padding:2px 6px; border-radius:4px;">${room.inviteCode}</code>`;
  }

  if (room.members) {
    membersEl.innerHTML = `<div style="margin-bottom:8px;"><strong>Members (${room.members.length}):</strong></div>
      <div class="members-list">
        ${room.members.map(m => `
          <div class="member-item">
            <span class="member-status ${m.status}"></span>
            <span>${m.name}</span>
            <span style="margin-left:auto;font-size:10px;color:#8a5169;">${m.status}</span>
          </div>
        `).join('')}
      </div>`;
  }

  section.style.display = 'block';
}

function updateRoomsList(rooms) {
  const list = qs('#roomsList');
  if (rooms.length === 0) {
    list.innerHTML = '<p style="font-size:12px;color:#8a5169;">No rooms available yet. Create one!</p>';
    return;
  }

  list.innerHTML = rooms.map(room => `
    <div class="room-item">
      <div class="room-item-name">${room.name}</div>
      <div class="room-item-meta">👥 ${room.members.length} ${room.members.length === 1 ? 'member' : 'members'}</div>
      <div class="room-item-meta">Created ${new Date(room.createdAt).toLocaleTimeString()}</div>
      <button style="width:100%;margin-top:6px;padding:6px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;" onclick="document.getElementById('inviteCodeInput').value='${room.inviteCode}'; document.getElementById('joinRoomBtn').click();">Join with Code: ${room.inviteCode}</button>
    </div>
  `).join('');
}

function showRoomPanel() {
  roomsPanel.classList.add('active');
}

function syncTimerWithRoom(timerState) {
  // Sync the main study timer with room
  if (roomTimerInterval) clearInterval(roomTimerInterval);
  
  roomTimerInterval = setInterval(() => {
    if (timerState.isRunning && timerState.timeRemaining > 0) {
      timerState.timeRemaining--;
      socket.emit('timer:tick', { timeRemaining: timerState.timeRemaining });
      updateRoomTimer(timerState);
    }
  }, 1000);
}

function updateRoomTimer(timerState) {
  const m = Math.floor(timerState.timeRemaining / 60).toString().padStart(2, '0');
  const s = (timerState.timeRemaining % 60).toString().padStart(2, '0');
  // Update display if needed
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: ${type === 'error' ? '#ff6b6b' : 'var(--accent)'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideIn {
    from { transform: translateX(-400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Fetch room list on load
setTimeout(() => {
  if (socket) socket.emit('room:list');
}, 1000);

} // End of initializeApp function


