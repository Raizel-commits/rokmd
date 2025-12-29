import axios from "axios";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export const name = "down-url";
export const description = "Download file from URL";

export async function execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const args = msg.message?.conversation?.split(" ") || [];
    
    if (!args[1]) {
        return await sock.sendMessage(jid, {
            text: "𝚄𝚜𝚊𝚐𝚎: .𝚍𝚘𝚠𝚗-𝚞𝚛𝚕 𝚞𝚛𝚕"
        });
    }

    const url = args[1];
    
    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data, "binary");
        
        const contentType = response.headers["content-type"] || mime.lookup(url) || "application/octet-stream";
        const extension = mime.extension(contentType) || "bin";
        const fileName = `download_${Date.now()}.${extension}`;
        const filePath = path.join("./", fileName);
        
        fs.writeFileSync(filePath, buffer);
        
        let messageOptions = {};
        if (contentType.startsWith("image/")) {
            messageOptions = { 
                image: fs.readFileSync(filePath),
                caption: `𝙸𝚖𝚊𝚐𝚎 𝚏𝚛𝚘𝚖: ${url}` 
            };
        } else if (contentType.startsWith("video/")) {
            messageOptions = { 
                video: fs.readFileSync(filePath),
                caption: `𝚅𝚒𝚍𝚎𝚘 𝚏𝚛𝚘𝚖: ${url}` 
            };
        } else if (contentType.startsWith("audio/")) {
            messageOptions = { 
                audio: fs.readFileSync(filePath),
                mimetype: contentType,
                ptt: false 
            };
        } else {
            messageOptions = { 
                document: fs.readFileSync(filePath),
                mimetype: contentType,
                fileName: fileName 
            };
        }
        
        await sock.sendMessage(jid, messageOptions);
        fs.unlinkSync(filePath);
        
    } catch (error) {
        await sock.sendMessage(jid, {
            text: "𝙵𝚊𝚒𝚕𝚎𝚍 𝚝𝚘 𝚍𝚘𝚠𝚗𝚕𝚘𝚊𝚍 𝚏𝚒𝚕𝚎."
        });
    }
}
