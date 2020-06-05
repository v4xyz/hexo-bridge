
const path = require('path');
const Koa = require('koa');
const Router = require('@koa/router');
const cors = require('@koa/cors');
const logger = require('koa-logger');
const koaBody = require('koa-body');

const getFileName = () => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = String(date.getTime()).slice(-4)

  return `${ dateStr }${ randomStr }`
}

module.exports = function (args, callback) {
  const { hexo } = this
  const { config, log } = hexo;
  const app = new Koa();
  const router = new Router();  
  // console.log(config)

  // 日志中间件
  app.use(logger());
  // 请求报文解析
  app.use(koaBody());
  // 允许跨域
  app.use(cors({
    credentials: true
  }));  

  const defaultConfig = Object.assign({}, {
    port: 5000
  });

  let port = parseInt(args.p || args.port || defaultConfig.port, 10) || 5000;

  // If the port setting is invalid, set to the default port 4000
  if (port > 65535 || port < 1){
    port = defaultConfig.port;
  }

  if (port === config.port){
    return callback(new Error(`Port ${port} is already used by Hexo server. Please assign another port for hexo bridge.`));
  }

  router.get('/', (ctx, next) => {
    const posts = hexo.model('Post');

    ctx.body = {
      list: posts.toJSON(),
      total: posts.count,
    }
  });

  router.post('/post/list', (ctx, next) => {
    const posts = hexo.model('Post').toJSON();
    const params = JSON.parse(ctx.request.body);
    const {
      title = '',
      layout = '',
      source = '',
      page = 1,
      limit = 10,
    } = params;
    const restlt = posts
      .filter(post => {
        // 按title查找
        return (post.title || '').includes(title);
      })
      .filter(post => {
        // 按layout查找
        return (post.layout || '').includes(layout);
      })
      .filter(post => {
        // 按source查找
        return (post.source || '').includes(source);
      })
      const total = restlt.length;
      const validPage = page < 1 ? 0 : (page > Math.floor(total/limit) ? Math.floor(total/limit) : page - 1);

    ctx.body = {
      list:  restlt.slice(validPage * limit, (validPage + 1) * limit),
      total,
    }
  });

  router.post('/post/add', async (ctx, next) => {
    const posts = hexo.model('Post').toJSON();
    const params = JSON.parse(ctx.request.body);
    
    ctx.body = await hexo.post.create({
      ...params,
      path: getFileName(),
    }).then(res => {

      return {
        ...res,
        msg: 'ok'
      }
    })
  });

  // start hexo-bridge server
  hexo.on('server', () => {
    app.use(router.routes())
      .listen(port, () => {
        console.log('hexo bridge server start on port:', port);
      });    
  });

  // Start hexo server
  hexo.call('server', {}, err => {
    if (err) return callback(err);
  });
  // console.log(args, callback)
  
};