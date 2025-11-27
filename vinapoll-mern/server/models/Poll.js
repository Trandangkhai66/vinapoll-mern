const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: String,
  votes: { type: Number, default: 0 }
});

const PollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [OptionSchema],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: [String], // Lưu danh sách userId đã like
  votedBy: [String], // Lưu danh sách userId đã vote
  totalVotes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Poll', PollSchema);
