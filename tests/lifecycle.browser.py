from pathlib import Path
import argparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('html');args=parser.parse_args()
html=Path(args.html).read_text();assert 'window.FIREBASE = null;' in html;assert 'window.__pgEval' not in html
pos=html.rfind('})();');assert pos>=0;html=html[:pos]+'window.__pgEval = expression => eval(expression);\n'+html[pos:]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');errors=[];blocked=[]
 def route(r):
  if r.request.url=='https://puzzlegrad.test/':r.fulfill(status=200,content_type='text/html',body=html)
  else:blocked.append(r.request.url);r.abort()
 c.route('**/*',route);c.add_init_script("window.WEBAPP=true;window.WEB_VERSION='test';localStorage.setItem('wallet',JSON.stringify({gold:100,owned:['classic'],fig:'classic',color:'#ef5350',name:'Тест',tut:true,tutAsked:true,notifAt:Date.now(),notifThanked:true,installHinted:true,paid:[],sound:false}));")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('https://puzzlegrad.test/');page.wait_for_function('typeof __pgEval==="function"')
 page.evaluate("document.querySelector('#boot')?.remove();document.querySelectorAll('.over').forEach(x=>{if(x.id!=='over')x.remove()})")
 ev=lambda x:page.evaluate('(x)=>__pgEval(x)',x)
 cfg="({seats:[{name:'Тест',human:true,col:'#ef5350'},{name:'Друг',human:true,col:'#26a69a'}],rules:{...setup.rules,timer:0},deck:['rS','cap','cap'],seed:7,noIntro:true})"
 ev(f"show('game');startGame({cfg});true");page.wait_for_function("__pgEval(\"phase==='handover'||phase==='place'\")");ev("if(phase==='handover')$('#go').click();true")
 gid=ev('gameLog.cfg.localId');assert gid and ev('!!loadSave()')
 ev("const p=allMoves(current.type)[0];selectSlot(p.x,p.y);setRot(p.r);okBtn.onclick();true");page.wait_for_function("__pgEval(\"phase==='meeple'||applied===1\")");ev('if(meepleResolve)meepleResolve(null);true');page.wait_for_function("__pgEval('applied===1')")
 assert ev("gameLog.moves.length===1 && tiles.size===2")
 page.reload();page.wait_for_function('typeof __pgEval==="function"');assert ev('!!loadSave()');ev("autoResume();true");page.wait_for_function("__pgEval('applied===1 && tiles.size===2')");assert ev('gameLog.cfg.localId')==gid
 ev("Promise.all([endGame('draw'),endGame('draw')])");assert ev("phase==='end' && loadSave()===null && gameFinished(gameKey())");assert len(ev("JSON.parse(localStorage.getItem('gameHistory'))"))==1
 page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");assert page.locator('#scr-menu').evaluate('(e)=>!e.hidden')
 ev("window.__calls=0;confirmBox('Проверка','Да',()=>window.__calls++);confirmBox('Повтор','Да',()=>window.__calls+=100);true");assert page.locator('#confirmBox').count()==1;page.locator('#confirmBox [data-a=y]').click();assert page.evaluate('window.__calls')==100
 assert not errors,errors;print(f'PASS Chromium {b.version}: active replay, terminal guard, background route, dialog; errors=0; blocked={len(blocked)}');b.close()
