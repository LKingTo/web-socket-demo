const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http, { cors: true })

const CONFIG = {
  PORT: 3004
}

app.get('/', (req, res, next) => {
  res.send('<h1>Welcome Realtime Server</h1>')
})

// 在线用户
const onlineUsers = {}
// 当前在线人数
let onlineCount = 0
// 路由分组
const ROUTES = {
  CHAT: '/chat',
  NEWS: '/news'
}

const chat = io.of(ROUTES.CHAT)  // 指定聊天路由路径
chat.on('connection', (socket) => {
  console.log('[a user connected]: ')

  // 监听用户新加入
  socket.on('login', (obj) => {
    console.log('[a user login]: ', obj)
    socket.userId = obj.userId

    // 加入在线列表
    if (!onlineUsers.hasOwnProperty(obj.userId)) {
      onlineUsers[obj.userId] = obj.userName
      onlineCount++
    }
    // 向所有客户端广播有新用户加入
    chat.emit('login', { onlineUsers: onlineUsers, onlineCount: onlineCount, user: obj })
    console.log(`${obj.userName}加入了聊天室`)
  })
  // 监听用户退出
  socket.on('logout', () => {
    const { userId } = socket
    if (onlineUsers.hasOwnProperty(userId)) {
      const obj = { userId, userName: onlineUsers[userId] }
      delete onlineUsers[userId]
      onlineCount--
      // 向所有客户端广播有用户退出
      io.emit('logout', { onlineUsers: onlineUsers, onlineCount: onlineCount, user: obj })
      console.log(`${obj.userName}退出了聊天室`)
    }
  })
  // 监听新消息发布
  socket.on('message', (obj) => {
    // 向所有客户端发布新消息
    chat.emit('message', obj)
    console.log(`${obj.userName}说：${obj.content}`)
  })

  socket.on('disconnect', () => {
    // io断开连接事件
  })
})

http.listen(CONFIG.PORT, () => {
  console.log(`127.0.0.1:${CONFIG.PORT}`)
})
