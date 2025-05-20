# Roadmap Phát Triển Backend cho Ứng Dụng Livestream

## Mục tiêu

Xây dựng backend cho ứng dụng livestream với các chức năng chính như xác thực, quản lý người dùng, quản lý kênh, API livestream, tích hợp media server, chức năng chat, và quản lý VOD.

## Giai đoạn 1: Thiết Kế Cơ Sở Dữ Liệu

### 1.1 Thiết Kế Cơ Sở Dữ Liệu Quan Hệ (SQL)

- **Sơ đồ Quan Hệ Thực Thể (ERD):**

  - **Bảng Users:**

    - `id`: INT, Primary Key, Auto Increment
    - `username`: VARCHAR(255), Unique, Not Null
    - `password`: VARCHAR(255), Not Null
    - `createdAt`: DATETIME, Not Null
    - `updatedAt`: DATETIME, Not Null

  - **Bảng Streams:**

    - `id`: INT, Primary Key, Auto Increment
    - `userId`: INT, Foreign Key (References Users.id)
    - `streamKey`: VARCHAR(255), Unique, Not Null
    - `title`: VARCHAR(255)
    - `description`: TEXT
    - `status`: ENUM('live', 'ended'), Default 'ended'
    - `startTime`: DATETIME
    - `endTime`: DATETIME
    - `viewerCount`: INT, Default 0
    - `thumbnail`: VARCHAR(255)
    - `createdAt`: DATETIME, Not Null
    - `updatedAt`: DATETIME, Not Null

  - **Indexes:**
    - Index trên `userId` trong bảng Streams để tối ưu hóa truy vấn.

### 1.2 Thiết Kế Cơ Sở Dữ Liệu Không Quan Hệ (NoSQL)

- **Cấu trúc Document cho Chat Logs (MongoDB):**

  - **Collection Chats:**
    - `streamId`: ObjectId, Reference to Streams
    - `userId`: ObjectId, Reference to Users
    - `message`: String
    - `timestamp`: Date

- **Cấu trúc Document cho VOD (MongoDB):**
  - **Collection VODs:**
    - `streamId`: ObjectId, Reference to Streams
    - `filePath`: String
    - `createdAt`: Date

## Giai đoạn 2: Thiết Kế Luồng Xử Lý Video

### 2.1 Luồng Xử Lý Video

- **Ingest:**

  - Streamer -> OBS/Software -> RTMP -> Media Server (Nginx-RTMP)

- **Processing (nếu có):**

  - Media Server thực hiện transcoding sang các chất lượng khác nhau cho Adaptive Bitrate Streaming (ABR)
  - Tạo thumbnail từ stream

- **Delivery:**

  - Media Server -> HLS/DASH -> CDN -> Player trên trình duyệt Viewer

- **VOD (nếu có):**
  - Media Server -> Ghi file MP4/FLV -> Object Storage (S3, Google Cloud Storage)

## Giai đoạn 3: Phát Triển API

### 3.1 Xác Thực & Phân Quyền

- **Đăng ký, Đăng nhập:**
  - Sử dụng JWT để quản lý session/token

### 3.2 Quản Lý Người Dùng & Kênh

- **API Người Dùng:**

  - Tạo, cập nhật thông tin người dùng

- **API Kênh:**
  - Tạo, cập nhật thông tin kênh

### 3.3 API Livestream

- **Tạo/Lấy Stream Key:**

  - API để tạo và lấy stream_key cho streamer

- **Cập Nhật Thông Tin Stream:**

  - API để cập nhật tiêu đề, mô tả stream

- **Cập Nhật Trạng Thái Stream:**

  - API để cập nhật trạng thái stream (on-air/off-air) dựa trên tín hiệu từ media server

- **Lấy Danh Sách Stream:**
  - API để lấy danh sách stream đang live, stream nổi bật

## Giai đoạn 4: Tích Hợp Media Server

### 4.1 Cấu Hình Media Server

- **Nginx-RTMP:**
  - Cấu hình để nhận RTMP và xuất HLS/DASH

### 4.2 Xử Lý Webhook

- **Webhook từ Media Server:**
  - Xử lý các sự kiện như on_publish, on_done, on_play để cập nhật CSDL

## Giai đoạn 5: Chức Năng Chat (Real-time)

### 5.1 Sử Dụng WebSockets

- **Socket.IO:**
  - Sử dụng để gửi/nhận tin nhắn thời gian thực

### 5.2 Lưu Trữ Chat Log

- **MongoDB:**
  - Lưu trữ log chat vào MongoDB

## Giai đoạn 6: Lưu Trữ và Quản Lý VOD

### 6.1 Cấu Hình Media Server

- **Ghi Lại Stream:**
  - Cấu hình để ghi lại stream thành file MP4/FLV

### 6.2 API VOD

- **Tải Video Lên Object Storage:**

  - API để tải video lên S3 hoặc Google Cloud Storage

- **Liệt Kê, Xem Lại Video:**
  - API để liệt kê và xem lại video đã lưu

## Giai đoạn 7: Thiết Kế Cho Khả Năng Mở Rộng (Scalability)

### 7.1 Load Balancers

- **API Servers và Media Servers:**
  - Sử dụng Load Balancers để phân phối tải

### 7.2 Auto-scaling

- **Auto-scaling Groups:**
  - Cấu hình auto-scaling cho API servers và Media Servers

### 7.3 Sử Dụng CDN

- **Phân Phối Nội Dung:**
  - Sử dụng CDN để phân phối nội dung tĩnh và video

### 7.4 Caching

- **Redis/Memcached:**
  - Sử dụng để caching dữ liệu thường xuyên truy cập

### 7.5 Kiến Trúc Microservices

- **Tách Thành Phần Độc Lập:**
  - Cân nhắc tách các thành phần như user service, stream service, chat service thành microservices

## Giai đoạn 8: Kiểm Thử và Triển Khai

### 8.1 Kiểm Thử

- **Unit Testing, Integration Testing, Performance Testing**

### 8.2 Triển Khai

- **Triển Khai Lên Cloud Provider**
- **Thiết Lập Monitoring & Logging**

## Ghi Chú

- **Bảo Mật:** Đảm bảo bảo mật cho tất cả các API và dữ liệu người dùng.
- **Tối Ưu Hóa:** Liên tục tối ưu hóa hiệu suất và khả năng mở rộng của hệ thống.
