import { Faker, vi } from "@faker-js/faker";
import fs from "fs";
import path from "path";

const faker = new Faker({ locale: vi });

const numUsers = 1200;
const filePath = path.resolve("./users.csv");
let csvContent = "username,message_content\n";

for (let i = 1; i <= numUsers; i++) {
  const username = `viewer_${String(i).padStart(4, "0")}`; // viewer_0001, viewer_0002...
  const messageContent = faker.lorem.sentence(5); // 5 từ ngẫu nhiên Tiếng Việt
  // Escape double quotes in message content for CSV format
  const escapedMessage = messageContent.replace(/"/g, '""');
  csvContent += `${username},"${escapedMessage}"\n`;
}

fs.writeFileSync(filePath, csvContent, "utf8");
console.log(`Generated ${numUsers} users in ${filePath}`);
