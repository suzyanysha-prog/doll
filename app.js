// Simple multi-timer + trackers for Beauty Study app
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

/* ---------- Timer Class ---------- */
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
const studyTimer = new Timer(studyDisplay, 30*60, 'beauty_study_timer'); // 30 min work
studyTimer.restoreState();

const catEl = qs('#studyCat');

const updatePomodoroDisplay = () => {
  const taskDisplay = qs('#pomodoroTaskDisplay');
  const phaseLabel = qs('#pomodoroPhase');
  const sessionCount = qs('#pomodoroSessionCount');
  
  if(pomodoroState.task) {
    taskDisplay.textContent = `📋 ${pomodoroState.task}`;
  } else {
    taskDisplay.textContent = 'No task selected';
  }
  
  const isWork = pomodoroState.isWorkSession;
  phaseLabel.textContent = isWork ? '🎯 Work Session (30 min)' : '☕ Break Time (5 min)';
  phaseLabel.style.color = isWork ? '#ff6b9d' : '#00bcd4';
  
  sessionCount.textContent = `Session ${pomodoroState.sessionCount + 1}`;
  
  updatePomodoroStats();
};

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
    updatePomodoroDisplay();
    catEl.classList.remove('studying');
    catEl.classList.add('dancing');
    alert('Work session done! Take a 5 minute break 🎉');
  } else {
    // After break, go back to work
    pomodoroState.sessionCount++;
    pomodoroState.isWorkSession = true;
    studyTimer.set(30 * 60); // 30 min work
    updatePomodoroDisplay();
    catEl.classList.remove('dancing');
    catEl.classList.add('studying');
    alert('Break over! Ready for another 30 minute work session? 💪');
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
  pomodoroState.taskIndex = taskIdx;
  const task = tasks[taskIdx];
  pomodoroState.task = task.text;
  pomodoroState.sessionCount = 0;
  savePomodoroState();
  updatePomodoroDisplay();
  renderPomodoroTaskList();
};

qs('#pomodoroTaskBtn').addEventListener('click', () => {
  const taskInput = qs('#pomodoroTaskInput');
  const taskText = taskInput.value.trim();
  if(!taskText) {
    alert('Please enter a task name');
    return;
  }
  pomodoroState.task = taskText;
  pomodoroState.sessionCount = 0;
  savePomodoroState();
  updatePomodoroDisplay();
  taskInput.value = '';
  alert(`Task "${taskText}" set! Now click Start to begin your first 30-minute work session 🚀`);
});

// Allow Enter key in task input
qs('#pomodoroTaskInput').addEventListener('keypress', (e) => {
  if(e.key === 'Enter') qs('#pomodoroTaskBtn').click();
});

// Task done button (gives 30 min break)
qs('#pomodoroTaskDone').addEventListener('click', () => {
  if(!pomodoroState.task) {
    alert('Please set a task first');
    return;
  }
  studyTimer.pause();
  if(pomodoroState.isWorkSession) {
    recordPomodoroSession(true, Math.floor(studyTimer.initial / 60));
  }
  // Mark task as done in the task list if it's from the list
  const taskIdx = pomodoroState.taskIndex;
  if(taskIdx !== null && tasks[taskIdx]) {
    tasks[taskIdx].done = true;
    saveTasks();
    renderTasks();
    renderPomodoroTaskList();
    recordStudySession(30); // Record 30 min study session
    updateProgressDashboard();
  }
  pomodoroState.isWorkSession = false;
  studyTimer.set(30 * 60); // 30 min break
  updatePomodoroDisplay();
  catEl.classList.add('dancing');
  alert(`🎉 Task "${pomodoroState.task}" completed! Enjoy your 30-minute break!`);
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
    alert('Please set a task first');
    return;
  }
  studyTimer.start(() => {
    transitionToNextPhase();
  });
  updateCatState();
});

qs('#studyPause').addEventListener('click', () => {
  studyTimer.pause();
  catEl.classList.remove('studying', 'dancing');
});

qs('#studyReset').addEventListener('click', () => {
  studyTimer.reset();
  if(pomodoroState.isWorkSession) {
    studyTimer.set(30 * 60);
  } else {
    studyTimer.set(5 * 60);
  }
  catEl.classList.remove('studying', 'dancing');
});

loadPomodoroState();
renderPomodoroTaskList();
studyTimer.updateDisplay();

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
  qsa('.del').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks.splice(i,1); saveTasks(); renderTasks(); renderPomodoroTaskList(); updateProgressDashboard(); }));
  qsa('.done').forEach(b=>b.addEventListener('click', e=>{ const i=e.target.dataset.i; tasks[i].done = !tasks[i].done; saveTasks(); renderTasks(); renderPomodoroTaskList(); updateProgressDashboard(); }));
  renderPomodoroTaskList();
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

/* ---------- User Auth & Settings System ---------- */
const userKey = 'beauty_user_v1';
const settingsKey = 'beauty_settings_v1';
let currentUser = null;

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

