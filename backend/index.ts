import "dotenv/config"
import express from "express"
import cors from "cors"
import authRouter from "./routes/auth"
const app = express()
app.use(cors())
app.use(express.json())
app.get("/", (req, res) => {
  res.send("Hello World")
})
app.use("/api/auth", authRouter)

app.listen(3000, () => {
  console.log("Server is running on port 3000")
})