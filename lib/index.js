hexo.extend.console.register('bridge', 'A bridge between hexo and web api', {
  options: [
    {name: '-p, --port', desc: 'Override the default port'},
    {name: '-l, --log [format]', desc: 'Enable logger. Override the logger format.'}
  ]
}, () => {});