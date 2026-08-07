(function(){
  'use strict';
  if(window.FootballLegacyControllerUI)return;

  const FOCUSABLE='button:not([disabled]),a[href],input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[role="button"],[tabindex]:not([tabindex="-1"])';
  const padStates=new Map();
  let current=null,controllerMode=false,lastScope=null,hintTimer=0;

  const visible=el=>{
    if(!el||!el.isConnected)return false;
    const style=getComputedStyle(el),rect=el.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>1&&rect.height>1;
  };
  const openOverlay=()=>{
    const selectors=['.fullPage.open','[role="dialog"][open]','[role="dialog"].open','[role="dialog"].show','.modal.open','.modal.show','#ftime'];
    const found=[];selectors.forEach(selector=>document.querySelectorAll(selector).forEach(el=>{if(visible(el))found.push(el);}));
    return found.length?found[found.length-1]:null;
  };
  const activeScope=()=>{
    const overlay=openOverlay();if(overlay)return overlay;
    if(document.querySelector('#c'))return null;
    return document.body;
  };
  const focusables=scope=>scope?[...scope.querySelectorAll(FOCUSABLE)].filter(el=>visible(el)&&!el.closest('[aria-hidden="true"]')&&!el.hasAttribute('data-controller-ignore')):[];
  const clearFocus=()=>{if(current)current.removeAttribute('data-controller-focus');current=null;};
  const setFocus=(el,announce=true)=>{
    if(!el||!visible(el))return false;if(current&&current!==el)current.removeAttribute('data-controller-focus');current=el;controllerMode=true;document.body.classList.add('controller-navigation');el.setAttribute('data-controller-focus','true');
    try{el.focus({preventScroll:true});}catch(e){el.focus();}el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});if(announce)showHint();return true;
  };
  const defaultFocus=scope=>{
    const list=focusables(scope);if(!list.length){clearFocus();return null;}
    const preferred=list.find(el=>el.matches('[data-controller-default],.primary,[autofocus]'))||list.find(el=>el.matches('input:checked,.selected,[aria-selected="true"]'))||list[0];setFocus(preferred,false);return preferred;
  };
  const ensureFocus=()=>{
    const scope=activeScope();if(scope!==lastScope){lastScope=scope;clearFocus();}
    if(!scope)return null;const list=focusables(scope);if(!current||!list.includes(current))return defaultFocus(scope);return current;
  };
  const fireChange=el=>{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
  const adjustControl=(el,direction)=>{
    if(!el)return false;
    if(el.tagName==='SELECT'&&(direction==='left'||direction==='right')){const step=direction==='right'?1:-1,next=Math.max(0,Math.min(el.options.length-1,el.selectedIndex+step));if(next!==el.selectedIndex){el.selectedIndex=next;fireChange(el);}return true;}
    if(el.matches('input[type="range"],input[type="number"]')&&(direction==='left'||direction==='right')){direction==='right'?el.stepUp():el.stepDown();fireChange(el);return true;}
    return false;
  };
  const navigate=direction=>{
    const scope=activeScope();if(!scope)return;const list=focusables(scope);if(!list.length)return;const from=ensureFocus();if(!from){defaultFocus(scope);return;}if(adjustControl(from,direction)){showHint();return;}
    const a=from.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2,horizontal=direction==='left'||direction==='right',sign=direction==='right'||direction==='down'?1:-1;
    let best=null,bestScore=Infinity;
    for(const el of list){if(el===from)continue;const r=el.getBoundingClientRect(),bx=r.left+r.width/2,by=r.top+r.height/2,primary=(horizontal?bx-ax:by-ay)*sign;if(primary<=4)continue;const cross=Math.abs(horizontal?by-ay:bx-ax),overlap=horizontal?Math.max(0,Math.min(a.bottom,r.bottom)-Math.max(a.top,r.top)):Math.max(0,Math.min(a.right,r.right)-Math.max(a.left,r.left)),score=primary+cross*(overlap>0?.32:1.75);if(score<bestScore){bestScore=score;best=el;}}
    if(!best){const index=list.indexOf(from),delta=sign>0?1:-1;best=list[(index+delta+list.length)%list.length];}
    setFocus(best);
  };
  const activate=()=>{
    const el=ensureFocus();if(!el)return;
    if(el.tagName==='SELECT'){if(el.options.length){el.selectedIndex=(el.selectedIndex+1)%el.options.length;fireChange(el);}showHint('Cross cycles this option · Left/Right also changes it');return;}
    if(el.matches('input[type="checkbox"],input[type="radio"]'))el.click();
    else if(el.matches('input,textarea')){el.focus();showHint('Use the keyboard to enter text · Circle returns');}
    else el.click();
  };
  const back=()=>{
    const scope=activeScope();if(!scope)return;const list=focusables(scope),patterns=[/back/i,/cancel/i,/close/i,/resume/i,/return/i,/exit/i];let target=null;
    for(const pattern of patterns){target=list.find(el=>pattern.test((el.textContent||el.getAttribute('aria-label')||el.id||'').trim()));if(target)break;}
    if(target){setFocus(target,false);target.click();return;}
    if(scope!==document.body){scope.dispatchEvent(new CustomEvent('controllerback',{bubbles:true}));return;}
    if(history.length>1)history.back();
  };
  const showHint=message=>{
    let hint=document.getElementById('controllerUiHint');if(!hint){hint=document.createElement('div');hint.id='controllerUiHint';hint.setAttribute('aria-live','polite');document.body.appendChild(hint);}
    hint.textContent=message||'D-pad / Left stick · Navigate    × · Select    ○ · Back';hint.classList.add('show');clearTimeout(hintTimer);hintTimer=setTimeout(()=>hint.classList.remove('show'),4200);
  };
  const pressed=(gp,index,threshold=.5)=>!!(gp.buttons&&gp.buttons[index]&&(gp.buttons[index].pressed||gp.buttons[index].value>threshold));
  const directionFor=gp=>{if(pressed(gp,12))return'up';if(pressed(gp,13))return'down';if(pressed(gp,14))return'left';if(pressed(gp,15))return'right';const x=gp.axes&&gp.axes.length>1?gp.axes[0]:0,y=gp.axes&&gp.axes.length>1?gp.axes[1]:0;if(Math.abs(x)>.66||Math.abs(y)>.66)return Math.abs(x)>Math.abs(y)?(x>0?'right':'left'):(y>0?'down':'up');return null;};
  const poll=now=>{
    let pads=[];try{pads=typeof navigator.getGamepads==='function'?[...(navigator.getGamepads()||[])].filter(Boolean):[];}catch(e){}
    for(const gp of pads){let state=padStates.get(gp.index);if(!state){state={buttons:[],direction:null,nextMove:0};padStates.set(gp.index,state);}
      const scope=activeScope(),uiActive=!!scope;if(uiActive){const cross=pressed(gp,0),circle=pressed(gp,1);if(cross&&!state.buttons[0]){controllerMode=true;ensureFocus();activate();}if(circle&&!state.buttons[1]){controllerMode=true;back();}
        const direction=directionFor(gp);if(direction!==state.direction){state.direction=direction;if(direction){controllerMode=true;ensureFocus();navigate(direction);state.nextMove=now+310;}}else if(direction&&now>=state.nextMove){navigate(direction);state.nextMove=now+135;}
      }else state.direction=null;
      for(const i of [0,1,12,13,14,15])state.buttons[i]=pressed(gp,i);
    }
    requestAnimationFrame(poll);
  };
  const style=document.createElement('style');style.textContent=`
    body.controller-navigation [data-controller-focus="true"]{outline:4px solid #ff9a3d!important;outline-offset:3px!important;box-shadow:0 0 0 7px rgba(232,120,36,.24),0 12px 32px rgba(0,0,0,.34)!important;position:relative;z-index:2}
    #controllerUiHint{position:fixed;right:16px;bottom:16px;z-index:99999;max-width:calc(100% - 32px);padding:9px 13px;border:1px solid rgba(232,120,36,.65);border-left:4px solid #e87824;background:rgba(3,16,31,.95);color:#f7f1e7;font:800 11px/1.35 Arial,sans-serif;letter-spacing:.07em;text-transform:uppercase;opacity:0;transform:translateY(8px);pointer-events:none;transition:.16s}#controllerUiHint.show{opacity:1;transform:none}`;document.head.appendChild(style);
  addEventListener('gamepadconnected',()=>{controllerMode=true;ensureFocus();showHint('Controller connected · D-pad / Left stick to navigate');});
  addEventListener('pointerdown',()=>{controllerMode=false;document.body.classList.remove('controller-navigation');clearFocus();},{passive:true});
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape'].includes(e.key)){controllerMode=false;document.body.classList.remove('controller-navigation');}});
  window.FootballLegacyControllerUI={focus:()=>ensureFocus(),navigate,activate,back};requestAnimationFrame(poll);
})();
