# Livestream API Server

Đây là một dự án API server backend được xây dựng bằng Node.js và Express.js, sử dụng Sequelize ORM để tương tác với cơ sở dữ liệu PostgreSQL. Dự án này cung cấp các API để quản lý người dùng (đăng ký, đăng nhập) và quản lý các luồng livestream (tạo, cập nhật, lấy danh sách, lấy chi tiết).

## Các Công Nghệ Sử Dụng

- **Node.js:** Môi trường chạy JavaScript phía server.
- **Express.js:** Framework web cho Node.js để xây dựng API.
- **PostgreSQL:** Hệ quản trị cơ sở dữ liệu quan hệ.
- **Sequelize:** ORM (Object-Relational Mapper) cho Node.js, hỗ trợ PostgreSQL.
- **JSON Web Tokens (JWT):** Dùng để xác thực người dùng.
- **bcrypt:** Thư viện để hash mật khẩu người dùng.
- **express-validator:** Middleware để validate dữ liệu đầu vào của API.
- **dotenv:** Để quản lý các biến môi trường.
- **Nodemon:** Công cụ tự động restart server khi có thay đổi code (trong quá trình phát triển).

## Hướng Dẫn Cài Đặt và Chạy Dự Án

### 1. Yêu Cầu Cài Đặt

- Node.js (phiên bản 18.x trở lên được khuyến nghị)
- npm (thường đi kèm với Node.js)
- PostgreSQL Server đã được cài đặt và đang chạy.

### 2. Clone Repository (Nếu có)

```bash
git clone <URL_REPOSITORY_CUA_BAN>
cd livestream-server
```

### 3. Cài Đặt Dependencies

Chạy lệnh sau trong thư mục gốc của dự án (nơi có file `package.json`):

```bash
npm install
```

### 4. Cấu Hình Biến Môi Trường

Tạo một file tên là `.env` trong thư mục gốc của dự án (`D:/VDT2025/Mini-project-livestream-app/server/.env`).
Sao chép nội dung dưới đây vào file `.env` và **thay thế bằng thông tin thực tế của bạn**:

```env
# Cấu hình Database (PostgreSQL)
DB_HOST=localhost
DB_USER=YOUR_DB_USER          # Thay bằng user PostgreSQL của bạn
DB_PASS=YOUR_DB_PASSWORD      # Thay bằng mật khẩu PostgreSQL của bạn
DB_NAME=livestream            # Tên database (bạn cần tạo database này trước)
DB_PORT=5432                  # Cổng PostgreSQL (mặc định là 5432)

# Biến kết nối đầy đủ cho Sequelize CLI (quan trọng cho migrations/seeders)
# Đảm bảo các biến DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME ở trên được thay thế đúng
DATABASE_URL_DEV="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
# Nếu database của bạn yêu cầu SSL (ví dụ DB trên cloud):
# DATABASE_URL_DEV="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# JWT
JWT_SECRET=YOUR_VERY_STRONG_AND_SECRET_JWT_KEY # Thay bằng một chuỗi bí mật mạnh

# Server Port
PORT=5000

# Node Environment (development, production, test)
NODE_ENV=development
```

**Quan trọng:**

- Bạn cần tự tạo database `livestream` (hoặc tên bạn đã chọn trong `DB_NAME`) trong PostgreSQL trước khi chạy migrations.
- Đảm bảo `JWT_SECRET` là một chuỗi đủ dài và ngẫu nhiên để bảo mật.

### 5. Chạy Database Migrations

Sau khi cấu hình file `.env` và tạo database, chạy lệnh sau để tạo các bảng trong cơ sở dữ liệu của bạn:

```bash
npx sequelize-cli db:migrate
```

### 6. Khởi Động Server

- **Chế độ phát triển (với Nodemon, tự động restart khi có thay đổi):**
  ```bash
  npm run dev
  ```
- **Chế độ production (khởi động bình thường):**
  ```bash
  npm start
  ```

Server sẽ chạy trên cổng bạn đã cấu hình trong `.env` (mặc định là `http://localhost:5000`).

## Mô Tả Các API Endpoint Chính

### User APIs (BasePath: `/api/users`)

- **`POST /register`**: Đăng ký người dùng mới.
  - **Body**: `{ "username": "string", "password": "string" }`
  - **Response**: Thông tin user và JWT token.
- **`POST /login`**: Đăng nhập người dùng.
  - **Body**: `{ "username": "string", "password": "string" }`
  - **Response**: Thông tin user và JWT token.

### Stream APIs (BasePath: `/api/streams`)

- **`POST /`**: Tạo một stream mới (yêu cầu xác thực JWT).
  - **Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`
  - **Body**: `{ "title": "string" (optional), "description": "string" (optional) }`
  - **Response**: Thông tin stream đã tạo, bao gồm `streamKey`.
- **`PUT /:streamId`**: Cập nhật thông tin stream (yêu cầu xác thực JWT, chỉ chủ sở hữu stream).
  - **Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`
  - **Body**: `{ "title": "string" (optional), "description": "string" (optional), "status": "live"|"ended" (optional) }`
  - **Response**: Thông tin stream đã cập nhật.
- **`GET /`**: Lấy danh sách các stream (công khai).
  - **Query Params (optional)**: `status=live|ended`, `page=number`, `limit=number`.
  - **Response**: Danh sách stream, thông tin phân trang.
- **`GET /:streamId`**: Lấy thông tin chi tiết của một stream (công khai).
  - **Response**: Thông tin chi tiết của stream.

## Cấu Trúc Thư Mục (Sơ Lược)

```
server/
├── config/                 # Cấu hình (database, etc.)
├── controllers/            # Logic xử lý request/response
├── middlewares/            # Middlewares (xác thực, validation, etc.)
│   └── validators/         # Các file validator cụ thể
├── migrations/             # Database migrations (Sequelize)
├── models/                 # Sequelize models (định nghĩa bảng DB)
├── routes/                 # Định nghĩa các API routes
├── services/               # Logic nghiệp vụ (business logic)
├── validators/             # (Đã di chuyển validators ra đây)
├── .env                    # (Cần tự tạo) Biến môi trường
├── package.json
├── README.md
└── src/
    └── index.js            # Điểm khởi đầu của ứng dụng
```

## Đóng Góp

Nếu bạn muốn đóng góp, vui lòng fork repository và tạo một Pull Request.

## Bản Quyền

