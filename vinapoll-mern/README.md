# vinapoll-mern

Dự án mẫu MERN (server + client) cho các tính năng thăm dò thời gian thực (bầu chọn, thích, chia sẻ, tải xuống). Cấu trúc và nội dung đã được tạo theo yêu cầu.

## Structure

```
vinapoll-mern/
├── server/
│   ├── models/Poll.js
│   ├── package.json
│   └── server.js
└── client/
    ├── public/
    ├── src/
    │   ├── App.js
    │   ├── index.css
    │   └── index.js
    ├── package.json
    └── tailwind.config.js
```

## Chạy project trên máy (cục bộ)

Yêu cầu trước khi chạy:
- Node.js và npm
- MongoDB đang chạy trên máy (URI mặc định: `mongodb://127.0.0.1:27017/vinapoll`)

1) Khởi động backend (server)

```powershell
cd vinapoll-mern\server
npm install
npm start
```

Khi server khởi động thành công bạn sẽ thấy thông báo tương tự: ✅ MongoDB Connected và 🚀 Server running on port 5000

2) Khởi động frontend (React app)

```powershell
cd vinapoll-mern\client
npm install
npm start
```

Mở trình duyệt vào http://localhost:3000 để xem ứng dụng.

Ghi chú:
- Client sử dụng: axios, socket.io-client, lucide-react (đã khai báo trong `client/package.json`).
- Server sử dụng Express + Mongoose + Socket.IO để hỗ trợ cập nhật thời gian thực.

---

## Triển khai lên Netlify (frontend)

Bạn có thể triển khai phần `client` (React) lên Netlify rất dễ dàng — Netlify phù hợp cho ứng dụng tĩnh/SPA. Lưu ý: phần backend (server) là một Node server có Socket.IO và yêu cầu MongoDB, nên cần được deploy trên một dịch vụ khác (ví dụ Render / Railway / Heroku / Fly / Vercel Serverless/Cloud Run).

Các bước cơ bản (client -> Netlify):

1. Đảm bảo mã client sử dụng biến môi trường để biết URL API backend. Ở repository này, client đã đọc `process.env.REACT_APP_API_URL` (nếu không có sẽ fallback tới `http://localhost:5000`).
2. Commit thay đổi và push lên GitHub.
3. Trên Netlify: tạo Site mới — chọn kết nối tới GitHub repo của bạn.
    - Build command: `npm run build`
    - Publish directory: `build`
4. Trên trang Site settings → Environment → Add variable:
    - Key: `REACT_APP_API_URL`
    - Value: public URL của server Node (ví dụ `https://your-backend.onrender.com`)
5. Thêm file `_redirects` vào `client/public/` (đã thêm sẵn) để SPA xử lý routing: nội dung `/* /index.html 200`.

Lưu ý: Netlify chỉ host phần front-end. Socket.io client trên Netlify sẽ kết nối tới server bạn deploy riêng (ví dụ Render). Netlify không host long-lived Node socket server trực tiếp cho ứng dụng này.

---

## Đề xuất deploy phần server (backend + MongoDB)

Phần backend (server/server.js) cần 1 host có Node.js runtime và 1 database MongoDB. Gợi ý:
- Backend: Render (https://render.com), Railway (https://railway.app), Fly.io hoặc DigitalOcean App Platform — đều hỗ trợ Node app lâu dài.
- Database: MongoDB Atlas (cloud.mongodb.com) — tạo cluster, lấy connection string, lưu vào biến môi trường `MONGODB_URI` trên host server.

Sau khi deploy server, copy URL public (ví dụ `https://my-vinapoll.onrender.com`) và đặt `REACT_APP_API_URL` trên Netlify trỏ tới URL đó. Đồng thời bổ sung Cors origin nếu cần.

### Hướng dẫn triển khai backend lên Render (step-by-step)

1) Chuẩn bị repo
    - Đảm bảo bạn đã commit toàn bộ source code vào GitHub (hoặc Git provider mà Render hỗ trợ) và project chứa `server/server.js` ở root `server/`.

2) Tạo MongoDB Atlas (Cloud)
    - Đăng ký/đăng nhập MongoDB Atlas (https://cloud.mongodb.com).
    - Tạo một Cluster mới (free tier được chấp nhận cho dev).
    - Tạo Database User (username/password) để kết nối.
    - Trong phần Network Access, thêm IP access (có thể tạm chọn "Allow access from anywhere" để test nhanh, nhưng nên giới hạn cho production).
    - Lấy Connection String (ví dụ `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/vinapoll?retryWrites=true&w=majority`).

3) Triển khai server trên Render
    - Tạo tài khoản Render (https://render.com), connect GitHub → chọn repo của bạn.
    - Tạo một **Web Service** mới (Server) → chọn branch, region.
    - Build & Start (Render thường tự chạy `npm install` và `npm start`):
      - Build command: `npm install` (nếu cần build step, nhưng server chỉ cần npm install)
      - Start command: `npm start` (server/package.json đã chứa `start: node server.js`)
    - Ở phần Environment, thêm biến:
      - `MONGODB_URI` = giá trị connection string của Atlas.
      - `FRONTEND_URL` = (URL Netlify của bạn) — dùng để cấu hình cors cho socket.io (ví dụ `https://my-site.netlify.app`).
      - `PORT` = (tuỳ chọn, Render sẽ gán port tự động nhưng giữ để chắc chắn; Render thường đặt `PORT` env var tự động)

4) Kiểm tra sau khi deploy
    - Render sẽ build và start server — kiểm tra logs để xác nhận `✅ Kết nối MongoDB thành công`.
    - Mở `https://your-backend.onrender.com/api/polls` để kiểm tra API trả về danh sách (có thể rỗng nếu chưa có poll).

5) Cấu hình client (Netlify)
    - Trên Netlify, set `REACT_APP_API_URL` bằng URL backend public (ví dụ `https://your-backend.onrender.com`).
    - Client sẽ kết nối tới socket.io server qua URL đó.

6) Bảo mật và production tips
    - Không lưu credentials trong repo — dùng secrets / env vars trên Render và Netlify.
    - Scale: nếu app cần nhiều realtime traffic, cân nhắc các options scale/increase instance size hoặc một dịch vụ socket-compatible.

---

Nếu bạn muốn, tôi có thể tiếp tục và:
- Tạo một script seed (`server/seed.js`) để tự động chèn vài polls mẫu và thêm `npm run seed` vào `server/package.json`.
- Viết hướng dẫn đầy đủ để deploy server -> kết nối Atlas -> cài Netlify frontend, từng bước cho người mới.

---

Nếu muốn, tôi có thể:
- Hướng dẫn bạn deploy server lên Render step-by-step (deploy repo, set env vars, connect to Atlas).
- Tạo script seed để có sample polls khi deploy lần đầu.

