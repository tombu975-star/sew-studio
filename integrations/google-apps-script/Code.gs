// Deploy as web app, execute as owner. Set SEWSINESS_SECRET in Script Properties.
function doPost(e) {
  function reply(ok, error) { return ContentService.createTextOutput(JSON.stringify({ok:ok,error:error||undefined})).setMimeType(ContentService.MimeType.JSON); }
  try {
    var p=JSON.parse(e.postData.contents);
    var secret=PropertiesService.getScriptProperties().getProperty("SEWSINESS_SECRET");
    if(!secret || secret.length<32 || typeof p.secret!=="string" || p.secret!==secret) return reply(false,"Unauthorized");
    if(p.channel!=="email") return reply(false,"Channel not configured");
    if(typeof p.recipient!=="string" || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(p.recipient) || p.recipient.length>254 || typeof p.title!=="string" || p.title.length>200 || /[\r\n]/.test(p.title) || typeof p.body!=="string" || p.body.length>30000) return reply(false,"Invalid message");
    if(MailApp.getRemainingDailyQuota()<1) return reply(false,"Daily quota exhausted");
    var mail={to:p.recipient,subject:p.title,body:p.body,name:"Sewsiness"};
    if(typeof p.htmlBody==="string" && p.htmlBody.length<=100000) mail.htmlBody=p.htmlBody;
    MailApp.sendEmail(mail);
    return reply(true);
  } catch(err) { return reply(false,"Delivery failed"); }
}
