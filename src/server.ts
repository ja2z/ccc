import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import embedRouter from "./routes/embed";

if (!process.env.JWT_CLIENT_ID || !process.env.JWT_SECRET) {
  console.error("ERROR: JWT_CLIENT_ID and JWT_SECRET must be set in environment");
  process.exit(1);
}

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use("/api", embedRouter);

const publicPath = path.join(__dirname, "..", "src", "public");
app.use(express.static(publicPath));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Commerce Control Center running at http://localhost:${port}`);
});
