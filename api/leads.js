const mongoose=require("mongoose");
const multer=require("multer");
const csv=require("csv-parser");
const {Readable}=require("stream");
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
const fields=["id","leadInDate","clientName","clientMobile","architectName","architectMobile","salesPerson","leadGivenBy","quotation","amount","dealed","hotLead","address","area","currentStatus","nextFollowUpDate"];
const schema=new mongoose.Schema(Object.fromEntries(fields.map(f=>[f,{type:String}])),{timestamps:true,versionKey:false});
schema.path("id").required(true);schema.index({id:1},{unique:true});
const Lead=mongoose.models.Lead||mongoose.model("Lead",schema);
async function db(){if(mongoose.connection.readyState!==1){if(!process.env.MONGODB_URI)throw Error("MONGODB_URI is missing");await mongoose.connect(process.env.MONGODB_URI)}}
function norm(x={}){let o={};fields.forEach(f=>o[f]=x[f]==null?"":String(x[f]).trim());if(!o.id)o.id=String(Date.now());return o}
function parseCsv(b){return new Promise((res,rej)=>{let a=[];Readable.from(b).pipe(csv()).on("data",x=>a.push(x)).on("end",()=>res(a)).on("error",rej)})}
module.exports=async(req,res)=>{
res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");
if(req.method==="OPTIONS")return res.status(200).end();
try{
await db();
const path=(req.url||"").split("?")[0].replace(/^\/+|\/+$/g,"").split("/");
const action=path[2]||"";
if(req.method==="GET")return res.json(await Lead.find().sort({id:1}).lean());
if(req.method==="POST"&&action==="import")return upload.single("file")(req,res,async err=>{
try{if(err)throw err;if(!req.file)throw Error("No file uploaded");let rows;
if(req.file.originalname.toLowerCase().endsWith(".json")){let x=JSON.parse(req.file.buffer.toString());rows=Array.isArray(x)?x:(x.leads||[])}
else if(req.file.originalname.toLowerCase().endsWith(".csv"))rows=await parseCsv(req.file.buffer);else throw Error("Only JSON/CSV supported");
let ops=rows.map(r=>{let d=norm(r);return{updateOne:{filter:{id:d.id},update:{$set:d},upsert:true}}});let r=await Lead.bulkWrite(ops,{ordered:false});res.json({ok:true,total:rows.length,inserted:r.upsertedCount||0,updated:r.modifiedCount||0})
}catch(e){res.status(400).json({error:e.message})}});
const id=decodeURIComponent(action);
if(req.method==="POST"){let d=norm(req.body);if(await Lead.exists({id:d.id}))return res.status(409).json({error:"ID already exists"});return res.status(201).json(await Lead.create(d))}
if(req.method==="PUT"){let d=norm({...req.body,id});let x=await Lead.findOneAndUpdate({id},d,{new:true});if(!x)return res.status(404).json({error:"Lead not found"});return res.json(x)}
if(req.method==="DELETE"){let x=await Lead.findOneAndDelete({id});if(!x)return res.status(404).json({error:"Lead not found"});return res.json({ok:true})}
res.status(405).json({error:"Method not allowed"})
}catch(e){console.error(e);res.status(500).json({error:e.message})}
}