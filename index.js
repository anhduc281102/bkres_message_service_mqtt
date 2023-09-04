const mqtt = require('mqtt');
require('dotenv').config()
var DB_URL =process.env.MONGO_URL
console.log(DB_URL)

const mongose = require('mongoose')
mongose.Promise = global.Promise
mongose.connect(DB_URL,).then(
    ()=>{
        console.log('Connect DB successfully')
        })


const MQTT_BROKER_URL = 'mqtt://sanslab1.ddns.net:1883'; 

const options = {
    username: 'admin', 
    password: '123',   
};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, options);

// Kết nối tới MongoDB
mongose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(
    () => {
        console.log('Kết nối Cơ sở dữ liệu MongoDB thành công');
    }
);

const subscriptionSchema = new mongose.Schema({
    api_key: String,
    device_ip: String,       
    count_message: Number,   
    subscribedAt: { type: Date, default: Date.now },
    messages: [{
        mess: String,
        receivedAt: { type: Date, default: Date.now }
    }]
});

const Subscription = mongose.model('Subscription', subscriptionSchema);

mqttClient.on('connect', () => {
    console.log('Kết nối thành công tới máy chủ MQTT');
    mqttClient.subscribe('topicName'); // thay topicName, IPaddress bằng thông tin của thiết bị
    saveSubscription('topicName', 'deviceIPAddress', 0);  
});

mqttClient.on('unsubscribe', (topics) => {
    topics.forEach(topic => {
        deleteSubscription(topic); 
    });
});

mqttClient.on('message', (api_key, message) => {
    console.log(`Nhận được tin nhắn trên chủ đề ${api_key}: ${message.toString()}`);
    saveMessage(api_key, message.toString()); 
});

function saveSubscription(api_key, device_ip, count_message) {
    const newSubscription = new Subscription({ api_key, device_ip, count_message });
    newSubscription.save().then(() => {
        console.log(`Đã lưu subscription cho chủ đề ${api_key}`);
    }).catch(err => {
        console.error(`Lỗi khi lưu subscription: ${err}`);
    });
}

function deleteSubscription(api_key) {
    Subscription.findOneAndDelete({ api_key }).then(() => {
        console.log(`Đã xóa subscription cho chủ đề ${api_key}`);
    }).catch(err => {
        console.error(`Lỗi khi xóa subscription: ${err}`);
    });
}

function saveMessage(api_key, mess) {
    Subscription.findOneAndUpdate(
        { api_key },
        { $push: { messages: { mess } }, $inc: { count_message: 1 } },
        { new: true }
    ).then(() => {
        console.log(`Đã lưu tin nhắn từ chủ đề ${api_key}: ${mess}`);
    }).catch(err => {
        console.error(`Lỗi khi lưu tin nhắn: ${err}`);
    });
}






