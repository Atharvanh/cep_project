const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function compile(name, requireModule) {
  const source = fs.readFileSync(path.join(__dirname,"..",name+".ts"),"utf8");
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  new Function("require","module","exports",code)(requireModule,module,module.exports);
  return module.exports;
}
const report = compile("report",() => {throw new Error("Unexpected dependency");});
const data = {profile:{name:"Alex",age:"22",gender:"Woman",height:"170",weight:"70",bmi:24.2,bmiCategory:"Normal",blood:"Unknown",conditions:[],cycle:false},date:"2026-10-13",goals:null,totals:{calories:0,carbs:0,protein:0,fat:0},meals:[],scans:[]};
function exporter(os,print,sharing) {
  return compile("exportReport",id => {
    if(id === "react-native") return {Platform:{OS:os}};
    if(id === "expo-print") return print;
    if(id === "expo-sharing") return sharing;
    if(id === "./report") return report;
    throw new Error("Unexpected dependency: "+id);
  }).exportHealthReport;
}
test("native report generates A4 PDF and opens sharing with a PDF MIME type",async()=>{
  let printOptions, shareOptions;
  await exporter("android",{printToFileAsync:async o=>{printOptions=o;return {uri:"file:///summary.pdf"};}},
    {isAvailableAsync:async()=>true,shareAsync:async(uri,o)=>{assert.equal(uri,"file:///summary.pdf");shareOptions=o;}})(data);
  assert.equal(printOptions.width,595);assert.equal(printOptions.height,842);
  assert.ok(printOptions.html.includes("WelNest Health Report"));
  assert.equal(shareOptions.mimeType,"application/pdf");assert.equal(shareOptions.UTI,"com.adobe.pdf");
});
test("unavailable native sharing falls back to print; generation errors propagate",async()=>{
  let printed;
  const print={printToFileAsync:async()=>({uri:"file:///summary.pdf"}),printAsync:async o=>{printed=o;}};
  await exporter("ios",print,{isAvailableAsync:async()=>false})(data);
  assert.deepEqual(printed,{uri:"file:///summary.pdf"});
  await assert.rejects(exporter("android",{printToFileAsync:async()=>{throw new Error("PDF failed");}},{})(data),/PDF failed/);
});
test("web opens the report document with an explicit print button; blocked popups fail clearly",async()=>{
  const original=global.window;let html,button,printed=false;
  const preview={opener:{},document:{open(){},write(v){html=v;},close(){},createElement(){return {};},body:{prepend(v){button=v;}}},print(){printed=true;}};
  try {
    global.window={open:()=>preview};await exporter("web",{},{})(data);
    assert.equal(preview.opener,null);assert.ok(html.includes("No meals logged"));assert.equal(button.textContent,"Print / Save as PDF");button.onclick();assert.equal(printed,true);
    global.window={open:()=>null};await assert.rejects(exporter("web",{},{})(data),/Allow pop-ups/);
  } finally {global.window=original;}
});
