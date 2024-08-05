import express from 'express';
import { Kafka, KafkaMessage } from 'kafkajs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import stream from "stream";

const app = express();
const kafka = new Kafka({
    clientId: 'video-streamer',
    brokers: ['localhost:9092'],
    requestTimeout: 25000,
    connectionTimeout: 3000,
});

const producer = kafka.producer();
const upload = multer({ dest: 'uploads/' });

let current = 0;
var mes: Array<KafkaMessage> = [];

app.post('/upload', upload.single('video'), async (req, res) => {
    current = 0;
    mes = [];
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    const videoPath = req.file.path;

    ////// producer      run ////////////////////////////////////////////////////////////////////////////
    const producer = kafka.producer();
    await producer.connect();
    const videoBuffer = await fs.promises.readFile(path.resolve("video.mp4"));

    const CHUNK_SIZE = 1024 * 512; // 0.5 MB

    for (let i = 0; i < videoBuffer.length; i += CHUNK_SIZE) {
        const chunk = videoBuffer.slice(i, i + CHUNK_SIZE);
        await producer.send({
            topic: 'topic-video',
            messages: [{ value: chunk, key: String(i / CHUNK_SIZE), }],
        });
    }

    // consumer      run ///////////////////////////////////////////////////////////////////////
    const consumer = kafka.consumer({ groupId: 'video-viewer' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'topic-video', fromBeginning: true });
    await consumer.run({
        eachMessage: async ({ message }): Promise<void> => {
            return new Promise(resolve => {
                mes.push(message);
                resolve();
            });
        },
    });
    await producer.disconnect();
    fs.unlinkSync(videoPath); // Remove the file after sending
    return res.send('Video uploaded and sent to Kafka');
});

app.get('/play', async (req, res) => {
    res.sendFile(path.resolve('video.html'));
});

app.get('/video', async (req, res) => {

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

app.get('/upload', (req, res) => {
    res.sendFile(path.resolve("index.html"));
});

app.listen(3000, async () => {
    await producer.connect();
    console.log('Server is running on http://localhost:3000');
});
