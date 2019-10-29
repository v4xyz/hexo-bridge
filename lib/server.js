
const path = require('path');
const Koa = require('koa');
const Router = require('@koa/router')
const logger = require('koa-logger');
const koaBody = require('koa-body');

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
    const Post = hexo.model('Post');

    ctx.body = {
      total: Post.count(),
      list: Post.toArray()
    };
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