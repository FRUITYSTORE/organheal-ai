// Minimal ISO-BMFF structure for container-validation unit tests only.
// No encoded H.264 samples; real codec/timing coverage is the Blender integration.
export function mp4Fixture(): Buffer {
  const box = (type: string, payload: Buffer) => {
    const header = Buffer.alloc(8); header.writeUInt32BE(payload.length + 8); header.write(type, 4);
    return Buffer.concat([header, payload]);
  };
  const handler = Buffer.alloc(12); handler.write("vide", 8);
  return Buffer.concat([
    box("ftyp", Buffer.from("isom\0\0\0\0mp41", "ascii")), box("mdat", Buffer.from([1])),
    box("moov", Buffer.concat([box("mvhd", Buffer.alloc(20)), box("trak", box("mdia", box("hdlr", handler)))])),
  ]);
}
