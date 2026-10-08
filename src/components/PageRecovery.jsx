import { Component, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function NotFound() {
  return <section className="experience-empty"><h1>没有找到这一页</h1><p>链接可能已变化，可以回到首页或继续发现溧水。</p><Link className="experience-button" to="/">回到首页</Link><Link className="experience-text-button" to="/nodes">发现溧水</Link></section>;
}
function Recovery() {
  const heading=useRef(null);
  useEffect(()=>{heading.current?.focus();},[]);
  return <section className="experience-empty" role="alert"><h1 ref={heading} tabIndex={-1}>这一页暂时没有打开</h1><p>请检查网络后重新加载，也可以先回到首页。</p><button type="button" className="experience-button" onClick={()=>window.location.reload()}>重新加载此页</button><Link className="experience-text-button" to="/">回到首页</Link></section>;
}
class Boundary extends Component {
  state={failed:false,route:this.props.route};
  static getDerivedStateFromError(){return{failed:true};}
  static getDerivedStateFromProps(props,state){return props.route!==state.route?{failed:false,route:props.route}:null;}
  render(){return this.state.failed?<Recovery/>:this.props.children;}
}
export default function PageRecovery({children}) {
  const location=useLocation();
  return <Boundary route={location.pathname}>{children}</Boundary>;
}
