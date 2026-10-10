const http = require("node:http");
const os = require("node:os");

const port = process.env.PORT || 3000;
const name = process.env.STUDENT_NAME || "anonymous";

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`สวัสดีจาก container ${os.hostname()} 👋 (by ${name})\n`);
  })
  .listen(port, () => console.log(`listening on :${port}`));
