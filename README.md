# 🌸 Beauty Study Live - Collaborative Study Timer

A beautiful, pastel-themed study application with **live collaborative features**. Create study rooms, invite friends, and study together in real-time!

## ✨ Features

### Core Study Tools
- 🍅 **Pomodoro Timer** - 30 min work sessions with 5 min breaks
- 📋 **Task Management** - Create and track your study tasks
- 🎨 **Skincare Routine Tracker** - Self-care integrated into study sessions
- 💧 **Water Intake Tracker** - Stay hydrated while studying
- 📊 **Progress Tracking** - Visual stats and achievements
- 🐱 **Pixel Cat Companion** - Your study buddy with animations

### NEW: Live Study Rooms 🚀
- **Create Study Rooms** - Start a collaborative study session
- **Invite Friends** - Share invite codes with roommates
- **Real-time Synchronization** - Timers sync across all room members
- **Member Status** - See who's studying, on break, or idle
- **Live Updates** - Instant notifications when members join/leave
- **Room Browser** - Discover and join active study rooms

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Step 1: Install Dependencies
```bash
cd c:\Users\LENOVO\doll
npm install
```

This installs:
- `express` - Web server framework
- `socket.io` - Real-time communication
- `cors` - Cross-Origin Resource Sharing
- `uuid` - Unique ID generation
- And development dependencies

### Step 2: Start the Server
```bash
npm start
```

You'll see:
```
🌸 Beauty Study Live server running on http://localhost:3000
```

### Step 3: Open in Browser
- Navigate to: **http://localhost:3000**
- Your Beauty Study app is now live with collaborative features!

## 🏘️ How to Use Study Rooms

### Create a Room
1. Click the **🏘️** button in the top-right corner
2. Enter your name if you haven't already
3. Click "Create Study Room"
4. Enter a room name (e.g., "Math Finals Study Group")
5. Share the **invite code** with friends!

### Join a Room
**Option A: Using Invite Code**
1. Click the **🏘️** button
2. Enter the invite code your friend shared
3. Click "Join"

**Option B: From Available Rooms**
1. Click the **🏘️** button
2. Find a room in "Available Rooms" section
3. Click the "Join with Code" button

### Study Together
1. Once in a room, you'll see all members and their status
2. When someone starts the timer, it syncs for everyone
3. See real-time updates: 🟢 Studying, ☕ Breaking, ⚪ Idle
4. Get notifications when members join/leave

## 📱 Architecture

### Frontend (Browser)
- `index.html` - UI with study rooms panel
- `app.js` - Logic including Socket.io client
- `styles.css` - Beautiful pastel design

### Backend (Node.js)
- `server.js` - Express server with Socket.io
  - User authentication
  - Room management
  - Real-time timer synchronization
  - Member status tracking

### Real-time Communication
Uses **Socket.io** for instant updates between:
- Room creation/joining
- Timer synchronization
- Member presence
- Status updates
- Notifications

## 🔌 API Events (Socket.io)

### Client → Server
```javascript
// User
socket.emit('user:init', { userId, name })

// Rooms
socket.emit('room:create', { roomName })
socket.emit('room:join', { inviteCode })
socket.emit('room:leave')
socket.emit('room:list')

// Timer
socket.emit('timer:start', { isWorkSession, duration })
socket.emit('timer:pause')
socket.emit('timer:tick', { timeRemaining })

// Status
socket.emit('status:update', { status })
```

### Server → Client
```javascript
// User
socket.on('user:ready', { userId })

// Rooms
socket.on('room:created', { roomId, inviteCode, room })
socket.on('room:joined', { roomId, room })
socket.on('member:joined', { member, members })
socket.on('member:left', { members })
socket.on('room:list', { rooms })

// Timer
socket.on('timer:started', { timerState, startedBy })
socket.on('timer:paused', { timerState })
socket.on('timer:update', { timerState })
socket.on('timer:finished', { timerState })

// Status
socket.on('member:status', { userId, status, members })
```

## 🎨 Customization

### Change Colors
Edit `styles.css` - look for CSS variables:
```css
:root {
  --bg: #fff6fb;           /* Background */
  --card: #ffeef6;         /* Card background */
  --accent: #ffb6d5;       /* Accent color */
  --text: #4b2a3a;         /* Text color */
}
```

### Change Timer Durations
Edit `server.js` - Look for `StudyRoom` class:
```javascript
this.totalTime = data.duration || (room.timerState.isWorkSession ? 30 * 60 : 5 * 60);
```

## 📝 Features in Development
- [ ] User accounts with login
- [ ] Database persistence (MongoDB/Firebase)
- [ ] Focus time leaderboards
- [ ] Custom avatars for members
- [ ] Achievements and badges
- [ ] Music/ambient sounds for focus sessions
- [ ] Export study statistics

## 🐛 Troubleshooting

### Can't connect to server?
```bash
# Check if server is running
# Open http://localhost:3000 in browser
# Look for error in console (F12 → Console tab)
```

### Invite code not working?
- Make sure code is uppercase
- Code is unique per room - verify with room creator
- Code doesn't expire, but room closes when all members leave

### Timer not syncing?
- Ensure all users are in same room
- Check browser console for errors
- Try refreshing page and rejoining room

### Port already in use?
```bash
# Change PORT in server.js:
const PORT = process.env.PORT || 3001; // Use 3001 instead
```

## 📦 Project Structure
```
beauty-study-live/
├── index.html          # Main UI
├── app.js             # Frontend logic + Socket.io client
├── styles.css         # All styling
├── server.js          # Backend server
├── package.json       # Dependencies
└── README.md          # This file
```

## 🚀 Deployment

### Deploy to Heroku
```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Push code
git push heroku main

# 3. Visit https://your-app-name.herokuapp.com
```

### Deploy to Vercel (Frontend) + Railway (Backend)
- Deploy `index.html`, `app.js`, `styles.css` to Vercel
- Deploy `server.js` to Railway
- Update socket URL in `app.js`

## 💝 Tips for Best Experience

1. **Use headphones** - Focus music available in rooms
2. **Set realistic goals** - 30 min Pomodoro is recommended
3. **Take breaks** - Don't skip the 5 min break!
4. **Stay hydrated** - Use water tracker
5. **Study with friends** - Rooms make it more fun
6. **Track progress** - Check your stats dashboard

## 📞 Support

For issues or feature requests:
1. Check the Troubleshooting section
2. Check browser console (F12)
3. Restart server with `npm start`

## 🎯 Future Roadmap

- v1.1: User authentication & profiles
- v1.2: Database persistence
- v1.3: Mobile app
- v2.0: Video chat integration
- v2.1: AI study suggestions

---

**Made with 🌸 for beautiful study sessions**

*Beauty Study Live - Study Better, Study Together*
