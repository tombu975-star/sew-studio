# End-to-end check of the Academy against a running app + Postgres (see docs/ACADEMY.md, "Testing").
# Needs: app on localhost:3000, a platform admin admin@test.com / Strong-pass-123, and psql on PATH.
import requests, hashlib, subprocess, json, uuid, sys
B="http://localhost:3000"
def psql(q):
    return subprocess.run(["psql","postgres://postgres:pw@127.0.0.1:5432/sew","-At","-c",q],capture_output=True,text=True).stdout.strip()
ok=0
def check(name, cond, extra=""):
    global ok
    print(("PASS " if cond else "FAIL ")+name, extra if not cond else "")
    ok += 0 if cond else 1
def adopt(sess, r):
    jar = dict(p.split("=",1) for p in sess.headers.get("Cookie","").split("; ") if "=" in p)
    for c in r.cookies: jar[c.name]=c.value
    sess.cookies.clear(); sess.headers["Cookie"]="; ".join(f"{k}={v}" for k,v in jar.items())
adm=requests.Session()
r=adm.post(B+"/api/admin-auth/login",json={"email":"admin@test.com","password":"Strong-pass-123"}); check("admin login",r.status_code==200,r.text[:200]); adopt(adm,r)
# course + lessons
r=adm.post(B+"/api/admin/academy/courses",json={"title":"Price every job"}); check("create course",r.status_code==201,r.text); cid=r.json()["id"]
r=adm.post(B+f"/api/admin/academy/courses",json={"title":"Me"}); slug_me=psql("select slug from public.academy_courses where title='Me'"); check("reserved slug avoided",slug_me=="me-course",slug_me)
r=adm.post(B+f"/api/admin/academy/courses/{cid}/lessons",json={"kind":"reading","title":"Read first","body":"## Hello\nCost before price.","isPreview":True}); check("reading lesson",r.status_code==201,r.text); l1=r.json()["id"]
# video upload in 2 chunks (tiny fake mp4 w/ ftyp)
data=b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"+bytes(range(256))*40
r=adm.post(B+"/api/admin/academy/media",json={"filename":"a.mp4","kind":"video","size":len(data)}); check("media init",r.status_code==201,r.text); mid=r.json()["id"]
half=len(data)//2
r=adm.put(B+f"/api/admin/academy/media/{mid}?offset=0",data=data[:half]); check("chunk1",r.status_code==200 and r.json()["received"]==half,r.text)
r=adm.put(B+f"/api/admin/academy/media/{mid}?offset=0",data=data[:half]); check("chunk1 retry idempotent",r.status_code==200,r.text)
r=adm.put(B+f"/api/admin/academy/media/{mid}?offset=5",data=data[5:half+5]); check("out-of-order rejected",r.status_code==409,r.text)
r=adm.post(B+f"/api/admin/academy/media/{mid}/complete"); check("complete before done rejected",r.status_code==409,r.text)
r=adm.put(B+f"/api/admin/academy/media/{mid}?offset={half}",data=data[half:]); check("chunk2",r.status_code==200,r.text)
r=adm.post(B+f"/api/admin/academy/media/{mid}/complete"); check("complete ok",r.status_code==200,r.text)
r=adm.post(B+"/api/admin/academy/media",json={"filename":"evil.exe","kind":"video","size":10}); check("bad type rejected",r.status_code==400)
r=adm.post(B+"/api/admin/academy/media",json={"filename":"fake.mp4","kind":"video","size":20}); fid=r.json()["id"]
adm.put(B+f"/api/admin/academy/media/{fid}?offset=0",data=b"not a video at all!!"); r=adm.post(B+f"/api/admin/academy/media/{fid}/complete"); check("fake mp4 rejected by magic bytes",r.status_code==400,r.text)
r=adm.post(B+f"/api/admin/academy/courses/{cid}/lessons",json={"kind":"video","title":"Watch","mediaId":mid,"durationSeconds":120}); check("video lesson",r.status_code==201,r.text); l2=r.json()["id"]
quiz=[{"q":"Cost + profit =","options":["Price","Tax"],"correct":0,"explain":"Right."},{"q":"Overhead is","options":["Rent and power","Profit"],"correct":0}]
r=adm.post(B+f"/api/admin/academy/courses/{cid}/lessons",json={"kind":"quiz","title":"Quiz","quiz":quiz}); check("quiz lesson",r.status_code==201,r.text); l3=r.json()["id"]
r=adm.post(B+f"/api/admin/academy/courses/{cid}/lessons",json={"kind":"quiz","title":"Bad","quiz":[{"q":"x","options":["a"],"correct":0}]}); check("invalid quiz rejected",r.status_code==400)
r=adm.patch(B+f"/api/admin/academy/courses/{cid}",json={"published":True}); check("publish",r.status_code==200,r.text)
slug=psql(f"select slug from public.academy_courses where id='{cid}'")
# anonymous access
anon=requests.Session()
check("catalogue lists course",slug in anon.get(B+"/academy").text)
check("course page",anon.get(B+f"/academy/{slug}").status_code==200)
r=anon.get(B+f"/api/academy/media/{mid}"); check("video blocked for anon",r.status_code==404)
r=anon.get(B+f"/academy/learn/{slug}?lesson={l1}"); check("preview lesson open to anon","Cost before price" in r.text)
r=anon.get(B+f"/academy/learn/{slug}?lesson={l3}"); check("quiz lesson asks sign-in","Email me a code" in r.text)
r=anon.post(B+f"/api/academy/lessons/{l1}/progress",json={"completed":True}); check("progress needs sign-in",r.status_code==401)
# learner sign-in
r=anon.post(B+"/api/academy/auth/request",json={"email":"Ama@Example.com","name":"Ama Mensah","next":"/academy/me"}); check("request code",r.status_code==200,r.text)
lid=psql("select id from public.academy_learners where lower(email)='ama@example.com'")
r=anon.post(B+"/api/academy/auth/verify",json={"email":"ama@example.com","code":"000000"}); check("wrong code rejected",r.status_code==401)
psql(f"update public.academy_auth_codes set code_hash='{hashlib.sha256((lid+':123456').encode()).hexdigest()}', attempts=0 where learner_id='{lid}'")
r=anon.post(B+"/api/academy/auth/verify",json={"email":"ama@example.com","code":"123456"}); adopt(anon,r); check("right code signs in",r.status_code==200 and "sew_learner" in anon.headers.get("Cookie",""),r.text)
check("me endpoint",anon.get(B+"/api/academy/me").json()["learner"]["fullName"]=="Ama Mensah")
r=anon.get(B+f"/api/academy/media/{mid}"); check("video served to learner",r.status_code==200 and r.content==data)
r=anon.get(B+f"/api/academy/media/{mid}",headers={"Range":"bytes=10-19"}); check("range 206",r.status_code==206 and r.content==data[10:20] and r.headers["Content-Range"].startswith("bytes 10-19/"),str(r.headers))
r=anon.get(B+f"/api/academy/media/{mid}",headers={"Range":"bytes=999999-"}); check("range 416",r.status_code==416)
# progress & quiz
r=anon.post(B+f"/api/academy/lessons/{l1}/progress",json={"position":0,"completed":True}); check("complete reading",r.status_code==200 and r.json()["courseCompleted"]==False,r.text)
r=anon.post(B+f"/api/academy/lessons/{l2}/progress",json={"position":110,"completed":True}); check("complete video",r.status_code==200)
r=anon.post(B+f"/api/academy/lessons/{l3}/progress",json={"completed":True}); check("quiz cannot be self-completed",psql(f"select count(*) from public.academy_progress where lesson_id='{l3}' and completed_at is not null")=="0")
html=anon.get(B+f"/academy/learn/{slug}?lesson={l3}").text; check("quiz answers not leaked to page","\"correct\"" not in html and "Right." not in html)
r=anon.post(B+f"/api/academy/lessons/{l3}/quiz",json={"answers":[1,1]}); check("wrong quiz fails",r.status_code==200 and r.json()["passed"]==False,r.text)
r=anon.post(B+f"/api/academy/lessons/{l3}/quiz",json={"answers":[0,0]}); j=r.json(); check("right quiz passes + certificate",j["passed"] and j["courseCompleted"] and j["certificate"],r.text); code=j["certificate"]
r=anon.get(B+f"/api/academy/certificates/{code}/pdf"); check("certificate PDF",r.status_code==200 and r.content[:4]==b"%PDF")
r=requests.get(B+f"/academy/verify/{code}"); check("public verify page","This certificate is genuine" in r.text and "Ama Mensah" in r.text)
check("verify rejects unknown",("could not find" in requests.get(B+"/academy/verify/SEW-AAAA-BBBB").text))
r=anon.post(B+f"/api/academy/lessons/{l3}/quiz",json={"answers":[0,0]}); check("certificate not duplicated",psql("select count(*) from public.academy_certificates")=="1")
check("my learning page","Price every job" in anon.get(B+"/academy/me").text)
sm=anon.get(B+"/api/academy/me?summary=1").json(); check("streak/summary works",sm["learner"] is not None)
# live classroom
r=adm.post(B+"/api/admin/trainings",json={"title":"Live pricing class","startsAt":"2020-01-01T10:00:00Z","durationMinutes":60,"status":"Live"}); check("public training",r.status_code==201,r.text); tid=r.json()["id"]
r=adm.patch(B+f"/api/admin/academy/live/{tid}",json={"delivery":"onsite","mediaId":mid}); check("make onsite",r.status_code==200,r.text)
r=requests.get(B+f"/api/academy/live/{tid}").json(); check("anon sees session but no media/chat",r["session"]["mediaId"] is None and r["messages"]==[])
r=anon.post(B+f"/api/academy/live/{tid}/messages",json={"body":"Hello class","kind":"question"}); check("post question",r.status_code==201,r.text)
r=anon.post(B+f"/api/academy/live/{tid}/messages",json={"body":"again"}); check("flood limited",r.status_code==429)
st=anon.get(B+f"/api/academy/live/{tid}").json(); check("learner sees live + media",st["session"]["phase"]=="live" and st["session"]["mediaId"]==mid and len(st["messages"])==1)
mid_msg=st["messages"][0]["id"]
r=anon.patch(B+f"/api/academy/live/{tid}/messages/{mid_msg}",json={"hidden":True}); check("learner cannot moderate",r.status_code==403)
r=adm.patch(B+f"/api/academy/live/{tid}/messages/{mid_msg}",json={"answered":True,"pinned":True}); check("host moderates",r.status_code==200)
r=adm.post(B+f"/api/academy/live/{tid}/messages",json={"body":"Great question"}); check("host replies",r.status_code==201)
r=adm.patch(B+f"/api/academy/live/{tid}/messages/{mid_msg}",json={"hidden":True}); st=anon.get(B+f"/api/academy/live/{tid}").json(); check("hidden message removed for learners",all(m["id"]!=mid_msg for m in st["messages"]))
r=requests.post(B+f"/api/public/trainings/{tid}/register",json={"fullName":"Kofi Boateng","email":"kofi@example.com"}); check("public sign-up returns room link","/academy/live/" in (r.json().get("link") or ""),r.text)
check("/academy/live page renders",requests.get(B+f"/academy/live/{tid}").status_code==200)
# security
check("admin API needs admin",requests.get(B+"/api/admin/academy/courses").status_code==401)
check("learner cannot use admin API",anon.get(B+"/api/admin/academy/courses").status_code==401)
check("open redirect blocked",requests.get(B+"/api/academy/auth/link?t=x&next=//evil.com",allow_redirects=False).headers.get("location","").find("evil")==-1)
r=anon.post(B+"/api/academy/auth/logout"); check("logout",anon.get(B+"/api/academy/me").json()["learner"] is None)
print("FAILURES:",ok)
