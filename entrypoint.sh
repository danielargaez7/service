#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --config=apps/backend-api/prisma/prisma.config.ts 2>&1 || echo "[entrypoint] Migration warning (may already be applied)"

echo "[entrypoint] Checking if database needs seeding..."
node -e "
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL});
const p=new PrismaClient({adapter:a});
const bcrypt=require('bcrypt');

async function seed(){
  const count=await p.employee.count();
  if(count>0){console.log('[seed] DB has '+count+' employees, skipping');return}

  console.log('[seed] Empty DB — seeding...');
  const hash=await bcrypt.hash('demo',10);
  const roles=[
    {fn:'Sarah',ln:'Mitchell',email:'admin@servicecore.com',role:'HR_ADMIN',cls:'OFFICE',mc:false},
    {fn:'Jacob',ln:'Clark',email:'manager@servicecore.com',role:'ROUTE_MANAGER',cls:'OFFICE',mc:false},
    {fn:'Lisa',ln:'Nguyen',email:'payroll@servicecore.com',role:'PAYROLL_ADMIN',cls:'OFFICE',mc:false},
    {fn:'Rachel',ln:'Adams',email:'exec@servicecore.com',role:'EXECUTIVE',cls:'OFFICE',mc:false},
    {fn:'Kevin',ln:'Brooks',email:'dispatch@servicecore.com',role:'DISPATCHER',cls:'OFFICE',mc:false},
    {fn:'Carlos',ln:'Rivera',email:'driver@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true},
    {fn:'Mike',ln:'Chen',email:'mike.chen@servicecore.com',role:'DRIVER',cls:'CDL_B',mc:true},
    {fn:'Tom',ln:'Garcia',email:'tom.garcia@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true,cba:'teamsters-local-455'},
    {fn:'Anna',ln:'Kowalski',email:'anna.kowalski@servicecore.com',role:'DRIVER',cls:'NON_CDL',mc:false},
    {fn:'James',ln:'Wright',email:'james.wright@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true},
    {fn:'Marcus',ln:'Johnson',email:'marcus.johnson@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true},
    {fn:'Terrell',ln:'Williams',email:'terrell.williams@servicecore.com',role:'DRIVER',cls:'CDL_B',mc:true,cba:'teamsters-local-455'},
    {fn:'Jake',ln:'Hernandez',email:'jake.hernandez@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true},
    {fn:'DeShawn',ln:'Carter',email:'deshawn.carter@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true},
    {fn:'Miguel',ln:'Rodriguez',email:'miguel.rodriguez@servicecore.com',role:'DRIVER',cls:'NON_CDL',mc:false},
    {fn:'Chris',ln:'Patterson',email:'chris.patterson@servicecore.com',role:'DRIVER',cls:'CDL_B',mc:true},
    {fn:'Tony',ln:'Ramirez',email:'tony.ramirez@servicecore.com',role:'DRIVER',cls:'CDL_A',mc:true,cba:'teamsters-local-117'},
    {fn:'Luis',ln:'Morales',email:'luis.morales@servicecore.com',role:'DRIVER',cls:'YARD',mc:false},
  ];

  const mgr=await p.employee.create({data:{firstName:'Jacob',lastName:'Clark',email:'manager@servicecore.com',passwordHash:hash,role:'ROUTE_MANAGER',employeeClass:'OFFICE',stateCode:'CO'}});

  for(const r of roles){
    if(r.email==='manager@servicecore.com')continue;
    const isDriver=r.role==='DRIVER';
    await p.employee.create({data:{
      firstName:r.fn,lastName:r.ln,email:r.email,passwordHash:hash,
      role:r.role,employeeClass:r.cls,stateCode:'CO',
      isMotorCarrier:r.mc,cbAgreementId:r.cba||null,
      managerId:isDriver?mgr.id:null,phone:'303-555-'+String(Math.floor(Math.random()*9000)+1000),
    }});
  }

  // Add some time entries
  const drivers=await p.employee.findMany({where:{role:'DRIVER'}});
  const now=new Date();
  const jobTypes=['RESIDENTIAL_SANITATION','ROLL_OFF_DELIVERY','SEPTIC_PUMP','GREASE_TRAP'];
  for(let d=10;d>=0;d--){
    const date=new Date(now);date.setDate(date.getDate()-d);
    if(date.getDay()===0||date.getDay()===6)continue;
    for(const dr of drivers){
      const sh=5+Math.floor(Math.random()*3);
      const hrs=7+Math.random()*3;
      const ci=new Date(date);ci.setHours(sh,Math.floor(Math.random()*30),0);
      const co=new Date(ci.getTime()+hrs*3600000);
      const jt=jobTypes[Math.floor(Math.random()*jobTypes.length)];
      const status=d>2?'APPROVED':d>0?'SUBMITTED':'PENDING';
      await p.timeEntry.create({data:{
        employeeId:dr.id,clockIn:ci,clockOut:co,jobType:jt,
        hoursWorked:hrs,regularHours:Math.min(hrs,8),overtimeHours:Math.max(0,hrs-8),
        status,approved:status==='APPROVED',approvedBy:status==='APPROVED'?mgr.id:null,
        gpsClockIn:{lat:39.7392+(Math.random()-0.5)*0.1,lng:-104.9903+(Math.random()-0.5)*0.1,accuracy:15},
      }});
    }
  }
  console.log('[seed] Done: '+roles.length+' employees + time entries');
}
seed().catch(e=>console.error('[seed] Error:',e.message)).finally(()=>p.\$disconnect());
" 2>&1

echo "[entrypoint] Starting server..."
exec node dist/apps/backend-api/main.js
