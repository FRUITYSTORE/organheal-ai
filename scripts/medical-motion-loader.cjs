// Scoped to this standalone Node process; never imported by request/Vercel code.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
exports.install=function(){
  const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
  Module._resolveFilename=function(request,parent,...rest){
    if(request==='server-only')request=path.join(__dirname,'medical-motion-server-only.cjs');
    else if(request.startsWith('@/'))request=path.join(root,request.slice(2));
    return resolve.call(this,request,parent,...rest);
  };
  require.extensions['.ts']=function(module,filename){
    const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    module._compile(code,filename);
  };
};
