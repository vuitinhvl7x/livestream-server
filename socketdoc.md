# Tài liệu WebSocket API cho Ứng dụng Livestream

Đây là tài liệu mô tả các sự kiện WebSocket được sử dụng trong ứng dụng.

## 1. Tổng quan và Xác thực

- **Endpoint**: WebSocket kết nối tới máy chủ chính.
- **Xác thực**: Mọi kết nối WebSocket phải được xác thực bằng JWT. Client phải gửi token qua `socket.handshake.auth.token`.
  - **Thất bại**: Nếu token không được cung cấp hoặc không hợp lệ, kết nối sẽ bị từ chối với lỗi `Authentication error`.
  - **Thành công**: Thông tin người dùng được giải mã từ token sẽ được gắn vào đối tượng `socket` (`socket.user`) để sử dụng trong các sự kiện sau này.

---

## 2. Luồng Sự kiện (Events)

### A. Sự kiện Client Gửi Lên (Client → Server)

#### `join_notification_room`

- **Mô tả**: Đăng ký nhận thông báo cá nhân cho người dùng đã đăng nhập. Socket sẽ được tham gia vào một phòng riêng tư có định dạng `notification:<userId>`.
- **Dữ liệu gửi lên (Payload)**: Không cần.
- **Phản hồi từ Server**:
  - `notification_room_joined`: Gửi về khi tham gia phòng thành công.
    - **Payload**: `{ room: string }` (ví dụ: `{ room: 'notification:12345' }`)
  - `notification_room_join_error`: Gửi về nếu có lỗi (ví dụ: người dùng chưa xác thực).
    - **Payload**: `{ message: string }`

#### `join_stream_room`

- **Mô tả**: Cho phép người dùng tham gia vào một phòng xem stream. Hành động này sẽ tăng số lượng người xem của stream.
- **Dữ liệu gửi lên (Payload)**: `{ streamId: string }`
- **Phản hồi từ Server**:
  - `room_joined_successfully`: Gửi về khi tham gia phòng thành công.
    - **Payload**: `{ streamId: string, streamKeyForDev: string }`
  - `room_join_error`: Gửi về nếu có lỗi (stream không tồn tại, stream không "live", streamId không hợp lệ).
    - **Payload**: `{ message: string }`
  - `recent_chat_history`: Gửi lịch sử 20 tin nhắn gần nhất trong phòng chat.
    - **Payload**: `{ streamId: string, messages: Array<Object> }`
  - `viewer_count_updated` (Broadcast): Gửi đến tất cả mọi người trong phòng để cập nhật số người xem.
    - **Payload**: `{ streamId: string, count: number }`

#### `chat_message`

- **Mô tả**: Gửi một tin nhắn trong phòng chat của một stream.
- **Dữ liệu gửi lên (Payload)**: `{ streamId: string, message: string }`
- **Phản hồi từ Server**:
  - `new_message` (Broadcast): Gửi tin nhắn mới đến tất cả mọi người trong phòng.
    - **Payload**: `{ userId: string, username: string, message: string, timestamp: Date, streamId: string }`
  - `message_error`: Gửi về nếu có lỗi (thiếu dữ liệu, người dùng không ở trong phòng).
    - **Payload**: `{ message: string }`

#### `leave_stream_room`

- **Mô tả**: Người dùng rời khỏi phòng xem stream. Hành động này sẽ giảm số lượng người xem.
- **Dữ liệu gửi lên (Payload)**: `{ streamId: string }`
- **Phản hồi từ Server**:
  - `viewer_count_updated` (Broadcast): Gửi đến tất cả mọi người trong phòng để cập nhật số người xem.
    - **Payload**: `{ streamId: string, count: number }`

#### `disconnect`

- **Mô tả**: Sự kiện được kích hoạt tự động khi client mất kết nối. Server sẽ tự động xử lý việc giảm số người xem ở tất cả các phòng stream mà người dùng này đã tham gia.
- **Dữ liệu gửi lên (Payload)**: Không có.
- **Phản hồi từ Server**:
  - `viewer_count_updated` (Broadcast): Gửi đến các phòng liên quan để cập nhật số người xem.
    - **Payload**: `{ streamId: string, count: number }`

---

### B. Sự kiện Server Chủ Động Gửi Xuống (Server → Client)

Các sự kiện này không phải là phản hồi trực tiếp cho một yêu cầu từ client, mà do server chủ động gửi đi khi có một sự kiện hệ thống xảy ra.

#### `stream_ended_notification` (Broadcast)

- **Mô tả**: Được gửi tới tất cả người dùng trong một phòng stream khi stream đó kết thúc (ví dụ: streamer dừng phát). Server sẽ vô hiệu hóa chat và các hoạt động khác.
- **Kích hoạt bởi**: Sự kiện `stream:ended` từ `appEmitter` phía backend.
- **Phòng (Room)**: `<streamId>`
- **Dữ liệu gửi xuống (Payload)**: `{ roomId: string, message: string }`

#### Ngắt kết nối cưỡng bức

- **Mô tả**: Sau khi `stream_ended_notification` được gửi đi, server sẽ chủ động ngắt kết nối (`disconnect`) tất cả các socket trong phòng đó. Điều này sẽ kích hoạt sự kiện `disconnect` trên client.
- **Kích hoạt bởi**: Server sau khi stream kết thúc.
- **Hành động**: `io.in(roomId).disconnectSockets(true);`
