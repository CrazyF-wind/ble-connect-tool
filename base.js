/**
 * Created by fwind on 2017/4/17.
 */
var spawn = require('child_process').spawn;
var LeScanner = require("andon-bluetooth-oncelescan-temp");
import {updateStatisticsdb,insertdb} from "./dbtools"
//const Q=require("q");
let record_time = new Date().getTime();


//启动蓝牙适配器
export const startup_dongle = (hcidev, macAddr, flag, mi, mobile, devicename)=> {
    const promise = new Promise(function (resolve, reject) {
        // Bring selected device UP
        const hciconfig = spawn('hciconfig', [hcidev, 'up']);
        hciconfig.on("exit", function (code) {
            if (code !== 0) {   //启动蓝牙适配器失败
                console.log("hcitool Device " + hcidev + "up fail!");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename,
                    {
                        "deviceup_failed": 1
                    });
                resolve({"result": 0, "value": "蓝牙启动失败！"});
            }
            else {              //启动蓝牙适配器成功
                console.log("Device " + hcidev + "up suceed!");
                resolve({"result": 1, "value": "ok"});
            }
        })
    })
    return promise;
}

//扫描ble设备
export const start_ble_scan = (macAddr, flag, mi, mobile, devicename, mobileopt)=> {
    const promise = new Promise(function (resolve, reject) {
        console.log("Device " + hcidev + "up suceed!");
        //扫描参数
        let scan_params = {
            "mac": macAddr,
            "flag": flag,
            "mi": mi,
            "mobile": mobile,
            "name": devicename,
            "parameter": {
                "interval": mobileopt["scan-interval"],
                "window": mobileopt["scan-window"]
            }
        };
        //扫描mac
        bleScanner = new LeScanner(scan_params, function (data) {
            console.log("返回扫描结果:" + JSON.stringify(data));
            if (data["value"] === "succeed") {
                let RSSI = data["RSSI"];
                let lescan_time = data["LeScanEndtime"] - data["LeScanBegintime"];
                console.log("扫描:" + macAddr + ",成功！扫描时间：" + lescan_time + "ms");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                    "lescan": 1,
                });
                resolve({"result": 1, "value": {"RSSI": RSSI, "lescan_time": lescan_time}})
            } else {
                console.log("扫描:" + macAddr + ",失败！");
                //console.log("扫描时间：" + (data["LeScanEndtime"] - data["LeScanBegintime"]) + "ms");
                resolve({"result": 0, "value": "failed"})
            }
        })
    })
    return promise;
}

//连接ble设备
export const connect_ble_device = (macAddr, flag, mi, mobile, devicename,mobileopt, RSSI,lescan_time)=> {
    const promise = new Promise(function (resolve, reject) {
        //begin Connect
        let begin_time = new Date();
        let end_time = new Date();
        //如果mac不是公共的（00开头），需要加参数--random 去连接
        //var hciToolScan = spawn('hcitool', ['EdInt',"--random",macAddr, mobileopt["connect-interval"], mobileopt["connect-window"], mobileopt["connect-min_interval"], mobileopt["connect-max_interval"]]);
        let hciToolEdInt = spawn('hcitool', ['EdInt', macAddr, mobileopt["connect-interval"], mobileopt["connect-window"], mobileopt["connect-min_interval"], mobileopt["connect-max_interval"]]);
        console.log("hcitool lecc(EdInt): started..." + ['EdInt', macAddr, mobileopt["connect-interval"], mobileopt["connect-window"], mobileopt["connect-min_interval"], mobileopt["connect-max_interval"]]);
        hciToolEdInt.stdout.on('data', function (data) {
            if (data.length) {
                end_time = new Date();
                console.log("\t连接成功!设备名称:" + devicename + "|mac:" + macAddr + "|RSSI:" + RSSI);
                let connect_time = (end_time.getTime() - begin_time.getTime());
                data = data.toString('utf-8');
                let handleValue = data.replace("Connection handle ", "");
                handleValue = handleValue.replace("/n", "");
                console.log("handlevalue:" + handleValue);

                //扫描记录存库、handle更新，返回成功结果
                //updatahandledb(handleValue);
                console.log('\t' + "连接时间：" + connect_time + "ms，扫描时间：" + lescan_time + "ms");
                resolve({
                    "result": 1,
                    "value": {"lescan_time":lescan_time,"RSSI":RSSI,"handleValue": handleValue, "connect_time": connect_time}
                })
            }
        });

        hciToolEdInt.on("exit", function (code) {
            console.log("exit:" + code);
            if (code !== 0) {
                //连接失败
                console.log("lecc(edint) " + macAddr + " failed!");
                let args = {
                    "mac": macAddr,
                    "flag": flag,
                    "name": devicename,
                    "mi": mi,
                    "time": record_time,
                    "mobile": mobile,
                    "LescanTime": lescan_time,
                    "RSSI": RSSI,
                    "isConnect": 0
                };
                insertdb(args);
            }
            else {
                console.log('\t' + "连接成功！退出时间:" + (new Date().getTime() - begin_time) + "ms");
            }
        });
    })
    return promise;
}

//断开ble设备
export const disconnect_ble_device = (macAddr, flag, mi, mobile, devicename,lescan_time, handleValue, RSSI,connect_time)=> {
    const promise = new Promise(function (resolve, reject) {
        let handleEndtime = new Date();
        let hciTool_ledc = spawn('hcitool', ['ledc', handleValue]);
        hciTool_ledc.on('exit', function (code) {
            let disconnect_time = (new Date().getTime() - handleEndtime);
            console.log('\t' + "断开成功!断开时间:" + disconnect_time + "ms");
            if (code !== 0) {
                console.log("lecc succeed ledc failed!");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                    "ledc_failed": 1,
                    "lecc": 1
                }.then(()=>{
                    resolve({"result": 0, "value": "关闭ble失败！"});
                }));
            } else {
                console.log("lecc succeed ledc succeed!");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                    "ledc_success": 1,
                    "lecc": 1
                }.then(()=>{
                    resolve({"result": 1, "value": "断开ble成功！"});
                }));
            }

            var args = {
                "mac": macAddr,
                "ConnectionTime": connect_time,
                "DisconnectTime": disconnect_time,
                "flag": flag,
                "name": devicename,
                "mi": mi,
                "time": record_time,
                "mobile": mobile,
                "LescanTime": lescan_time,
                "RSSI": RSSI,
                "isConnect": 1
            };
            insertdb(args);
        })
    })
    return promise;
}

//关闭蓝牙适配器
export const close_dongle = (hcidev, macAddr, flag, mi, mobile, devicename)=> {
    const promise = new Promise(function (resolve, reject) {
        var hciconfig = spawn('hciconfig', [hcidev, 'down']);
        hciconfig.on("exit", function (code) {
            if (code !== 0) {
                console.log("hcitool Device " + hcidev + "down fail!");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                    "lescan_failed": 1,
                    "devicedown_failed": 1
                }).then(()=> {
                    resolve({"result": 0, "value": "关闭dongle失败！"});
                });
            }
            else {
                console.log("hcitool Device " + hcidev + "down suceed!");
                //写入统计库
                updateStatisticsdb(macAddr, flag, mi, mobile, devicename, {
                    "lescan_failed": 1,
                    "devicedown_success": 1
                }).then(()=> {
                    resolve({"result": 1, "value": "关闭dongle成功！"});
                });
            }
        });
    })
    return promise;
}

