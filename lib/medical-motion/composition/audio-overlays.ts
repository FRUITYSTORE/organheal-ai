import "server-only";
import sharp from "sharp";
import { MEDICAL_SUBTITLE_V1,subtitleLines } from "./audio-specification";
import type { SubtitleCue } from "../contracts/audio-composition";
import { audioInvalid } from "./narration-foundation";

const escapeMarkup=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
/** Local Pango shaping, including Arabic bidi/diacritics. No SVG text, remote
 * font resources or user filter expressions. Geometry is never involved. */
export async function rasterizeMedicalSubtitle(cue:SubtitleCue,fontfile:string){
  const r=MEDICAL_SUBTITLE_V1.safeRectangle;
  const left=Math.ceil(r[0]*1080),top=Math.ceil(r[1]*1920);
  const width=Math.floor(r[2]*1080)-left,height=Math.floor(r[3]*1920)-top;
  const lines=subtitleLines(cue.text);
  const text=await sharp({text:{text:`<span foreground="#f4f5f6">${escapeMarkup(lines.join("\n"))}</span>`,
    font:"Arial 42",fontfile,width:width-48,align:"centre",rgba:true,spacing:10,wrap:"none"}}).png().toBuffer({resolveWithObject:true});
  if(text.info.width>width-32||text.info.height>height-24)audioInvalid("SUBTITLE_LAYOUT_INVALID");
  const backing=Buffer.from(`<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#101821" fill-opacity="0.76"/></svg>`);
  const bytes=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([
    {input:backing,left:0,top:0},{input:text.data,left:Math.floor((width-text.info.width)/2),top:Math.floor((height-text.info.height)/2)}]).png().toBuffer();
  return {bytes,left,top,width,height,lines,direction:cue.language==="ar"?"rtl":"ltr",shaping:"local-Pango"};
}
