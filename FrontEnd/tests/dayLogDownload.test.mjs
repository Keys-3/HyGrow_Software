import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url), {parse}=require('@babel/parser');
const source=fs.readFileSync(new URL('../app/(tabs)/plants.js',import.meta.url),'utf8');
const ast=parse(source,{sourceType:'module',plugins:['jsx']});let action;
function visit(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.id.name==='handleDownloadDay')action=source.slice(node.init.start,node.init.end);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}
visit(ast);
test('download-day exports only the selected day and its photos, including offline stored readings',async()=>{
 const requested=[], downloads=[], busy=[];
 const selected={id:'methi_2026-11-26',dateString:'2026-11-26',readings:{ph:6.2},photos:[{imageUrl:'hygrow-photo:farmer/selected'}]};
 const run=vm.runInNewContext('('+action+')',{openedPlant:{id:'methi'},downloadingDay:null,setDownloadingDay:value=>busy.push(value),exportLogPhotoDataUri:async reference=>{requested.push(reference);return 'saved-image-bytes';},buildPlantLogExport:(plant,records,photos)=>{assert.equal(records.length,1);assert.equal(records[0],selected);assert.equal(records[0].readings.ph,6.2);assert.equal(photos[selected.photos[0].imageUrl],'saved-image-bytes');return{archive:new Uint8Array([1,2,3])};},downloadLogArchive:async(name,bytes)=>downloads.push({name,bytes}),showAlert:()=>assert.fail('Export should succeed')});
 await run(selected);assert.deepEqual(requested,['hygrow-photo:farmer/selected']);assert.equal(downloads[0].name,'methi_2026-11-26_record.zip');assert.equal(busy.at(-1),null);
});
