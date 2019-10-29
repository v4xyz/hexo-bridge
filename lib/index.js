
hexo.extend.console.register('bridge', 'A bridge to access hexo via web api', {
  options: [
    {name: '-p, --port', desc: 'Override the default port'},
    {name: '-l, --log [format]', desc: 'Enable logger. Override the logger format.'}
  ]
}, require('./server').bind({hexo: hexo}));
