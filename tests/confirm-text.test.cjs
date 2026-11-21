const { gameSource } = require('../scripts/compose-page.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=gameSource();
function fn(name){const i=html.indexOf('function '+name+'(');assert.ok(i>=0);const b=html.indexOf('{',i);let d=0;for(let j=b;j<html.length;j++){if(html[j]==='{')d++;else if(html[j]==='}'&&!--d)return html.slice(i,j+1);}throw Error(name);}
const c={};vm.runInNewContext(fn('confirmTextParts'),c);
const explanation='Прогресс сохранится в аккаунте. На этом устройстве начнётся новая игра, а войти можно будет в любой аккаунт';
const legacy='Выйти из аккаунта?<br><small style="font-weight:500;color:var(--muted)">'+explanation+'</small>';
test('logout legacy message separates title and complete explanation',()=>{const p=c.confirmTextParts(legacy);assert.equal(p.title,'Выйти из аккаунта?');assert.equal(p.description,explanation);});
test('plain text and angle brackets are not stripped',()=>{for(const text of ['Выйти?', 'Имя <игрока> & данные', '', null]){const p=c.confirmTextParts(text);assert.equal(p.title,text==null?'':text);assert.equal(p.description,'');}});
test('unexpected markup is never interpreted as rich content',()=>{for(const text of ['<img src=x onerror=alert(1)>','Выйти?<br><small onclick="alert(1)">текст</small>','Выйти?<br><small><script>alert(1)</script></small>']){const p=c.confirmTextParts(text);assert.equal(p.title,text);assert.equal(p.description,'');}});
test('actual confirmBox creates separate text nodes and preserves one-shot confirmation',()=>{
  let doc;
  class El {
    constructor(){this.style={};this.attrs={};this.listeners={};this.isConnected=true;}
    setAttribute(k,v){this.attrs[k]=v;}
    set innerHTML(v){this.template=v;this.h=new El();this.y=new El();this.n=new El();this.h.after=e=>{this.description=e;};}
    querySelector(q){return q==='h3'?this.h:q==='[data-a=y]'?this.y:this.n;}
    querySelectorAll(){return [this.y,this.n];}
    addEventListener(k,v){this.listeners[k]=v;}
    focus(){doc.activeElement=this;}
    remove(){this.isConnected=false;if(doc.current===this)doc.current=null;}
  }
  doc={current:null,activeElement:new El(),createElement:()=>new El(),getElementById:()=>doc.current,body:{append:b=>{doc.current=b;}},addEventListener(){},removeEventListener(){}};
  const env={document:doc};vm.runInNewContext(fn('confirmTextParts')+';'+fn('confirmBox'),env);
  let calls=0;env.confirmBox(legacy,'Выйти',()=>calls++);const box=doc.current;
  assert.equal(box.h.textContent,'Выйти из аккаунта?');assert.equal(box.description.textContent,explanation);assert.equal(box.attrs['aria-describedby'],'confirmDescription');assert.ok(!box.template.includes(explanation));assert.equal(box.y.textContent,'Выйти');
  const event={target:{closest:()=>({dataset:{a:'y'}})}};box.listeners.click(event);box.listeners.click(event);assert.equal(calls,1);
  env.confirmBox('<img src=x onerror=alert(1)>','Да',()=>{});assert.equal(doc.current.h.textContent,'<img src=x onerror=alert(1)>');assert.equal(doc.current.description,undefined);assert.ok(!doc.current.template.includes('onerror'));
});
