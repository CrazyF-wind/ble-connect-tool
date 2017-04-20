/**
 * Created by fwind on 2017/4/17.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
import {startup_dongle,start_ble_scan,connect_ble_device,disconnect_ble_device,close_dongle} from "./base"


var BluetoothScanner = module.exports = function (option, callback) {
    var self = this;

    // Inherit EventEmitter
    EventEmitter.call(self);

    self.init = function (option) {
        console.log("input info:" + JSON.stringify(option));
        //初始化参数
        let hcidev = 'hci1';
        let macAddr = option['mac'];
        let mobile = option['mobile'];
        let devicename = option['name'];
        let mi = option['mi'];
        let flag = option['flag'];
        let mobileopt = option['mobileopt'];

        // 启动dongle
        startup_dongle(hcidev, macAddr, flag, mi, mobile, devicename).then((data)=>{
            if(data["result"]===1) {
                console.log(`start_dongle:${data}`)
                //开始扫描
                start_ble_scan(macAddr, flag, mi, mobile, devicename, mobileopt)
            }else {
                //返回dongle启动失败情况
                callback(data);
            }
        }).then((data)=>{
            console.log(`start_ble_scan:${data}`)
            if(data["result"]===1) {
                let RSSI = data["value"]["RSSI"];
                let lescan_time = data["value"]["lescan_time"];
                //连接ble设备
                connect_ble_device(macAddr, flag, mi, mobile, devicename,mobileopt, RSSI,lescan_time)
            }else {
                //返回扫描失败情况
                callback(data);
            }
        }).then((data)=>{
            console.log(`connect_ble_device:${data}`)
            if(data["result"]===1){
                let RSSI = data["value"]["RSSI"];
                let lescan_time = data["value"]["lescan_time"];
                let handleValue=data["value"]["handleValue"];
                let connect_time=data["value"]["connect_time"];
                //断开ble设备
                disconnect_ble_device(macAddr, flag, mi, mobile, devicename,lescan_time, handleValue, RSSI,connect_time)
            }else {
                //返回连接失败情况
                callback(data)
            }
        }).then((data)=>{
            console.log(`disconnect_ble_device:${data}`)
            if(data["result"]===1) {
                //关闭dongle
                close_dongle(hcidev, macAddr, flag, mi, mobile, devicename)
            }else {
                //返回断开失败情况
                callback(data)
            }
        }).then((data)=>{
            console.log(`close_dongle:${data}`)
            callback(data)
        })

    };
    self.init(option);
};
util.inherits(BluetoothScanner, EventEmitter);


