const fs = require("node:fs");
const ts = require("typescript");
const path = require("node:path");
const root = path.join(__dirname,"../..");
function load(name) {
  const source=fs.readFileSync(path.join(root,"src",name+".ts"),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function("module","exports",code)(module,module.exports);return module.exports;
}
const {buildHealthReport}=load("report");const {nutritionGoals,sumMeals}=load("nutrition");
const profile={name:"Alex Morgan",age:"22",gender:"Prefer not to say",blood:"Unknown",conditions:["Mindful sugar intake","High blood pressure"],cycle:false,height:"170",weight:"78",bmi:26.9896,bmiCategory:"Overweight"};
const date="2026-10-13";
const meals=[{id:"meal-1",name:"Nutella",date,timestamp:"2026-10-13T07:00:00Z",amount:25,unit:"g",source:"barcode",calories:134.75,carbs:14.375,protein:1.575,fat:7.725}];
const scans=Array.from({length:10},(_,i)=>({id:String(i),timestamp:"2026-10-13T07:00:00Z",productName:i===0 ? "Nutella" : "A long named wholegrain product with seasonal ingredients "+i,calories:i===8 ? null : 220,basis:"100g"}));
fs.mkdirSync(path.join(root,"tmp/pdfs"),{recursive:true});
fs.writeFileSync(path.join(root,"tmp/pdfs/health-report.html"),buildHealthReport({profile,date,goals:nutritionGoals(profile),totals:sumMeals(meals),meals,scans}));
