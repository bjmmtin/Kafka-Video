## Streaming a video through Apache Kafka.

If you dont have apache kafka installed you can follow this guide https://kafka.apache.org/quickstart .

Assuming you have zookeeper server and the kafka running.

There is a video in the root folder that you can use as an example.

Otherwise in a production env you could take the video from an S3 bucket for example.

Now to stream the video we have to make the producer to send them in chunks.

### bash commands
first: .\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties

second: .\bin\windows\kafka-server-start.bat .\config\server.properties

third: .\bin\windows\kafka-topics.bat --create --topic topic-video --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

### Note.

    Kafka server by default has a limit of you much data you can send.



### Then if we visit:

    http://127.0.0.1:3000/

    We should see our video playing.

<img src="screenshot.png">
