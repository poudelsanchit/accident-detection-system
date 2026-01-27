import "dotenv/config"
import express from "express"
import cors from "cors"
import authRouter from "./routes/auth"
import organizationRouter from "./routes/organization"
import { authMiddleware } from "./middleware/authMiddleware"
import invitationRouter from "./routes/invitation"
import { WebSocket } from "ws"
import { WebSocketServer } from "ws"
import { number } from "zod"
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use("/api/auth", authRouter)
app.use("/api/organization", authMiddleware, organizationRouter)
app.use("/api/invitation", authMiddleware, invitationRouter)
const httpServer=app.listen(3000, () => {
  console.log("Server is running on port 3000")
})
const wss=new WebSocketServer({ server:httpServer })
enum UserRole{
  DRIVER="DRIVER",
  ADMIN="ADMIN",
  VIEWER="VIEWER",
}
interface Viewer{
  organizationId:string,
  ws:WebSocket,
  name:string,
}
interface Driver{
  organizationId:string
  ws:WebSocket
  name:string,
}
interface Driver{
  organizationId:string
  ws:WebSocket
}
let viewers:Viewer[]=[]
let drivers=[]  
wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data, isBinary) {
    wss.clients.forEach(function each(client) {
      const parsedData=JSON.parse(data.toString())
      if(parsedData.type==="join:viewer"){
        viewers.push({
          organizationId:parsedData.organizationId,
          ws:ws,
          name:parsedData.name,
        })
      }
      if(parsedData.type==="join:driver"){
        drivers.push({
          organizationId:parsedData.organizationId,
          ws:ws,
          name:parsedData.name,
        })
      }
      if(parsedData.type==="driver:data"){
        //send the data to all viewers in the organization
        viewers.forEach(viewer=>{
          if(viewer.organizationId===parsedData.organizationId){
            viewer.ws.send(JSON.stringify({
              type:"driver:data",
              data:parsedData.data,
            }))
          }
        })
      }
      
      // if (client.readyState === WebSocket.OPEN) {
      //   client.send(data, { binary: isBinary });
      // }
    });
  });

  ws.send('Hello! Message From Server!!');
});