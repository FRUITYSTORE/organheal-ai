const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),bundle=path.join(root,'dist','medical-motion-worker');
const candidateJson=new Set(['medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json','medical-assets/candidates/zenodo-4506463-v2/selection-manifest.json']);
exports.load=function(){
  const version=process.versions.node.split('.').map(Number);
  if(version[0]!==24||version[1]<16)throw Object.assign(Error(),{workerExitCode:64});
  // This isolated service must not initialize an unrelated telemetry target.
  if(process.env.SENTRY_DSN)throw Object.assign(Error(),{workerExitCode:64});
  if(fs.lstatSync(bundle).isSymbolicLink()||!fs.lstatSync(bundle).isDirectory())throw Error();
  const realBundle=fs.realpathSync(bundle),manifestPath=path.join(bundle,'manifest.json');
  if(fs.lstatSync(manifestPath).isSymbolicLink()||fs.statSync(manifestPath).size>262144)throw Error();
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(manifest.schemaVersion!==1||manifest.nodeMajor!==24||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>1000||
    !manifest.files.some(item=>item.file==='lib/medical-motion/worker/entry.js'))throw Error();
  for(const item of manifest.files){
    if(typeof item.file!=='string'||typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error();
    const file=path.resolve(bundle,item.file);
    const relative=path.relative(realBundle,fs.realpathSync(file));
    if(!file.startsWith(bundle+path.sep)||!(/^(lib\/.*\.(js|json)|sentry\.server\.config\.js)$/.test(item.file)||candidateJson.has(item.file))||fs.lstatSync(file).isSymbolicLink()||
      !relative||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!fs.lstatSync(file).isFile()||
      crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error();
  }
  const permitted=new Set(manifest.files.map(item=>path.resolve(bundle,item.file)));
  if(permitted.size!==manifest.files.length)throw Error();
  const resolve=Module._resolveFilename;
  Module._resolveFilename=function(request,parent,...rest){
    if(request==='server-only')request=path.join(__dirname,'medical-motion-server-only.cjs');
    else if(request.startsWith('@/')){request=path.resolve(bundle,request.slice(2));if(!request.startsWith(bundle+path.sep))throw Error();}
    const result=resolve.call(this,request,parent,...rest);
    if(result.startsWith(bundle+path.sep)&&!permitted.has(result))throw Error();
    return result;
  };
  process.chdir(root);
  return require(path.join(bundle,'lib','medical-motion','worker','entry.js'));
};
