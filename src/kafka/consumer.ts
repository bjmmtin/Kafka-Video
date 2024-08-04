import {Kafka, Consumer} from "kafkajs";

export const consumer = async (): Promise<Consumer> => {
  const kafka = new Kafka({
    clientId: "my-app2",
    brokers: ["localhost:9092"],
  });
  const consumer = kafka.consumer({groupId: "whatever"});

  await consumer.connect();
  await consumer.subscribe({topic: "test-streaming", fromBeginning: true});

  return consumer;
};
