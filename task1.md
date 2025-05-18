# Backend Task 1: Thiết lập môi trường và xây dựng API cơ bản với ES6 Modules, Controller-Service, và Validation

## Mục tiêu

Thiết lập môi trường phát triển cho backend, xây dựng các API cơ bản cho chức năng đăng ký và đăng nhập người dùng, và thiết lập migration cho cơ sở dữ liệu.

## Bước 1: Thiết lập môi trường phát triển

1. **Cài đặt Node.js và npm:**

   - Tải và cài đặt Node.js từ [nodejs.org](https://nodejs.org/).
   - Kiểm tra cài đặt bằng lệnh:
     ```bash
     node -v
     npm -v
     ```

2. **Khởi tạo dự án Node.js:**

   - Tạo một thư mục mới cho dự án backend.
   - Khởi tạo dự án Node.js:
     ```bash
     mkdir backend
     cd backend
     npm init -y
     ```

3. **Cấu hình ES6 Modules:**

   - Thêm `"type": "module"` vào `package.json`:
     ```json
     {
       "name": "backend",
       "version": "1.0.0",
       "main": "src/index.js",
       "type": "module",
       "scripts": {
         "start": "node src/index.js"
       },
       "dependencies": {}
     }
     ```

4. **Cài đặt Express.js và các thư viện cần thiết:**

   - Cài đặt Express.js và các thư viện:
     ```bash
     npm install express body-parser cors dotenv bcrypt express-validator
     ```

5. **Thiết lập cấu trúc thư mục:**

   - Tạo các thư mục cần thiết:
     ```bash
     mkdir src
     mkdir src/controllers
     mkdir src/services
     mkdir src/models
     mkdir src/routes
     mkdir src/config
     mkdir src/migrations
     ```

6. **Cài đặt Sequelize ORM và CLI:**

   - Cài đặt Sequelize, CLI và driver PostgreSQL:
     ```bash
     npm install sequelize sequelize-cli pg pg-hstore
     ```

7. **Cấu hình Sequelize:**
   - Khởi tạo Sequelize:
     ```bash
     npx sequelize-cli init
     ```
   - Cấu hình kết nối cơ sở dữ liệu trong `config/config.json`:
     ```json
     {
       "development": {
         "username": "your_username",
         "password": "your_password",
         "database": "livestream",
         "host": "127.0.0.1",
         "dialect": "postgres"
       }
     }
     ```

## Bước 2: Tạo Migration và Model cho User

1. **Tạo migration cho User:**

   - Tạo migration:
     ```bash
     npx sequelize-cli migration:generate --name create-user
     ```
   - Chỉnh sửa file migration trong `migrations`:
     ```javascript
     export default {
       up: async (queryInterface, Sequelize) => {
         await queryInterface.createTable("Users", {
           id: {
             allowNull: false,
             autoIncrement: true,
             primaryKey: true,
             type: Sequelize.INTEGER,
           },
           username: {
             type: Sequelize.STRING,
             allowNull: false,
             unique: true,
           },
           password: {
             type: Sequelize.STRING,
             allowNull: false,
           },
           createdAt: {
             allowNull: false,
             type: Sequelize.DATE,
           },
           updatedAt: {
             allowNull: false,
             type: Sequelize.DATE,
           },
         });
       },
       down: async (queryInterface, Sequelize) => {
         await queryInterface.dropTable("Users");
       },
     };
     ```

2. **Tạo model User:**

   - Tạo file `src/models/user.js`:

     ```javascript
     import { DataTypes } from "sequelize";
     import sequelize from "../config/database.js";

     const User = sequelize.define("User", {
       username: {
         type: DataTypes.STRING,
         allowNull: false,
         unique: true,
       },
       password: {
         type: DataTypes.STRING,
         allowNull: false,
       },
     });

     export default User;
     ```

3. **Chạy migration:**
   - Chạy lệnh để thực hiện migration:
     ```bash
     npx sequelize-cli db:migrate
     ```

## Bước 3: Xây dựng API đăng ký và đăng nhập

1. **Tạo service cho User:**

   - Tạo file `src/services/userService.js`:

     ```javascript
     import User from "../models/user.js";
     import bcrypt from "bcrypt";

     export const registerUser = async (username, password) => {
       const hashedPassword = await bcrypt.hash(password, 10);
       return User.create({ username, password: hashedPassword });
     };

     export const loginUser = async (username, password) => {
       const user = await User.findOne({ where: { username } });
       if (!user) {
         throw new Error("User not found");
       }
       const isPasswordValid = await bcrypt.compare(password, user.password);
       if (!isPasswordValid) {
         throw new Error("Invalid password");
       }
       return user;
     };
     ```

2. **Tạo controller cho User:**

   - Tạo file `src/controllers/userController.js`:

     ```javascript
     import { registerUser, loginUser } from "../services/userService.js";
     import { validationResult } from "express-validator";

     export const register = async (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }

       try {
         const { username, password } = req.body;
         const user = await registerUser(username, password);
         res
           .status(201)
           .json({ message: "User registered successfully", user });
       } catch (error) {
         res.status(500).json({ error: error.message });
       }
     };

     export const login = async (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }

       try {
         const { username, password } = req.body;
         const user = await loginUser(username, password);
         res.status(200).json({ message: "Login successful", user });
       } catch (error) {
         res.status(500).json({ error: error.message });
       }
     };
     ```

3. **Tạo route cho User với validation:**

   - Tạo file `src/routes/userRoutes.js`:

     ```javascript
     import express from "express";
     import { register, login } from "../controllers/userController.js";
     import { body } from "express-validator";

     const router = express.Router();

     const validateUser = [
       body("username")
         .isString()
         .notEmpty()
         .withMessage("Username is required"),
       body("password")
         .isString()
         .isLength({ min: 6 })
         .withMessage("Password must be at least 6 characters long"),
     ];

     router.post("/register", validateUser, register);
     router.post("/login", validateUser, login);

     export default router;
     ```

4. **Thiết lập server Express:**

   - Tạo file `src/index.js`:

     ```javascript
     import express from "express";
     import bodyParser from "body-parser";
     import cors from "cors";
     import sequelize from "./config/database.js";
     import userRoutes from "./routes/userRoutes.js";

     const app = express();
     app.use(cors());
     app.use(bodyParser.json());

     app.use("/api/users", userRoutes);

     const PORT = process.env.PORT || 5000;

     sequelize
       .sync()
       .then(() => {
         app.listen(PORT, () => {
           console.log(`Server is running on port ${PORT}`);
         });
       })
       .catch((error) => {
         console.error("Unable to connect to the database:", error);
       });
     ```

5. **Chạy server:**
   - Chạy server:
     ```bash
     npm start
     ```

## Kiểm thử

- Sử dụng Postman hoặc một công cụ tương tự để kiểm thử các API:
  - **Đăng ký:** POST `/api/users/register` với body `{ "username": "testuser", "password": "testpass" }`
  - **Đăng nhập:** POST `/api/users/login` với body `{ "username": "testuser", "password": "testpass" }`

## Ghi chú

- Đảm bảo rằng PostgreSQL đang chạy và bạn đã cấu hình đúng thông tin kết nối trong `config/config.json`.
- Sử dụng `.env` file để lưu trữ các biến môi trường như thông tin kết nối cơ sở dữ liệu và secret keys.
