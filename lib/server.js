
const path = require('path');
const Koa = require('koa');
const Router = require('@koa/router');
const cors = require('@koa/cors');
const logger = require('koa-logger');
const koaBody = require('koa-body');
const yfm = require('yaml-front-matter');

/**
 * 生成随机文件名
 * @return {[type]} [description]
 */
const getFileName = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = String(date.getTime()).slice(-8, -3); // 保证每秒生成一个唯一id, 一天最多生成86400个

  return `${ dateStr }${ randomStr }`;
}

/**
 * 响应报文格式化
 * @return {[type]} [description]
 */
const resParser = async (ctx, next) => {
  await next();

  if (ctx.body.data) {
    Object.assign(ctx.body, {
      code: 0
    })
  } else {
    Object.assign(ctx.body, {
      code: ctx.body.code || -1,
    });
  }
}

module.exports = function (args, callback) {
  const { hexo } = this;
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
  // 响应报文处理
  app.use(resParser);

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
    // 按创建时间倒序返回, Date进行算术运算时调用valueOf()结果后计算, eg: new Date('Jan 1, 1970, 00:00:00.001 GMT') * 3 --> 3
    const posts = hexo.model('Post').toJSON().sort((a, b) => (new Date(b.date) - new Date(a.date)));
    const params = ctx.request.body;
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
      data: restlt.slice(validPage * limit, (validPage + 1) * limit),
      total,
    }
  });

  // 文章详情
  router.get('/post/detail/:postId', async (ctx, next) => {
    const post = hexo.model('Post').get(ctx.params.postId);
    
    if (post) {
      try {
        ctx.body = {
          data: yfm.loadFront(post.raw)
        };
      } catch (e) {
        ctx.body = {
          code: 'ERR-002',
          msg: e.message,
        }
      }
    } else {      
      ctx.body = {
        code: 'ERR-001',
        msg: '指定id文章不存在',
      };
    }
  });

  // 更新文档内容
  router.get('/post/update/:postId', async (ctx, next) => {

    const params = ctx.request.body;
    
    ctx.body = ctx.params;

  });  

  router.post('/post/add', async (ctx, next) => {
    const posts = hexo.model('Post').toJSON();
    const params = ctx.request.body;
    
    ctx.body = await hexo.post.create({
      ...params,
      path: getFileName(),
    }).then(res => {

      return {
        data: res,
      }
    })
  });

  // 标签列表
  router.post('/tag/list', (ctx, next) => {
    // 按创建时间倒序返回, Date进行算术运算时调用valueOf()结果后计算, eg: new Date('Jan 1, 1970, 00:00:00.001 GMT') * 3 --> 3
    const restlt = hexo.model('Tag').toJSON()// .sort((a, b) => (new Date(b.date) - new Date(a.date)));
    const params = ctx.request.body;
    const {
      title = '',
      layout = '',
      source = '',
      page = 1,
      limit = 10,
    } = params;
    const total = restlt.length;
    const validPage = page < 1 ? 0 : (page > Math.floor(total/limit) ? Math.floor(total/limit) : page - 1);

    ctx.body = {
      data: restlt.slice(validPage * limit, (validPage + 1) * limit),
      total,
    }
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