const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const fields = ["id","leadInDate","clientName","clientMobile","architectName","architectMobile","salesPerson","leadGivenBy","quotation","amount","dealed","hotLead","address","area","currentStatus","nextFollowUpDate"];

const schema = new mongoose.Schema({
  id:{type:String,required:true,unique:true,index:true},
  leadInDate:String,clientName:String,clientMobile:String,architectName:String,architectMobile:String,
  salesPerson:String,leadGivenBy:String,quotation:String,amount:String,dealed:String,hotLead:String,
  address:String,area:String,currentStatus:String,nextFollowUpDate:String
},{timestamps:true,versionKey:false});

const Lead = mongoose.models.Lead || mongoose.model("Lead",schema);

async function db(){
  if(mongoose.connection.readyState===1) return;
  if(!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in Vercel Environment Variables");
  await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
}

function normalize(input={}){
  const out={};
  for(const key of fields){
    let v=input[key];
    if(v===undefined || v===null || v==="") v=null;
    else v=String(v).trim();
    out[key]=v;
  }
  if(!out.id) out.id=String(Date.now());
  return out;
}

function parseCsv(buffer){
  return new Promise((resolve,reject)=>{
    const rows=[];
    Readable.from(buffer)
      .pipe(csv())
      .on("data",r=>rows.push(r))
      .on("end",()=>resolve(rows))
      .on("error",reject);
  });
}

function getPath(req){
  return (req.url || "").split("?")[0].replace(/^\/+/,"").split("/").filter(Boolean);
}

module.exports = async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();

  try{
    await db();
    const parts=getPath(req);
    // /api/leads or /api/leads/:id or /api/leads/import
    const tail=parts.slice(2);
    const action=tail[0] || "";

    if(req.method==="GET"){
      return res.status(200).json(await Lead.find().sort({id:1}).lean());
    }

    if(req.method==="POST" && action==="import"){
      return upload.single("file")(req,res,async(err)=>{
        try{
          if(err) throw err;
          if(!req.file) return res.status(400).json({error:"No file uploaded"});
          const name=req.file.originalname.toLowerCase();
          let rows=[];
          if(name.endsWith(".json")){
            const parsed=JSON.parse(req.file.buffer.toString("utf8"));
            rows=Array.isArray(parsed)?parsed:(Array.isArray(parsed.leads)?parsed.leads:[]);
          }else if(name.endsWith(".csv")){
            rows=await parseCsv(req.file.buffer);
          }else{
            return res.status(400).json({error:"Only JSON and CSV files are supported"});
          }
          if(!rows.length) return res.status(400).json({error:"No valid rows found"});
          const ops=rows.map(r=>{
            const doc=normalize(r);
            return {updateOne:{filter:{id:doc.id},update:{$set:doc},upsert:true}};
          });
          const result=await Lead.bulkWrite(ops,{ordered:false});
          return res.json({ok:true,inserted:result.upsertedCount||0,updated:result.modifiedCount||0,total:rows.length});
        }catch(e){ return res.status(500).json({error:e.message}); }
      });
    }

    const id=action ? decodeURIComponent(action) : "";

    if(req.method==="POST"){
      const data=normalize(req.body);
      const exists=await Lead.findOne({id:data.id});
      if(exists) return res.status(409).json({error:"Lead ID already exists"});
      return res.status(201).json(await Lead.create(data));
    }

    if(req.method==="PUT"){
      if(!id) return res.status(400).json({error:"Missing lead ID"});
      const data=normalize({...req.body,id});
      const lead=await Lead.findOneAndUpdate({id},data,{new:true,runValidators:true});
      if(!lead) return res.status(404).json({error:"Lead not found"});
      return res.json(lead);
    }

    if(req.method==="DELETE"){
      if(!id) return res.status(400).json({error:"Missing lead ID"});
      const lead=await Lead.findOneAndDelete({id});
      if(!lead) return res.status(404).json({error:"Lead not found"});
      return res.json({ok:true});
    }

    return res.status(405).json({error:"Method not allowed"});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e.message});
  }
};
