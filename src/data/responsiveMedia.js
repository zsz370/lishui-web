// 仅更换显示尺寸；原照片继续保留作为失败回退。
const pair = name => ({ src: '/assets/display/' + name + '-960.webp', srcSet: '/assets/display/' + name + '-640.webp 640w, /assets/display/' + name + '-960.webp 960w' });
export const responsivePhotos = {
  '/nodes/n_tsq.jpg': pair('node-tianshengqiao'),
  '/nodes/n_wx.jpg': pair('node-wuxiang'),
  '/assets/catalog/culture-luoshan-dragon.png': pair('culture-dragon'),
};
const hero = (name, original, width) => ({...pair(name), srcSet: pair(name).srcSet + ', ' + original + ' ' + width + 'w'});
export const responsiveHero = {
  lakeside: hero('hero-lakeside','/assets/images/hero-lakeside.webp',1800),
  wuxiang: hero('hero-wuxiang','/assets/images/hero-wuxiang.webp',1280),
  bridge: hero('hero-tianshengqiao','/assets/images/hero-tianshengqiao.webp',1280),
};
