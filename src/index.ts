import express from "express";
import {config} from "dotenv";
import {KafkaMessage} from "kafkajs";
import path from "path";
import fs from "fs";
import stream from "stream";

import {producer} from "./kafka/producer";
import {consumer} from "./kafka/consumer";

config();

const app = express();

let current = 0;
const mes: Array<KafkaMessage> = [];

app.get("/streaming", (req, res) => {
  const readStream = new stream.PassThrough();

  mes.sort((a, b) => {
    const aa = JSON.parse(a.key.toString("utf8"));
    const bb = JSON.parse(b.key.toString("utf8"));
    return aa > bb ? 1 : bb > aa ? -1 : 0;
  });

  const buf_array = mes.map(b => b.value)[current];

  if (!buf_array) {
    return res.end();
  }

  const buf = Buffer.from(buf_array);

  current++;

  const start = 0;
  const end = buf.length;
  const size = end - start;
  const head = {
    "Access-Control-Allow-Origin": "*",
    // "Content-Range": `bytes ${start}-${end}/17839845`,
    "Accept-Ranges": "bytes",
    "Content-Length": size,
    "Content-Type": "video/mp4",
  };

  res.writeHead(206, head);

  readStream.end(buf);
  readStream.pipe(res);
});

app.get("/file_streaming", (req, res) => {
  const path = "video.mp4";
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;
  let start;
  let end;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  } else {
    start = 0;
    end = 1;
  }

  const chunksize = end - start + 1;
  const file = fs.createReadStream(path, {start, end});
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunksize,
    "Content-Type": "video/mp4",
  };
  res.writeHead(206, headers);
  file.pipe(res);
});

app.get("/produce", async (req, res) => {
  await producer();
  const cons = await consumer();
  await cons.run({
    eachMessage: async ({message}): Promise<void> => {
      return new Promise(resolve => {
        mes.push(message);
        resolve();
      });
    },
  });
  res.setHeader("Content-type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.send({message: "producing"});
});

app.get("/consume", async (req, res) => {
  await consumer();
  res.setHeader("Content-type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.send({message: "producing"});
});

app.get("/", function (req, res) {
  res.sendFile(path.resolve("index.html"));
});

const host = (process.env.HOST as unknown) as string;
const port = (process.env.PORT as unknown) as number;

app.listen(port, host, () => {
  console.info(`API server is running on http://${host}:${port}`);
});
