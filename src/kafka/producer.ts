import {Kafka} from "kafkajs";
import fs from "fs";
import path from "path";

export const producer = async (): Promise<void> => {
  const kafka = new Kafka({
    clientId: "my-app2",
    brokers: ["localhost:9092"],
    requestTimeout: 25000,
    connectionTimeout: 3000,
  });

  const producer = kafka.producer();

  await producer.connect();

  const data = await fs.promises.readFile(path.resolve("video.mp4"));

  const chunk = 1000000;
  for (let i = 0, j = data.length; i < j; i += chunk) {
    producer.send({
      topic: "test-streaming",
      messages: [
        {
          value: data.slice(i, i + chunk),
          key: String(i / chunk),
        },
      ],
    });
  }

  await producer.disconnect();
};
