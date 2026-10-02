// Build-time TypeScript only. The emitted package requires no TS runtime.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),output=path.join(root,'dist','medical-motion-worker');
const options=ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile).config,ts.sys,root).options;
function inside(file,base){return file.startsWith(base+path.sep)&&file!==base;}
function safeRemove(file){if(!inside(file,path.join(root,'dist'))||fs.lstatSync(file).isSymbolicLink())throw Error('UNSAFE_BUILD_LOCATION');fs.rmSync(file,{recursive:true,force:true});}
let staging;
try {
  const dist=path.dirname(output);fs.mkdirSync(dist,{recursive:true});if(fs.lstatSync(dist).isSymbolicLink())throw Error();
  staging=fs.mkdtempSync(path.join(dist,'motion-build-'));const seen=new Set(),manifest=[];
  function emit(file){
    if(seen.has(file))return;seen.add(file);if(!inside(file,path.join(root,'lib'))&&file!==path.join(root,'sentry.server.config.ts'))throw Error('UNSUPPORTED_WORKER_IMPORT');
    const source=fs.readFileSync(file,'utf8'),relative=path.relative(root,file),destination=path.join(staging,relative.replace(/\.tsx?$/,'.js'));
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    const code=file.endsWith('.json')?source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
    fs.writeFileSync(destination,code);manifest.push({file:path.relative(staging,destination).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(code).digest('hex')});
    for(const match of code.matchAll(/require\(["']([^"']+)["']\)/g)){
      const spec=match[1];if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;
      const resolved=ts.resolveModuleName(spec,file,options,ts.sys).resolvedModule?.resolvedFileName;
      if(!resolved)throw Error('UNRESOLVED_WORKER_IMPORT');emit(path.resolve(resolved));
    }
  }
  emit(path.join(root,'lib','medical-motion','worker','entry.ts'));
  emit(path.join(root,'lib','medical-motion','worker','operations.ts'));
  manifest.sort((a,b)=>a.file.localeCompare(b.file));fs.writeFileSync(path.join(staging,'manifest.json'),JSON.stringify({schemaVersion:1,nodeMajor:24,files:manifest},null,2)+'\n');
  if(fs.existsSync(output))safeRemove(output);fs.renameSync(staging,output);
  console.log(JSON.stringify({event:'WORKER_PACKAGE_BUILT',moduleCount:manifest.length}));
}catch{if(staging&&fs.existsSync(staging))safeRemove(staging);console.error('{"event":"WORKER_PACKAGE_BUILD_FAILED"}');process.exitCode=1;}
