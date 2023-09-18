const mqtt = require('mqtt');
require('dotenv').config();
const DB_URL = process.env.MONGO_URL;
console.log(DB_URL);

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(DB_URL).then(() => {
  console.log('Connect DB successfully');
});

const MQTT_BROKER_URL = 'mqtt://sanslab1.ddns.net:1883';

const options = {
  username: 'admin',
  password: '123',
};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, options);

// Kết nối tới MongoDB
mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('Kết nối Cơ sở dữ liệu MongoDB thành công');
});

const subscriptionSchema = new mongoose.Schema({
  api_key: String,
  device_ip: String,
  count_message: Number,
  subscribedAt: { type: Date, default: Date.now },
  messages: [
    {
      mess: String,
      receivedAt: { type: Date, default: Date.now },
    },
  ],
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

mqttClient.on('connect', () => {
  console.log('Kết nối thành công tới máy chủ MQTT');
  mqttClient.subscribe('#'); 
});

mqttClient.on('unsubscribe', (topics) => {
  topics.forEach((topic) => {
    deleteSubscription(topic);
  });
});

mqttClient.on('message', async (topic, message) => {
  console.log(`Nhận được tin nhắn trên chủ đề ${topic}: ${message.toString()}`);
  try {
    let subscription = await Subscription.findOne({ api_key: topic });

    if (!subscription) {
      console.log(`Topic ${topic} chưa tồn tại, đang tạo mới.`);
      subscription = new Subscription({
        api_key: topic,
        device_ip: 'deviceIPAddress', 
        count_message: 0,
        messages: [],
      });
    }

    const messageData = {
      mess: message.toString(),
      receivedAt: new Date(),
    };
    
    subscription.messages.push(messageData);
    subscription.count_message += 1;
    
    await subscription.save();
    console.log(`Đã lưu tin nhắn cho chủ đề ${topic}`);
  } catch (error) {
    console.error(`Lỗi khi xử lý tin nhắn: ${error}`);
  }
});

function deleteSubscription(api_key) {
  Subscription.findOneAndDelete({ api_key }).then(() => {
    console.log(`Đã xóa subscription cho chủ đề ${api_key}`);
  }).catch((err) => {
    console.error(`Lỗi khi xóa subscription: ${err}`);
  });
}











