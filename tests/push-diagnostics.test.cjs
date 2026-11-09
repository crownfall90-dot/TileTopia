const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const source='app/src/main/java/com/crownfall/mosaic/PushDiagnostics.java';
const hasJavac = (() => {
  try { return cp.spawnSync('javac', ['-version']).status === 0; } catch (_) { return false; }
})();
test('actual Java diagnostics: success, failure, disable, stale completion, synchronous error, offline configuration', {skip: !hasJavac && 'javac is not installed'}, ()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'push-diagnostics-'));
 const sources={
 'android/content/Context.java':`package android.content; public class Context { public static final int MODE_PRIVATE=0; private final SharedPreferences p=new SharedPreferences(); public Context getApplicationContext(){return this;} public SharedPreferences getSharedPreferences(String n,int m){return p;} }`,
 'android/content/SharedPreferences.java':`package android.content; import java.util.*; public class SharedPreferences { final Map<String,Object> m=new HashMap<>(); public long getLong(String k,long d){return (Long)m.getOrDefault(k,d);} public boolean getBoolean(String k,boolean d){return (Boolean)m.getOrDefault(k,d);} public String getString(String k,String d){return (String)m.getOrDefault(k,d);} public Editor edit(){return new Editor();} public class Editor { final Map<String,Object> changes=new HashMap<>(); public Editor putLong(String k,long v){changes.put(k,v);return this;} public Editor putBoolean(String k,boolean v){changes.put(k,v);return this;} public Editor putString(String k,String v){changes.put(k,v);return this;} public void apply(){m.putAll(changes);} } }`,
 'com/google/android/gms/tasks/Task.java':`package com.google.android.gms.tasks; import java.util.function.Consumer; public class Task<T> { Consumer<Task<T>> callback; boolean ok; public Task<T> addOnCompleteListener(Consumer<Task<T>> c){callback=c;return this;} public boolean isSuccessful(){return ok;} public void finish(boolean success){ok=success;callback.accept(this);} }`,
 'com/google/firebase/FirebaseApp.java':`package com.google.firebase; import java.util.*; import android.content.Context; public class FirebaseApp { public static boolean ready=true; public static List<Object> getApps(Context c){return ready?Collections.singletonList(new Object()):Collections.emptyList();} }`,
 'com/google/firebase/messaging/FirebaseMessaging.java':`package com.google.firebase.messaging; import java.util.*; import com.google.android.gms.tasks.Task; public class FirebaseMessaging { public static final FirebaseMessaging INSTANCE=new FirebaseMessaging(); public static FirebaseMessaging getInstance(){return INSTANCE;} public final List<Task<Void>> tasks=new ArrayList<>(); public final List<String> operations=new ArrayList<>(); public boolean throwNext; public Task<Void> subscribeToTopic(String t){return add("+"+t);} public Task<Void> unsubscribeFromTopic(String t){return add("-"+t);} Task<Void> add(String op){if(throwNext){throwNext=false;throw new IllegalStateException("sensitive exception message");} Task<Void> t=new Task<>(); tasks.add(t);operations.add(op);return t;} }`,
 'com/crownfall/mosaic/BuildConfig.java':`package com.crownfall.mosaic; public class BuildConfig { public static final String PUSH_TOPIC="updates-github"; }`,
 'com/crownfall/mosaic/PushService.java':`package com.crownfall.mosaic; public class PushService { static final String NEWS_TOPIC="news"; }`,
 'com/crownfall/mosaic/Harness.java':`package com.crownfall.mosaic; import android.content.*; import com.google.firebase.FirebaseApp; import com.google.firebase.messaging.FirebaseMessaging; public class Harness { static void check(boolean v){if(!v)throw new AssertionError();} public static void main(String[] args){ Context c=new Context(); SharedPreferences p=c.getSharedPreferences("push_diagnostics",0); FirebaseMessaging f=FirebaseMessaging.INSTANCE; PushDiagnostics.setEnabled(c,true); check(f.operations.toString().equals("[+updates-github, +news]")); check(p.getString("updates-github.state","").equals("pending")); f.tasks.get(0).finish(true); f.tasks.get(1).finish(false); check(p.getString("updates-github.state","").equals("success")); check(p.getString("news.error","").equals("task_failed")); PushDiagnostics.setEnabled(c,true); int old=f.tasks.size()-2; PushDiagnostics.setEnabled(c,false); int latest=f.tasks.size()-2; check(f.operations.get(latest).equals("-updates-github")); f.tasks.get(old).finish(true); check(p.getString("updates-github.state","").equals("pending")); check(!p.getBoolean("updates-github.enabled",true)); f.tasks.get(latest).finish(true); check(p.getString("updates-github.state","").equals("success")); f.throwNext=true; PushDiagnostics.setEnabled(c,true); check(p.getString("updates-github.error","").equals("request_failed")); check(p.getString("news.state","").equals("pending")); int count=f.tasks.size(); FirebaseApp.ready=false; PushDiagnostics.setEnabled(c,false); check(f.tasks.size()==count); check(!p.getBoolean("configured",true)); check(!p.getBoolean("desiredEnabled",true)); } }`
 };
 try {
  for(const [name,text] of Object.entries(sources)){const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
  const actual=path.join(dir,'com/crownfall/mosaic/PushDiagnostics.java');fs.copyFileSync(source,actual);
  let r=cp.spawnSync('javac',['-d',dir,...Object.keys(sources).map(n=>path.join(dir,n)),actual],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);
  r=cp.spawnSync('java',['-cp',dir,'com.crownfall.mosaic.Harness'],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('production subscription path uses diagnostics without persisting tokens (source check)',()=>{
 const service=fs.readFileSync('app/src/main/java/com/crownfall/mosaic/PushService.java','utf8');
 const s=fs.readFileSync(source,'utf8');
 assert.ok(service.includes('PushDiagnostics.setEnabled(c, on)'));
 assert.ok(!s.includes('getToken('));
 assert.ok(!s.includes('getMessage('));
});
