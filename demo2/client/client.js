(function () {
  const SESSION_KEY = 'realtime_login'
  const SOCKET_URL = 'ws://127.0.0.1:3004'
  const ROUTES = {
    CHAT: '/chat',
    NEWS: '/news'
  }

  // 生成用户id
  function generateUserId () {
    return Date.now() + '' + Math.floor(Math.random() * 899 + 100)
  }

  /**
   *. 转义html(防XSS攻击)
   *. @param str 字符串
   */
  function escapeHTML (str) {
    return str.replace(
      /[&<>'"]/g,
      tag =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '\'': '&#39;',
          '"': '&quot;'
        }[tag] || tag)
    )
  }

  const app = new Vue({
    el: '#app',
    data () {
      return {
        userId: '',
        userName: '',
        inputUserName: '',
        inputText: '',
        onlineUsers: {},
        onlineCount: 0,
        screenHeight: 0,
        msgBoxHeight: 0,
        msgContent: '',
        hasLogin: false,
        showLogin: true,
        socket: null,
      }
    },
    methods: {
      // 初始化
      init () {
        this.$nextTick(() => {
          this.queryElements()
          this.scrollToBottom()
        })
        // 连接websocket后端服务器
        this.socket = io.connect(`${SOCKET_URL}${ROUTES.CHAT}`, { transports: ['websocket', 'xhr-polling', 'jsonp-polling'] })
        // 告诉服务器端有用户登录
        this.socket.emit('login', { userId: this.userId, userName: this.userName })
        // 监听新用户登录
        this.socket.on('login', (o) => {
          console.log('[new user login]: ', o)
          this.updateSysMsg(o, 'login')
        })
        // 监听用户退出
        this.socket.on('logout', (o) => {
          console.log('[one user logout]: ', o)
          this.updateSysMsg(o, 'logout')
        })
        // 监听消息发送
        this.socket.on('message', (o) => {
          console.log('[new MSG]: ', o)
          this.updateSysMsg(o, 'message')
        })
      },
      // 用户登录，提交用户名、id
      doLogin (loginUserId, loginUserName) {
        /**
         * 客户端根据时间和随机数生成uid,这样使得聊天室用户名称可以重复。
         * 实际项目中，如果是需要用户登录，那么直接采用用户的uid来做标识就可以
         */
        this.userId = loginUserId || generateUserId()
        this.userName = loginUserName || this.inputUserName
        this.hasLogin = !!this.userId
        if (this.userName !== '') {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: this.userId, userName: this.userName }))
          this.init()
        }
      },
      doLogout () {
        // 告诉服务器端退出聊天室
        this.socket.emit('logout', { userId: this.userId, userName: this.userName })
        this.socket.disconnect()
        sessionStorage.removeItem(SESSION_KEY)
        this.reset()
        this.checkIsLogin()
        //location.reload()
      },
      doSubmit () {
        if (this.inputText !== '') {
          this.socket.emit('message', {
            userId: this.userId,
            userName: this.userName,
            content: escapeHTML(this.inputText)
          })
          this.inputText = ''
        }
      },
      reset () {
        this.userId = ''
        this.userName = ''
        this.msgContent = ''
      },
      //更新系统消息，在用户加入、退出的时候调用
      updateSysMsg: function (o, action) {
        const { onlineUsers, onlineCount, user, userId, userName, content } = o
        let sectionDiv = ''
        if (action === 'message') {
          const isMe = userId === this.userId
          if (isMe) {
            sectionDiv = `<section class="user"><span>${userName}</span><div>${content}</div></section>`
          } else {
            sectionDiv = `<section class="service"><div>${content}</div><span>${userName}</span></section>`
          }
        } else {
          // 更新在线人数
          this.onlineUsers = onlineUsers
          this.onlineCount = onlineCount
          // 添加系统消息
          sectionDiv = `<section class="system J-mjrlinkWrap J-cutMsg"><div class="msg-system">${user.userName}${action === 'login' ? '加入了聊天室' : '退出了聊天室'}</div></section>`
        }
        this.msgContent += sectionDiv
        this.scrollToBottom()
      },
      // 浏览器滚动条保持在低部
      scrollToBottom: function () {
        const $msgBox = this.$refs.msgBox
        $msgBox.scrollTo({
          top: $msgBox.scrollHeight + this.inputBoxHeight,
          behavior: 'smooth'
        })
      },
      queryElements () {
        this.screenHeight = window.innerHeight
        const $chatTop = this.$refs.$chatTop
        const $inputBox = this.$refs.inputBox
        this.chatTopHeight = $chatTop && $chatTop.clientHeight || 0
        this.inputBoxHeight = $inputBox && $inputBox.clientHeight || 0
        this.msgBoxHeight = this.screenHeight - this.inputBoxHeight - this.chatTopHeight
      },
      checkIsLogin () {
        const loginCache = JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}
        const { userId, userName } = loginCache
        this.hasLogin = !!userId
        if (userId) {
          this.doLogin(userId, userName)
        }
      },
    },
    mounted () {
      this.checkIsLogin()
    }
  })
})()
