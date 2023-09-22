const mqtt = require('mqtt');
require('dotenv').config();
const DB_URL = process.env.MONGO_URL;
console.log(DB_URL);
var {getDay} = require('./day')

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

const { format } = require('date-fns'); // Thêm date-fns

// Kết nối tới MongoDB
mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('Kết nối Cơ sở dữ liệu MongoDB thành công');
});

const subscriptionSchema = new mongoose.Schema({
  count_message: Number,
  mess_in_minute: Number,
  is_block: Boolean,
  API_key: String,
  device_ip: String,
  time_interval: Number,
  last_message: String, 
  message: [
    {
      message: String,
      time: String, 
    },
  ],
});

const MessageSchema = new mongoose.Schema({
  API_key: String,
  ip_device: String,
  time: String,
  message: String,
  isProcess: Boolean,
});

const Subscription = mongoose.model('devices', subscriptionSchema);
const Message = mongoose.model('message', MessageSchema); 

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
    let subscription = await Subscription.findOne({ API_key: topic });

    if (!subscription) {
      console.log(`Topic ${topic} chưa tồn tại, đang tạo mới.`);
      subscription = new Subscription({
        count_message: 0,
        mess_in_minute: 0,
        is_block: false,
        API_key: topic,
        device_ip: 'deviceIPAddress', 
        time_interval: 0,
        last_message: getDay(), 
        message: [],
      });
    }

    // Cập nhật thông tin bản tin
    subscription.count_message += 1;

    // Thêm bản tin mới vào danh sách tin nhắn và cập nhật thời gian dưới dạng chuỗi
    subscription.message.push({
      message: message.toString(),
      time: getDay(),
    });

    // Cập nhật thời gian bản tin cuối cùng dưới dạng chuỗi
    subscription.last_message = getDay();

    await subscription.save();
    console.log(`Đã cập nhật thông tin cho chủ đề ${topic}`);

    // Lưu thông tin bản tin vào bảng "messages"
    const newMessage = new Message({
      API_key: topic,
      ip_device: 'deviceIPAddress', 
      time: getDay(),
      message: message.toString(),
      isProcess: false, 
    });
    await newMessage.save();
    console.log('Đã lưu thông tin bản tin vào bảng "messages"');
  } catch (error) {
    console.error(`Lỗi khi xử lý tin nhắn: ${error}`);
  }
});

function deleteSubscription(API_key) {
  Subscription.findOneAndDelete({ API_key }).then(() => {
    console.log(`Đã xóa subscription cho chủ đề ${API_key}`);
  }).catch((err) => {
    console.error(`Lỗi khi xóa subscription: ${err}`);
  });
}















