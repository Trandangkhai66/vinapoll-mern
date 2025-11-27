const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const Poll = require('./models/Poll');

const app = express();
const server = http.createServer(app);

// --- 1. CẤU HÌNH CORS & SOCKET.IO (QUAN TRỌNG CHO DEPLOY) ---
// Thay vì dùng biến môi trường phức tạp, ta mở kết nối "*" (All)
// để Netlify có thể kết nối vào Render dễ dàng mà không bị chặn.
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: "*" })); 
app.use(express.json());

// --- 2. KẾT NỐI MONGODB ATLAS (CHÍNH CHỦ CỦA BẠN) ---
// Username: bilongdaica12_db_user
// Password: anhemtot12
// Cluster: cluster0.2fvaipc.mongodb.net
const MONGO_URL = "mongodb+srv://bilongdaica12_db_user:anhemtot12@cluster0.2fvaipc.mongodb.net/vinapoll?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Cloud Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

// --- 3. API ROUTES (LOGIC GIỮ NGUYÊN) ---

// Get All Polls
app.get('/api/polls', async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) { res.status(500).json(err); }
});

// Create Poll
app.post('/api/polls', async (req, res) => {
  try {
    const newPoll = new Poll(req.body);
    const savedPoll = await newPoll.save();
    io.emit('poll_created', savedPoll); // Real-time
    res.status(200).json(savedPoll);
  } catch (err) { res.status(500).json(err); }
});

// Vote
app.post('/api/polls/:id/vote', async (req, res) => {
  const { userId, optionId } = req.body;
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll || poll.votedBy.includes(userId)) return res.status(403).json("Already voted");

    const option = poll.options.id(optionId);
    if (option) {
      option.votes++;
      poll.votedBy.push(userId);
      poll.totalVotes++;
      await poll.save();
      io.emit('poll_updated', poll); // Real-time
      res.status(200).json(poll);
    } else {
      res.status(404).json("Option not found");
    }
  } catch (err) { res.status(500).json(err); }
});

// Like
app.post('/api/polls/:id/like', async (req, res) => {
  const { userId } = req.body;
  try {
    const poll = await Poll.findById(req.params.id);
    if (poll.likedBy.includes(userId)) {
      poll.likes--;
      poll.likedBy.pull(userId);
    } else {
      poll.likes++;
      poll.likedBy.push(userId);
    }
    await poll.save();
    io.emit('poll_updated', poll); // Real-time
    res.status(200).json(poll);
  } catch (err) { res.status(500).json(err); }
});

// --- 4. KHỞI CHẠY SERVER ---
// Quan trọng: Render sẽ tự động cấp PORT vào process.env.PORT
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});