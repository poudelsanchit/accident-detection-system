import "dotenv/config"
import express from "express"
import cors from "cors"
import authRouter from "./routes/auth"
import organizationRouter from "./routes/organization"
import { authMiddleware } from "./middleware/authMiddleware"

const app = express()

// CORS configuration
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Test endpoint to verify body parsing
app.post("/test-body", (req, res) => {
  res.json({ received: req.body })
})

app.get("/", (req, res) => {
  res.send("Hello World")
})

app.use("/api/auth", authRouter)
app.use("/api/organization", authMiddleware, organizationRouter)
app.listen(3000, () => {
  console.log("Server is running on port 3000")
})