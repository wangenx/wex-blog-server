const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')

const session = require('koa-generic-session')
const redisStore = require('koa-redis')
const path = require('path')
const fs = require('fs')
const morgan = require('koa-morgan')

const cors = require('koa2-cors')

const index = require('./routes/index')
const blog = require('./routes/blog')
const user = require('./routes/user')

const { REDIS_CONF } = require('./conf/db')


// 记录日志
const ENV = process.env.NODE_ENV;
if(ENV !== 'production') {
  // 开发环境
  app.use(morgan('dev'));
}else {
  // 线上环境
  const logFileName = path.join(__dirname, 'logs', 'access.log');
  const writeStream = fs.createWriteStream(logFileName, {
    flags: 'a'
  })
  app.use(morgan('combined', {
    stream: writeStream
  }))
}


// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))

// 跨域设置 
// app.use(convert(cors));
// app.use(async (ctx, next) => {
//   ctx.set('Access-Control-Allow-Origin', '*');
//   await next();
// });
app.use(cors({
  origin: function (ctx) {
    if (ctx.url === '/test') {
        return "*"; // 允许来自所有域名请求
    }
    return 'http://localhost:8001'; // 这样就能只允许 http://localhost:8080 这个域名的请求了
  },
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 5,
  credentials: true,
  allowMethods: ['GET', 'POST', 'DELETE', "PUT", "OPTIONS"],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(async (ctx, next)=> {
// ctx.set('Access-Control-Allow-Origin', 'http://localhost:8001');
// ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
// ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
// ctx.set('Access-Control-Allow-Credentials', true);
  if (ctx.method == 'OPTIONS') {
    ctx.body = 200; 
  } else {
    await next();
  }
});

app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// session 配置
app.keys = ['&jsd_4555%#']
app.use(session({
  // 配置cookie
    cookie: {
      path: '/',
      httpOnly: true,
      overwrite: true,
      rolling: true,
      maxAge: 4 * 60 * 1000,
    },
  // 配置 redis
  store: redisStore({
    // all: '127.0.0.1:6379'  // 先写死本地的 redis
    all:`${REDIS_CONF.host}:${REDIS_CONF.port}`
  })
}))

// routes
app.use(index.routes(), index.allowedMethods())
app.use(blog.routes(), blog.allowedMethods())
app.use(user.routes(), user.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
