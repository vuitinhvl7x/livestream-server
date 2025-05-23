# Task 3: Phát Triển API và Tích Hợp Chức Năng Livestream

## Giới Thiệu

Task 3 nhằm mở rộng hệ thống backend hiện tại bằng cách bổ sung chức năng livestream, tích hợp webhook từ media server, phát triển realtime chat và API quản lý VOD. Mỗi phần dưới đây được chia nhỏ thành các nhiệm vụ cụ thể để dễ theo dõi, lập kế hoạch và triển khai.

---

## 1. Giai Đoạn: Mở Rộng Cơ Sở Dữ Liệu (Database Extension)

### 1.1. Thiết Kế Migration cho Bảng Streams

- **Nội dung:**
  - Tạo migration mới (ví dụ: `migrations/202505XXXXXX-create-streams.js`) để định nghĩa bảng Streams.
- **Yêu Cầu Cụ Thể:**
  - Trường `id`: INT, auto increment, primary key.
  - Trường `userId`: INT, ràng buộc khóa ngoại tham chiếu đến `Users.id`.
  - Trường `streamKey`: VARCHAR(255), unique, not null.
  - Trường `title`: VARCHAR(255), cho tiêu đề stream (có thể null hoặc có giá trị mặc định).
  - Trường `description`: TEXT, cho mô tả stream.
  - Trường `status`: ENUM với giá trị 'live' và 'ended', mặc định là 'ended'.
  - Trường `startTime` và `endTime`: DATETIME, dùng để lưu thời điểm bắt đầu và kết thúc stream.
  - Trường `viewerCount`: INT, mặc định là 0, cập nhật theo số lượng người xem.
  - Trường `thumbnail`: VARCHAR(255), chứa đường dẫn hình ảnh biểu diễn stream.
  - Các trường `createdAt` và `updatedAt`: DATETIME để lưu lịch sử tạo và cập nhật.
- **Kiểm Tra:**
  - Sau khi migration chạy, xác nhận bảng được tạo đúng cấu trúc và các index cần thiết (ví dụ: index trên `userId`).

### 1.2. Cập Nhật Model Sequelize cho Streams

- **Nội dung:**
  - Tạo file `src/models/stream.js`.
- **Yêu Cầu Cụ Thể:**
  - Định nghĩa model sử dụng Sequelize, ánh xạ đầy đủ các trường như trong migration.
  - Thiết lập quan hệ (association) với model `User`:
    - Một user có thể có nhiều stream.
  - Đảm bảo tính năng timestamp tự động.
- **Kiểm Tra:**
  - Import model vào index model (`models/index.js`) và chạy thử kết nối model với DB.

---

## 2. Giai Đoạn: Phát Triển API Livestream

### 2.1. Thiết Kế Controller cho Streams

- **Nội dung:**
  - Tạo file `src/controllers/streamController.js`.
- **Yêu Cầu Cụ Thể:**
  - **Endpoint Tạo Mới Stream:**
    - Nhận request từ client để đăng ký stream.
    - Sinh ra `streamKey` duy nhất (có thể dựa trên UUID hoặc kết hợp mã hóa).
    - Liên kết stream với tài khoản người dùng.
    - Trả về thông tin stream kèm streamKey.
  - **Endpoint Cập Nhật Thông Tin Stream:**
    - Cho phép cập nhật trường `title`, `description`, và trạng thái (chuyển từ 'live' sang 'ended' khi kết thúc).
    - Xác thực rằng chỉ chủ sở hữu stream mới có thể chỉnh sửa.
  - **Endpoint Lấy Danh Sách Stream:**
    - Cung cấp API để liệt kê các stream đang live, sắp diễn ra hoặc stream nổi bật.
    - Hỗ trợ phân trang nếu danh sách dài.
- **Kiểm Tra:**
  - Viết unit test cho từng endpoint.
  - Test thông qua Postman hoặc các công cụ tương tự để đảm bảo dữ liệu trả về chính xác.

### 2.2. Định Nghĩa Routes cho Streams

- **Nội dung:**
  - Tạo file `src/routes/streamRoutes.js`.
- **Yêu Cầu Cụ Thể:**
  - Định nghĩa route:
    - `POST /streams` để tạo mới stream.
    - `PUT /streams/:id` để cập nhật stream.
    - `GET /streams` để lấy danh sách stream.
  - Áp dụng middleware kiểm tra xác thực (JWT auth middleware).
  - Áp dụng middleware validation cho dữ liệu đầu vào (ví dụ: kiểm tra định dạng, bắt buộc các trường cần thiết).
- **Kiểm Tra:**
  - Kiểm tra routing qua API gateway hoặc thông qua cURL/Postman để nhận phản hồi đúng.

---

## 3. Giai Đoạn: Tích Hợp Webhook Từ Media Server

### 3.1. Xác Định Các Sự Kiện Cần Nhận

- **Nội dung:**
  - Liệt kê các sự kiện webhook cần xử lý:
    - `on_publish`: Khi một stream bắt đầu.
    - `on_done`: Khi stream kết thúc.
    - (Tùy chọn) `on_play`: Khi có người xem.
- **Yêu Cầu Cụ Thể:**
  - Ghi log sự kiện gửi từ media server để phục vụ cho việc debug và bảo trì.

### 3.2. Tạo Endpoint Nhận Webhook

- **Nội dung:**
  - Tạo file hoặc phân đoạn mã riêng trong controller, ví dụ: `src/controllers/webhookController.js`.
- **Yêu Cầu Cụ Thể:**
  - Endpoint `POST /webhook/stream-event` nhận payload từ media server.
  - Xác thực nguồn gửi (ví dụ: dựa vào secret key được ký sẵn hoặc IP cho phép).
  - Phân biệt các loại event và cập nhật trạng thái stream tương ứng:
    - Khi nhận `on_publish`: Cập nhật stream từ trạng thái 'ended' sang 'live', cập nhật `startTime`.
    - Khi nhận `on_done`: Cập nhật trạng thái sang 'ended', ghi lại `endTime` và cập nhật số liệu người xem.
- **Kiểm Tra:**
  - Giả lập gửi request từ media server môi trường test để xác định hoạt động chính xác.
  - Đảm bảo trả về HTTP status phù hợp (ví dụ: 200 OK nếu thành công).

---

## 4. Giai Đoạn: Phát Triển Chức Năng Chat Realtime

### 4.1. Tích Hợp Socket.IO

- **Nội dung:**
  - Cập nhật file `src/index.js` hoặc tạo module riêng (ví dụ: `src/socket.js`) để cấu hình Socket.IO.
- **Yêu Cầu Cụ Thể:**
  - Thiết lập server Socket.IO chạy song song với Express.
  - Định nghĩa các sự kiện:
    - `connection`: Xác thực người dùng khi kết nối (có thể dùng token từ JWT).
    - `chat_message`: Nhận và broadcast tin nhắn tới tất cả các client trong phòng/livestream tương ứng.
  - Implement phòng chat cho mỗi stream để quản lý thông điệp cho từng kênh riêng biệt.
- **Kiểm Tra:**
  - Sử dụng client Socket.IO (ví dụ: trong browser hoặc test client) để gửi tin nhắn và đảm bảo broadcast hoạt động.
  - Kiểm tra an ninh khi kết nối (chỉ cho phép user hợp lệ kết nối).

### 4.2. Lưu Trữ Chat Logs

- **Nội dung:**
  - Đề xuất tích hợp với MongoDB cho lưu trữ lâu dài của chat logs.
- **Yêu Cầu Cụ Thể:**
  - Định nghĩa collection `Chats` với các trường:
    - `streamId`: Liên kết với stream hiện tại.
    - `userId`: Liên kết với người gửi.
    - `message`: Nội dung tin nhắn.
    - `timestamp`: Thời điểm gửi.
  - Phát triển service (ví dụ: `src/services/chatService.js`) để lưu chat vào MongoDB.
- **Kiểm Tra:**
  - Test ghi nhận tin nhắn bằng cách gửi và lưu trữ sau đó kiểm tra trực tiếp trong MongoDB.

---

## 5. Giai Đoạn: Phát Triển API và Quản Lý VOD

### 5.1. API Upload Video (VOD)

- **Nội dung:**
  - Tạo endpoint để cho phép upload video từ media server khi stream kết thúc.
- **Yêu Cầu Cụ Thể:**
  - Endpoint `POST /vod/upload` nhận thông tin và file upload (hoặc đường dẫn tới file đã được lưu trữ bởi media server).
  - Xác thực quy trình upload và lưu trữ thông tin video trong database.
  - Dùng một service (ví dụ: `src/services/vodService.js`) để tích hợp với Object Storage (S3, GCS, …) nếu triển khai sau.
- **Kiểm Tra:**
  - Test gửi file giả lập để ensure API xử lý đúng và lưu metadata VOD vào DB.

### 5.2. API Liệt Kê và Phát Video VOD

- **Nội dung:**
  - Tạo endpoint `GET /vod` để liệt kê các video có sẵn.
- **Yêu Cầu Cụ Thể:**
  - Hỗ trợ phân trang, bộ lọc theo `streamId` hoặc thời gian.
  - Trả về thông tin chi tiết video (ví dụ: đường dẫn video, thumbnail, thời gian tạo).
- **Kiểm Tra:**
  - Gửi request và đảm bảo response chứa dữ liệu phù hợp với định dạng định nghĩa.

---

## 6. Giai Đoạn: Bảo Mật và Quản Lý Session

### 6.1. Cải Thiện Xác Thực (JWT Middleware)

- **Nội dung:**
  - Triển khai middleware kiểm tra JWT cho các endpoint nhạy cảm (streams, webhook, VOD, chat).
- **Yêu Cầu Cụ Thể:**
  - Middleware xác thực token từ header hoặc query string.
  - Nếu token không hợp lệ hoặc hết hạn: trả về lỗi 401 Unauthorized.
  - Áp dụng middleware cho `src/routes/streamRoutes.js`, `src/routes/webhookRoutes.js` (nếu có endpoint riêng) và có thể cho API của VOD, chat.
- **Kiểm Tra:**
  - Thực hiện các kịch bản thử nghiệm: token hợp lệ, token hết hạn, token sai.

### 6.2. Quản Lý Session và Logging

- **Nội dung:**
  - Định nghĩa cơ chế ghi log cho các hoạt động quan trọng (API call, event từ media server, chat message).
- **Yêu Cầu Cụ Thể:**
  - Sử dụng thư viện logging (như Winston hoặc Morgan) để log file lỗi và thông tin hoạt động.
  - Kiểm soát truy cập và nhật nhật nhật dữ liệu việc ghi log.
- **Kiểm Tra:**
  - Kiểm tra file log và đảm bảo log được tạo ra cho các yêu cầu quan trọng.

---

## 7. Giai Đoạn: Tối Ưu Hóa Hệ Thống và Kiến Trúc Microservices

### 7.1. Phân Tách Các Thành Phần

- **Nội dung:**
  - Xem xét tách các chức năng người dùng, livestream, chat và VOD ra thành các service độc lập (microservices) nếu cần mở rộng quy mô.
- **Yêu Cầu Cụ Thể:**
  - Thiết kế giao tiếp giữa các microservices thông qua REST API hoặc message brokers (ví dụ: RabbitMQ).
  - Định nghĩa các contract API giữa các service.
- **Kiểm Tra:**
  - Thực hiện tích hợp service và đảm bảo gọi API giữa các hệ thống không bị lỗi.

### 7.2. Tối Ưu Hóa Hiệu Năng

- **Nội dung:**
  - Áp dụng cache (sử dụng Redis hoặc Memcached) cho các truy vấn lặp đi lặp lại:
    - Danh sách stream, thông tin chi tiết stream hoặc VOD phổ biến.
- **Yêu Cầu Cụ Thể:**
  - Cấu hình cache cho các truy vấn vào DB để giảm tải.
  - Xác định thời gian sống (TTL) hợp lý cho từng loại dữ liệu cache.
- **Kiểm Tra:**
  - Thực hiện test hiệu năng với và không có cache và so sánh tốc độ.

### 7.3. Load Balancing và Auto-Scaling

- **Nội dung:**
  - Đề xuất sử dụng load balancer cho API server và media server khi hệ thống được triển khai lên môi trường cloud.
- **Yêu Cầu Cụ Thể:**
  - Xác định kích thước của từng instance, thiết lập auto-scaling dựa trên hiệu năng và số request.
  - Đánh giá việc phân phối lưu lượng server để tránh single point of failure.
- **Kiểm Tra:**
  - Test với công cụ mô phỏng traffic để đánh giá khả năng mở rộng.

---

## 8. Quy Trình Kiểm Thử và Triển Khai

### 8.1. Kiểm Thử Từng Module

- **Yêu Cầu:**
  - Viết unit tests cho mỗi controller, service và middleware.
  - Tạo các kịch bản tích hợp để test giao tiếp giữa các module (ví dụ: từ controller đến service đến DB).
  - Sử dụng các tool như Jest/Mocha cho Node.js.
- **Kiểm Tra:**
  - Đảm bảo code coverage đạt mức tối thiểu (ví dụ: 80%+).

### 8.2. Test Chức Năng Realtime và Webhook

- **Yêu Cầu:**
  - Test các kết nối Socket.IO: kết nối client, gửi nhận tin nhắn, và xử lý các lỗi kết nối.
  - Test endpoint webhook bằng cách giả lập nhận dữ liệu từ media server với các event khác nhau.
- **Kiểm Tra:**
  - Ghi lại log các event, kiểm tra trạng thái của stream trên DB cập nhật đúng.

### 8.3. Triển Khai và Giám Sát

- **Yêu Cầu:**
  - Triển khai các thay đổi trên môi trường staging để kiểm tra toàn diện.
  - Thiết lập cơ chế giám sát và logging trên environment production:
    - Theo dõi các lỗi, phân tích hiệu năng API và các sự kiện realtime.
- **Kiểm Tra:**
  - Kiểm tra dashboard giám sát, alert email/sms khi xảy ra lỗi.

---

## Kết Luận

Task 3 được chia thành các giai đoạn cụ thể như mở rộng cơ sở dữ liệu, phát triển API livestream, tích hợp webhook, xây dựng chức năng chat realtime và quản lý VOD cùng với các biện pháp bảo mật và tối ưu hệ thống.  
Mỗi bước có các yêu cầu rõ ràng, kiểm tra và các công cụ hỗ trợ nhằm đảm bảo tính ổn định và khả năng mở rộng của hệ thống.

_Lưu ý: Các công việc được đề xuất có thể cần được điều chỉnh dựa trên tình hình thực tế cũng như feedback từ các nhóm liên quan (frontend, DevOps, QA)._
