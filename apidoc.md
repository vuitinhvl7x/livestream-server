    # Tài Liệu API cho Frontend - Trang Dashboard

    Đây là tài liệu chi tiết về các API cần thiết để xây dựng các tính năng trên trang Dashboard.

    ---

    ## 1. Quản lý Người dùng (User)

    ### 1.1 Lấy thông tin cá nhân của tôi

    - **Mục đích:** Lấy thông tin chi tiết của người dùng đang đăng nhập.
    - **Method:** `GET`
    - **URL:** `/api/users/me`
    - **Authentication:** Yêu cầu `Bearer Token`.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "id": 1,
    "username": "my_username",
    "displayName": "My Display Name",
    "avatarUrl": "https://f005.backblazeb2.com/file/your-bucket/users/1/avatars/1678886400000_avatar.jpg?X-Amz-Algorithm=...",
    "avatarUrlExpiresAt": "2024-08-15T10:00:00.000Z",
    "bio": "Đây là bio của tôi.",
    "role": "user",
    "createdAt": "2024-07-15T10:00:00.000Z",
    "updatedAt": "2024-07-16T11:30:00.000Z"
    }
    ```

    **Phản hồi lỗi (401 Unauthorized):**

    ```json
    {
    "error": "Authentication token is required"
    }
    ```

    ---

    ### 1.2 Cập nhật thông tin cá nhân

    - **Mục đích:** Chỉnh sửa thông tin cá nhân của người dùng đang đăng nhập.
    - **Method:** `PUT`
    - **URL:** `/api/users/me/profile`
    - **Authentication:** Yêu cầu `Bearer Token`.
    - **Content-Type:** `multipart/form-data` (vì có thể upload avatar)

    **Dữ liệu gửi lên (form-data):**

    - `displayName` (string, optional): Tên hiển thị mới.
    - `bio` (string, optional): Giới thiệu mới.
    - `avatarFile` (file, optional): File ảnh đại diện mới.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "message": "Profile updated successfully",
    "user": {
        "id": 1,
        "username": "my_username",
        "displayName": "Tên hiển thị mới",
        "avatarUrl": "https://f005.backblazeb2.com/file/your-bucket/users/1/avatars/new_avatar.jpg?...",
        "bio": "Bio mới cập nhật.",
        "role": "user",
        "updatedAt": "2024-07-17T14:00:00.000Z"
    }
    }
    ```

    **Phản hồi lỗi (400 Bad Request):**

    ```json
    {
    "errors": [
        {
        "msg": "Display name must be a string",
        "path": "displayName",
        "location": "body"
        }
    ]
    }
    ```

    ---

    ## 2. Quản lý Stream

    ### 2.1 Tạo mới Stream

    -   **Mục đích:** Tạo một stream mới cho người dùng đang đăng nhập. Stream được tạo với trạng thái mặc định là 'ended'.
    -   **Method:** `POST`
    -   **URL:** `/api/streams`
    -   **Authentication:** Yêu cầu `Bearer Token`.
    -   **Content-Type:** `multipart/form-data`

    **Dữ liệu gửi lên (form-data):**

    -   `title` (string, required): Tiêu đề của stream (3-255 ký tự).
    -   `description` (string, optional): Mô tả chi tiết về stream.
    -   `categoryId` (int, optional): ID của danh mục mà stream thuộc về.
    -   `thumbnailFile` (file, optional): Ảnh thumbnail cho stream.

    **Phản hồi thành công (201 Created):**

    ```json
    {
        "success": true,
        "message": "Stream created successfully",
        "data": {
            "id": 124,
            "userId": 1,
            "streamKey": "some-random-uuid-key",
            "title": "Stream mới của tôi",
            "description": "Mô tả stream mới.",
            "status": "ended",
            "thumbnailUrl": "https://.../new_thumbnail.jpg?...",
            "thumbnailUrlExpiresAt": "2024-08-18T10:00:00.000Z",
            "b2ThumbnailFileId": "some_b2_id",
            "b2ThumbnailFileName": "users/1/stream_thumbnails/...",
            "categoryId": 5,
            "createdAt": "2024-07-18T14:00:00.000Z",
            "updatedAt": "2024-07-18T14:00:00.000Z"
        }
    }
    ```

    **Phản hồi lỗi (400 Bad Request - Validation Error):**

    ```json
    {
        "errors": [
            {
                "type": "field",
                "msg": "Title must be a string between 3 and 255 characters",
                "path": "title",
                "location": "body"
            }
        ]
    }
    ```

    ---

    ### 2.2 Lấy danh sách Stream

    - **Mục đích:** Lấy danh sách các stream, có thể lọc theo nhiều tiêu chí. Đặc biệt, để lấy stream của người dùng hiện tại, sử dụng `userId=[my_user_id]`.
    - **Method:** `GET`
    - **URL:** `/api/streams`
    - **Authentication:** Không yêu cầu.

    **Tham số Query (Query Params):**

    - `page` (int, optional, default: 1): Số trang.
    - `limit` (int, optional, default: 10): Số lượng stream mỗi trang.
    - `status` (string, optional, enum: 'live', 'ended'): Lọc theo trạng thái.
    - `categoryId` (int, optional): Lọc theo ID của danh mục.
    - `userId` (int, optional): Lọc theo ID của người dùng (dùng để lấy stream của "tôi").

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "message": "Streams fetched successfully",
    "totalStreams": 1,
    "totalPages": 1,
    "currentPage": 1,
    "streams": [
        {
        "id": 123,
        "title": "Stream của tôi",
        "description": "Mô tả stream.",
        "status": "ended",
        "startTime": "2024-07-16T10:00:00.000Z",
        "endTime": "2024-07-16T12:00:00.000Z",
        "viewerCount": 150,
        "currentViewerCount": 0,
        "playbackUrls": null,
        "thumbnailUrl": "https://.../thumbnail.jpg?...",
        "user": {
            "id": 1,
            "username": "my_username"
        },
        "category": {
            "id": 5,
            "name": "Gaming",
            "slug": "gaming"
        },
        "createdAt": "2024-07-16T09:55:00.000Z"
        }
    ]
    }
    ```

    ---

    ### 2.2.1 Tìm kiếm Stream

    - **Mục đích:** Tìm kiếm stream theo từ khóa, tag hoặc tên streamer.
    - **Method:** `GET`
    - **URL:** `/api/streams/search`
    - **Authentication:** Không yêu cầu.

    **Tham số Query (Query Params):**

    - `page` (int, optional, default: 1): Số trang.
    - `limit` (int, optional, default: 10): Số lượng stream mỗi trang.
    - `searchQuery` (string, optional): Từ khóa tìm kiếm trong tiêu đề và mô tả.
    - `tag` (string, optional): Tìm kiếm stream theo tag của category.
    - `streamerUsername` (string, optional): Tìm kiếm stream theo tên của streamer.
      (Phải cung cấp ít nhất một trong ba tham số: `searchQuery`, `tag`, `streamerUsername`)

    **Phản hồi thành công (200 OK):**

    ```json
    {
      "success": true,
      "message": "Streams fetched successfully based on search criteria",
      "searchCriteria": {
        "tag": "gaming",
        "query": "hướng dẫn"
      },
      "totalItems": 1,
      "totalPages": 1,
      "currentPage": 1,
      "streams": [
        {
          "id": 123,
          "title": "Hướng dẫn chơi game A",
          "description": "Stream hướng dẫn...",
          "status": "live",
          "currentViewerCount": 150,
          "playbackUrls": {
              "hls": "...",
              "dash": "..."
          },
          "thumbnailUrl": "https://.../thumbnail.jpg?...",
          "user": {
            "id": 1,
            "username": "my_username"
          },
          "category": {
            "id": 5,
            "name": "Gaming",
            "slug": "gaming",
            "tags": ["gaming", "esports"]
          }
        }
      ]
    }
    ```

    **Phản hồi lỗi (400 Bad Request):**

    ```json
    {
      "errors": [
        {
          "type": "query",
          "msg": "At least one search criteria (tag, searchQuery, or streamerUsername) must be provided.",
          "path": "query",
          "location": "query"
        }
      ]
    }
    ```

    ---

    ### 2.3 Lấy chi tiết một Stream

    - **Mục đích:** Lấy thông tin chi tiết của một stream cụ thể bằng ID.
    - **Method:** `GET`
    - **URL:** `/api/streams/:streamId`
    - **Authentication:** Không yêu cầu.

    **Tham số URL (URL Params):**

    - `streamId` (int, required): ID của stream.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "message": "Stream details fetched successfully",
    "stream": {
        "id": 123,
        "title": "Stream của tôi",
        "description": "Mô tả stream.",
        "status": "ended",
        "streamKey": "a1b2c3d4-e5f6-...",
        "user": {
        "id": 1,
        "username": "my_username",
        "displayName": "My Display Name",
        "avatarUrl": "https://.../avatar.jpg?..."
        },
        "category": {
        "id": 5,
        "name": "Gaming",
        "slug": "gaming"
        }
    }
    }
    ```

    ---

    ### 2.4 Cập nhật thông tin Stream

    - **Mục đích:** Cập nhật thông tin cho một stream cụ thể.
    - **Method:** `PUT`
    - **URL:** `/api/streams/:streamId`
    - **Authentication:** Yêu cầu `Bearer Token`. Người dùng phải là chủ sở hữu của stream.
    - **Content-Type:** `multipart/form-data` (nếu có cập nhật thumbnail)

    **Tham số URL (URL Params):**

    - `streamId` (int, required): ID của stream.

    **Dữ liệu gửi lên (form-data):**

    - `title` (string, optional): Tiêu đề mới.
    - `description` (string, optional): Mô tả mới.
    - `categoryId` (int, optional): ID danh mục mới.
    - `thumbnailFile` (file, optional): File ảnh thumbnail mới.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "success": true,
    "message": "Stream updated successfully",
    "data": {
        "id": 123,
        "title": "Tiêu đề stream đã cập nhật",
        "description": "Mô tả mới.",
        "categoryId": 5,
        "thumbnailUrl": "https://.../new_thumbnail.jpg?..."
    }
    }
    ```

    **Phản hồi lỗi (403 Forbidden):**

    ```json
    {
    "error": "Người dùng không có quyền cập nhật stream này"
    }
    ```

    ---

    ### 2.5 Lấy VOD từ Stream

    - **Mục đích:** Lấy thông tin VOD (nếu có) được tạo ra từ một stream cụ thể.
    - **Method:** `GET`
    - **URL:** `/api/streams/:streamId/vod`
    - **Authentication:** Không yêu cầu.

    **Tham số URL (URL Params):**

    - `streamId` (int, required): ID của stream muốn lấy VOD.

    **Phản hồi thành công (200 OK):**

    ```json
    {
        "success": true,
        "message": "VOD details fetched successfully for the stream.",
        "vod": {
            "id": 1,
            "title": "VOD của Stream 123",
            "description": "Nội dung buổi stream...",
            "viewCount": 1024,
            "videoUrl": "https://f005.backblazeb2.com/file/your-bucket/vods/....mp4?...",
            "thumbnailUrl": "https://f005.backblazeb2.com/file/your-bucket/vods/thumbnails/....jpg?...",
            "durationSeconds": 7230,
            "createdAt": "2024-07-21T15:00:00.000Z",
            "streamId": 123,
            "user": {
                "id": 5,
                "username": "streamer_user"
            },
            "category": {
                "id": 3,
                "name": "Art & Drawing",
                "slug": "art-drawing"
            }
        }
    }
    ```

    **Phản hồi lỗi (404 Not Found):**

    ```json
    {
        "error": "No VOD found for this stream."
    }
    ```

    ---

    ## 3. Tính năng Xã hội (Social)

    ### 3.1 Lấy danh sách người theo dõi tôi (Followers)

    - **Mục đích:** Xem ai đang theo dõi một người dùng.
    - **Method:** `GET`
    - **URL:** `/api/users/:userId/followers`
    - **Authentication:** Không yêu cầu.

    **Tham số URL (URL Params):**

    - `userId` (int, required): ID của người dùng muốn xem danh sách follower.

    **Tham số Query (Query Params):**

    - `page` (int, optional, default: 1): Số trang.
    - `limit` (int, optional, default: 10): Số lượng mỗi trang.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "followers": [
        {
        "id": 2,
        "username": "follower_user_1",
        "avatarUrl": "https://.../avatar2.jpg?..."
        },
        {
        "id": 3,
        "username": "follower_user_2",
        "avatarUrl": "https://.../avatar3.jpg?..."
        }
    ],
    "totalItems": 25,
    "totalPages": 3,
    "currentPage": 1
    }
    ```

    ---

    ### 3.2 Lấy danh sách người tôi đang theo dõi (Following)

    - **Mục đích:** Xem một người dùng đang theo dõi những ai.
    - **Method:** `GET`
    - **URL:** `/api/users/:userId/following`
    - **Authentication:** Không yêu cầu.

    **Tham số URL (URL Params):**

    - `userId` (int, required): ID của người dùng.

    **Tham số Query (Query Params):**

    - `page` (int, optional, default: 1): Số trang.
    - `limit` (int, optional, default: 10): Số lượng mỗi trang.

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "following": [
        {
        "id": 10,
        "username": "streamer_1",
        "avatarUrl": "https://.../streamer1.jpg?..."
        },
        {
        "id": 11,
        "username": "streamer_2",
        "avatarUrl": "https://.../streamer2.jpg?..."
        }
    ],
    "totalItems": 15,
    "totalPages": 2,
    "currentPage": 1
    }
    ```

    ---

    ### 3.3 Theo dõi một người dùng

    - **Mục đích:** Người dùng đang đăng nhập bắt đầu theo dõi một người dùng khác.
    - **Method:** `POST`
    - **URL:** `/api/users/:userId/follow`
    - **Authentication:** Yêu cầu `Bearer Token`.

    **Tham số URL (URL Params):**

    - `userId` (int, required): ID của người dùng muốn theo dõi.

    **Phản hồi thành công (201_CREATED):**

    ```json
    {
        "success": true,
        "message": "User followed successfully.",
        "data": {
            "id": 15,
            "followerId": 1,
            "followingId": 10,
            "createdAt": "2024-07-23T10:00:00.000Z",
            "updatedAt": "2024-07-23T10:00:00.000Z"
        }
    }
    ```

    **Phản hồi lỗi (409 Conflict):**

    ```json
    {
        "success": false,
        "message": "You are already following this user."
    }
    ```

    ---

    ### 3.4 Bỏ theo dõi một người dùng

    - **Mục đích:** Người dùng đang đăng nhập ngừng theo dõi một người dùng khác.
    - **Method:** `DELETE`
    - **URL:** `/api/users/:userId/unfollow`
    - **Authentication:** Yêu cầu `Bearer Token`.

    **Tham số URL (URL Params):**

    - `userId` (int, required): ID của người dùng muốn bỏ theo dõi.

    **Phản hồi thành công (200 OK):**

    ```json
    {
        "success": true,
        "message": "User unfollowed successfully."
    }
    ```

    **Phản hồi lỗi (404 Not Found):**

    ```json
    {
        "success": false,
        "message": "You are not following this user."
    }
    ```

    ---

    ### 3.5 Lấy thông tin công khai của người dùng

    - **Mục đích:** Lấy thông tin công khai của một người dùng bằng username.
    - **Method:** `GET`
    - **URL:** `/api/users/profile/:username`
    - **Authentication:** Không yêu cầu.

    **Tham số URL (URL Params):**

    - `username` (string, required): Username của người dùng.

    **Phản hồi thành công (200 OK):**

    ```json
    {
        "id": 10,
        "username": "streamer_1",
        "displayName": "Streamer Pro",
        "avatarUrl": "https://.../streamer1.jpg?...",
        "bio": "Bio của streamer chuyên nghiệp.",
        "createdAt": "2024-07-10T09:00:00.000Z",
        "followersCount": 150,
        "followingCount": 25
    }
    ```

    ---

    ## 4. Trung tâm Thông báo (Notifications)

    ### 4.1 Lấy danh sách thông báo

    - **Mục đích:** Lấy danh sách thông báo cho người dùng đang đăng nhập.
    - **Method:** `GET`
    - **URL:** `/api/notifications`
    - **Authentication:** Yêu cầu `Bearer Token`.

    **Tham số Query (Query Params):**

    - `page` (int, optional, default: 1): Số trang.
    - `limit` (int, optional, default: 10): Số lượng mỗi trang.
    - `isRead` (boolean, optional): Lọc theo trạng thái đã đọc (`true` hoặc `false`).

    **Phản hồi thành công (200 OK):**

    ```json
    {
    "notifications": [
        {
        "id": 1,
        "userId": 1,
        "type": "new_follower",
        "message": "follower_user_1 started following you.",
        "relatedEntityId": 2,
        "relatedEntityType": "user",
        "isRead": false,
        "createdAt": "2024-07-17T12:00:00.000Z",
        "updatedAt": "2024-07-17T12:00:00.000Z"
        },
        {
        "id": 2,
        "userId": 1,
        "type": "stream_started",
        "message": "streamer_1 has started a new stream: Let's Play!",
        "relatedEntityId": 124,
        "relatedEntityType": "stream",
        "isRead": true,
        "createdAt": "2024-07-16T18:00:00.000Z",
        "updatedAt": "2024-07-16T18:30:00.000Z"
        }
    ],
    "totalItems": 20,
    "totalPages": 2,
    "currentPage": 1
    }
    ```

    ---

    ### 4.2 Đánh dấu một thông báo là đã đọc

    -   **Mục đích:** Đánh dấu một thông báo cụ thể là đã đọc.
    -   **Method:** `POST`
    -   **URL:** `/api/notifications/:notificationId/read`
    -   **Authentication:** Yêu cầu `Bearer Token`.

    **Tham số URL (URL Params):**

    -   `notificationId` (int, required): ID của thông báo cần đánh dấu.

    **Phản hồi thành công (200 OK):**

    ```json
    {
        "success": true,
        "message": "Notification marked as read",
        "notification": {
            "id": 1,
            "userId": 1,
            "type": "new_follower",
            "message": "follower_user_1 started following you.",
            "relatedEntityId": 2,
            "relatedEntityType": "user",
            "isRead": true,
            "createdAt": "2024-07-17T12:00:00.000Z",
            "updatedAt": "2024-07-18T10:00:00.000Z"
        }
    }
    ```

    **Phản hồi lỗi (404 Not Found):**

    ```json
    {
        "error": "Notification not found or not owned by user"
    }
    ```

    ---

    ### 4.3 Đánh dấu tất cả thông báo là đã đọc

    -   **Mục đích:** Đánh dấu tất cả thông báo chưa đọc của người dùng thành đã đọc.
    -   **Method:** `POST`
    -   **URL:** `/api/notifications/read-all`
    -   **Authentication:** Yêu cầu `Bearer Token`.

    **Phản hồi thành công (200 OK):**

    ```json
    {
        "success": true,
        "message": "All notifications marked as read",
        "affectedCount": 5
    }
    ```

---

## 5. Quản lý VOD (Video on Demand)

### 5.1 Lấy danh sách VOD

- **Mục đích:** Lấy danh sách các VOD, có thể lọc theo nhiều tiêu chí.
- **Method:** `GET`
- **URL:** `/api/vod`
- **Authentication:** Không yêu cầu.

**Tham số Query (Query Params):**

- `page` (int, optional, default: 1): Số trang.
- `limit` (int, optional, default: 10): Số lượng VOD mỗi trang.
- `userId` (int, optional): Lọc theo ID của người dùng (dùng để lấy VOD của một người dùng cụ thể).
- `categoryId` (int, optional): Lọc theo ID của danh mục.
- `streamId` (int, optional): Lọc các VOD được tạo từ một stream cụ thể.

**Phản hồi thành công (200 OK):**

```json
{
  "vods": [
    {
      "id": 1,
      "title": "VOD buổi stream hôm qua",
      "description": "Nội dung buổi stream...",
      "viewCount": 1024,
      "videoUrl": "https://f005.backblazeb2.com/file/your-bucket/vods/....mp4?X-Amz-Algorithm=...",
      "thumbnailUrl": "https://f005.backblazeb2.com/file/your-bucket/vods/thumbnails/....jpg?...",
      "thumbnailUrlExpiresAt": "2024-08-22T10:00:00.000Z",
      "durationSeconds": 7230,
      "createdAt": "2024-07-21T15:00:00.000Z",
      "userId": 5,
      "categoryId": 3,
      "user": {
        "id": 5,
        "username": "streamer_user"
      },
      "category": {
        "id": 3,
        "name": "Art & Drawing",
        "slug": "art-drawing"
      }
    }
  ],
  "totalItems": 15,
  "totalPages": 2,
  "currentPage": 1
}
```

---

### 5.2 Tìm kiếm VOD

- **Mục đích:** Tìm kiếm VOD theo từ khóa, tag hoặc tên người đăng.
- **Method:** `GET`
- **URL:** `/api/vod/search`
- **Authentication:** Không yêu cầu.

**Tham số Query (Query Params):**

- `page` (int, optional, default: 1): Số trang.
- `limit` (int, optional, default: 10): Số lượng VOD mỗi trang.
- `searchQuery` (string, optional): Từ khóa tìm kiếm trong tiêu đề và mô tả.
- `tag` (string, optional): Tìm kiếm VOD theo tag của category.
- `uploaderUsername` (string, optional): Tìm kiếm VOD theo tên người đăng.
  (Phải cung cấp ít nhất một trong ba tham số: `searchQuery`, `tag`, `uploaderUsername`)

**Phản hồi thành công (200 OK):**

```json
{
  "vods": [
    {
      "id": 2,
      "title": "Hướng dẫn vẽ Chibi",
      "viewCount": 500,
      "videoUrl": "https://.../chibi-video.mp4?...",
      "thumbnailUrl": "https://.../chibi-thumb.jpg?...",
      "durationSeconds": 1800,
      "createdAt": "2024-07-20T10:00:00.000Z",
      "user": {
        "id": 5,
        "username": "streamer_user"
      },
      "category": {
        "id": 3,
        "name": "Art & Drawing",
        "slug": "art-drawing"
      }
    }
  ],
  "totalItems": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

**Phản hồi lỗi (400 Bad Request):**

```json
{
  "errors": [
    {
      "type": "query",
      "msg": "At least one search criteria (tag, searchQuery, or uploaderUsername) must be provided.",
      "path": "query",
      "location": "query"
    }
  ]
}
```

---

### 5.3 Lấy chi tiết một VOD

- **Mục đích:** Lấy thông tin chi tiết của một VOD cụ thể bằng ID. Lượt xem sẽ được tăng sau khi gọi API này (có cơ chế cooldown).
- **Method:** `GET`
- **URL:** `/api/vod/:id`
- **Authentication:** Không yêu cầu.

**Tham số URL (URL Params):**

- `id` (int, required): ID của VOD.

**Phản hồi thành công (200 OK):**

```json
{
  "id": 1,
  "title": "VOD buổi stream hôm qua",
  "description": "Nội dung buổi stream...",
  "videoUrl": "https://.../video.mp4?...",
  "urlExpiresAt": "2024-08-22T18:00:00.000Z",
  "b2FileId": "...",
  "b2FileName": "vods/...",
  "durationSeconds": 7230,
  "viewCount": 1025,
  "thumbnailUrl": "https://.../thumbnail.jpg?...",
  "thumbnailUrlExpiresAt": "2024-08-22T18:00:00.000Z",
  "b2ThumbnailFileId": "...",
  "b2ThumbnailFileName": "vods/thumbnails/...",
  "categoryId": 3,
  "createdAt": "2024-07-21T15:00:00.000Z",
  "user": {
    "id": 5,
    "username": "streamer_user"
  },
  "stream": {
    "id": 45,
    "title": "Stream tối qua",
    "streamKey": "..."
  },
  "category": {
    "id": 3,
    "name": "Art & Drawing",
    "slug": "art-drawing"
  }
}
```

**Phản hồi lỗi (404 Not Found):**

```json
{
  "error": "VOD không tìm thấy."
}
```

---

### 5.4 Upload VOD từ máy tính

- **Mục đích:** Tạo một VOD mới bằng cách upload file video từ máy tính của người dùng.
- **Method:** `POST`
- **URL:** `/api/vod/upload-local`
- **Authentication:** Yêu cầu `Bearer Token`.
- **Content-Type:** `multipart/form-data`

**Dữ liệu gửi lên (form-data):**

- `title` (string, required): Tiêu đề của VOD (3-255 ký tự).
- `description` (string, optional): Mô tả chi tiết.
- `categoryId` (int, optional): ID của danh mục.
- `videoFile` (file, required): File video.
- `thumbnailFile` (file, optional): File ảnh thumbnail. Nếu không cung cấp, thumbnail sẽ được tự động tạo từ video.

**Phản hồi thành công (201 Created):**

```json
{
  "message": "VOD uploaded and created successfully.",
  "vod": {
    "id": 10,
    "userId": 1,
    "title": "VOD mới của tôi",
    "description": "Đây là VOD tôi vừa upload.",
    "videoUrl": "https://.../uploaded_video.mp4?...",
    "urlExpiresAt": "2024-08-22T20:00:00.000Z",
    "b2FileId": "...",
    "b2FileName": "users/1/vods/...",
    "durationSeconds": 300,
    "thumbnailUrl": "https://.../uploaded_thumb.jpg?...",
    "thumbnailUrlExpiresAt": "2024-08-22T20:00:00.000Z",
    "b2ThumbnailFileId": "...",
    "b2ThumbnailFileName": "users/1/vods/thumbnails/...",
    "categoryId": 3,
    "createdAt": "2024-07-22T13:00:00.000Z",
    "viewCount": 0
  }
}
```

**Phản hồi lỗi (400 Bad Request):**

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Tiêu đề VOD không được để trống.",
      "path": "title",
      "location": "body"
    }
  ]
}
```

---

### 5.5 Xóa một VOD

- **Mục đích:** Xóa một VOD. Người dùng phải là chủ sở hữu VOD hoặc là admin.
- **Method:** `DELETE`
- **URL:** `/api/vod/:id`
- **Authentication:** Yêu cầu `Bearer Token`.

**Tham số URL (URL Params):**

- `id` (int, required): ID của VOD cần xóa.

**Phản hồi thành công (200 OK):**

```json
{
  "message": "VOD đã được xóa thành công."
}
```

**Phản hồi lỗi (403 Forbidden):**

```json
{
  "error": "Bạn không có quyền xóa VOD này."
}
```

**Phản hồi lỗi (404 Not Found):**

```json
{
  "error": "VOD không tìm thấy để xóa."
}
```

---

### 5.6 Làm mới URL xem VOD (Dành cho chủ sở hữu / Admin)

- **Mục đích:** Làm mới pre-signed URL cho một VOD. URL xem VOD có thời hạn, API này dùng để lấy URL mới.
- **Method:** `POST`
- **URL:** `/api/vod/:id/refresh-url`
- **Authentication:** Yêu cầu `Bearer Token`.

**Tham số URL (URL Params):**

- `id` (int, required): ID của VOD cần làm mới URL.

**Phản hồi thành công (200 OK):**

```json
{
  "id": 1,
  "videoUrl": "https://.../video.mp4?X-Amz-Algorithm=...&X-Amz-Expires=604800...",
  "urlExpiresAt": "2024-08-29T10:00:00.000Z"
}
```

**Phản hồi lỗi (404 Not Found):**

```json
{
  "error": "VOD không tìm thấy."
}
```

---

### 5.7 Upload VOD thủ công (Dành cho Admin)

- **Mục đích:** Admin tạo một bản ghi VOD mới cho một file video đã tồn tại trên B2 storage.
- **Method:** `POST`
- **URL:** `/api/vod/upload`
- **Authentication:** Yêu cầu `Bearer Token` của Admin.

**Dữ liệu gửi lên (JSON body):**

- `title` (string, required): Tiêu đề VOD.
- `description` (string, optional): Mô tả.
- `videoUrl` (string, required): Pre-signed URL của file video trên B2.
- `urlExpiresAt` (string, required): Thời gian hết hạn của `videoUrl` (định dạng ISO 8601).
- `b2FileId` (string, required): ID của file trên B2.
- `b2FileName` (string, required): Tên file trên B2.
- `durationSeconds` (int, required): Thời lượng video (giây).
- `userId` (int, required): ID của người dùng sở hữu VOD này.
- `categoryId` (int, optional): ID của danh mục.
- `thumbnailUrl` (string, optional): URL thumbnail (nếu có).
- `thumbnailUrlExpiresAt` (string, optional): Thời gian hết hạn của `thumbnailUrl`.
- `b2ThumbnailFileId` (string, optional): ID file thumbnail trên B2.
- `b2ThumbnailFileName` (string, optional): Tên file thumbnail trên B2.

**Phản hồi thành công (201 Created):**

```json
{
  "message": "VOD created successfully by admin.",
  "vod": {
    "id": 11,
    "userId": 5,
    "title": "VOD do Admin upload",
    "videoUrl": "https://.../video.mp4?...",
    "urlExpiresAt": "...",
    "viewCount": 0
  }
}
```

**Phản hồi lỗi (403 Forbidden):**

```json
{
  "error": "Admin access required"
}
```

### 5.8 Cập nhật thông tin VOD

- **Mục đích:** Cập nhật thông tin chi tiết cho một VOD (tiêu đề, mô tả, category).
- **Method:** `PUT`
- **URL:** `/api/vod/:id`
- **Authentication:** Yêu cầu `Bearer Token` (phải là chủ sở hữu hoặc admin).
- **Content-Type:** `multipart/form-data`

**Tham số URL (URL Params):**

- `id` (int, required): ID của VOD cần cập nhật.

**Dữ liệu gửi lên (form-data):**

- `title` (string, optional): Tiêu đề mới.
- `description` (string, optional): Mô tả mới.
- `categoryId` (int, optional): ID danh mục mới.
- `thumbnailFile` (file, optional): Ảnh thumbnail mới.

**Phản hồi thành công (200 OK):**

```json
{
  "success": true,
  "message": "VOD updated successfully.",
  "data": {
    "id": 1,
    "title": "Tiêu đề VOD đã cập nhật",
    "description": "Mô tả mới cho VOD.",
    "categoryId": 4,
    "thumbnailUrl": "https://.../new-vod-thumb.jpg?..."
  }
}
```

**Phản hồi lỗi (403 Forbidden):**

```json
{
  "error": "Bạn không có quyền cập nhật VOD này."
}
```

---

## 6. Quản lý Danh mục (Category)

_Các API này thường yêu cầu quyền Admin._

### 6.1 Lấy tất cả danh mục

- **Mục đích:** Lấy danh sách tất cả các danh mục có sẵn trong hệ thống.
- **Method:** `GET`
- **URL:** `/api/categories`
- **Authentication:** Không yêu cầu.

**Phản hồi thành công (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Gaming",
      "slug": "gaming",
      "tags": ["esports", "moba", "fps"],
      "thumbnailUrl": "https://.../gaming.jpg"
    },
    {
      "id": 2,
      "name": "Just Chatting",
      "slug": "just-chatting",
      "tags": ["talkshow", "q&a"],
      "thumbnailUrl": "https://.../chatting.jpg"
    }
  ]
}
```

---

### 6.2 Tạo danh mục mới (Admin)

- **Mục đích:** Tạo một danh mục mới.
- **Method:** `POST`
- **URL:** `/api/categories`
- **Authentication:** Yêu cầu `Bearer Token` của Admin.
- **Content-Type:** `multipart/form-data`

**Dữ liệu gửi lên (form-data):**

- `name` (string, required): Tên danh mục.
- `tags` (string, optional): Các tag, cách nhau bởi dấu phẩy (ví dụ: "tag1,tag2,tag3").
- `thumbnailFile` (file, optional): Ảnh thumbnail cho danh mục.

**Phản hồi thành công (201 Created):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 3,
    "name": "Music",
    "slug": "music",
    "tags": ["lofi", "live music"],
    "thumbnailUrl": "https://.../new-music-thumb.jpg"
  }
}
```

---

### 6.3 Cập nhật danh mục (Admin)

- **Mục đích:** Cập nhật thông tin một danh mục.
- **Method:** `PUT`
- **URL:** `/api/categories/:id`
- **Authentication:** Yêu cầu `Bearer Token` của Admin.
- **Content-Type:** `multipart/form-data`

**Tham số URL (URL Params):**

- `id` (int, required): ID của danh mục.

**Dữ liệu gửi lên (form-data):**

- `name` (string, optional): Tên mới.
- `tags` (string, optional): Chuỗi tag mới.
- `thumbnailFile` (file, optional): File thumbnail mới.

**Phản hồi thành công (200 OK):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": 3,
    "name": "Live Music",
    "slug": "live-music",
    "tags": ["lofi", "live music", "acoustic"],
    "thumbnailUrl": "https://.../updated-music-thumb.jpg"
  }
}
```

---

### 6.4 Xóa danh mục (Admin)

- **Mục đích:** Xóa một danh mục.
- **Method:** `DELETE`
- **URL:** `/api/categories/:id`
- **Authentication:** Yêu cầu `Bearer Token` của Admin.

**Phản hồi thành công (200 OK):**

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## 7. Chat trong Stream

### 7.1 Lấy tin nhắn chat của Stream

- **Mục đích:** Lấy lịch sử tin nhắn của một stream.
- **Method:** `GET`
- **URL:** `/api/chat/:streamId`
- **Authentication:** Không yêu cầu.

**Tham số URL (URL Params):**

- `streamId` (int, required): ID của stream.

**Phản hồi thành công (200 OK):**

```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "content": "Chào mọi người!",
      "timestamp": "2024-07-23T11:00:00.000Z",
      "user": {
        "id": 2,
        "username": "viewer1",
        "displayName": "Viewer Một"
      }
    },
    {
      "id": 2,
      "content": "Stream hay quá <3",
      "timestamp": "2024-07-23T11:01:30.000Z",
      "user": {
        "id": 3,
        "username": "fan_cung",
        "displayName": "Fan Cứng"
      }
    }
  ]
}
```

### 7.2 Gửi tin nhắn chat

- **Mục đích:** Gửi một tin nhắn mới vào kênh chat của stream.
- **Method:** `POST`
- **URL:** `/api/chat/:streamId`
- **Authentication:** Yêu cầu `Bearer Token`.

**Tham số URL (URL Params):**

- `streamId` (int, required): ID của stream.

**Dữ liệu gửi lên (JSON body):**

- `content` (string, required): Nội dung tin nhắn.

**Phản hồi thành công (201 Created):**

_Server sẽ không trả về body, tin nhắn mới sẽ được broadcast qua WebSocket._

**Phản hồi lỗi (400 Bad Request):**

```json
{
  "error": "Nội dung tin nhắn không được để trống."
}
```

---

## 8. Webhooks (Dành cho Developer)

### 8.1 LiveKit Webhook

- **Mục đích:** Nhận sự kiện từ LiveKit (ví dụ: stream bắt đầu, kết thúc, người xem tham gia/rời đi).
- **Method:** `POST`
- **URL:** `/api/webhooks/livekit`
- **Body:** `Livekit-Webhook-Event`
- **Ghi chú:** Đây là endpoint nội bộ, được gọi bởi LiveKit.

### 8.2 Backblaze B2 Webhook

- **Mục đích:** Nhận sự kiện từ Backblaze B2 (ví dụ: file upload thành công).
- **Method:** `POST`
- **URL:** `/api/webhooks/backblaze`
- **Body:** `JSON` (theo định dạng của B2)
- **Ghi chú:** Endpoint này dùng để tự động tạo VOD sau khi file stream được ghi lại và upload lên B2.
